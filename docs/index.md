# N-ATLaS Toolkit & Production Developer Documentation

Welcome to the official developer documentation for **N-ATLaS (NCAIR1/N-ATLaS)**, Nigeria's sovereign multilingual Large Language Model and Speech AI ecosystem.

!!! note "Sovereign Attribution"
    **N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.**

---

## What is N-ATLaS?

N-ATLaS is a sovereign AI suite engineered specifically for Nigerian linguistic structures, cultural idioms, accents, and tonal nuances.

```text
                               +-------------------------------------+
                               |          N-ATLaS Ecosystem          |
                               +-------------------------------------+
                                                  |
                     +----------------------------+----------------------------+
                     |                                                         |
         +-----------------------+                                 +-----------------------+
         |     Sovereign LLM     |                                 |     Sovereign ASR     |
         |    NCAIR1/N-ATLaS     |                                 |  Whisper Small (244M) |
         +-----------------------+                                 +-----------------------+
                     |                                                         |
       +-------------+-------------+                             +-------------+-------------+
       |             |             |                             |             |             |
   Chat (SSE)    Translation   Africanize                     Yoruba-ASR   Hausa-ASR     Igbo-ASR
   Completions    (/translate)  (/africanize)                 (627+ hrs)   (120+ hrs)   (120+ hrs)
```

---

## Key Highlights

1. **Dual SDK Support**: First-class, fully typed [`python-sdk`](sdk/python.md) and [`js-sdk`](sdk/javascript.md) (Universal TS/JS for Node, Next.js, and Browsers).
2. **Sovereign Speech-to-Text (ASR)**:
    - **Yoruba**: `NCAIR1/Yoruba-ASR` (trained on 627+ hours)
    - **Hausa**: `NCAIR1/Hausa-ASR` (trained on 120+ hours)
    - **Igbo**: `NCAIR1/Igbo-ASR` (trained on 120+ hours)
    - **Nigerian English**: `NCAIR1/NigerianAccentedEnglish` (trained on 120+ hours)
3. **Deepgram-Style Real-Time Live Streaming**: Low-latency WebSocket streaming for real-time voice agents.
4. **Cultural Domain APIs**: Direct Nigerian translation (`/v1/translate`) and cultural tone adapter (`/v1/africanize`).
5. **Flexible Deployment**:
    - **Live Modal Cloud**: Zero-server setup with scale-to-zero economics.
    - **Self-Hosted Docker**: 1-command Docker Compose gateway with NVIDIA vLLM or CPU fallback.

---

## Quick Navigation

- [**Installation & Quickstart**](getting-started/install.md): Get up and running in under 2 minutes.
- [**Model Catalog**](getting-started/models.md): Understand the models, datasets, and architecture.
- [**Python SDK Guide**](sdk/python.md): Synchronous, Asynchronous, and Streaming client.
- [**JavaScript / TypeScript SDK**](sdk/javascript.md): Universal client with SSE and WebSocket ASR.
- [**Real-Time Streaming ASR**](asr/streaming.md): Deepgram protocol WebSocket audio streaming.
- [**Docker & Self-Hosting**](deployment/docker.md): On-premises private deployment.
- [**API Reference**](api/endpoints.md): Complete REST endpoint documentation.
- [**Èdè Yorùbá (Bilingual Docs)**](yo/index.md): Ka àwọn ìwé ìtọ́ni ní èdè Yorùbá.
