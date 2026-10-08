# Docker GPU & CPU Deployment

Run the entire sovereign N-ATLaS ecosystem (LLM + Sovereign ASR) on your private internal servers or local developer workstations with 100% data privacy.

---

## Unified Reverse-Proxy Gateway

In both GPU and CPU deployment profiles, an integrated Nginx reverse-proxy on port `8000` unifies both microservices under a single endpoint:

* `POST http://localhost:8000/v1/chat/completions` → N-ATLaS 8B LLM (supports SSE streaming & function calling)
* `POST http://localhost:8000/v1/audio/transcriptions` → Sovereign ASR (Hausa, Yoruba, Igbo, Nigerian English)
* `WSS  ws://localhost:8000/v1/audio/transcriptions/streaming` → Real-Time WebSockets ASR
* `GET  http://localhost:8000/healthz` → Unified Gateway & Container Healthcheck
* `GET  http://localhost:8000/docs` → LLM Interactive OpenAPI / Swagger UI
* `GET  http://localhost:8000/docs/asr` → ASR Interactive OpenAPI / Swagger UI

---

## Option 1: Dedicated GPU Server (vLLM High-Throughput)

For NVIDIA GPU servers running Linux with the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) installed:

```bash
# 1. Configure environment variables in .env:
cp .env.example .env

# 2. Build and launch the container cluster:
docker compose up -d --build
```

### Architecture:
* **LLM Engine**: `vLLM` container with PagedAttention and continuous batching serving `NCAIR1/N-ATLaS` on port `8001`.
* **ASR Engine**: PyTorch Faster-Whisper container serving all 4 sovereign Whisper models on port `8002`.
* **Gateway**: Nginx reverse-proxy on port `8000`.

---

## Option 2: Local Developer CPU & Apple Silicon (Metal)

For MacBooks (M1/M2/M3/M4) or laptops without dedicated NVIDIA hardware:

```bash
# Runs with zero NVIDIA requirements:
docker compose -f docker-compose.local.yml up -d --build
```

---

## Connecting via SDKs

Connect using either official SDK pointing to `http://localhost:8000`:

=== "Python"
    ```python
    import natlas

    client = natlas.Client(
        host="http://localhost:8000",
        api_key="your-configured-key",
    )

    # 1. Chat Completion
    res = client.chat([{"role": "user", "content": "Sannu!"}])
    print(res.message.content)

    # 2. Audio Transcription
    with open("hausa_audio.mp3", "rb") as f:
        transcript = client.audio.transcriptions.create(
            file=f,
            model="NCAIR1/Hausa-ASR"
        )
    print(transcript.text)
    ```

=== "JavaScript / TypeScript"
    ```typescript
    import { NatlasClient } from "natlas-sdk";

    const client = new NatlasClient({
      baseUrl: "http://localhost:8000/v1",
      apiKey: "your-configured-key",
    });

    const res = await client.chat([
      { role: "user", content: "Ẹ n lẹ́ o!" }
    ]);
    console.log(res.message.content);
    ```
