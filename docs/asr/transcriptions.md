# Audio Transcriptions (Batch ASR)

The N-ATLaS Speech-to-Text API converts spoken Yoruba, Hausa, Igbo, and Nigerian Accented English audio into written text with optional millisecond word timestamps.

---

## Supported Audio Formats

- **Container Formats**: WAV, MP3, OGG, FLAC, M4A, AAC, WebM.
- **Sample Rates**: 16kHz recommended (native Whisper sample rate). Automatically resampled on the server using system `ffmpeg`.
- **Max File Size**: Up to 100MB per file.

---

## 1. Using the Python SDK

```python
import natlas

client = natlas.Client()

with open("speech.wav", "rb") as f:
    res = client.audio.transcriptions.create(
        file=f,
        model="NCAIR1/Yoruba-ASR",
        language="yo",
        timestamp_granularities=["word"]
    )

print("Transcription:", res.text)
print("Language:", res.language)
print("Audio Duration:", res.duration)
```

---

## 2. Using cURL (REST API)

```bash
curl -X POST https://<workspace>--natlas-engine-natlasasrengine-serve.modal.run/v1/audio/transcriptions \
  -H "Authorization: Bearer $NATLAS_API_KEY" \
  -F "file=@hausa_sample.mp3" \
  -F "model=NCAIR1/Hausa-ASR" \
  -F "language=ha" \
  -F "timestamp_granularities[]=word"
```

### JSON Response Format
```json
{
  "text": "bude ƙofar,na san kina ciki.",
  "language": "ha",
  "duration": 5.69,
  "model": "NCAIR1/Hausa-ASR",
  "words": [
    {"word": "bude", "start": 0.50, "end": 1.10},
    {"word": "ƙofar", "start": 1.20, "end": 1.85},
    {"word": "na", "start": 2.10, "end": 2.30},
    {"word": "san", "start": 2.35, "end": 2.65},
    {"word": "kina", "start": 2.70, "end": 3.10},
    {"word": "ciki", "start": 3.15, "end": 3.60}
  ]
}
```
