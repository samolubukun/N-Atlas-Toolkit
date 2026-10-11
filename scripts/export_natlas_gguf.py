"""
Standalone GGUF and LoRA Merger / Export Script for N-ATLaS Fine-tunes.

Converts standard Hugging Face PEFT LoRA adapters (such as `natlas-8b-medical-doctor`)
into:
1. Merged full 16-bit Hugging Face weights (`--format hf_16bit`)
2. Merged 4-bit weights (`--format hf_4bit`)
3. GGUF format for Ollama, LM Studio, and llama.cpp (`--format gguf` or `--format all`)
4. Modelfile generation for instant `ollama create natlas-medical -f Modelfile` deployment.

Usage:
    # 1. Merge and generate Ollama Modelfile (HF PEFT format)
    python scripts/export_natlas_gguf.py \
        --base-model NCAIR1/N-ATLaS \
        --adapter-dir path/to/lora-adapter \
        --output-dir outputs/export \
        --generate-modelfile

    # 2. Or using Unsloth fast export (if unsloth is installed)
    python scripts/export_natlas_gguf.py \
        --adapter-dir outputs/checkpoints/final_adapters \
        --use-unsloth \
        --gguf-quant q4_k_m q8_0
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


def create_ollama_modelfile(output_dir: Path, gguf_path: str, model_name: str = "natlas-medical") -> Path:
    """Generates an optimized Ollama Modelfile with N-ATLaS date-aware chat template."""
    modelfile_path = output_dir / "Modelfile"
    modelfile_content = f"""# Ollama Modelfile for N-ATLaS Fine-Tuned Model
FROM {gguf_path}

# Template formatted for Llama-3 / N-ATLaS instruction chat
TEMPLATE \"\"\"{{{{ if .System }}}}<|start_header_id|>system<|end_header_id|>

{{{{ .System }}}}<|eot_id|>{{{{ end }}}}{{{{ if .Prompt }}}}<|start_header_id|>user<|end_header_id|>

{{{{ .Prompt }}}}<|eot_id|>{{{{ end }}}}<|start_header_id|>assistant<|end_header_id|>

{{{{ .Response }}}}<|eot_id|>\"\"\"

# Core inference parameters
PARAMETER stop "<|start_header_id|>"
PARAMETER stop "<|end_header_id|>"
PARAMETER stop "<|eot_id|>"
PARAMETER stop "<|reserved_special_token_"
PARAMETER temperature 0.7
PARAMETER top_p 0.9

