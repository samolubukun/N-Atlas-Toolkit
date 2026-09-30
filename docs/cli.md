# Command-Line Interface (CLI) Reference

The N-ATLaS toolkit provides unified command-line interfaces for both Python (`python-sdk`) and JavaScript / Node.js (`js-sdk`).

---

## Installation & Running from Repository

=== "Python CLI"
    ```bash
    # Option 1: Run directly with Python from repo root:
    python python-sdk/src/cli.py --help

    # Option 2: Install locally in editable mode:
    pip install -e ./python-sdk
    natlas --help
    ```

=== "Node.js / JavaScript CLI"
    ```bash
    # Option 1: Run directly with Node from repo root:
    node js-sdk/bin/cli.mjs --help

    # Option 2: Link locally:
    cd js-sdk && npm link
    natlas --help
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

Transcribe spoken Nigerian audio files into text with optional millisecond word timestamps:

```bash
# Basic transcription
natlas transcribe speech_hausa.mp3 --language hausa

# Transcription with word-level timestamps
natlas transcribe speech_yoruba.wav --language yoruba --timestamps
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
