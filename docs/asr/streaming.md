# Real-Time Streaming ASR (WebSocket Protocol)

N-ATLaS implements a real-time, low-latency WebSocket speech-to-text protocol modeled after Deepgram.

---

## WebSocket Endpoint

* **Modal Live Cloud**: `wss://<workspace>--natlas-engine-natlasasrengine-serve.modal.run/v1/audio/transcriptions/streaming`
* **Docker On-Premises**: `ws://localhost:8000/v1/audio/transcriptions/streaming`

---

## Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `language` | string | Optional | `english` | Target language: `hausa`, `igbo`, `yoruba`, or `english` |
| `model` | string | Optional | Auto-resolved | Model ID (`NCAIR1/Yoruba-ASR`, etc.) |
| `sample_rate` | int | Optional | `16000` | Audio sampling frequency (Hz) |
| `encoding` | string | Optional | `linear16` | Audio encoding (PCM 16-bit) |

---

## Protocol Specification

### 1. Sending Audio
Clients stream raw audio binary frames directly into the WebSocket connection:
- Format: 16kHz, 16-bit mono PCM.
- Recommended chunk size: `2048` to `4096` bytes (~64ms–128ms of audio).

### 2. Receiving Transcripts
The server streams JSON events conforming to the Deepgram schema:

```json
{
  "channel": {
    "alternatives": [
      {
        "transcript": "ọjọ́ ajé nígbà tí mo lọ sí ọjà",
        "confidence": 0.95,
        "words": [
          {"word": "ọjọ́", "start": 0.12, "end": 0.45},
          {"word": "ajé", "start": 0.48, "end": 0.80}
        ]
      }
    ]
  },
  "is_final": true,
  "speech_final": true,
  "language": "yo",
  "model": "NCAIR1/Yoruba-ASR"
}
```

### 3. Closing the Stream
Send a JSON control message:
```json
{"type": "CloseStream"}
```
Then close the WebSocket cleanly.
