"""
Command-line interface (CLI) for N-ATLaS Sovereign Multilingual AI.

Provides full terminal access to:
- Chat completions with live SSE streaming (`natlas chat`)
- Speech-to-text audio transcription (`natlas transcribe`)
- Real-time Deepgram-style live WebSocket ASR (`natlas stream-asr`)
- High-accuracy native African translation (`natlas translate`)
- Cultural tone adaptation (`natlas africanize`)
- Evaluation & benchmarking (`natlas eval`)
- Healthcheck & model discovery (`natlas health`, `natlas models`)

N-ATLaS is an initiative of the Federal Ministry of Communications,
Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
from pathlib import Path
from typing import List, Optional

# Ensure proper UTF-8 output on Windows console for diacritics
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Support running as a standalone script or installed package
try:
    from .client import AsyncClient, Client
    from .languages import EN_NG, HA, IG, YO, detect_language, system_prompt
except ImportError:
    # If run directly as python python-sdk/src/cli.py
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from src.client import AsyncClient, Client
    from src.languages import EN_NG, HA, IG, YO, detect_language, system_prompt

LANG_MAP = {
    "yo": YO,
    "yoruba": YO,
    "ha": HA,
    "hausa": HA,
    "ig": IG,
    "igbo": IG,
    "en": EN_NG,
    "en-ng": EN_NG,
    "english": EN_NG,
    "nigerian-english": EN_NG,
}


def cmd_chat(args: argparse.Namespace) -> int:
    """Run interactive or one-shot chat with SSE streaming."""
    client = Client(base_url=args.base_url, api_key=args.api_key)

    # Resolve target language
    lang = LANG_MAP.get(args.language.lower(), args.language) if args.language else None

    # One-shot prompt
    if args.prompt:
        messages = []
        if lang:
            messages.append(system_prompt(lang))
        messages.append({"role": "user", "content": args.prompt})

        if args.no_stream:
            resp = client.chat(messages, temperature=args.temperature, max_tokens=args.max_tokens)
            print(resp.message.content)
        else:
            stream = client.chat(messages, stream=True, temperature=args.temperature, max_tokens=args.max_tokens)
            for chunk in stream:
                print(chunk.message.content, end="", flush=True)
            print()
        return 0

    # Interactive REPL session
    print("=" * 65)
    print("N-ATLaS Interactive Multilingual Chat Console")
    print(f"Base URL: {client.base_url}")
    print(f"Language: {args.language or 'auto-detect'}")
    print("Type 'exit', 'quit', or Ctrl+C to stop.")
    print("=" * 65 + "\n")

    history = []
    if lang:
        history.append(system_prompt(lang))

    while True:
        try:
            user_input = input("You > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit", "q"):
                print("E se pupo / Nagode / Dalu / Goodbye!")
                break

            # Auto-detect language if not explicitly provided
            active_lang = lang or detect_language(user_input)
            prompt_history = history.copy()
            if not history and active_lang:
                prompt_history.append(system_prompt(active_lang))

            prompt_history.append({"role": "user", "content": user_input})

            print(f"N-ATLaS [{active_lang or 'general'}] > ", end="", flush=True)
            assistant_reply = []
            for chunk in client.chat(prompt_history, stream=True, temperature=args.temperature, max_tokens=args.max_tokens):
                content = chunk.message.content
                print(content, end="", flush=True)
                assistant_reply.append(content)
            print("\n")

            history.append({"role": "user", "content": user_input})
            history.append({"role": "assistant", "content": "".join(assistant_reply)})

        except KeyboardInterrupt:
            print("\nExiting session...")
            break
        except Exception as e:
            print(f"\n[Error]: {e}\n")

    return 0


def cmd_transcribe(args: argparse.Namespace) -> int:
    """Run batch speech-to-text on an audio file."""
    client = Client(asr_url=args.asr_url, api_key=args.api_key)
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"Error: Audio file not found at '{file_path}'", file=sys.stderr)
        return 1

    print(f"Transcribing '{file_path.name}' ({file_path.stat().st_size:,} bytes)...")
    t0 = time.time()
    with open(file_path, "rb") as f:
        granularities = ["word"] if args.timestamps else None
        res = client.audio.transcriptions.create(
            file=f,
            model=args.model,
            language=args.language,
            timestamp_granularities=granularities,
        )

    latency = time.time() - t0
    print("\n" + "=" * 60)
    print("TRANSCRIPTION RESULT")
    print("=" * 60)
    print(f"Text     : {res.text}")
    print(f"Language : {res.language or args.language or 'auto'}")
    print(f"Duration : {res.duration:.2f}s | Latency: {latency:.2f}s")
    if res.words:
        print("\nWord Timestamps:")
        for w in res.words[:15]:
            print(f"  {w.word:<15} [{w.start:5.2f}s -> {w.end:5.2f}s]")
        if len(res.words) > 15:
            print(f"  ... and {len(res.words) - 15} more words.")
    print("=" * 60)
    return 0


def cmd_stream_asr(args: argparse.Namespace) -> int:
    """Stream audio chunks over WebSocket using the Deepgram protocol."""
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"Error: Audio file not found at '{file_path}'", file=sys.stderr)
        return 1

    async def run_live():
        async with AsyncClient(asr_url=args.asr_url, api_key=args.api_key) as client:
            print(f"Connecting to live WebSocket ASR session for language: {args.language}...")
            session = await client.audio.transcriptions.connect_live(language=args.language)

            async def listen():
                async for event in session:
                    transcript = event.channel.alternatives[0].transcript
                    if transcript:
                        tag = "FINAL" if event.is_final else "INTERIM"
                        print(f"[{tag}] {transcript}")

            recv_task = asyncio.create_task(listen())

            print(f"Streaming {file_path.name} in chunk size {args.chunk_size} bytes...")
            with open(file_path, "rb") as f:
                while chunk := f.read(args.chunk_size):
                    await session.send_audio(chunk)
                    await asyncio.sleep(args.delay)

            await session.close()
            await recv_task

    asyncio.run(run_live())
    return 0


def cmd_translate(args: argparse.Namespace) -> int:
    """Translate text into an African language."""
    client = Client(base_url=args.base_url, api_key=args.api_key)
    res = client.post(
        "translate",
        body={"text": args.text, "target_lang": args.target, "tone": args.tone},
    )
    print(res.get("translation", res))
    return 0


def cmd_africanize(args: argparse.Namespace) -> int:
    """Adapt tone to Nigerian cultural context."""
    client = Client(base_url=args.base_url, api_key=args.api_key)
    res = client.post(
        "africanize",
        body={"content": args.text, "culture_context": args.context, "formality": args.formality},
    )
    print(res.get("adapted_text", res))
    return 0


def cmd_health(args: argparse.Namespace) -> int:
    """Inspect active health and GPU status."""
    client = Client(base_url=args.base_url, asr_url=args.asr_url, api_key=args.api_key)
    print("Checking LLM Engine Health...")
    try:
        llm_health = client.get("healthz")
        print(f"  LLM Health : {llm_health}")
    except Exception as e:
        print(f"  LLM Health Check Failed: {e}")

    print("\nChecking Sovereign ASR Engine Health...")
    try:
        import httpx
        asr_health_url = (client.asr_url or "https://<workspace>--natlas-engine-natlasasrengine-serve.modal.run").rstrip("/") + "/healthz"
        with httpx.Client(timeout=10.0) as http:
            r = http.get(asr_health_url)
            print(f"  ASR Health : {r.status_code} {r.json() if r.status_code == 200 else r.text}")
    except Exception as e:
        print(f"  ASR Health Check Failed: {e}")

    return 0


def cmd_models(args: argparse.Namespace) -> int:
    """Discover available models."""
    client = Client(base_url=args.base_url, api_key=args.api_key)
    models = client.get("models")
    print("\nAvailable LLM Models:")
    for m in models.get("data", []):
        print(f"  - {m.get('id')} (owned by {m.get('owned_by')})")

    print("\nAvailable Sovereign ASR Models:")
    print("  - NCAIR1/Yoruba-ASR (Yoruba)")
    print("  - NCAIR1/Hausa-ASR (Hausa)")
    print("  - NCAIR1/Igbo-ASR (Igbo)")
    print("  - NCAIR1/NigerianAccentedEnglish (Nigerian Accented English)")
    return 0


def cmd_eval(args: argparse.Namespace) -> int:
    """Run benchmark evaluation suite."""
    from finetune_starter_kit.eval.eval_asr import run_benchmark  # type: ignore
    run_benchmark(
        endpoint=args.endpoint or (client.asr_url or "https://<workspace>--natlas-engine-natlasasrengine-serve.modal.run/v1/audio/transcriptions"),
        api_key=args.api_key or os.environ.get("NATLAS_API_KEY"),
        languages=args.languages,
        samples_per_language=args.num_samples,
    )
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    """Main CLI entrypoint."""
    parser = argparse.ArgumentParser(
        prog="natlas",
        description="N-ATLaS CLI: Sovereign Nigerian Multilingual AI & Speech Recognition.",
    )
    parser.add_argument("--base-url", default=None, help="Target LLM API URL")
    parser.add_argument("--asr-url", default=None, help="Target ASR API URL")
    parser.add_argument("--api-key", default=None, help="N-ATLaS API Key")

    subparsers = parser.add_subparsers(dest="subcommand", help="Available subcommands")

    # 1. Chat
    chat_p = subparsers.add_parser("chat", help="Chat with N-ATLaS with real-time SSE streaming")
    chat_p.add_argument("prompt", nargs="?", default=None, help="Prompt text (omit for interactive session)")
    chat_p.add_argument("--language", "-l", default=None, help="Language code (yo, ha, ig, en)")
    chat_p.add_argument("--temperature", "-t", type=float, default=0.7, help="Sampling temperature")
    chat_p.add_argument("--max-tokens", "-m", type=int, default=512, help="Max generated tokens")
    chat_p.add_argument("--no-stream", action="store_true", help="Disable streaming output")

    # 2. Transcribe
    transcribe_p = subparsers.add_parser("transcribe", help="Batch audio file speech-to-text")
    transcribe_p.add_argument("file", help="Path to audio file (WAV, MP3, etc.)")
    transcribe_p.add_argument("--language", "-l", default=None, help="Language (yoruba, hausa, igbo, english)")
    transcribe_p.add_argument("--model", default=None, help="Model ID override")
    transcribe_p.add_argument("--timestamps", action="store_true", help="Include word-level timestamps")

    # 3. Stream ASR
    stream_p = subparsers.add_parser("stream-asr", help="Real-time WebSocket streaming speech-to-text")
    stream_p.add_argument("file", help="Path to audio file to stream")
    stream_p.add_argument("--language", "-l", default="hausa", help="Language (hausa, yoruba, igbo, english)")
    stream_p.add_argument("--chunk-size", type=int, default=4096, help="Chunk size in bytes")
    stream_p.add_argument("--delay", type=float, default=0.05, help="Simulated streaming delay between chunks (s)")

    # 4. Translate
    translate_p = subparsers.add_parser("translate", help="Translate into an African language")
    translate_p.add_argument("text", help="Source text to translate")
    translate_p.add_argument("--target", "-t", default="Yoruba", help="Target language (Yoruba, Hausa, Igbo, Pidgin)")
    translate_p.add_argument("--tone", default="formal", help="Translation register (formal, conversational)")

    # 5. Africanize
    africanize_p = subparsers.add_parser("africanize", help="Adapt tone to Nigerian cultural context")
    africanize_p.add_argument("text", help="Text to adapt")
    africanize_p.add_argument("--context", "-c", default="Lagos-Urban", help="Context preset (Lagos-Urban, Northern-Formal, etc.)")
    africanize_p.add_argument("--formality", default="natural", help="Formality level")

    # 6. Health & Models
    subparsers.add_parser("health", help="Check server health and active GPU")
    subparsers.add_parser("models", help="List available LLM and ASR models")

    # 7. Eval
    eval_p = subparsers.add_parser("eval", help="Run benchmark accuracy evaluation")
    eval_p.add_argument("--task", default="asr", choices=["asr", "llm"], help="Evaluation task")
    eval_p.add_argument("--languages", nargs="+", default=["hausa", "igbo", "yoruba", "english"], help="Languages to test")
    eval_p.add_argument("--num-samples", type=int, default=10, help="Samples per language")
    eval_p.add_argument("--endpoint", default=None, help="ASR endpoint override")

    args = parser.parse_args(argv)

    if not args.subcommand:
        parser.print_help()
        return 0

    dispatch = {
        "chat": cmd_chat,
        "transcribe": cmd_transcribe,
        "stream-asr": cmd_stream_asr,
        "translate": cmd_translate,
        "africanize": cmd_africanize,
        "health": cmd_health,
        "models": cmd_models,
        "eval": cmd_eval,
    }

    handler = dispatch.get(args.subcommand)
    if handler:
        return handler(args)
    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
