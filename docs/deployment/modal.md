# Modal Cloud Serverless Deployment

How the N-ATLaS production architecture is deployed on Modal with automated scaling and GPU volume caching.

---

## Architecture Overview

The system runs on a high-throughput, unified engine on Modal:

* **Hardware**: NVIDIA A10G (24GB VRAM)
* **Volume**: `natlas-weights-cache` (persistent ~16GB weights)
* **LLM Engine**: PyTorch / Transformers bfloat16 + SDPA & native vLLM continuous batching
* **ASR Gateway**: Serves Yoruba, Hausa, Igbo, and Nigerian English Whisper models at `/v1/audio/transcriptions`
* **Idle Keep-Warm**: 300 seconds (scale-to-zero economics)

---

## Deploying Your Own Instance

With the Modal CLI installed and authenticated:

```bash
# Deploy to your Modal account using natlas_engine.py:
modal deploy natlas_engine.py
```

### Output Endpoints
```text
 Created App: natlas-engine
 Deployed web function: NATLaSAPI.serve -> https://<workspace>--natlas-engine-natlasapi-serve.modal.run
```

