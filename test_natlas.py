"""Live smoke tests for the N-ATLaS engine."""

import json
import os
import sys
import time

import httpx
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

load_dotenv()

API_URL = os.environ.get("NATLAS_BASE_URL") or os.environ.get(
    "NATLAS_API_URL",
    "https://samuelolubukun--natlas-engine-natlasapi-serve.modal.run",
)
API_URL = API_URL.rstrip("/")
if API_URL.endswith("/v1"):
    API_URL = API_URL[:-3]
API_KEY = os.environ.get("NATLAS_API_KEY", "").strip()
if not API_KEY:
    raise RuntimeError("Set NATLAS_API_KEY before running the live smoke test.")

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

transport = httpx.HTTPTransport(retries=5)
client = httpx.Client(transport=transport, follow_redirects=True, timeout=90.0)


def api_url(path: str) -> str:
    return f"{API_URL}/{path.lstrip('/')}"


def request_with_retry(method: str, url: str, **kwargs) -> httpx.Response:
    for attempt in range(4):
        try:
            return client.request(method, url, **kwargs)
        except (httpx.ConnectError, httpx.NetworkError) as err:
            if attempt == 3:
                raise
            time.sleep(1.0 * (attempt + 1))
    return client.request(method, url, **kwargs)


def test_health() -> bool:
    print("\n[1/6] Testing Health Endpoint (/healthz)...")
    try:
        response = request_with_retry("GET", api_url("/healthz"), timeout=30.0)
        response.raise_for_status()
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.json()}")
        return True
    except Exception as error:
        print(f"  [ERROR]: {error}")
        return False


def test_models() -> bool:
    print("\n[2/6] Testing Models Discovery (/v1/models)...")
    try:
        response = request_with_retry("GET", api_url("/v1/models"), headers=HEADERS, timeout=30.0)
        response.raise_for_status()
        print(f"  Status: {response.status_code}")
        print(f"  Models: {json.dumps(response.json(), indent=2)}")
        return True
    except Exception as error:
        print(f"  [ERROR]: {error}")
        return False


def test_chat_multilingual() -> bool:
    print("\n[3/6] Testing OpenAI-Compatible Chat Completion (/v1/chat/completions)...")
    test_queries = (
        ("Hausa", "Sannu! Menene amfanin fasahar zamani wajen bunkasa ilimi a Najeriya?"),
        ("Yoruba", "Bawo ni! Ki ni pataki imo-ero ayelujara si idagbasoke eto-eko?"),
        ("Igbo", "Kedu otu teknụzụ nwere ike isi nyere ụmụ akwụkwọ aka ịmụta ihe ọhụrụ?"),
        ("Pidgin", "How far! Wetin be the best way make person start tech journey for Nigeria?"),
    )
    all_passed = True
    for language, prompt in test_queries:
        print(f"\n  -> Sending [{language}] prompt: '{prompt}'")
        payload = {
            "model": "NCAIR1/N-ATLaS",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 150,
        }
        started = time.perf_counter()
        try:
            response = request_with_retry(
                "POST",
                api_url("/v1/chat/completions"),
                json=payload,
                headers=HEADERS,
                timeout=120.0,
            )
            response.raise_for_status()
            data = response.json()
            reply = data["choices"][0]["message"]["content"]
            tokens = data.get("usage", {}).get("total_tokens", "N/A")
            elapsed = time.perf_counter() - started
            print(f"  [PASS] [{language} Response in {elapsed:.2f}s | {tokens} tokens]:")
            print(f"     {reply[:250]}...\n")
        except Exception as error:
            all_passed = False
            print(f"  [ERROR]: {error}")
    return all_passed


