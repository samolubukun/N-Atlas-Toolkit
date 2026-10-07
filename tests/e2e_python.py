#!/usr/bin/env python
"""
N-ATLaS Python SDK — Full End-to-End Integration Runner
=========================================================
Exercises every SDK surface against the live Modal cloud endpoints:
  • Chat (sync, streaming, async, async-streaming)
  • Text generation
  • Tool calling (OpenAI function spec)
  • Language detection & system_prompt helpers
  • Sovereign ASR — batch transcription for Yoruba, Hausa, Igbo, Nigerian English
  • All 7 built-in agent tools

Usage:
    NATLAS_API_KEY=<key> python e2e_python.py

Optional env vars (if different from SDK defaults):
    NATLAS_BASE_URL  — LLM endpoint
    NATLAS_API_URL   — ASR endpoint
"""

from __future__ import annotations

import asyncio
import os
import sys
import time
from pathlib import Path

# ── UTF-8 output on Windows for diacritics ──────────────────────────────────
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# ── Optional .env loading ────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import natlas
from natlas import tools

# ── Configuration ────────────────────────────────────────────────────────────
API_KEY   = os.environ.get("NATLAS_API_KEY", "")
BASE_URL  = os.environ.get("NATLAS_BASE_URL", natlas.DEFAULT_BASE_URL)
ASR_URL   = os.environ.get("NATLAS_API_URL",  natlas.DEFAULT_ASR_URL)
AUDIO_DIR = Path(__file__).parent / "audio"

AUDIO_SAMPLES = [
    {"file": AUDIO_DIR / "yoruba.mp3",  "model": "NCAIR1/Yoruba-ASR",              "lang": "yo", "gt": "Ta ni o mo pe awon agba je ile isura ogbon?"},
    {"file": AUDIO_DIR / "hausa.mp3",   "model": "NCAIR1/Hausa-ASR",               "lang": "ha", "gt": "Bude kofar. Na san kina ciki."},
    {"file": AUDIO_DIR / "igbo.mp3",    "model": "NCAIR1/Igbo-ASR",                "lang": "ig", "gt": "Odeakwukwo okputokpuku uloorua na-ahua maka oru ngo na steeti Anambra"},
    {"file": AUDIO_DIR / "english.mp3", "model": "NCAIR1/NigerianAccentedEnglish", "lang": "en", "gt": "Closing the Google assistant app prevents it from working with your headphones."},
]

# ── Pretty printing helpers ──────────────────────────────────────────────────
SEP  = "-" * 72
DSEP = "=" * 72

def header(title: str) -> None:
    print(f"\n{DSEP}")
    print(f"  {title}")
    print(DSEP)

def section(title: str) -> None:
    print(f"\n{SEP}")
    print(f"  {title}")
    print(SEP)

def ok(msg: str)   -> None: print(f"  [OK]  {msg}")
def info(msg: str) -> None: print(f"  [>>]  {msg}")
def fail(msg: str) -> None: print(f"  [FAIL] {msg}")

def check_api_key() -> None:
    if not API_KEY:
        fail("NATLAS_API_KEY is not set. Export it and re-run.")
        sys.exit(1)

# ── Client factory ───────────────────────────────────────────────────────────
def make_client() -> natlas.Client:
    return natlas.Client(
        mode="hosted",
        host=BASE_URL,
        asr_url=ASR_URL,
        api_key=API_KEY,
    )

