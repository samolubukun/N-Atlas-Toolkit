"""
Comprehensive Production Testing & Benchmarking Suite for N-ATLaS.

Evaluates against REAL Hugging Face Datasets:
1. Speech Recognition (ASR):
   - Streams 100 audio samples per language (Hausa, Yoruba, Igbo, English) from
     `benjaminogbonna/nigerian_common_voice_dataset` (or custom dataset).
   - Computes Word Error Rate (WER) & Character Error Rate (CER) with African diacritic preservation.
2. Reading Comprehension (LLM Reasoning):
   - Evaluates multiple-choice reading comprehension accuracy from Meta's Belebele benchmark
     (`facebook/belebele`) for `hau_Latn`, `yor_Latn`, `ibo_Latn`, and `eng_Latn`.
3. LLM Generation Performance:
   - Measures generation throughput (Tokens/Sec) and end-to-end latency across all national languages.

N-ATLaS is an initiative of the Federal Ministry of Communications,
Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

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
from typing import Any, Dict, List, Optional

import httpx

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

DEFAULT_BASE_URL = os.environ.get(
    "NATLAS_BASE_URL",
    os.environ.get("NATLAS_API_URL", "http://localhost:8000"),
).rstrip("/")

DEFAULT_ASR_URL = os.environ.get(
    "NATLAS_ASR_URL",
    DEFAULT_BASE_URL,
).rstrip("/")

API_KEY = os.environ.get("NATLAS_API_KEY", "")

# Real ASR Dataset Configuration (benjaminogbonna)
DEFAULT_ASR_DATASET = "benjaminogbonna/nigerian_common_voice_dataset"

ASR_CONFIGS = {
    "hausa": "hausa",
    "igbo": "igbo",
    "yoruba": "yoruba",
    "english": "english",
}

SOVEREIGN_ASR_MODELS = {
    "hausa": "NCAIR1/Hausa-ASR",
    "igbo": "NCAIR1/Igbo-ASR",
    "yoruba": "NCAIR1/Yoruba-ASR",
    "english": "NCAIR1/NigerianAccentedEnglish",
}

# Real LLM Reading Comprehension Dataset Configuration (Meta Belebele)
BELEBELE_DATASET = "facebook/belebele"
BELEBELE_LANG_CODES = {
    "hausa": "hau_Latn",
    "yoruba": "yor_Latn",
    "igbo": "ibo_Latn",
    "english": "eng_Latn",
}

LETTERS = ["A", "B", "C", "D"]

# Standard generation performance test prompts
LLM_THROUGHPUT_PROMPTS = [
    {
        "language": "Hausa",
        "prompt": "Ka ba ni misalai uku na yadda fasahar AI za ta iya inganta fannin aikin gona a Arewacin Najeriya.",
        "max_tokens": 150,
    },
    {
        "language": "Yoruba",
        "prompt": "Ṣe àlàyé nípa bí ìmọ̀ ẹ̀rọ AI ṣe lè ṣèrànwọ́ fún àwọn ọmọ ilé-ẹ̀kọ́ ní Nàìjíríà.",
        "max_tokens": 150,
    },
    {
        "language": "Igbo",
        "prompt": "Kọwaa ụzọ atọ teknụzụ AI ga-esi kwalite azụmahịa na Naịjirịa.",
        "max_tokens": 150,
    },
    {
        "language": "Nigerian English",
        "prompt": "Explain three key ways sovereign artificial intelligence will transform financial services in Nigeria.",
        "max_tokens": 150,
    },
]


# ===========================================================================
# Metric & Normalization Mathematics (Levenshtein, WER, CER)
# ===========================================================================

def normalise_text(text: str) -> str:
    """Normalize text for fair comparison: NFC Unicode, lowercasing, strip punctuation."""
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text).lower()
    text = re.sub(r"[^\w\s]", "", text, flags=re.UNICODE)
    return " ".join(text.split())


def levenshtein(s1: list, s2: list) -> int:
    dp = [[0] * (len(s2) + 1) for _ in range(len(s1) + 1)]
    for i in range(len(s1) + 1):
        dp[i][0] = i
    for j in range(len(s2) + 1):
        dp[0][j] = j
    for i in range(1, len(s1) + 1):
        for j in range(1, len(s2) + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    return dp[len(s1)][len(s2)]


def compute_wer_cer(reference: str, hypothesis: str) -> tuple[float, float]:
    r_words = normalise_text(reference).split()
    h_words = normalise_text(hypothesis).split()
    if not r_words:
        wer = 0.0 if not h_words else 1.0
    else:
        wer = levenshtein(r_words, h_words) / len(r_words)

    r_chars = list(normalise_text(reference).replace(" ", ""))
    h_chars = list(normalise_text(hypothesis).replace(" ", ""))
    if not r_chars:
        cer = 0.0 if not h_chars else 1.0
    else:
        cer = levenshtein(r_chars, h_chars) / len(r_chars)

    return round(wer, 4), round(cer, 4)


def audio_dict_to_wav_bytes(audio_dict: Dict[str, Any]) -> bytes:
    """Convert Hugging Face datasets audio record to WAV bytes."""
    if "bytes" in audio_dict and audio_dict["bytes"]:
        return audio_dict["bytes"]

    import numpy as np

    array = audio_dict["array"]
    sampling_rate = audio_dict.get("sampling_rate", 16000)

    if isinstance(array, np.ndarray):
        if array.dtype in (np.float32, np.float64):
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
        wav.setsampwidth(2)
        wav.setframerate(sampling_rate)
        wav.writeframes(pcm_bytes)
    return buffer.getvalue()


def parse_mcq_letter(response_text: str) -> str | None:
    """Extract chosen option letter (A, B, C, D) from response."""
    if not response_text:
        return None
    text = response_text.strip()
    patterns = [
        r"answer\s*(?:is|:)?\s*\**\s*\(?([A-D])\)?\b",
        r"^\s*\**\(?([A-D])\)?\**\s*[\.\):\-]",
        r"^\s*\**\(?([A-D])\)?\**\s*$",
        r"\b(?:option|choice)\s*\(?([A-D])\)?\b",
        r"\b([A-D])\b",
    ]
    for p in patterns:
        m = re.search(p, text, flags=re.IGNORECASE | re.MULTILINE)
        if m:
            return m.group(1).upper()
    return None


# ===========================================================================
# 1. LLM Generation Throughput & Latency Benchmark
# ===========================================================================

def benchmark_llm_throughput(base_url: str, api_key: str) -> Dict[str, Any]:
    print("\n--- 1. Running LLM Latency & Throughput Benchmark ---")
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    endpoint = f"{base_url}/v1/chat/completions"

    results = []
    with httpx.Client(timeout=120.0) as client:
        for item in LLM_THROUGHPUT_PROMPTS:
            lang = item["language"]
            prompt = item["prompt"]
            max_tokens = item["max_tokens"]

            payload = {
                "model": "NCAIR1/N-ATLaS",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0.0,
            }

            t0 = time.time()
            resp = None
            err_msg = None
            for attempt in range(3):
                try:
                    with httpx.Client(timeout=120.0) as req_client:
                        resp = req_client.post(endpoint, headers=headers, json=payload)
                    break
                except Exception as ex:
                    err_msg = str(ex)
                    time.sleep(1.0)

            latency = time.time() - t0

            if resp is not None and resp.status_code == 200:
                data = resp.json()

                usage = data.get("usage", {})
                completion_tokens = usage.get("completion_tokens", 0)
                tok_per_sec = (completion_tokens / latency) if latency > 0 and completion_tokens else 0

                results.append({
                    "language": lang,
                    "tokens_generated": completion_tokens,
                    "latency_sec": round(latency, 2),
                    "tokens_per_sec": round(tok_per_sec, 2),
                    "status": "PASS",
                })
                print(f"[{lang:<16}] {completion_tokens} tokens in {latency:.2f}s => {tok_per_sec:.1f} tok/s")
            else:
                results.append({"language": lang, "status": "FAIL", "error": resp.text})
                print(f"[{lang:<16}] Failed: {resp.status_code}")

    return {
        "results": results,
        "avg_throughput_tok_s": round(sum(r.get("tokens_per_sec", 0) for r in results if r["status"] == "PASS") / max(1, len(results)), 2),
        "avg_latency_s": round(sum(r.get("latency_sec", 0) for r in results if r["status"] == "PASS") / max(1, len(results)), 2),
    }


# ===========================================================================
# 2. Reading Comprehension Accuracy Benchmark (Meta Belebele)
# ===========================================================================

def benchmark_llm_comprehension(
    base_url: str,
    api_key: str,
    samples_per_lang: int = 25,
) -> Dict[str, Any]:
    print(f"\n--- 2. Running Real Reading Comprehension Benchmark (Belebele, {samples_per_lang} samples/lang) ---")
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    endpoint = f"{base_url}/v1/chat/completions"

    try:
        from datasets import load_dataset
    except ImportError:
        print("Hugging Face 'datasets' library not installed. Install with: pip install datasets")
        return {"error": "datasets library missing", "accuracy_percent": 0.0}

    results_by_lang = {}
    total_correct = 0
    total_evaluated = 0

    with httpx.Client(timeout=120.0) as client:
        for lang_name, lang_code in BELEBELE_LANG_CODES.items():
            print(f"\n>>> Streaming Belebele [{lang_name.upper()} - {lang_code}] split...")
            try:
                ds = load_dataset(BELEBELE_DATASET, lang_code, split="test", streaming=True)
            except Exception as e:
                print(f"Failed to stream Belebele for {lang_name}: {e}")
                continue

            lang_correct = 0
            count = 0

            for row in ds:
                if count >= samples_per_lang:
                    break

                passage = row.get("flores_passage") or row.get("context", "")
                question = row.get("question", "")
                options = [
                    str(row.get(f"mc_answer{i+1}", "")) for i in range(4)
                ]
                gold_idx_str = str(row.get("correct_answer_num", "1")).strip()
                gold_letter = LETTERS[int(gold_idx_str) - 1] if gold_idx_str.isdigit() and 1 <= int(gold_idx_str) <= 4 else "A"

                formatted_options = "\n".join([f"{LETTERS[i]}. {opt}" for i, opt in enumerate(options)])
                prompt = (
                    f"Passage: {passage}\n\n"
                    f"Question: {question}\n\n"
                    f"Options:\n{formatted_options}\n\n"
                    "Answer with a single letter (A, B, C, or D) corresponding to the correct answer.\nAnswer:"
                )

                payload = {
                    "model": "NCAIR1/N-ATLaS",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 8,
                    "temperature": 0.0,
                }

                try:
                    with httpx.Client(timeout=30.0) as req_client:
                        resp = req_client.post(endpoint, headers=headers, json=payload)
                    if resp.status_code == 200:
                        raw_text = resp.json()["choices"][0]["message"]["content"]
                        pred = parse_mcq_letter(raw_text)
                        is_correct = (pred == gold_letter)
                        if is_correct:
                            lang_correct += 1
                        count += 1
                        status_char = "✓" if is_correct else "✗"
                        print(f"[{count:02d}/{samples_per_lang:02d}] {lang_name.title()}: {status_char} (pred: {pred}, gold: {gold_letter})")
                    else:
                        print(f"Failed: HTTP {resp.status_code}")
                except Exception as ex:
                    print(f"Request error on {lang_name}: {ex}")


            acc = round((lang_correct / max(1, count)) * 100, 1)
            results_by_lang[lang_name] = {
                "correct": lang_correct,
                "total": count,
                "accuracy_percent": acc,
            }
            total_correct += lang_correct
            total_evaluated += count

    overall_acc = round((total_correct / max(1, total_evaluated)) * 100, 1)
    return {
        "by_language": results_by_lang,
        "total_correct": total_correct,
        "total_evaluated": total_evaluated,
        "accuracy_percent": overall_acc,
    }


# ===========================================================================
# 3. Sovereign ASR Real Dataset Accuracy Benchmark (Benjamin Ogbonna)
# ===========================================================================

def benchmark_asr_dataset(
    asr_url: str,
    api_key: str,
    samples_per_lang: int = 100,
    dataset_name: str = DEFAULT_ASR_DATASET,
) -> Dict[str, Any]:
    print(f"\n--- 3. Running Real Sovereign ASR Accuracy Benchmark ({samples_per_lang} audio samples/lang) ---")
    print(f"Source Dataset: {dataset_name}")
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    endpoint = f"{asr_url}/v1/audio/transcriptions"

    try:
        from datasets import load_dataset
    except ImportError:
        print("Hugging Face 'datasets' library not installed. Install with: pip install datasets")
        return {"error": "datasets library missing", "avg_wer_percent": 0.0, "avg_cer_percent": 0.0}

    results_by_lang = {}
    all_wer = []
    all_cer = []

    with httpx.Client(timeout=180.0) as client:
        for lang_name, config in ASR_CONFIGS.items():
            model_id = SOVEREIGN_ASR_MODELS.get(lang_name)
            print(f"\n>>> Streaming [{lang_name.upper()}] from {dataset_name}...")

            hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
            ds = None
            try:
                from datasets import Audio as HFAudio
                ds = load_dataset(dataset_name, config, split="test", streaming=True, token=hf_token)
                ds = ds.cast_column("audio", HFAudio(decode=False))
            except Exception as e:
                print(f"Failed to stream {lang_name} audio from Hugging Face: {e}")

            # Fallback to local reference audio files if streaming encounters network/DNS issues
            if ds is None:
                local_sample_file = BASE_DIR / "tests" / "audio" / f"{lang_name}.mp3"
                if local_sample_file.exists():
                    print(f"Falling back to bundled local audio sample: {local_sample_file.name}")
                    local_gts = {
                        "hausa": "Bude kofar. Na san kina ciki.",
                        "english": "Closing the Google assistant app prevents it from working with your headphones.",
                        "igbo": "Odeakwụkwọ ọkpụtọrọkpụ ụlọọrụ na-ahụ maka ọrụ ngo na steeti Anambra",
                        "yoruba": "Ta ni ò mọ̀ pé àwọn àgbà jẹ́ ilé ìṣura ọgbọ́n?",
                    }
                    ds = [{
                        "sentence": local_gts.get(lang_name, ""),
                        "audio": {"bytes": open(local_sample_file, "rb").read()},
                    }]
                else:
                    continue



            count = 0
            lang_wer = []
            lang_cer = []

            def get_rows():
                try:
                    for r in ds:
                        yield r
                except Exception as stream_err:
                    print(f"Streaming error on {lang_name}: {stream_err}. Using local reference sample.")
                    local_sample_file = BASE_DIR / "tests" / "audio" / f"{lang_name}.mp3"
                    if local_sample_file.exists():
                        local_gts = {
                            "hausa": "Bude kofar. Na san kina ciki.",
                            "english": "Closing the Google assistant app prevents it from working with your headphones.",
                            "igbo": "Odeakwụkwọ ọkpụtọrọkpụ ụlọọrụ na-ahụ maka ọrụ ngo na steeti Anambra",
                            "yoruba": "Ta ni ò mọ̀ pé àwọn àgbà jẹ́ ilé ìṣura ọgbọ́n?",
                        }
                        yield {
                            "sentence": local_gts.get(lang_name, ""),
                            "audio": {"bytes": open(local_sample_file, "rb").read()},
                        }

            for row in get_rows():
                if count >= samples_per_lang:
                    break

                sentence = row.get("sentence", "").strip()
                audio_data = row.get("audio")
                if not sentence or not audio_data:
                    continue

                try:
                    audio_bytes = audio_dict_to_wav_bytes(audio_data)
                except Exception as ex:
                    print(f"Audio conversion failed: {ex}")
                    continue


                files = {"file": (f"{lang_name}_{count}.wav", audio_bytes, "audio/wav")}
                data = {"model": model_id, "language": lang_name}

                t0 = time.time()
                try:
                    with httpx.Client(timeout=60.0) as req_client:
                        resp = req_client.post(endpoint, headers=headers, files=files, data=data)
                    latency = time.time() - t0

                    if resp.status_code == 200:
                        transcribed = resp.json().get("text", "").strip()
                        wer, cer = compute_wer_cer(sentence, transcribed)
                        lang_wer.append(wer * 100)
                        lang_cer.append(cer * 100)
                        all_wer.append(wer * 100)
                        all_cer.append(cer * 100)
                        count += 1

                        print(f"[{count:03d}/{samples_per_lang:03d}] WER: {wer*100:5.1f}% | CER: {cer*100:5.1f}% | Lat: {latency:.2f}s | Ref: '{sentence[:35]}...'")
                    else:
                        print(f"Failed: HTTP {resp.status_code}")
                except Exception as ex:
                    print(f"Transcription error: {ex}")


            avg_w = round(sum(lang_wer) / max(1, len(lang_wer)), 1)
            avg_c = round(sum(lang_cer) / max(1, len(lang_cer)), 1)
            results_by_lang[lang_name] = {
                "samples": count,
                "avg_wer_percent": avg_w,
                "avg_cer_percent": avg_c,
            }

    overall_avg_wer = round(sum(all_wer) / max(1, len(all_wer)), 1)
    overall_avg_cer = round(sum(all_cer) / max(1, len(all_cer)), 1)

    return {
        "by_language": results_by_lang,
        "total_samples": len(all_wer),
        "avg_wer_percent": overall_avg_wer,
        "avg_cer_percent": overall_avg_cer,
    }


# ===========================================================================
# Main CLI Orchestrator
# ===========================================================================

def main():
    parser = argparse.ArgumentParser(description="Run Production N-ATLaS Testing & Benchmarking Suite")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Base server URL for LLM and unified API")
    parser.add_argument("--asr-url", default=None, help="Optional separate ASR URL (defaults to --base-url)")
    parser.add_argument("--api-key", default=API_KEY)
    parser.add_argument("--asr-samples", type=int, default=100, help="Number of real audio samples per language from Benjamin Ogbonna dataset")
    parser.add_argument("--comp-samples", type=int, default=100, help="Number of Belebele reading comprehension questions per language")
    parser.add_argument("--skip-asr", action="store_true", help="Skip ASR dataset benchmark")
    parser.add_argument("--skip-comprehension", action="store_true", help="Skip reading comprehension benchmark")
    parser.add_argument("--output", default="benchmark_report.json")
    args = parser.parse_args()

    asr_url = (args.asr_url or DEFAULT_ASR_URL or args.base_url).rstrip("/")
    base_url = args.base_url.rstrip("/")

    print("=" * 75)
    print("N-ATLaS REPRODUCIBLE PRODUCTION BENCHMARK SUITE")
    print(f"LLM Base URL    : {base_url}")
    print(f"ASR Base URL    : {asr_url}")
    print(f"ASR Samples/Lang: {args.asr_samples} (from benjaminogbonna/nigerian_common_voice_dataset)")
    print(f"MCQ Samples/Lang: {args.comp_samples} (from facebook/belebele)")
    print("=" * 75)

    llm_metrics = benchmark_llm_throughput(base_url, args.api_key)

    if not args.skip_comprehension:
        comp_metrics = benchmark_llm_comprehension(base_url, args.api_key, samples_per_lang=args.comp_samples)
    else:
        comp_metrics = {"skipped": True}

    if not args.skip_asr:
        asr_metrics = benchmark_asr_dataset(asr_url, args.api_key, samples_per_lang=args.asr_samples)
    else:
        asr_metrics = {"skipped": True}

    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "llm_throughput": llm_metrics,
        "reading_comprehension": comp_metrics,
        "sovereign_asr": asr_metrics,
    }

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 75)
    print("FINAL BENCHMARK SCORECARD")
    print("=" * 75)
    print(f"LLM Avg Throughput    : {llm_metrics.get('avg_throughput_tok_s')} tok/s")
    print(f"LLM Avg Latency       : {llm_metrics.get('avg_latency_s')}s")
    if not args.skip_comprehension:
        print(f"Belebele MCQ Acc      : {comp_metrics.get('accuracy_percent')}% (across Hausa, Yoruba, Igbo, English)")
    if not args.skip_asr:
        print(f"ASR Avg WER           : {asr_metrics.get('avg_wer_percent')}% ({asr_metrics.get('total_samples')} real audio clips evaluated)")
        print(f"ASR Avg CER           : {asr_metrics.get('avg_cer_percent')}%")
    print(f"Report saved to       : {args.output}")
    print("=" * 75)


if __name__ == "__main__":
    main()
