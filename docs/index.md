# N-ATLaS Toolkit & Production Developer Documentation

Welcome to the developer documentation for **N-ATLaS (NCAIR1/N-ATLaS)**, Nigeria's sovereign multilingual Large Language Model and Speech AI ecosystem.

!!! note "Sovereign Attribution"
    **N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.**

---

### 🎥 Watch N-ATLaS in Action
<p align="center">
  <video src="https://xxr2q8wqbj.ufs.sh/f/5VP3IsRxk7FSWcGgYDXLgTfpX463sKnubzmVaRQy0O9ACqc2" controls="controls" muted="muted" style="max-height:480px; width:100%; border-radius: 8px; margin-bottom: 20px;"></video>
  <video src="https://xxr2q8wqbj.ufs.sh/f/5VP3IsRxk7FSmJ0N0a9iRwu6TNxcIC0QZ4pdBMaKerfk5zHj" controls="controls" muted="muted" style="max-height:480px; width:100%; border-radius: 8px;"></video>
</p>

<p align="center">
  <a href="https://xxr2q8wqbj.ufs.sh/f/5VP3IsRxk7FSWcGgYDXLgTfpX463sKnubzmVaRQy0O9ACqc2" target="_blank">🎬 Watch LLM Streaming Demo (Direct Link)</a> &nbsp;·&nbsp;
  <a href="https://xxr2q8wqbj.ufs.sh/f/5VP3IsRxk7FSmJ0N0a9iRwu6TNxcIC0QZ4pdBMaKerfk5zHj" target="_blank">🎙️ Watch Sovereign ASR Demo (Direct Link)</a>
</p>

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
```

---

## Key Highlights

1. **Dual SDK Support**: First-class, fully typed [`python-sdk`](sdk/python.md) and [`js-sdk`](sdk/javascript.md) (Universal TS/JS for Node, Next.js, and Browsers).
2. **Sovereign Speech-to-Text (ASR)**:
    - **Yoruba**: `NCAIR1/Yoruba-ASR` (trained on 120+ hours)
    - **Hausa**: `NCAIR1/Hausa-ASR` (trained on 120+ hours)
    - **Igbo**: `NCAIR1/Igbo-ASR` (trained on 120+ hours)
    - **Nigerian English**: `NCAIR1/NigerianAccentedEnglish` (trained on 120+ hours)
3. **High-Accuracy Audio Transcription**: Millisecond word-level timestamps and multi-format audio support (WAV, MP3, WebM, FLAC).
5. **Flexible Deployment**:
    - **Live Modal Cloud**: Zero-server setup with scale-to-zero economics.
    - **Self-Hosted Docker**: 1-command Docker Compose gateway with NVIDIA vLLM or CPU fallback.

---

## Quick Navigation

- [**Installation & Quickstart**](getting-started/install.md): Get up and running in under 2 minutes.
- [**Model Catalog**](getting-started/models.md): Understand the models, datasets, and architecture.
- [**Python SDK Guide**](sdk/python.md): Synchronous, Asynchronous, and Streaming client.
- [**JavaScript / TypeScript SDK**](sdk/javascript.md): Universal client with SSE.
- [**Audio Transcriptions (ASR)**](asr/transcriptions.md): Batch and voice note speech-to-text with word alignment.
- [**Docker & Self-Hosting**](deployment/docker.md): On-premises private deployment.
- [**API Reference**](api/endpoints.md): Complete REST endpoint documentation.
- [**Èdè Yorùbá (Bilingual Docs)**](yo/index.md): Ka àwọn ìwé ìtọ́ni ní èdè Yorùbá.