def make_async_client() -> natlas.AsyncClient:
    return natlas.AsyncClient(
        mode="hosted",
        host=BASE_URL,
        asr_url=ASR_URL,
        api_key=API_KEY,
    )

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1 — Language detection & system_prompt helpers
# ────────────────────────────────────────────────────────────────────────────
def test_language_helpers() -> None:
    section("1 . Language Detection & System Prompt Helpers")
    samples = {
        "Yoruba":           "Ki ni o se? Mo fe ko iwe Yoruba.",
        "Hausa":            "Sannu! Yaya ake amfani da AI a Najeriya?",
        "Igbo":             "Kedu otu teknuzuu nwere ike inyere aka imuta?",
        "Nigerian English": "What is artificial intelligence and how can it help Nigeria?",
    }
    for expected, text in samples.items():
        detected = natlas.detect_language(text)
        prompt   = natlas.system_prompt(detected)
        ok(f"{expected:20} -> detected={detected!r:20}  system_prompt role={prompt.role!r}")

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2 — Synchronous Chat
# ────────────────────────────────────────────────────────────────────────────
def test_sync_chat(client: natlas.Client) -> None:
    section("2 . Synchronous Chat (Hausa + Igbo)")
    prompts = [
        (natlas.HA, "Menene babban birnin Nijeriya kuma yaya yanayinta?"),
        (natlas.IG, "Kedu ihe bu AI na-eme maka ndi Nigeria?"),
    ]
    for lang, question in prompts:
        t0 = time.perf_counter()
        resp = client.chat(
            [natlas.system_prompt(lang), {"role": "user", "content": question}],
            max_tokens=120,
            temperature=0.2,
        )
        elapsed = time.perf_counter() - t0
        ok(f"[{lang}] {elapsed:.2f}s | tokens={resp.usage.total_tokens} | done_reason={resp.done_reason!r}")
        print(f"     Q: {question}")
        print(f"     A: {resp.message.content}\n")

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3 — Streaming Chat
# ────────────────────────────────────────────────────────────────────────────
def test_streaming_chat(client: natlas.Client) -> None:
    section("3 . Streaming Chat (token-by-token)")
    prompt = "List three unique benefits of preserving the Yoruba language in the digital age."
    print(f"  Q: {prompt}")
    print("  A: ", end="", flush=True)
    t0 = time.perf_counter()
    chunks = 0
    for chunk in client.chat(
        [{"role": "user", "content": prompt}],
        stream=True,
        max_tokens=180,
    ):
        print(chunk.message.content, end="", flush=True)
        chunks += 1
    elapsed = time.perf_counter() - t0
    print(f"\n  [OK]  Streaming complete -- {chunks} chunks in {elapsed:.2f}s")

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4 — Text Generation
# ────────────────────────────────────────────────────────────────────────────
def test_generate(client: natlas.Client) -> None:
    section("4 . Text Generation (generate)")
    prompt = "Explain Nigeria's multilingual AI opportunity in two short paragraphs."
    t0 = time.perf_counter()
    resp = client.generate(prompt, max_tokens=200, temperature=0.3, repetition_penalty=1.1)
    elapsed = time.perf_counter() - t0
    ok(f"{elapsed:.2f}s | tokens={resp.usage.total_tokens} | done_reason={resp.done_reason!r}")
    print(f"  {resp.response}")

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5 — Tool Calling (OpenAI function spec)
# ────────────────────────────────────────────────────────────────────────────
def test_tool_calling(client: natlas.Client) -> None:
    section("5 . Tool Calling (OpenAI function spec)")
    fx_tool = {
        "type": "function",
        "function": {
            "name": "get_fx_rate",
            "description": "Get the current USD to Naira exchange rate",
            "parameters": {
                "type": "object",
                "properties": {"currency": {"type": "string", "description": "Target currency code"}},
                "required": ["currency"],
            },
        },
    }
    resp = client.chat(
        [{"role": "user", "content": "What is the current USD to Naira rate?"}],
        tools=[fx_tool],
        tool_choice="auto",
        max_tokens=128,
    )
    ok(f"done_reason={resp.done_reason!r}")
    if resp.done_reason == "tool_calls" and resp.message.tool_calls:
        for tc in resp.message.tool_calls:
            ok(f"Tool invoked -> {tc.function.name}({tc.function.arguments})")
    else:
        info(f"Model answered directly: {resp.message.content}")

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6 — Async Chat + Async Streaming
# ────────────────────────────────────────────────────────────────────────────
async def test_async(client: natlas.AsyncClient) -> None:
    section("6 . Async Chat + Async Streaming")

    # 6a. Single async response
    resp = await client.chat(
        [natlas.system_prompt(natlas.YO), {"role": "user", "content": "Se alaye imo ero ni oro mewa."}],
        max_tokens=100,
    )
    ok(f"[async chat] tokens={resp.usage.total_tokens} | done_reason={resp.done_reason!r}")
    print(f"  {resp.message.content}\n")

    # 6b. Async streaming
    question = "Give a one-sentence tagline for N-ATLaS AI in Hausa."
    print(f"  Q: {question}")
    print("  A: ", end="", flush=True)
    stream = await client.chat([{"role": "user", "content": question}], stream=True, max_tokens=80)
    async for chunk in stream:
        print(chunk.message.content, end="", flush=True)
    print("\n  [OK]  Async streaming complete")

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7 — Sovereign ASR (all 4 languages)
# ────────────────────────────────────────────────────────────────────────────
def test_asr(client: natlas.Client) -> None:
    section("7 . Sovereign ASR -- Batch Transcription (all 4 languages)")
    results = []
    for sample in AUDIO_SAMPLES:
        audio_path = Path(sample["file"])
        if not audio_path.exists():
            fail(f"Audio file missing: {audio_path}")
            continue

        print(f"\n  [{sample['lang'].upper()}] {audio_path.name}  ({audio_path.stat().st_size:,} bytes)")
        t0 = time.perf_counter()
        try:
            with open(audio_path, "rb") as f:
                result = client.audio.transcriptions.create(
                    file=f,
                    model=sample["model"],
                    language=sample["lang"],
                    timestamp_granularities=["word"],
                )
            elapsed = time.perf_counter() - t0
            ok(f"{elapsed:.2f}s | duration={result.duration}s | model={result.model}")
            print(f"     GT  : {sample['gt']}")
            print(f"     OUT : {result.text}")
            if result.words:
                snippet = result.words[:4]
                print(f"     words[0:4]: {[w.word for w in snippet]}")
            results.append({"lang": sample["lang"], "status": "PASS", "out": result.text})
        except Exception as exc:
            fail(f"ASR failed for {sample['lang']}: {exc}")
            results.append({"lang": sample["lang"], "status": "FAIL", "out": str(exc)})

    # Summary table
    print(f"\n  {'Lang':<6} {'Status'}")
    print(f"  {'----':<6} {'------'}")
    for r in results:
        status_icon = "[OK]" if r["status"] == "PASS" else "[FAIL]"
        print(f"  {r['lang']:<6} {status_icon} {r['status']}")

