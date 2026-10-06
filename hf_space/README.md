---
title: N ATLaS Sovereign AI Replica
emoji: 🌍
colorFrom: green
colorTo: green
sdk: gradio
sdk_version: 5.20.0
app_file: app.py
pinned: false
license: apache-2.0
short_description: Multilingual N-ATLaS LLM & Nigerian ASR Replica
---

# 🇳🇬 N-ATLaS Engine Replica: Gradio Web UI & OpenAI-Compatible API

This Space replicates the full **N-ATLaS Engine** developed under the Nigerian Languages AI Initiative / Federal Ministry of Communications, Innovation and Digital Economy, powered by Awarri Technologies.

### 🌟 Key Features:
1. **Multilingual Sovereign LLM (`NCAIR1/N-ATLaS`)**:
   - Native support for **Hausa**, **Yoruba**, **Igbo**, and **English**.
   - Streaming responses & real-time chat interface.
2. **Sovereign Whisper ASR**:
   - `NCAIR1/Yoruba-ASR`
   - `NCAIR1/Hausa-ASR`
   - `NCAIR1/Igbo-ASR`
   - `NCAIR1/NigerianAccentedEnglish`
3. **OpenAI-Compatible API Endpoints**:
   - `GET /healthz`
   - `GET /v1/models`
   - `POST /v1/chat/completions` (OpenAI format + SSE streaming)
   - `POST /v1/completions`
   - `POST /v1/audio/transcriptions` (OpenAI Whisper multipart format)

---

### 🚀 Deploying to Hugging Face Spaces

1. Create a new Space on [Hugging Face](https://huggingface.co/new-space).
2. Set SDK to **Gradio**.
3. Select hardware: **ZeroGPU** (the app is built for it; models load at startup and run on the GPU only during requests).
4. Clone your Space repo and push these files (`app.py`, `requirements.txt`, `README.md`).
5. Set Space Secrets (in Space Settings > Variables and secrets):
   - `HF_TOKEN`: Your Hugging Face read access token (**Required**; `NCAIR1/N-ATLaS` is a gated repository).
   - `NATLAS_API_KEY`: Custom API key to protect your `/v1/*` endpoints. (Required for API access; requests must pass `Authorization: Bearer <NATLAS_API_KEY>`).

> **Note:** Models are downloaded at startup into the ZeroGPU environment. ZeroGPU shares a free GPU quota, so heavy API usage may be rate-limited by Hugging Face.

---

### 💻 Using with N-ATLaS SDKs

Both the Python and JavaScript SDKs work out of the box with this Space:

#### Python SDK (`natlas`)
```python
from natlas import Client

client = Client(
    base_url="https://<YOUR-USERNAME>-<YOUR-SPACE-NAME>.hf.space/v1",
    api_key="your-natlas-api-key",
)

# Multilingual Chat
response = client.chat(
    messages=[{"role": "user", "content": "Bawo ni se n lo? Se daadaa ni?"}]
)
print(response.message.content)

# Sovereign Speech-to-Text
transcription = client.audio.transcribe(
    file="sample_yoruba.wav",
    language="yo"
)
print(transcription.text)
```

#### TypeScript / JavaScript SDK (`natlas`)
```typescript
import { NatlasClient } from "natlas";

const client = new NatlasClient({
  baseURL: "https://<YOUR-USERNAME>-<YOUR-SPACE-NAME>.hf.space/v1",
  apiKey: "your-natlas-api-key",
});

const response = await client.chat([
  { role: "user", content: "Sannu! Me zan iya taimaka muku da shi?" }
]);
console.log(response.message.content);
```

---

### 🔌 Using via Official OpenAI SDK

The API conforms to OpenAI's specification (`/v1/chat/completions` and `/v1/audio/transcriptions`):

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://<YOUR-USERNAME>-<YOUR-SPACE-NAME>.hf.space/v1",
    api_key="your-natlas-api-key",
)

completion = client.chat.completions.create(
    model="NCAIR1/N-ATLaS",
    messages=[{"role": "user", "content": "Bawo ni se n lo? Se daadaa ni?"}],
)
print(completion.choices[0].message.content)

# Audio Transcription
with open("sample_yoruba.wav", "rb") as audio:
    transcription = client.audio.transcriptions.create(
        model="NCAIR1/Yoruba-ASR",
        file=audio,
    )
print(transcription.text)
```
