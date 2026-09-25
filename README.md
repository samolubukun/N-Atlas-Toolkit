# N-ATLaS Toolkit & Production Serverless Deployment Suite

High-performance, enterprise-grade serverless hosting of **N-ATLaS (NCAIR1/N-ATLaS)** on Modal, engineered after the architectural patterns of Cadence.

---

## 🚀 Live Production Deployment

The engine is deployed, live, and fully operational on Modal:

- **App Status**: `deployed` (Live on Modal)
- **Base URL**: `https://samuelolubukun--natlas-engine-natlasllmengine-serve.modal.run`
- **Realtime WebSocket**: `wss://samuelolubukun--natlas-engine-natlasllmengine-serve.modal.run/ws/realtime`
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
| `WSS` | `/ws/realtime` | Bidirectional real-time conversational token streaming | WebSocket |

---

## 💻 Quickstart: Drop-In OpenAI SDK Usage

The deployed endpoint is a drop-in replacement for OpenAI:

```python
import os
from openai import OpenAI

# Initialize client pointing to your live Modal endpoint
client = OpenAI(
    base_url="https://samuelolubukun--natlas-engine-natlasllmengine-serve.modal.run/v1",
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
curl -X POST https://samuelolubukun--natlas-engine-natlasllmengine-serve.modal.run/v1/translate \
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
curl -X POST https://samuelolubukun--natlas-engine-natlasllmengine-serve.modal.run/v1/africanize \
  -H "Authorization: Bearer $NATLAS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "We must work hard and remain resilient in order to achieve our dreams.",
    "culture_context": "Lagos-Urban",
    "formality": "natural"
  }'
```

---

## 🛠️ Repository File Structure

- **[`natlas_engine.py`](file:///c:/Users/USER/Downloads/natlas-toolkit/natlas_engine.py)**: The complete Modal serverless engine definition with container build, volume mounting, authentication, FastAPI ASGI application, and WebSocket server.
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
