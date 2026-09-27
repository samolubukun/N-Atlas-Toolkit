# Docker GPU & CPU Deployment

Run the entire N-ATLaS ecosystem (LLM + Sovereign ASR) on your private internal servers or local developer workstations.

---

## Unified Reverse-Proxy Gateway

In both GPU and CPU profiles, an Nginx reverse-proxy on port `8000` unifies both engines under a single host:

* `POST http://localhost:8000/v1/chat/completions` $\rightarrow$ LLM
* `POST http://localhost:8000/v1/audio/transcriptions` $\rightarrow$ Sovereign ASR
* `WSS ws://localhost:8000/v1/audio/transcriptions/streaming` $\rightarrow$ Real-Time ASR
* `GET http://localhost:8000/docs` $\rightarrow$ LLM Swagger UI
* `GET http://localhost:8000/docs/asr` $\rightarrow$ ASR Swagger UI

---

## Option 1: Dedicated GPU Server (vLLM High-Throughput)

For NVIDIA GPU servers (requires NVIDIA Container Toolkit):

```bash
# Ensure HF_TOKEN and NATLAS_API_KEY are configured in .env
docker compose up -d --build
```

---

## Option 2: Local Developer CPU / Apple Silicon (Metal)

For MacBooks or laptops without an NVIDIA GPU:

```bash
docker compose -f docker-compose.local.yml up -d --build
```
