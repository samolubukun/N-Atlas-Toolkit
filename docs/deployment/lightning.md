# Lightning AI Serverless Deployment

Deploy N-ATLaS on Lightning AI using free-tier serverless GPUs (NVIDIA T4) with scale-to-zero economics.

---

## Architecture Overview

The Lightning AI deployment ([`natlas_engine_lightning.py`](https://github.com/samolubukun/N-Atlas-Toolkit/blob/main/natlas_engine_lightning.py)) serves both the **N-ATLaS 8.03B Multilingual LLM** and all four **Sovereign Whisper ASR models** (Yoruba, Hausa, Igbo, Nigerian Accented English) from a single unified serverless endpoint:

- **Hardware**: NVIDIA T4 GPU (`lit-t4-1`)
- **Scale-to-Zero**: Automatically downscales to `0` replicas after 10 minutes of inactivity ($0/hour when idle).
- **Fast Process Teardown**: Built-in OS signal handlers (`SIGTERM`/`SIGINT`) for instant clean machine spin-down.
- **OpenAI & Whisper Compatible**: Native `/v1/chat/completions`, `/v1/completions`, `/v1/models`, and `/v1/audio/transcriptions`.

---

## Prerequisites

1. Create a free account at [lightning.ai](https://lightning.ai/).
2. Verify your account to claim promotional free compute credits (no credit card required).
3. Ensure you have accepted gated model access for [`NCAIR1/N-ATLaS`](https://huggingface.co/NCAIR1/N-ATLaS) on Hugging Face.

---

## Step-by-Step Deployment Guide

### 1. Install Lightning CLI & Authenticate

```bash
pip install lightning-sdk
lightning login
```

### 2. Launch Serverless Deployment

From your repository root, run:

```bash
lightning deployment create \
  --name natlas-engine \
  --studio scratch-studio-devbox \
  --command "uvicorn natlas_engine_lightning:app --host 0.0.0.0 --port 8000" \
  --machine lit-t4-1 \
  --min-replicas 0 \
  --max-replicas 1 \
  --ports 8000
```

### 3. Configured Secrets

Ensure your environment variables are configured in your deployment settings or studio:
- `HF_TOKEN`: Your Hugging Face user access token (Read access).
- `NATLAS_API_KEY`: Secret Bearer token for client authentication (e.g. `natlas-super-secret-key-2026`).

---

## Using the Deployed Endpoint

Once created, you receive a production URL:
```text
https://8000-dep-<deployment-id>.cloudspaces.litng.ai
```

### Python OpenAI SDK Example

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://8000-dep-<deployment-id>.cloudspaces.litng.ai/v1",
    api_key="natlas-super-secret-key-2026",
)

# 1. Chat Completion
response = client.chat.completions.create(
    model="NCAIR1/N-ATLaS",
    messages=[{"role": "user", "content": "Báwo ni? Ṣàlàyé nípa AI ní ṣókí."}],
)
print(response.choices[0].message.content)

# 2. Audio Transcription
with open("tests/audio/yoruba.mp3", "rb") as f:
    transcript = client.audio.transcriptions.create(
        model="NCAIR1/Yoruba-ASR",
        file=f,
    )
print(transcript.text)
```
