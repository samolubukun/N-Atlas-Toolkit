# Python SDK Guide

The official typed Python SDK (`natlas`) provides synchronous and asynchronous clients, Server-Sent Events (SSE) streaming, language detection, and audio transcription.

---

## Initialization

```python
import natlas

# Reads NATLAS_BASE_URL, NATLAS_ASR_URL, and NATLAS_API_KEY from environment
client = natlas.Client()

# Or configure explicitly:
client = natlas.Client(
    base_url="https://<workspace>--natlas-engine-natlasapi-serve.modal.run",
    asr_url="https://<workspace>--natlas-engine-natlasasrengine-serve.modal.run",
    api_key="your-key",
)
```

---

## 1. Chat Completion & Streaming

### Synchronous Chat
```python
response = client.chat([
    natlas.system_prompt(natlas.HA),
    {"role": "user", "content": "Sannu! Menene sabon labari?"}
])
print(response.message.content)
```

### Real-Time SSE Streaming
```python
stream = client.chat([
    {"role": "user", "content": "Tell me a story about Lagos traffic."}
], stream=True)

for chunk in stream:
    print(chunk.message.content, end="", flush=True)
print()
```

---

## 2. Speech-to-Text (ASR)

### Batch Audio File Transcription
```python
with open("hausa_audio.mp3", "rb") as f:
    result = client.audio.transcriptions.create(
        file=f,
        model="NCAIR1/Hausa-ASR",
        timestamp_granularities=["word"]
    )

print("Transcription:", result.text)
for word in result.words:
    print(f"{word.word}: {word.start:.2f}s -> {word.end:.2f}s")
```

### Deepgram-Style Real-Time Live Streaming ASR
```python
import asyncio

async def live_audio_stream():
    async with natlas.AsyncClient() as async_client:
        session = await async_client.audio.transcriptions.connect_live(language="yoruba")

        async def receive_transcripts():
            async for event in session:
                transcript = event.channel.alternatives[0].transcript
                if transcript:
                    status = "FINAL" if event.is_final else "INTERIM"
                    print(f"[{status}] {transcript}")

        recv_task = asyncio.create_task(receive_transcripts())

        # Stream raw PCM 16kHz mono audio chunks:
        with open("sample.wav", "rb") as f:
            while chunk := f.read(4096):
                await session.send_audio(chunk)
                await asyncio.sleep(0.05)

        await session.close()
        await recv_task

asyncio.run(live_audio_stream())
```

---

## 3. Language Helpers & Presets

```python
import natlas

phrase = "Ndị be anyị, kedu ka unu mere?"
detected_lang = natlas.detect_language(phrase) # "igbo"

# Prepend sovereign cultural system message
messages = [
    natlas.system_prompt(detected_lang),
    {"role": "user", "content": phrase}
]
```
