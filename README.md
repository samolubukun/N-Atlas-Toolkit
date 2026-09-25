# N-ATLaS Toolkit & Production Serverless Deployment Suite

High-performance, enterprise-grade serverless hosting of **N-ATLaS (NCAIR1/N-ATLaS)** on Modal, engineered after the architectural patterns of Cadence.

---

## 🚀 Live Production Deployment

The engine is deployed, live, and fully operational on Modal:

- **App Status**: `deployed` (Live on Modal)
- **Base API URL**: `https://samuelolubukun--natlas-engine-natlasapi-serve.modal.run`
- **Realtime LLM Voice WebSocket**: `wss://samuelolubukun--natlas-engine-natlasapi-serve.modal.run/ws/realtime`
- **Streaming ASR WebSocket**: `wss://samuelolubukun--natlas-engine-natlasasrengine-serve.modal.run/v1/audio/transcriptions/streaming`
- **Hardware Acceleration**: NVIDIA A10G (24GB VRAM)
- **Engine**: PyTorch / Transformers bfloat16 + SDPA with native vLLM Continuous Batching support
- **Scale-to-Zero Economics**: 300-second idle keep-warm lifecycle
- **Volume Caching**: `natlas-weights-cache` (Persistent cache preserving ~16GB weights across container lifecycles)

---

## ⚡ Live API Endpoints

All endpoints support standard CORS and can be used in web apps, mobile apps, or backend microservices:

| Method | Endpoint | Description | Auth Header |
| :--- | :--- | :--- | :--- |
| `GET` | `/healthz` | Container health, active GPU, and engine state | *None (Public)* |
| `GET` | `/v1/models` | OpenAI-compatible model catalog discovery | `Bearer <API_KEY>` |
| `POST` | `/v1/chat/completions` | Standard OpenAI chat (supports SSE streaming with `stream=true`) | `Bearer <API_KEY>` |
| `POST` | `/v1/completions` | Raw prompt text completion | `Bearer <API_KEY>` |
| `POST` | `/v1/translate` | Direct African language translation (Hausa/Igbo/Yoruba/Pidgin/English) | `Bearer <API_KEY>` |
| `POST` | `/v1/africanize` | Cultural tone adapter for Nigerian cultural contexts | `Bearer <API_KEY>` |
| `POST` | `/v1/audio/transcriptions` | OpenAI-compliant Sovereign ASR batch speech-to-text | `Bearer <API_KEY>` |
| `WSS` | `/ws/realtime` | Bidirectional real-time conversational voice token streaming | WebSocket |
| `WSS` | `/v1/audio/transcriptions/streaming` | Real-time Deepgram-style streaming STT WebSocket | WebSocket |

---

## 💻 Quickstart: Drop-In OpenAI SDK Usage

The deployed endpoint is a drop-in replacement for OpenAI:

```python
import os
from openai import OpenAI

# Initialize client pointing to your live Modal endpoint
client = OpenAI(
    base_url="https://samuelolubukun--natlas-engine-natlasapi-serve.modal.run/v1",
    api_key=os.environ.get("NATLAS_API_KEY", "<YOUR_NATLAS_API_KEY>"),
)

# 1. Chat Completion (Multilingual)
response = client.chat.completions.create(
    model="NCAIR1/N-ATLaS",
    messages=[
        {"role": "user", "content": "Sannu! Ka rubuta gajeren jawabi game da fasaha a Najeriya."}
    ],
    temperature=0.7,
    max_tokens=200,
)
print(response.choices[0].message.content)

# 2. Server-Sent Events (SSE) Streaming
stream = client.chat.completions.create(
    model="NCAIR1/N-ATLaS",
    messages=[
        {"role": "user", "content": "Explain why indigenous African language AI is essential."}
    ],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

---

## 🌍 Native African Domain Endpoints

### 1. High-Accuracy Translation (`POST /v1/translate`)
```bash
curl -X POST https://samuelolubukun--natlas-engine-natlasapi-serve.modal.run/v1/translate \
  -H "Authorization: Bearer $NATLAS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Education is the most powerful tool which you can use to change the world.",
    "target_lang": "Yoruba",
    "tone": "formal"
  }'
```
**Output:**
```json
{
  "source_text": "Education is the most powerful tool which you can use to change the world.",
  "target_lang": "Yoruba",
  "translation": "Ẹ̀kọ́ jẹ́ irinṣẹ́ tó lágbára jù lọ tí o lè lo láti yí ayé padà.",
  "model": "NCAIR1/N-ATLaS"
}
```

### 2. Cultural Tone Adaptation (`POST /v1/africanize`)
```bash
curl -X POST https://samuelolubukun--natlas-engine-natlasapi-serve.modal.run/v1/africanize \
  -H "Authorization: Bearer $NATLAS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "We must work hard and remain resilient in order to achieve our dreams.",
    "culture_context": "Lagos-Urban",
    "formality": "natural"
  }'
