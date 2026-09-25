"""Local N-ATLaS Inference & Interactive Verification Script.

Tests local GPU/CPU hardware capabilities, checks for HF_TOKEN,
and starts an interactive terminal conversation with N-ATLaS.
"""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

# Ensure terminal handles UTF-8 for Nigerian language diacritics
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

load_dotenv()


def check_environment() -> bool:
    print("=" * 60)
    print("  N-ATLaS LOCAL RUNNER & HARDWARE VERIFICATION")
    print("=" * 60)

    # 1. Hugging Face Access Token Check
    token = os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN")
    if not token:
        print("\n❌ [ERROR] Missing Hugging Face token.")
        print("   NCAIR1/N-ATLaS is a gated model.")
        print("   1. Accept access conditions at: https://huggingface.co/NCAIR1/N-ATLaS")
        print("   2. Set HF_TOKEN in your environment or .env file.")
        return False
    print("✓ Hugging Face Token detected.")

    # 2. Check PyTorch & Hardware Acceleration
    try:
        import torch

        print(f"✓ PyTorch version: {torch.__version__}")
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            total_vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            print(f"✓ CUDA GPU detected: {gpu_name} ({total_vram_gb:.1f} GB VRAM)")
            if total_vram_gb < 14:
                print(
                    "⚠️  [WARNING] N-ATLaS 8B (FP16) requires ~16GB VRAM. "
                    "Inference might offload layers to CPU or require 8-bit/4-bit quantization."
                )
        else:
            print("⚠️  [NOTICE] No CUDA GPU detected. Model will run on CPU (slower).")
    except ImportError:
        print("\n❌ [ERROR] PyTorch is not installed.")
        print("   Install local dependencies with: pip install \"./python-sdk[local]\"")
        return False

    return True


def run_interactive():
    import natlas

    print(f"\n{natlas.ATTRIBUTION}")
    print("Loading N-ATLaS locally (lazy-loaded on first turn)...")

    client = natlas.Client(mode="local")

    history = [
        {
            "role": "system",
            "content": (
                "You are AwaGPT, a helpful assistant with deep fluency in English, "
                "Hausa, Yoruba, Igbo, and Nigerian Pidgin."
            ),
        }
    ]

    print("\n✓ Engine ready. Type your prompt below (or 'exit' to quit):")
    print("-" * 60)

    while True:
        try:
            prompt = input("\nYou: ").strip()
            if not prompt:
                continue
            if prompt.lower() in {"exit", "quit", "q"}:
                print("Exiting local runner. Goodbye!")
                break

            history.append({"role": "user", "content": prompt})
            print("\nN-ATLaS: ", end="", flush=True)

            # Stream response in real time
            stream = client.chat(history, stream=True, max_tokens=300)
            full_reply = ""
            for chunk in stream:
                delta = chunk.message.content
                print(delta, end="", flush=True)
                full_reply += delta
            print("\n")

            history.append({"role": "assistant", "content": full_reply})
        except KeyboardInterrupt:
            print("\nOperation cancelled by user.")
            break
        except Exception as e:
            print(f"\n❌ Error during generation: {e}")


def main():
    if check_environment():
        run_interactive()


if __name__ == "__main__":
    main()