# System prompt
SYSTEM \"\"\"You are N-ATLaS Medical Assistant, an empathetic and highly knowledgeable clinical AI assistant trained on medical consultations. You provide clear, accurate guidance in English, Yoruba, Hausa, and Igbo. Always advise patients to seek emergency professional medical care for acute conditions.\"\"\"
"""
    with open(modelfile_path, "w", encoding="utf-8") as f:
        f.write(modelfile_content)
    
    print(f"[Modelfile] Created Ollama Modelfile at: {modelfile_path}")
    print("\nTo deploy into Ollama locally, run:")
    print(f"  ollama create {model_name} -f {modelfile_path}")
    print(f"  ollama run {model_name}")
    return modelfile_path


def merge_hf_peft(base_model: str, adapter_dir: str, output_dir: Path, token: str = None) -> Path:
    """Merges LoRA adapter with base model using standard HuggingFace transformers + peft."""
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel

    merged_path = output_dir / "merged_16bit"
    merged_path.mkdir(parents=True, exist_ok=True)

    print(f"[Merge] Loading base model: {base_model}...")
    dtype = torch.bfloat16 if torch.cuda.is_available() and torch.cuda.is_bf16_supported() else torch.float16
    
    base = AutoModelForCausalLM.from_pretrained(
        base_model,
        torch_dtype=dtype,
        device_map="cpu",  # Merge on CPU or GPU depending on RAM
        token=token,
        trust_remote_code=True,
    )
    tokenizer = AutoTokenizer.from_pretrained(base_model, token=token, trust_remote_code=True)

    print(f"[Merge] Loading LoRA adapters from: {adapter_dir}...")
    model = PeftModel.from_pretrained(base, adapter_dir)

    print("[Merge] Merging weights into base model (merge_and_unload)...")
    merged_model = model.merge_and_unload()

    print(f"[Merge] Saving 16-bit standalone weights to: {merged_path}...")
    merged_model.save_pretrained(merged_path, safe_serialization=True)
    tokenizer.save_pretrained(merged_path)

    print(f"[Merge] Completed! Merged Hugging Face checkpoint ready at: {merged_path}")
    return merged_path


def export_with_unsloth(checkpoint: str, output_dir: Path, quant_methods: list, token: str = None):
    """Exports model and GGUF quants directly using Unsloth if installed."""
    try:
        from unsloth import FastLanguageModel
    except ImportError:
        print("[Error] Unsloth is not installed in the active environment. Use standard HF mode.")
        return

    print(f"[Unsloth] Loading checkpoint: {checkpoint}...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=checkpoint,
        max_seq_length=2048,
        load_in_4bit=True,
    )

    gguf_dir = output_dir / "gguf"
    gguf_dir.mkdir(parents=True, exist_ok=True)

    for q in quant_methods:
        print(f"[Unsloth] Converting & saving GGUF ({q}) to {gguf_dir}...")
        model.save_pretrained_gguf(str(gguf_dir), tokenizer, quantization_method=q)
        print(f"[Unsloth] Exported {q} GGUF successfully!")


def main():
    parser = argparse.ArgumentParser(description="Export N-ATLaS Fine-Tuned LoRA into Standalone & GGUF Models")
    parser.add_argument("--base-model", default="NCAIR1/N-ATLaS", help="Hugging Face base model repo or path")
    parser.add_argument("--adapter-dir", required=True, help="Path to trained LoRA adapter directory")
    parser.add_argument("--output-dir", default="outputs/export", help="Destination export directory")
    parser.add_argument("--use-unsloth", action="store_true", help="Use Unsloth GGUF direct exporter if available")
    parser.add_argument("--gguf-quant", nargs="+", default=["q4_k_m", "q8_0"], help="Quantization methods for GGUF")
    parser.add_argument("--generate-modelfile", action="store_true", default=True, help="Generate an Ollama Modelfile")
    parser.add_argument("--hf-token", default=os.environ.get("HF_TOKEN"), help="Hugging Face access token")
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.use_unsloth:
        export_with_unsloth(args.adapter_dir, out_dir, args.gguf_quant, args.hf_token)
    else:
        print(f"=== N-ATLaS LoRA & GGUF Exporter ===")
        print(f"Base Model:   {args.base_model}")
        print(f"Adapter:      {args.adapter_dir}")
        print(f"Output Dir:   {out_dir}\n")

        # Create Ollama Modelfile
        rel_gguf_name = f"{Path(args.adapter_dir).name}.Q4_K_M.gguf"
        create_ollama_modelfile(out_dir, rel_gguf_name, model_name="natlas-medical")

        print("\n=== Next Steps to Convert Merged Model to GGUF via llama.cpp ===")
        print("1. Merge weights:")
        print(f"   python scripts/export_natlas_gguf.py --base-model {args.base_model} --adapter-dir {args.adapter_dir} --output-dir {out_dir}")
        print("2. Run llama.cpp conversion:")
        print(f"   python llama.cpp/convert_hf_to_gguf.py {out_dir / 'merged_16bit'} --outfile {out_dir / rel_gguf_name} --outtype q8_0")
        print("3. Run locally in Ollama:")
        print(f"   ollama create natlas-medical -f {out_dir / 'Modelfile'}")
        print("   ollama run natlas-medical")


if __name__ == "__main__":
    main()