def test_streaming() -> bool:
    print("\n[4/6] Testing SSE Streaming (/v1/chat/completions with stream=True)...")
    payload = {
        "model": "NCAIR1/N-ATLaS",
        "messages": [
            {
                "role": "user",
                "content": "Explain in one sentence why multilingual AI matters for African culture.",
            }
        ],
        "temperature": 0.5,
        "max_tokens": 100,
        "stream": True,
    }
    try:
        with client.stream(
            "POST",
            api_url("/v1/chat/completions"),
            json=payload,
            headers=HEADERS,
            timeout=60.0,
        ) as response:
            response.raise_for_status()
            content_type = response.headers.get("content-type", "").lower()
            if "text/event-stream" not in content_type:
                raise RuntimeError(f"Expected SSE response, received {content_type!r}")
            print(f"  Status: {response.status_code}")
            print("  Stream Tokens: ", end="", flush=True)
            done = False
            finish_seen = False
            for line in response.iter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    done = True
                    break
                if not data:
                    continue
                chunk = json.loads(data)
                if "error" in chunk:
                    raise RuntimeError(f"Stream error: {chunk['error']}")
                choice = chunk["choices"][0]
                if choice.get("finish_reason") is not None:
                    finish_seen = True
                print(choice.get("delta", {}).get("content", ""), end="", flush=True)
            if not finish_seen:
                raise RuntimeError("Stream ended without a finish_reason event")
            if not done:
                raise RuntimeError("Stream ended without [DONE]")
            print("\n  [PASS] Stream Completed Successfully!")
            return True
    except Exception as error:
        print(f"  [ERROR]: {error}")
        return False


    payload = {
        "text": "Artificial intelligence will empower young Africans to build solutions for their communities.",
        "target_lang": "Yoruba",
        "tone": "formal",
    }
    try:
        response = request_with_retry(
            "POST",
            json=payload,
            headers=HEADERS,
            timeout=60.0,
        )
        response.raise_for_status()
        result = response.json()
        print(f"  Original:    {result['source_text']}")
        print(f"  Target:      {result['target_lang']}")
        return True
    except Exception as error:
        print(f"  [ERROR]: {error}")
        return False


    payload = {
        "content": "Welcome to our meeting today. Let us make sure we achieve great success and prosper together.",
        "culture_context": "Lagos-Urban",
        "formality": "natural",
    }
    try:
        response = request_with_retry(
            "POST",
            json=payload,
            headers=HEADERS,
            timeout=60.0,
        )
        response.raise_for_status()
        result = response.json()
        print(f"  Context: {result['context']}")
        print(f"  Adapted: {result['adapted_text']}")
        print("  [PASS] Cultural Adapter Successful!")
        return True
    except Exception as error:
        print(f"  [ERROR]: {error}")
        return False


def test_audio_transcription() -> bool:
    print("\n[7/7] Testing Sovereign ASR Transcription (/v1/audio/transcriptions)...")
    # Generate a quick 1-second silence/beep 16kHz WAV in-memory to test the pipeline
    import io
    import wave
    import struct
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        # 0.5s of audio (8000 samples of quiet sine tone)
        import math
        samples = [int(1000 * math.sin(2 * math.pi * 440 * i / 16000)) for i in range(8000)]
        wf.writeframes(struct.pack(f"<{len(samples)}h", *samples))
    buf.seek(0)
    audio_bytes = buf.read()

    files = {"file": ("test.wav", audio_bytes, "audio/wav")}
    data = {"language": "yo"}
    auth_headers = {"Authorization": f"Bearer {API_KEY}"}

    try:
        response = request_with_retry(
            "POST",
            api_url("/v1/audio/transcriptions"),
            headers=auth_headers,
            data=data,
            files=files,
            timeout=120.0,
        )
        response.raise_for_status()
        result = response.json()
        print(f"  Status: {response.status_code}")
        print(f"  Language: {result.get('language')}")
        print(f"  Model: {result.get('model')}")
        print(f"  Transcription Text: '{result.get('text', '')}'")
        print("  [PASS] Audio Transcription Endpoint Succeeded!")
        return True
    except Exception as error:
        print(f"  [ERROR]: {error}")
        return False


def main() -> int:
    print("=" * 60)
    print("  N-ATLaS LLM & ASR ENGINE TEST SUITE")
    print(f"  Endpoint: {API_URL}")
    print("=" * 60)
    checks = (
        test_health,
        test_models,
        test_chat_multilingual,
        test_streaming,
        test_audio_transcription,
    )
    failures = [check.__name__ for check in checks if not check()]
    if failures:
        print(f"\n[FAILED] {len(failures)} check(s) failed: {', '.join(failures)}")
        return 1
    print("\n[COMPLETE] All endpoint tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

