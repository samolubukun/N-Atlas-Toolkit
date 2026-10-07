"""
Sovereign Nigerian ASR Evaluation Harness (WER / CER).

Evaluates N-ATLaS ASR models (Yoruba, Hausa, Igbo, Nigerian English)
against benchmark audio datasets such as:
`benjaminogbonna/nigerian_common_voice_dataset` (Common Voice Nigeria)

Calculates:
- Word Error Rate (WER)
- Character Error Rate (CER)
- Latency & Duration Statistics
- Breakdown by Language (Hausa, Igbo, Yoruba, Nigerian English)
- Comparison against Ground Truth

N-ATLaS is an initiative of the Federal Ministry of Communications,
Innovation and Digital Economy, and powered by Awarri Technologies.
"""

import argparse
import io
import json
import os
import re
import sys
import time
import unicodedata
import wave
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import httpx

# Ensure proper UTF-8 output on Windows console for diacritics
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Default Modal cloud endpoints
DEFAULT_ASR_ENDPOINT = os.environ.get(
    "NATLAS_API_URL",
    "https://samuelolubukun--natlas-engine-natlasasrengine-serve.modal.run/v1/audio/transcriptions",
)
if not DEFAULT_ASR_ENDPOINT.endswith("/v1/audio/transcriptions"):
    DEFAULT_ASR_ENDPOINT = f"{DEFAULT_ASR_ENDPOINT.rstrip('/')}/v1/audio/transcriptions"

SOVEREIGN_MODELS = {
    "hausa": "NCAIR1/Hausa-ASR",
    "ha": "NCAIR1/Hausa-ASR",
    "igbo": "NCAIR1/Igbo-ASR",
    "ig": "NCAIR1/Igbo-ASR",
    "yoruba": "NCAIR1/Yoruba-ASR",
    "yo": "NCAIR1/Yoruba-ASR",
    "english": "NCAIR1/NigerianAccentedEnglish",
    "en": "NCAIR1/NigerianAccentedEnglish",
}

DATASET_CONFIGS = {
    "hausa": "hausa",
    "igbo": "igbo",
    "yoruba": "yoruba",
    "english": "english",
}


# ---------------------------------------------------------------------------
# Levenshtein Edit Distance, WER & CER (Pure Python, Zero Dependency)
# ---------------------------------------------------------------------------

def normalise_text(text: str) -> str:
    """Normalise text for fair ASR error rate comparison.
    Performs Unicode NFC normalisation, lowercasing, and strips punctuation.
    """
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text).lower()
    # Remove punctuation while preserving African diacritics and letters
    text = re.sub(r"[^\w\s]", "", text, flags=re.UNICODE)
    # Collapse multiple whitespaces
    return " ".join(text.split())


def _levenshtein_distance(ref_tokens: List[str], hyp_tokens: List[str]) -> int:
    """Computes Levenshtein matrix distance between reference and hypothesis tokens."""
    r_len, h_len = len(ref_tokens), len(hyp_tokens)
    if r_len == 0:
        return h_len
    if h_len == 0:
        return r_len

    dp = [[0] * (h_len + 1) for _ in range(r_len + 1)]
    for i in range(r_len + 1):
        dp[i][0] = i
    for j in range(h_len + 1):
        dp[0][j] = j

    for i in range(1, r_len + 1):
        for j in range(1, h_len + 1):
            cost = 0 if ref_tokens[i - 1] == hyp_tokens[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,       # Deletion
                dp[i][j - 1] + 1,       # Insertion
                dp[i - 1][j - 1] + cost # Substitution
            )
    return dp[r_len][h_len]


def calculate_wer(reference: str, hypothesis: str) -> float:
    """Calculate Word Error Rate (WER) between reference and hypothesis."""
    ref_norm = normalise_text(reference)
    hyp_norm = normalise_text(hypothesis)
    ref_words = ref_norm.split()
    hyp_words = hyp_norm.split()

    if not ref_words:
        return 0.0 if not hyp_words else 1.0

    distance = _levenshtein_distance(ref_words, hyp_words)
    return distance / len(ref_words)


def calculate_cer(reference: str, hypothesis: str) -> float:
    """Calculate Character Error Rate (CER) between reference and hypothesis."""
    ref_norm = normalise_text(reference)
    hyp_norm = normalise_text(hypothesis)
    ref_chars = list(ref_norm.replace(" ", ""))
    hyp_chars = list(hyp_norm.replace(" ", ""))

    if not ref_chars:
        return 0.0 if not hyp_chars else 1.0

    distance = _levenshtein_distance(ref_chars, hyp_chars)
    return distance / len(ref_chars)