```

---

## 🎙️ Sovereign Nigerian Speech Recognition (ASR) & STT

The toolkit natively incorporates the four official sovereign **Whisper Small (244M)** speech models trained across all 6 geopolitical zones of Nigeria:

- **Yoruba**: `NCAIR1/Yoruba-ASR` (627+ hours training data)
- **Hausa**: `NCAIR1/Hausa-ASR` (120+ hours training data)
- **Igbo**: `NCAIR1/Igbo-ASR` (120+ hours training data)
- **Nigerian Accented English**: `NCAIR1/NigerianAccentedEnglish` (120+ hours training data)

### 1. OpenAI-Compliant Batch Transcriptions (`POST /v1/audio/transcriptions`)
```python
import natlas

client = natlas.Client()

with open("speech_yoruba.wav", "rb") as audio:
    transcription = client.audio.transcriptions.create(
        file=audio,
        model="NCAIR1/Yoruba-ASR",
        timestamp_granularities=["word"],  # Millisecond word-level timestamps
    )

print(transcription.text)
```

### 2. Deepgram-Style Real-Time Streaming STT (`WSS /v1/audio/transcriptions/streaming`)
- Streams 16kHz audio frames over WebSocket with real-time interim results and `is_final` events.
- Zero-roundtrip direct coupling into `NATLaSAPI` for real-time voice agents.

---

## 🏢 Private On-Premise & Local Deployment Guide

For enterprise, banking, healthcare, or government environments requiring **100% on-premises data privacy**:

### Option 1: High-Throughput Private Server with Docker & vLLM (Recommended)
Self-host the entire N-ATLaS ecosystem (LLM + Sovereign ASR) on any internal GPU server using the included [`docker-compose.yml`](file:///c:/Users/USER/Downloads/natlas-toolkit/docker-compose.yml):

```bash
# Ensure HF_TOKEN and NATLAS_API_KEY are configured in your environment
docker compose up -d --build
```

**Single Unified Gateway on Port `8000`**:
- **Interactive Swagger Docs**: `http://localhost:8000/docs` (LLM & Chat) & `http://localhost:8000/docs/asr` (Sovereign ASR)
- **Chat & Completions**: `POST http://localhost:8000/v1/chat/completions`
- **Sovereign Speech-to-Text**: `POST http://localhost:8000/v1/audio/transcriptions`
- **Real-Time Streaming STT**: `WSS ws://localhost:8000/v1/audio/transcriptions/streaming`

Connect using the Python SDK with a single client:
```python
import natlas

client = natlas.Client(
    host="http://localhost:8000",
    api_key="natlas-super-secret-key-2026",
)

# 1. Chat Completion
response = client.chat([{"role": "user", "content": "Sannu!"}])
print(response.message.content)

# 2. Sovereign Audio Transcription
with open("speech_hausa.wav", "rb") as audio:
    result = client.audio.transcriptions.create(
        file=audio,
        model="NCAIR1/Hausa-ASR"
    )
print(result.text)
```

### Option 2: In-Process Local Python Execution (Zero-Server Prototyping)
Run inference directly inside your Python process on your local GPU/workstation:

```bash
# Install local dependencies
pip install "./python-sdk[local]"

# Run interactive local chat runner
python run_local.py
```

Or via code:
```python
import natlas

client = natlas.Client(mode="local")
response = client.chat([{"role": "user", "content": "Báwo ni!"}])
print(response.message.content)
```

---

## 🛠️ Repository File Structure

- **[`python-sdk/`](file:///c:/Users/USER/Downloads/natlas-toolkit/python-sdk)**: Production-grade typed Python SDK (`natlas`) supporting both direct hosted Modal vLLM inference and local GPU/CPU execution, complete with streaming, language presets, and test suites.
- **[`natlas_engine.py`](file:///c:/Users/USER/Downloads/natlas-toolkit/natlas_engine.py)**: The complete Modal serverless engine definition with container build, volume mounting, authentication, FastAPI ASGI application, and WebSocket server.
- **[`docker-compose.yml`](file:///c:/Users/USER/Downloads/natlas-toolkit/docker-compose.yml)**: Instant 1-command private on-premise container deployment with vLLM PagedAttention.
- **[`run_local.py`](file:///c:/Users/USER/Downloads/natlas-toolkit/run_local.py)**: Hardware diagnostics and interactive CLI chat runner for local in-process execution.
- **[`test_natlas.py`](file:///c:/Users/USER/Downloads/natlas-toolkit/test_natlas.py)**: Automated end-to-end test runner exercising all endpoints across Hausa, Yoruba, Igbo, and Pidgin.
- **[`openai_sdk_quickstart.py`](file:///c:/Users/USER/Downloads/natlas-toolkit/openai_sdk_quickstart.py)**: Minimal drop-in script for the OpenAI Python SDK.
- **[`.env.example`](file:///c:/Users/USER/Downloads/natlas-toolkit/.env.example)**: Environment variable template for API keys and deployment URLs.
- **[`.env`](file:///c:/Users/USER/Downloads/natlas-toolkit/.env)**: Local environment configuration with API keys and live endpoints.

---

## 🔄 Re-Deploying or Updating

To update code or rebuild container images on Modal:

```powershell
modal deploy natlas_engine.py
```

---

## 🏛️ License & Attribution

Model weights and license terms are governed by [Awarri Technologies and NCAIR/NITDA](https://huggingface.co/NCAIR1/N-ATLaS).  
Attribution: *"N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies."*