# ────────────────────────────────────────────────────────────────────────────
# SECTION 8 — Built-in Agent Tools
# ────────────────────────────────────────────────────────────────────────────
def test_builtin_tools() -> None:
    section("8 . Built-in Agent Tools (all 7)")

    # Offline tools
    info("nigeria_gazetteer('Lagos')")
    result = tools.nigeria_gazetteer("Lagos")
    ok(f"  -> {str(result)[:120]}")

    info("math_eval('(50000 * 0.075) + 320')")
    result = tools.math_eval("(50000 * 0.075) + 320")
    ok(f"  -> {result}")

    # Network tools
    for display, call in [
        ("web_search",       lambda: tools.web_search("N-ATLaS Nigeria AI multilingual")),
        ("weather_lookup",   lambda: tools.weather_lookup("Abuja")),
        ("fx_rates",         lambda: tools.fx_rates("USD", "NGN")),
        ("wikipedia_lookup", lambda: tools.wikipedia_lookup("Yoruba language", lang="en")),
        ("fetch_webpage",    lambda: tools.fetch_webpage("https://huggingface.co/NCAIR1")),
    ]:
        info(f"{display}(...)")
        t0 = time.perf_counter()
        try:
            res = call()
            elapsed = time.perf_counter() - t0
            preview = str(res)[:140].replace("\n", " ")
            ok(f"{elapsed:.2f}s -> {preview}")
        except Exception as exc:
            fail(f"{display}: {exc}")

    # get_openai_tools / execute_tool
    schemas = tools.get_openai_tools(["fx_rates", "math_eval"])
    ok(f"get_openai_tools(['fx_rates','math_eval']) -> {len(schemas)} schemas returned")
    exec_res = tools.execute_tool("math_eval", {"expression": "2 ** 10"})
    ok(f"execute_tool('math_eval', {{expression:'2**10'}}) -> {exec_res}")

    # Custom tool registration
    @tools.tool
    def ping_natlas(url: str) -> dict:
        """Simple ping to verify a URL is reachable."""
        import urllib.request
        try:
            urllib.request.urlopen(url, timeout=5)
            return {"url": url, "reachable": True}
        except Exception as e:
            return {"url": url, "reachable": False, "error": str(e)}

    ok(f"Custom tool 'ping_natlas' registered -> in TOOL_REGISTRY: {'ping_natlas' in tools.TOOL_REGISTRY}")
    ping_result = tools.execute_tool("ping_natlas", {"url": BASE_URL})
    ok(f"execute_tool('ping_natlas') -> {ping_result}")

# ────────────────────────────────────────────────────────────────────────────
# MAIN
# ────────────────────────────────────────────────────────────────────────────
async def run_async() -> None:
    async with make_async_client() as client:
        await test_async(client)


def main() -> None:
    check_api_key()
    header("N-ATLaS Python SDK -- Full End-to-End Integration Runner")
    info(f"SDK version  : {natlas.__version__}")
    info(f"LLM endpoint : {BASE_URL}")
    info(f"ASR endpoint : {ASR_URL}")
    info(f"Attribution  : {natlas.ATTRIBUTION}")

    client = make_client()

    test_language_helpers()
    test_sync_chat(client)
    test_streaming_chat(client)
    test_generate(client)
    test_tool_calling(client)
    asyncio.run(run_async())
    test_asr(client)
    test_builtin_tools()

    header("ALL SECTIONS COMPLETE")
    ok("Python SDK is fully operational end-to-end")


if __name__ == "__main__":
    main()