# ---------------------------------------------------------------------------
# Audio Conversion Helper (Array to WAV Bytes)
# ---------------------------------------------------------------------------

def audio_record_to_wav_bytes(audio_dict: Dict[str, Any]) -> bytes:
    """Convert Hugging Face datasets audio dictionary to WAV byte stream."""
    if "bytes" in audio_dict and audio_dict["bytes"]:
        return audio_dict["bytes"]

    # Array representation (float32 or int16 numpy array)
    import numpy as np

    array = audio_dict["array"]
    sampling_rate = audio_dict.get("sampling_rate", 16000)

    # Convert to 16-bit PCM
    if isinstance(array, np.ndarray):
        if array.dtype in (np.float32, np.float64):
            # Normalize to -1.0 to 1.0 and scale to int16
            max_val = np.max(np.abs(array))
            if max_val > 0:
                array = array / max_val
            array = (array * 32767).astype(np.int16)
        pcm_bytes = array.tobytes()
    else:
        pcm_bytes = bytes(array)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(sampling_rate)
        wav.writeframes(pcm_bytes)

    return buffer.getvalue()


# ---------------------------------------------------------------------------
# ASR Evaluation Runner
# ---------------------------------------------------------------------------

def evaluate_sample(
    client: httpx.Client,
    endpoint: str,
    headers: Dict[str, str],
    audio_bytes: bytes,
    filename: str,
    model: str,
    language: str,
    ground_truth: str,
) -> Dict[str, Any]:
    """Transcribe a single audio sample and compute accuracy metrics."""
    files = {"file": (filename, audio_bytes, "audio/wav")}
    data = {"model": model, "language": language}

    t0 = time.time()
    try:
        resp = client.post(endpoint, headers=headers, files=files, data=data)
        latency = time.time() - t0

        if resp.status_code == 200:
            res = resp.json()
            transcribed = res.get("text", "").strip()
            wer = calculate_wer(ground_truth, transcribed)
            cer = calculate_cer(ground_truth, transcribed)
            duration = res.get("duration", 0.0)

            return {
                "status": "PASS",
                "ground_truth": ground_truth,
                "transcribed": transcribed,
                "wer": wer,
                "cer": cer,
                "latency": latency,
                "duration": duration,
                "error": None,
            }
        else:
            return {
                "status": "FAIL",
                "ground_truth": ground_truth,
                "transcribed": "",
                "wer": 1.0,
                "cer": 1.0,
                "latency": latency,
                "duration": 0.0,
                "error": f"HTTP {resp.status_code}: {resp.text}",
            }
    except Exception as ex:
        return {
            "status": "ERROR",
            "ground_truth": ground_truth,
            "transcribed": "",
            "wer": 1.0,
            "cer": 1.0,
            "latency": time.time() - t0,
            "duration": 0.0,
            "error": str(ex),
        }


