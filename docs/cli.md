# Command-Line Interface (CLI) Reference

The N-ATLaS toolkit provides unified command-line interfaces for both Python (`natlas`) and JavaScript/Node.js (`npx natlas`).

---

## Installation & Running

=== "Python"
    ```bash
    pip install ./python-sdk
    natlas --help
    ```

=== "JavaScript (npx)"
    ```bash
    # Run instantly with npx or install globally:
    npx natlas help
    ```

---

## 1. Multilingual Chat (`natlas chat`)

### Interactive REPL Console
Start a live conversational terminal session with automatic Nigerian language detection:
```bash
natlas chat
```

### One-Shot Prompting with SSE Streaming
```bash
# Chat in Hausa
natlas chat "Sannu! Ka ba ni labari game da Kano." --lang hausa

# Chat in Yoruba with temperature setting
natlas chat "Kí ni àǹfààní ìmọ̀ ẹ̀rọ AI?" --lang yoruba --temperature 0.5
```

---

## 2. Audio Transcription (`natlas transcribe`)

Transcribe spoken Nigerian audio into text with optional millisecond timestamps:

```bash
# Basic transcription
natlas transcribe speech_hausa.mp3 --language hausa

# Transcription with word-level timestamps
natlas transcribe speech_yoruba.wav --language yoruba --timestamps
```

---

## 3. Real-Time Streaming ASR (`natlas stream-asr`)

Streams audio frames over WebSocket with real-time interim and final transcript events:

```bash
natlas stream-asr audio_stream.wav --language igbo
```

---

## 4. African Translation (`natlas translate`)

```bash
natlas translate "Education is the foundation of national development." --target Yoruba --tone formal
```

---

## 5. Cultural Tone Adaptation (`natlas africanize`)

```bash
natlas africanize "We need to work together and be resilient." --context Lagos-Urban
```

---

## 6. Server Health & Model Discovery

```bash
# Check cloud GPU status and server health:
natlas health

# List available LLM and sovereign Whisper ASR models:
natlas models
```
