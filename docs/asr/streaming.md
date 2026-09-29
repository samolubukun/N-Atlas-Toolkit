# Speech Recognition (Audio & Voice Input)

N-ATLaS ASR provides high-accuracy speech-to-text recognition with word-level timestamp alignment for Nigerian languages (Yorùbá, Hausa, Igbo, and Nigerian English).

---

## Architecture Note: Full-Context vs. Sub-Second Slicing

N-ATLaS ASR uses an encoder-decoder sequence architecture (Whisper-based) optimized for Nigerian acoustic nuances and tonal inflections. 

### Why Full-Utterance Recognition is Superior
- **Tonal & Acoustic Context**: Slicing audio into arbitrary 1-second chunks strips away the broader tonal contour and sentence structure necessary to distinguish similar phonetic sequences in tonal languages (e.g., Yorùbá tones: *òpè* vs *ọ̀pẹ* vs *ọ̀pẹ́*).
- **Zero Hallucination Loops**: Sub-second slicing of ambient room silence frequently triggers decoder attention degeneration. Full-utterance capture with voice activity detection (VAD) completely eliminates repetitive hallucination loops.
- **Word-Level Timestamp Accuracy**: Full utterances preserve continuous token alignment across complete phrases.

---

## Audio Transcription Endpoint

* **Modal Live Cloud**: `https://<workspace>--natlas-engine-natlasasrengine-serve.modal.run/v1/audio/transcriptions`
* **Docker / On-Premises**: `http://localhost:8000/v1/audio/transcriptions`

### Supported Input Formats
- WAV (16kHz mono recommended)
- MP3, OGG, FLAC, WebM (auto-resampled to 16kHz mono)

### Request Parameters (Multipart Form)

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | Binary | Yes | Audio file or recorded voice blob |
| `model` | string | Optional | Model ID or language override (`NCAIR1/Yoruba-ASR`, etc.) |
| `language` | string | Optional | `yoruba`, `hausa`, `igbo`, or `english` |
| `response_format` | string | Optional | `json` (default) or `text` |
| `timestamp_granularities` | list | Optional | Pass `["word"]` for word-level timestamps |
