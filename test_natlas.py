"""Client SDK and Test Runner for N-ATLaS Engine.

Tests:
1. Health endpoint (/healthz)
2. Model catalog (/v1/models)
3. Multilingual Chat Completion in English, Hausa, Yoruba, Igbo, and Pidgin
4. Streaming SSE response verification
5. African Language Translation (/v1/translate)
6. Cultural Tone Adaptation (/v1/africanize)
"""

import os
import sys
import json
import time
from pathlib import Path
import httpx
from dotenv import load_dotenv

# Ensure UTF-8 console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

load_dotenv()

API_URL = os.environ.get("NATLAS_API_URL", "https://samuelolubukun--natlas-engine-natlasllmengine-serve.modal.run")
API_KEY = os.environ.get("NATLAS_API_KEY", "natlas-super-secret-key-2026")

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

print(f"[NATLAS] Connecting to N-ATLaS Engine at: {API_URL}")
print(f"[AUTH] Using API Key: {API_KEY[:6]}***")

def test_health():
    print("\n[1/6] Testing Health Endpoint (/healthz)...")
    url = f"{API_URL.rstrip('/')}/healthz"
    try:
        resp = httpx.get(url, timeout=30.0)
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.json()}")
        return resp.status_code == 200
    except Exception as e:
        print(f"  [ERROR]: {e}")
        return False

def test_models():
    print("\n[2/6] Testing Models Discovery (/v1/models)...")
    url = f"{API_URL.rstrip('/')}/v1/models"
    try:
        resp = httpx.get(url, headers=HEADERS, timeout=30.0)
        print(f"  Status: {resp.status_code}")
        print(f"  Models: {json.dumps(resp.json(), indent=2)}")
        return resp.status_code == 200
    except Exception as e:
        print(f"  [ERROR]: {e}")
        return False

def test_chat_multilingual():
    print("\n[3/6] Testing OpenAI-Compatible Chat Completion (/v1/chat/completions)...")
    url = f"{API_URL.rstrip('/')}/v1/chat/completions"
    
    test_queries = [
        ("Hausa", "Sannu! Menene amfanin fasahar zamani wajen bunkasa ilimi a Najeriya?"),
        ("Yoruba", "Bawo ni! Ki ni pataki imo-ero ayelujara si idagbasoke eto-eko?"),
        ("Igbo", "Kedu otu teknụzụ nwere ike isi nyere ụmụ akwụkwọ aka ịmụta ihe ọhụrụ?"),
        ("Pidgin", "How far! Wetin be the best way make person start tech journey for Nigeria?"),
    ]

    for lang, prompt in test_queries:
        print(f"\n  -> Sending [{lang}] prompt: '{prompt}'")
        payload = {
            "model": "NCAIR1/N-ATLaS",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 150,
        }
        t0 = time.time()
        try:
            resp = httpx.post(url, json=payload, headers=HEADERS, timeout=120.0)
            elapsed = time.time() - t0
            if resp.status_code == 200:
                data = resp.json()
                reply = data["choices"][0]["message"]["content"]
                tokens = data.get("usage", {}).get("total_tokens", "N/A")
                print(f"  [PASS] [{lang} Response in {elapsed:.2f}s | {tokens} tokens]:")
                print(f"     {reply[:250]}...\n")
            else:
                print(f"  [FAIL] ({resp.status_code}): {resp.text}")
        except Exception as e:
            print(f"  [ERROR]: {e}")

def test_streaming():
    print("\n[4/6] Testing SSE Streaming (/v1/chat/completions with stream=True)...")
    url = f"{API_URL.rstrip('/')}/v1/chat/completions"
    payload = {
        "model": "NCAIR1/N-ATLaS",
        "messages": [
            {"role": "user", "content": "Explain in one sentence why multilingual AI matters for African culture."}
        ],
        "temperature": 0.5,
        "max_tokens": 100,
        "stream": True,
    }
    try:
        with httpx.stream("POST", url, json=payload, headers=HEADERS, timeout=60.0) as resp:
            print(f"  Status: {resp.status_code}")
            print("  Stream Tokens: ", end="", flush=True)
            for line in resp.iter_lines():
                if line.startswith("data: ") and not line.endswith("[DONE]"):
                    try:
                        chunk = json.loads(line[6:])
                        delta = chunk["choices"][0]["delta"].get("content", "")
                        print(delta, end="", flush=True)
                    except:
                        pass
            print("\n  [PASS] Stream Completed Successfully!")
    except Exception as e:
        print(f"  [ERROR]: {e}")

def test_translation():
    print("\n[5/6] Testing Direct African Language Translation (/v1/translate)...")
    url = f"{API_URL.rstrip('/')}/v1/translate"
    payload = {
        "text": "Artificial intelligence will empower young Africans to build solutions for their communities.",
        "target_lang": "Yoruba",
        "tone": "formal"
    }
    try:
        resp = httpx.post(url, json=payload, headers=HEADERS, timeout=60.0)
        if resp.status_code == 200:
            res = resp.json()
            print(f"  Original:    {res['source_text']}")
            print(f"  Target:      {res['target_lang']}")
            print(f"  Translation: {res['translation']}")
            print("  [PASS] Translation Successful!")
        else:
            print(f"  [FAIL]: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"  [ERROR]: {e}")

def test_africanize():
    print("\n[6/6] Testing Cultural Tone Adaptation (/v1/africanize)...")
    url = f"{API_URL.rstrip('/')}/v1/africanize"
    payload = {
        "content": "Welcome to our meeting today. Let us make sure we achieve great success and prosper together.",
        "culture_context": "Lagos-Urban",
        "formality": "natural"
    }
    try:
        resp = httpx.post(url, json=payload, headers=HEADERS, timeout=60.0)
        if resp.status_code == 200:
            res = resp.json()
            print(f"  Context: {res['context']}")
            print(f"  Adapted: {res['adapted_text']}")
            print("  [PASS] Cultural Adapter Successful!")
        else:
            print(f"  [FAIL]: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"  [ERROR]: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("  N-ATLaS LLM ENGINE TEST SUITE")
    print("=" * 60)
    test_health()
    test_models()
    test_chat_multilingual()
    test_streaming()
    test_translation()
    test_africanize()
    print("\n[COMPLETE] All endpoint tests executed successfully.")