def run_benchmark(
    endpoint: str,
    api_key: Optional[str] = None,
    languages: Optional[List[str]] = None,
    samples_per_language: int = 10,
    dataset_name: str = "benjaminogbonna/nigerian_common_voice_dataset",
    output_json: Optional[str] = None,
) -> Dict[str, Any]:
    """Run full benchmark across Nigerian languages using Hugging Face datasets."""
    from datasets import load_dataset

    if not languages:
        languages = ["hausa", "igbo", "yoruba", "english"]

    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    print("=" * 75)
    print("N-ATLaS SOVEREIGN ASR BENCHMARK & EVALUATION HARNESS")
    print(f"Target Endpoint : {endpoint}")
    print(f"Benchmark Set   : {dataset_name}")
    print(f"Languages       : {', '.join(languages)}")
    print(f"Samples / Lang  : {samples_per_language}")
    print("=" * 75)

    results_by_language = {}
    summary = {}

    with httpx.Client(timeout=180.0) as client:
        # Check health
        health_url = endpoint.replace("/v1/audio/transcriptions", "/healthz")
        try:
            h_resp = client.get(health_url)
            print(f"Health Status: {h_resp.status_code} ({h_resp.text.strip()})")
        except Exception as e:
            print(f"Warning: Health check ping failed: {e}")

        for lang in languages:
            config = DATASET_CONFIGS.get(lang.lower(), lang.lower())
            model_id = SOVEREIGN_MODELS.get(lang.lower(), "NCAIR1/NigerianAccentedEnglish")

            print(f"\n>>> Loading [{lang.upper()}] test split from {dataset_name} (streamed)...")
            try:
                ds = load_dataset(dataset_name, config, split="test", streaming=True)
            except Exception as e:
                print(f"Failed to stream dataset for {lang}: {e}")
                continue

            lang_evals = []
            count = 0

            for row in ds:
                if count >= samples_per_language:
                    break

                sentence = row.get("sentence", "").strip()
                if not sentence:
                    continue

                audio_data = row.get("audio")
                if not audio_data:
                    continue

                audio_bytes = audio_record_to_wav_bytes(audio_data)
                filename = f"{lang}_{count}.wav"

                eval_res = evaluate_sample(
                    client=client,
                    endpoint=endpoint,
                    headers=headers,
                    audio_bytes=audio_bytes,
                    filename=filename,
                    model=model_id,
                    language=lang,
                    ground_truth=sentence,
                )

                lang_evals.append(eval_res)
                count += 1

                wer_pct = eval_res["wer"] * 100
                cer_pct = eval_res["cer"] * 100
                print(
                    f"[{count:02d}/{samples_per_language:02d}] "
                    f"WER: {wer_pct:5.1f}% | CER: {cer_pct:5.1f}% | "
                    f"Lat: {eval_res['latency']:.2f}s | "
                    f"Ref: '{sentence[:40]}...'"
                )

            if lang_evals:
                avg_wer = sum(r["wer"] for r in lang_evals) / len(lang_evals) * 100
                avg_cer = sum(r["cer"] for r in lang_evals) / len(lang_evals) * 100
                avg_lat = sum(r["latency"] for r in lang_evals) / len(lang_evals)
                pass_rate = sum(1 for r in lang_evals if r["status"] == "PASS") / len(lang_evals) * 100

                results_by_language[lang] = lang_evals
                summary[lang] = {
                    "samples": len(lang_evals),
                    "model": model_id,
                    "avg_wer_percent": round(avg_wer, 2),
                    "avg_cer_percent": round(avg_cer, 2),
                    "avg_latency_sec": round(avg_lat, 2),
                    "pass_rate_percent": round(pass_rate, 1),
                }

    # Print Final Summary Table
    print("\n" + "=" * 78)
    print("                      ASR BENCHMARK FINAL REPORT                      ")
    print("=" * 78)
    print(f"{'Language':<18} | {'Samples':<7} | {'Avg WER':<9} | {'Avg CER':<9} | {'Avg Lat':<8} | {'Pass Rate'}")
    print("-" * 78)
    for lang, s in summary.items():
        print(
            f"{lang.capitalize():<18} | "
            f"{s['samples']:<7} | "
            f"{s['avg_wer_percent']:>5.1f}%   | "
            f"{s['avg_cer_percent']:>5.1f}%   | "
            f"{s['avg_latency_sec']:>5.2f}s  | "
            f"{s['pass_rate_percent']:>5.1f}%"
        )
    print("=" * 78)

    full_report = {
        "dataset": dataset_name,
        "endpoint": endpoint,
        "summary": summary,
        "details": results_by_language,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    if output_json:
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(full_report, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Full detailed benchmark report saved to: {output_json}")

    return full_report


def main():
    parser = argparse.ArgumentParser(description="Evaluate N-ATLaS Sovereign ASR against Common Voice Nigeria benchmark.")
    parser.add_argument(
        "--endpoint",
        default=DEFAULT_ASR_ENDPOINT,
        help="ASR transcription URL (default: Modal live ASR endpoint)",
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("NATLAS_API_KEY"),
        help="N-ATLaS API Key",
    )
    parser.add_argument(
        "--languages",
        nargs="+",
        default=["hausa", "igbo", "yoruba", "english"],
        help="Languages to benchmark (hausa, igbo, yoruba, english)",
    )
    parser.add_argument(
        "--num-samples",
        type=int,
        default=25,
        help="Number of test samples per language (default: 25 for statistical confidence)",
    )
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Quick smoke-test mode (runs 5 samples per language)",
    )
    parser.add_argument(
        "--dataset",
        default="benjaminogbonna/nigerian_common_voice_dataset",
        help="Hugging Face dataset identifier",
    )
    parser.add_argument(
        "--output",
        default="eval_asr_results.json",
        help="Path to save JSON benchmark results",
    )

    args = parser.parse_args()
    samples = 5 if args.fast else args.num_samples

    run_benchmark(
        endpoint=args.endpoint,
        api_key=args.api_key,
        languages=args.languages,
        samples_per_language=samples,
        dataset_name=args.dataset,
        output_json=args.output,
    )


if __name__ == "__main__":
    main()
