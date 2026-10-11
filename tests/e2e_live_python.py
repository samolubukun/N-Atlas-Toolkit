#!/usr/bin/env python3
"""Comprehensive End-to-End Test Suite for Python natlas SDK.

Tests every SDK capability against the live N-ATLaS Hugging Face Sovereign Engine:
1. Client initialization (hosted mode)
2. Models listing & connection check
3. Chat completions (non-streaming)
4. Chat completions (streaming SSE)
5. Zero-dependency Agent Tools execution (local Nigerian tools)
6. Sovereign Whisper ASR transcription (audio file upload)
7. Structured JSON Extraction (Pydantic schema + coercion + retry engine)
8. Semantic Helpers (translate, summarize, classify, classify_scam, voice_chat)
"""

import os
import sys
from pathlib import Path
from pydantic import BaseModel, Field

# Ensure we import local python-sdk src directly
SDK_PATH = Path(__file__).resolve().parent.parent / "python-sdk"
sys.path.insert(0, str(SDK_PATH))

from src import Client, tools
from src._types import ChatResponse


class MarketPurchase(BaseModel):
    customer: str
    item: str
    price_naira: float
    is_paid: bool = Field(default=True)


for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def log_test(name: str):
    print(f"\n[TEST] ---> {name} ...", flush=True)


def pass_test(msg: str = "PASS"):
    print(f"       [OK] {msg}", flush=True)


def main():
    print("=" * 60)
    print("N-ATLaS Python SDK Live End-to-End Test Suite")
    print("=" * 60)

    base_url = os.environ.get("NATLAS_BASE_URL", "https://samuelolubukun-natlas-sovereign-engine.hf.space")
    api_key = os.environ.get("NATLAS_API_KEY", "natlas-super-secret-key-2026")

    print(f"Target Gateway: {base_url}")
    print(f"API Key:        {api_key[:10]}...")

    client = Client(mode="hosted", base_url=base_url, api_key=api_key)

    # 1. Models endpoint
    log_test("1. Checking Gateway Connection & Models List")
    models = client.get("models")
    assert "data" in models, f"Unexpected models response: {models}"
    model_ids = [m["id"] for m in models["data"]]
    pass_test(f"Connected successfully! Available models: {model_ids}")

    # 2. Basic Chat completion
    log_test("2. Non-Streaming Chat Completion (Wazobia check)")
    chat_resp = client.chat(
        messages=[
            {"role": "system", "content": "You are N-ATLaS. Greet the user in Yoruba."},
            {"role": "user", "content": "Hello!"},
        ],
        temperature=0.1,
        max_tokens=50,
    )
    assert isinstance(chat_resp, ChatResponse)
    content = chat_resp.message.content or ""
    assert len(content.strip()) > 0, "Empty chat response!"
    pass_test(f"Model replied: '{content.strip()}'")

    # 3. Streaming Chat completion
    log_test("3. Streaming Chat Completion (SSE)")
    stream_chunks = []
    for chunk in client.chat(
        messages=[{"role": "user", "content": "Count from 1 to 3 in Hausa."}],
        stream=True,
        temperature=0.1,
        max_tokens=40,
    ):
        text = chunk.message.content or ""
        stream_chunks.append(text)
    full_streamed = "".join(stream_chunks).strip()
    assert len(full_streamed) > 0, "No chunks streamed!"
    pass_test(f"Streamed response: '{full_streamed}'")

    # 4. Agent Tools test
    log_test("4. Built-in Nigerian Agent Tools Execution")
    gaz = tools.nigeria_gazetteer("Lagos")
    assert "state" in gaz or "status" in gaz or "capital" in gaz or "name" in gaz, f"Unexpected gazetteer result: {gaz}"
    fx = tools.fx_rates("USD", "NGN")
    assert fx is not None, "Failed to retrieve FX rates"
    pass_test(f"Gazetteer verified for Lagos: {gaz.get('capital', 'Ikeja')}. FX verified: {fx.get('rate', fx)}")

    # 5. Audio Whisper ASR Transcription
    log_test("5. Sovereign Whisper ASR Transcription")
    audio_path = Path(__file__).resolve().parent / "audio" / "yoruba.mp3"
    assert audio_path.exists(), f"Audio sample not found at {audio_path}"
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()
    trans_res = client.transcribe(audio=audio_bytes, language="yoruba")
    assert len(trans_res.text.strip()) > 0, "ASR returned empty transcription"
    pass_test(f"Transcribed Yoruba audio: '{trans_res.text.strip()}'")

    # 6. Structured JSON Extraction
    log_test("6. Resilient Structured JSON Extraction (Pydantic schema)")
    extracted = client.extract(
        response_model=MarketPurchase,
        prompt="Ibrahim bought 5 bags of cement for 45,000 naira and paid cash.",
        temperature=0.0,
    )
    assert isinstance(extracted, MarketPurchase)
    assert "ibrahim" in extracted.customer.lower()
    assert extracted.price_naira > 1000
    pass_test(f"Extracted Pydantic object: {extracted.model_dump()}")

    # 7. Semantic Helpers: Translate
    log_test("7. Semantic Helper: translate()")
    trans = client.translate("Good morning, how are you?", target_language="yoruba")
    assert len(trans) > 0
    pass_test(f"Translated to Yoruba: '{trans}'")

    # 8. Semantic Helpers: Summarize
    log_test("8. Semantic Helper: summarize()")
    summary = client.summarize(
        "The Federal Ministry of Communications, Innovation and Digital Economy launched the N-ATLaS "
        "multilingual artificial intelligence project to empower Nigerian languages and drive digital inclusion across Africa.",
        max_words=15,
    )
    assert len(summary) > 0
    pass_test(f"Summarized: '{summary}'")

    # 9. Semantic Helpers: Classify
    log_test("9. Semantic Helper: classify()")
    category = client.classify(
        text="I transferred 10,000 naira but the merchant has not credited my account.",
        labels=["transaction_dispute", "account_opening", "general_inquiry"],
    )
    assert category in ["transaction_dispute", "account_opening", "general_inquiry"]
    pass_test(f"Classified category: '{category}'")

    # 10. Semantic Helpers: Classify Scam
    log_test("10. Semantic Helper: classify_scam()")
    scam_res = client.classify_scam(
        "URGENT: Your bank account will be blocked today unless you call 08012345678 with your BVN immediately."
    )
    assert isinstance(scam_res, dict)
    pass_test(f"Scam detection report: {scam_res}")

    # 11. Semantic Helpers: Voice Chat
    log_test("11. Semantic Helper: voice_chat() (ASR + Chat Pipeline)")
    voice_res = client.voice_chat(
        audio=audio_bytes,
        language="yoruba",
        system_prompt="Answer briefly in English to acknowledge the audio.",
    )
    assert "transcription" in voice_res and "response" in voice_res
    pass_test(f"Voice chat succeeded! Transcribed: '{voice_res['transcription'][:40]}...', Reply: '{voice_res['response'][:40]}...'")

    print("\n" + "=" * 60)
    print("🎉 ALL 11 PYTHON SDK END-TO-END CAPABILITIES PASSED PERFECTLY!")
    print("=" * 60)


if __name__ == "__main__":
    main()
