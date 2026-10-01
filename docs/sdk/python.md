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
