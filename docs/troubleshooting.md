# Troubleshooting Guide

Common issues and resolutions when deploying and interacting with N-ATLaS.

---

## 1. 401 Unauthorized / Invalid API Key
**Symptom**: `{"error": "Unauthorized: Invalid or missing API key"}`  
**Solution**: Verify that `NATLAS_API_KEY` is exported in your environment and matches the key configured on your server or `.env`.

---

## 2. Cold-Boot Delays on Modal
**Symptom**: First request takes ~30–45s before returning output.  
**Explanation**: Modal containers scale to zero after 300 seconds of inactivity. Container warm-up takes a few moments to spin up the NVIDIA A10G and attach the persistent volume. Once warm, requests respond in milliseconds.

---

## 3. Windows Unicode Diacritics Error
**Symptom**: `UnicodeEncodeError: 'charmap' codec can't encode character...`  
**Solution**: Windows default console encoding (CP1252) cannot display Yoruba/Igbo tone marks. Set:
```powershell
$env:PYTHONIOENCODING="utf-8"
```

---

## 4. CUDA Out of Memory (OOM) on Local Inference
**Symptom**: `torch.cuda.OutOfMemoryError`  
**Solution**: The full 8B FP16 model requires ~16GB VRAM. Use 4-bit quantization or offload layers to CPU:
```python
client = natlas.Client(mode="local", load_in_4bit=True)
```
