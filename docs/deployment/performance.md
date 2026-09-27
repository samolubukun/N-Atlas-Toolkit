# Performance, Memory & Quantization

Guidelines for running N-ATLaS models on lower-memory and budget-conscious hardware.

---

## Memory Requirements by Quantization Level

| Model Configuration | Format | Min VRAM / RAM | Recommended Hardware |
| :--- | :--- | :--- | :--- |
| **8B FP16 (Full Precision)** | FP16 | ~16GB VRAM | NVIDIA A10G (24GB), RTX 3090/4090 |
| **8B BF16 (vLLM Serving)** | BF16 | ~16GB VRAM | NVIDIA A10G, A100 |
| **8B 8-bit Quantized** | INT8 | ~9GB VRAM | RTX 3080 (10GB/12GB), T4 (16GB) |
| **8B 4-bit (QLoRA / AWQ)** | INT4 | ~5.5GB VRAM | RTX 3060 (6GB/12GB), T4 |
| **GGUF (`q4_k_m`)** | GGUF | ~5GB RAM | Standard CPU Laptop / Apple M-series |
| **Whisper Small (ASR)** | FP16 | ~1.5GB VRAM | Any modern GPU or CPU |

---

## Exporting to GGUF for Local Laptop Inference

Using [`finetune-starter-kit/save_export.py`](file:///c:/Users/USER/Downloads/natlas-toolkit/finetune-starter-kit/save_export.py):

```bash
# Export adapter/model to 4-bit GGUF:
python save_export.py --checkpoint outputs/checkpoints/final_adapters
```

Run with `llama.cpp` or Ollama on your laptop CPU:
```bash
./main -m natlas-q4_k_m.gguf -p "Sannu! Menene AI?"
```
