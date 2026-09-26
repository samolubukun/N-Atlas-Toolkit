"""Test N-ATLaS Sovereign ASR Endpoint against audio samples with Ground Truth comparison."""

import os
import sys
import time
from pathlib import Path
import httpx

# Ensure proper UTF-8 output on Windows console for diacritics (ẹ, ọ, ị, ụ, à, etc.)
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Load environment variables from .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent

ASR_ENDPOINT = os.environ.get(
    "NATLAS_ASR_URL",
    "https://samuelolubukun--natlas-engine-natlasasrengine-serve.modal.run/v1/audio/transcriptions",
)
if not ASR_ENDPOINT.endswith("/v1/audio/transcriptions"):
    ASR_ENDPOINT = f"{ASR_ENDPOINT.rstrip('/')}/v1/audio/transcriptions"

API_KEY = os.environ.get("NATLAS_API_KEY")
if not API_KEY:
    print("ERROR: NATLAS_API_KEY environment variable is not set. Please set NATLAS_API_KEY in your .env or environment.")
    sys.exit(1)

TESTS = [
    {
        "language": "Hausa",
        "file": str(BASE_DIR / "audio" / "hausa.mp3"),
        "model": "NCAIR1/Hausa-ASR",
        "ground_truth": "Bude kofar. Na san kina ciki.",
    },
    {
        "language": "English",
        "file": str(BASE_DIR / "audio" / "english.mp3"),
        "model": "NCAIR1/NigerianAccentedEnglish",
        "ground_truth": "Closing the Google assistant app prevents it from working with your headphones.",
    },
    {
        "language": "Igbo",
        "file": str(BASE_DIR / "audio" / "igbo.mp3"),
        "model": "NCAIR1/Igbo-ASR",
        "ground_truth": "Odeakwụkwọ ọkpụtọrọkpụ ụlọọrụ na-ahụ maka ọrụ ngo na steeti Anambra",
    },
    {
        "language": "Yoruba",
        "file": str(BASE_DIR / "audio" / "yoruba.mp3"),
        "model": "NCAIR1/Yoruba-ASR",
        "ground_truth": "Ta ni ò mọ̀ pé àwọn àgbà jẹ́ ilé ìṣura ọgbọ́n?",
    },
]

def main():
    print("=" * 80)
    print("N-ATLaS SOVEREIGN ASR ENGINE - AUDIO SAMPLES TEST")
    print(f"Target Endpoint: {ASR_ENDPOINT}")
    print("=" * 80)

    headers = {"Authorization": f"Bearer {API_KEY}"}

    results = []

    with httpx.Client(timeout=180.0) as client:
        # First check health
        health_url = ASR_ENDPOINT.replace("/v1/audio/transcriptions", "/healthz")
        try:
            print(f"Pinging health endpoint: {health_url} ...")
            health_resp = client.get(health_url)
            print(f"Health status: {health_resp.status_code}")
            if health_resp.status_code == 200:
                print(f"Health response: {health_resp.json()}")
        except Exception as e:
            print(f"Health check warning: {e}")

        print("\nRunning transcription tests...")
        for item in TESTS:
            lang = item["language"]
            file_path = Path(item["file"])
            gt = item["ground_truth"]
            model = item["model"]

            print(f"\n--- Testing {lang} ({file_path.name}) ---")
            if not file_path.exists():
                print(f"ERROR: Audio file {file_path} not found!")
                continue

            with open(file_path, "rb") as f:
                audio_bytes = f.read()

            print(f"Audio size: {len(audio_bytes):,} bytes | Model: {model}")
            t0 = time.time()
            try:
                files = {"file": (file_path.name, audio_bytes, "audio/mpeg")}
                data = {"model": model}

                resp = client.post(ASR_ENDPOINT, headers=headers, files=files, data=data)
                latency = time.time() - t0

                if resp.status_code == 200:
                    res = resp.json()
                    transcribed = res.get("text", "").strip()
                    duration = res.get("duration", 0)
                    print(f"Status: OK ({latency:.2f}s, Audio Duration: {duration}s)")
                    print(f"  [Ground Truth] : {gt}")
                    print(f"  [Transcribed ] : {transcribed}")

                    results.append({
                        "language": lang,
                        "file": file_path.name,
                        "ground_truth": gt,
                        "transcribed": transcribed,
                        "duration": duration,
                        "latency": latency,
                        "status": "PASS",
                    })
                else:
                    print(f"Error {resp.status_code}: {resp.text}")
                    results.append({
                        "language": lang,
                        "file": file_path.name,
                        "ground_truth": gt,
                        "transcribed": f"ERROR {resp.status_code}: {resp.text}",
                        "status": "FAIL",
                    })
            except Exception as ex:
                print(f"Exception during request: {ex}")
                results.append({
                    "language": lang,
                    "file": file_path.name,
                    "ground_truth": gt,
                    "transcribed": f"EXCEPTION: {ex}",
                    "status": "ERROR",
                })

    print("\n" + "=" * 80)
    print("FINAL SUMMARY COMPARISON")
    print("=" * 80)
    for r in results:
        print(f"\nLanguage : {r['language']}")
        print(f"Original : {r['ground_truth']}")
        print(f"Output   : {r['transcribed']}")
        if "duration" in r:
            print(f"Duration : {r['duration']}s | Latency: {r['latency']:.2f}s")
        print("-" * 50)

if __name__ == "__main__":
    main()
