# Modal Cloud Serverless Deployment

How the N-ATLaS production architecture is deployed on Modal with automated scaling and GPU volume caching.

---

## Architecture Overview

The system uses two dedicated microservices on Modal:

1. **`NATLaSAPI` (LLM Microservice)**:
   - Hardware: NVIDIA A10G (24GB VRAM)
   - Volume: `natlas-weights-cache` (persistent ~16GB weights)
   - Engine: PyTorch / Transformers bfloat16 + SDPA & native vLLM
   - Idle Keep-Warm: 300 seconds (scale-to-zero economics)
2. **`NATLaSASREngine` (Sovereign ASR Microservice)**:
   - Hardware: NVIDIA T4 / A10G
   - Serves Yoruba, Hausa, Igbo, and Nigerian English Whisper Small models.
   - Provides batch REST and WebSocket streaming.

---

## Deploying Your Own Instance

With the Modal CLI installed and authenticated:

```bash
# Deploy both microservices to your Modal account using [`natlas_engine.py`](https://github.com/samolubukun/N-Atlas-Toolkit/blob/main/natlas_engine.py):
modal deploy natlas_engine.py
```

### Output Endpoints
```text
 Created App: natlas-engine
 Deployed web function: NATLaSAPI.serve -> https://<workspace>--natlas-engine-natlasapi-serve.modal.run
 Deployed web function: NATLaSASREngine.serve -> https://<workspace>--natlas-engine-natlasasrengine-serve.modal.run
```
