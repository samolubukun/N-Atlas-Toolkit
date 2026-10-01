export const DOCS_NAV = [
  {
    category: "Getting Started",
    items: [
      { id: "overview", title: "Overview", icon: "BookOpen" },
      { id: "install", title: "Installation & Quickstart", icon: "Terminal" },
      { id: "models", title: "Model Catalog", icon: "Layers" },
    ]
  },
  {
    category: "SDK & Guides",
    items: [
      { id: "sdk-python", title: "Python SDK", icon: "Code2" },
      { id: "sdk-js", title: "JavaScript / TypeScript SDK", icon: "FileCode" },
      { id: "cli", title: "Unified CLI Reference", icon: "Terminal" },
      { id: "cookbook", title: "Developer Cookbook", icon: "Compass" },
    ]
  },
  {
    category: "Speech-to-Text (ASR)",
    items: [
      { id: "asr-transcription", title: "Audio Transcriptions", icon: "Mic" },
    ]
  },
  {
    category: "LLM Capabilities",
    items: [
      { id: "llm-chat", title: "Chat & SSE Streaming", icon: "MessageSquare" },
      { id: "llm-translation", title: "Native Cultural Translation", icon: "Globe" },
      { id: "llm-africanize", title: "Cultural Tone Adapter", icon: "Wand2" },
    ]
  },
  {
    category: "Fine-Tuning Starter Kit",
    items: [
      { id: "finetune-overview", title: "LoRA Pipeline Overview", icon: "Cpu" },
      { id: "finetune-data", title: "Dataset Preparation", icon: "Database" },
      { id: "finetune-eval", title: "Evaluation & Benchmarks", icon: "CheckCircle" },
    ]
  },
  {
    category: "Deployment & API",
    items: [
      { id: "api-endpoints", title: "REST API Reference", icon: "Server" },
      { id: "deploy-modal", title: "Modal Cloud Serverless", icon: "Cloud" },
      { id: "deploy-docker", title: "Docker Self-Hosted", icon: "Box" },
    ]
  },
  {
    category: "Èdè Yorùbá / Hausa / Igbo",
    items: [
      { id: "yo-intro", title: "Èdè Yorùbá: Ìbẹ̀rẹ̀ Kíákíá", icon: "Globe" },
      { id: "ha-intro", title: "Harshen Hausa: Farawa Cikin Sauri", icon: "Globe" },
      { id: "ig-intro", title: "Asụsụ Igbo: Mbido Ọsọ Ọsọ", icon: "Globe" },
    ]
  }
];

export const DOCS_DATA = {
  "overview": {
    title: "N-ATLaS Developer Toolkit & Architecture",
    subtitle: "A unified, production-grade developer platform engineered for Nigeria's sovereign LLM and Speech AI models.",
    studioLink: "chat",
    content: `
The **N-ATLaS Toolkit** is an open, production-ready developer platform designed to bridge state-of-the-art sovereign foundation models into everyday Nigerian applications — ranging from agricultural SMS advisory to hospital triage, voice banking, and multilingual customer service.

> **Sovereign Attribution:** N-ATLaS model weights were developed under the Federal Ministry of Communications, Innovation and Digital Economy (FMCIDE) sovereign AI initiative by Awarri Technologies in partnership with NCAIR and NITDA. This toolkit provides the end-to-end client SDKs, serverless runtime, real-time audio pipeline, and interactive developer playground.

---

### System Architecture Overview

\`\`\`architecture
\`\`\`

---

### Core Toolkit Capabilities

\`\`\`capabilities
\`\`\`

---

### Quick Launch Next Steps

\`\`\`next-steps
\`\`\`
    `
  },

  "install": {
    title: "Getting Started: Installation & First Inference",
    subtitle: "Get up and running with Python and TypeScript SDKs in under 2 minutes.",
    badge: "Quickstart",
    studioLink: "chat",
    content: `
> **Source Code & Repository:** Both SDKs, fine-tuning scripts, and the Docker engine are maintained in the open-source GitHub repository:
> 👉 **[github.com/samolubukun/N-Atlas-Toolkit](https://github.com/samolubukun/N-Atlas-Toolkit)**
> 
> \`\`\`bash
> git clone https://github.com/samolubukun/N-Atlas-Toolkit.git
> cd N-Atlas-Toolkit
> \`\`\`

### 1. Environment Setup & API Keys

Set your API key and endpoint URLs:

\`\`\`bash
# Set in terminal or your project's .env file:
export NATLAS_API_KEY="your-api-key"
export NATLAS_BASE_URL="https://<workspace>--natlas-engine-natlasapi-serve.modal.run"
export NATLAS_ASR_URL="https://<workspace>--natlas-engine-natlasasrengine-serve.modal.run"
\`\`\`

### 2. Python SDK Installation

\`\`\`bash
# Install directly from the repository
pip install ./python-sdk

# Or install with local PyTorch/GPU support
pip install "./python-sdk[local]"
\`\`\`

#### Your First Python Chat:
\`\`\`python
import natlas

client = natlas.Client()

response = client.chat([
    natlas.system_prompt(natlas.YO),
    {"role": "user", "content": "Bawo ni nkan? Ṣe alaye lori AI ni ṣoki."}
])

print(response.message.content)
\`\`\`

### 3. JavaScript / TypeScript SDK Installation

Install directly from the repository directory:
\`\`\`bash
# Install local js-sdk directory
npm install ./js-sdk
# or pnpm: pnpm add ./js-sdk / bun add ./js-sdk
\`\`\`

#### Your First TypeScript Chat:
\`\`\`typescript
import { NatlasClient, systemPrompt, YO } from "natlas";

const client = new NatlasClient({
  apiKey: process.env.NATLAS_API_KEY,
});

const response = await client.chat([
  systemPrompt(YO),
  { role: "user", content: "Ẹ n lẹ́ o! Ṣé àlàáfíà ni?" }
]);

console.log(response.message.content);
\`\`\`
    `
  },

  "models": {
    title: "Model Catalog & Sovereign Architecture",
    subtitle: "Complete specifications of the fine-tuned LLM and Whisper-derived ASR models.",
    badge: "Weights & Specs",
    content: `
### Sovereign Model Checkpoints

| Capability | Model Identifier | Base Architecture | Training Corpus | Target Language |
| :--- | :--- | :--- | :--- | :--- |
| **Sovereign LLM** | \`NCAIR1/N-ATLaS\` | Meta-Llama-3-8B-Instruct | 392M+ tokens Nigerian dialogue | Multilingual (YO, HA, IG, PCM, EN) |
| **Yoruba ASR** | \`NCAIR1/Yoruba-ASR\` | Whisper Small (244M) | 120+ hours curated speech | Yorùbá (\`yo\`) |
| **Hausa ASR** | \`NCAIR1/Hausa-ASR\` | Whisper Small (244M) | 120+ hours curated speech | Harshen Hausa (\`ha\`) |
| **Igbo ASR** | \`NCAIR1/Igbo-ASR\` | Whisper Small (244M) | 120+ hours curated speech | Asụsụ Igbo (\`ig\`) |
| **Nigerian Accented English** | \`NCAIR1/NigerianAccentedEnglish\` | Whisper Small (244M) | 120+ hours Nigerian English | Nigerian English (\`en\`) |

### Language Codes Reference

- \`yo\` - Yorùbá
- \`ha\` - Hausa
- \`ig\` - Igbo
- \`pcm\` - Nigerian Pidgin
- \`en\` - Nigerian English
    `
  },

  "sdk-python": {
    title: "Python SDK Guide",
    subtitle: "Complete API guide for the synchronous and asynchronous natlas Python client.",
    badge: "Python 3.9+",
    studioLink: "chat",
    content: `
### Installation & Client Initialization

\`\`\`python
import natlas

# Reads NATLAS_BASE_URL, NATLAS_ASR_URL, and NATLAS_API_KEY from environment
client = natlas.Client()

# Or configure explicitly:
client = natlas.Client(
    base_url="https://<workspace>--natlas-engine-natlasapi-serve.modal.run",
    asr_url="https://<workspace>--natlas-engine-natlasasrengine-serve.modal.run",
    api_key="your-key",
)
\`\`\`

### 1. Chat Completion & Streaming

\`\`\`python
# Synchronous Chat
response = client.chat([
    natlas.system_prompt(natlas.HA),
    {"role": "user", "content": "Sannu! Menene sabon labari?"}
])
print(response.message.content)

# Real-Time SSE Streaming
stream = client.chat([
    {"role": "user", "content": "Tell me a short folklore about tortoise."}
], stream=True)

for chunk in stream:
    print(chunk.message.content, end="", flush=True)
\`\`\`

### 2. Speech-to-Text Transcription

\`\`\`python
with open("yoruba_audio.wav", "rb") as f:
    result = client.audio.transcriptions.create(
        file=f,
        model="NCAIR1/Yoruba-ASR",
        timestamp_granularities=["word"]
    )

print("Transcription:", result.text)
print("Language:", result.language)
for w in result.words:
    print(f"[{w.start:.2f}s -> {w.end:.2f}s] {w.word}")
\`\`\`

### 3. Africanize & Cultural Translation

\`\`\`python
# Africanize (Tone Adapter)
res = client.africanize(
    text="I am extremely surprised and astonished by this news.",
    tone="pidgin" # options: formal, colloquial, street, pidgin
)
print(res.text) # "Chai! You mean dis thing dey happen for real?!"

# Translation
trans = client.translate(
    text="Good morning, how did you sleep?",
    target_lang="yo"
)
print(trans.text) # "Ẹ káàárọ̀, báwo ni ẹ ṣe sùn?"
\`\`\`
    `
  },

  "sdk-js": {
    title: "JavaScript / TypeScript SDK Guide",
    subtitle: "Universal client for Node.js >= 18, Next.js, Bun, Deno, and modern browsers.",
    badge: "npm / TypeScript",
    studioLink: "chat",
    content: `
### Installation

Install directly from the repository directory:
\`\`\`bash
npm install ./js-sdk
# or: pnpm add ./js-sdk / bun add ./js-sdk
\`\`\`

### 1. Chat Completion & Streaming

\`\`\`typescript
import { NatlasClient, systemPrompt, YO } from "natlas";

const client = new NatlasClient({
  apiKey: process.env.NATLAS_API_KEY,
  baseUrl: process.env.NATLAS_BASE_URL,
});

// Standard completion
const response = await client.chat([
  systemPrompt(YO),
  { role: "user", content: "Ẹ n lẹ́ o! Ṣé àlàáfíà ni?" }
]);
console.log(response.message.content);

// Server-Sent Events (SSE) Streaming
const stream = await client.chat([
  { role: "user", content: "Write a poem in Nigerian Pidgin." }
], { stream: true });

for await (const chunk of stream) {
  process.stdout.write(chunk.message.content);
}
\`\`\`

### 2. Audio Transcription (Node.js & Browser)

\`\`\`typescript
import { NatlasClient } from "natlas";
import * as fs from "node:fs";

const client = new NatlasClient();
const audioBuffer = fs.readFileSync("audio_sample.wav");

const result = await client.audio.transcriptions.create(audioBuffer, {
  model: "NCAIR1/Hausa-ASR",
  language: "ha",
  timestampGranularities: ["word"],
});

console.log("Transcribed Text:", result.text);
\`\`\`

### 3. Africanize & Cultural Translation

\`\`\`typescript
// Africanize (Tone Adapter)
const res = await client.africanize("I am extremely surprised by this news.", {
  tone: "pidgin"
});
console.log(res.text);

// Translation
const trans = await client.translate("Good morning, how did you sleep?", {
  target_lang: "yo"
});
console.log(trans.text); // "Ẹ káàárọ̀, báwo ni ẹ ṣe sùn?"
\`\`\`
    `
  },

  "cli": {
    title: "Unified CLI Reference (natlas)",
    subtitle: "Command-line interface for testing models, streaming audio, and verifying gateway status.",
    badge: "CLI v0.1.0",
    content: `
### Running the CLI from this Repository

You can run either the **Python CLI** or the **Node.js / JavaScript CLI** directly from this cloned repository:

#### Option 1: Python CLI
\`\`\`bash
# Direct run:
python python-sdk/src/cli.py --help

# Or install editable in local venv:
pip install -e ./python-sdk
natlas --help
\`\`\`

#### Option 2: Node.js / JavaScript CLI
\`\`\`bash
# Direct run:
node js-sdk/bin/cli.mjs --help

# Or link locally:
cd js-sdk && npm link
natlas --help
\`\`\`

### CLI Commands Reference

\`\`\`bash
# 1. Health check & live GPU inspection
natlas health

# 2. Interactive LLM Chat
natlas chat --lang yo

# 3. Audio File Transcription with Word Timestamps
natlas transcribe speech.wav --model NCAIR1/Yoruba-ASR --timestamps

# 4. Quick Cultural Tone Adapter
natlas africanize "That is unbelievable" --tone street

# 5. Native Cultural Translation
natlas translate "Good morning" --target-lang yo
\`\`\`
    `
  },

  "cookbook": {
    title: "Developer Cookbook & Recipes",
    subtitle: "End-to-end practical recipes: WhatsApp bots, voice pipelines, and Next.js integrations.",
    badge: "Cookbook",
    content: `
### Production Recipes in the Repository

Check out the [\`cookbook/\`](https://github.com/samolubukun/N-Atlas-Toolkit/tree/main/cookbook) directory in the GitHub repository:

1. **[\`whatsapp_bot.py\`](https://github.com/samolubukun/N-Atlas-Toolkit/blob/main/cookbook/whatsapp_bot.py)**:
   - Production FastAPI webhook for WhatsApp Business API with Twilio.
   - Automatically transcribes voice notes via \`NCAIR1/Yoruba-ASR\` and responds in native Yoruba using N-ATLaS LLM.
2. **[\`voice_translation_pipeline.py\`](https://github.com/samolubukun/N-Atlas-Toolkit/blob/main/cookbook/voice_translation_pipeline.py)**:
   - End-to-end voice-to-voice translation: Audio input → Multilingual ASR → N-ATLaS Translation → Nigerian TTS synthesis.
3. **[\`openai_sdk_quickstart.py\`](https://github.com/samolubukun/N-Atlas-Toolkit/blob/main/cookbook/openai_sdk_quickstart.py)**:
   - Drop-in compatibility with the official \`openai\` Python library via \`base_url="https://.../v1"\`.
    `
  },

  "asr-transcription": {
    title: "Audio Transcriptions (Batch ASR)",
    subtitle: "Convert spoken Yoruba, Hausa, Igbo, and Nigerian English audio into formatted text with word timestamps.",
    badge: "Sovereign ASR",
    studioLink: "asr",
    content: `
### Supported Formats & Capabilities

- **Audio Formats**: WAV, MP3, OGG, FLAC, M4A, AAC, WebM.
- **Sample Rates**: 16kHz recommended. Auto-resampled with \`ffmpeg\`.
- **Max Audio File Size**: Up to 100MB per file.
- **Word Timestamps**: Accurate per-word start & end milliseconds.

### REST API Example (cURL)

\`\`\`bash
curl -X POST "https://<NATLAS_ASR_URL>/v1/audio/transcriptions" \\
  -H "Authorization: Bearer $NATLAS_API_KEY" \\
  -F "file=@sample_yo.wav" \\
  -F "model=NCAIR1/Yoruba-ASR" \\
  -F "language=yo" \\
  -F "timestamp_granularities[]=word"
\`\`\`

### Response Payload:
\`\`\`json
{
  "text": "Ẹ kú àárọ̀ o, báwo ni gbogbo nkan?",
  "language": "yo",
  "duration": 3.42,
  "model": "NCAIR1/Yoruba-ASR",
  "words": [
    {"word": "Ẹ", "start": 0.20, "end": 0.35},
    {"word": "kú", "start": 0.36, "end": 0.55},
    {"word": "àárọ̀", "start": 0.60, "end": 0.95},
    {"word": "o,", "start": 0.96, "end": 1.15},
    {"word": "báwo", "start": 1.30, "end": 1.65},
    {"word": "ni", "start": 1.70, "end": 1.85},
    {"word": "gbogbo", "start": 1.90, "end": 2.30},
    {"word": "nkan?", "start": 2.35, "end": 2.80}
  ]
}
\`\`\`
    `
  },

  "llm-chat": {
    title: "Chat & Server-Sent Events (SSE) Streaming",
    subtitle: "Streaming conversational inference with OpenAI-compatible payload schemas.",
    badge: "OpenAI Compatible",
    studioLink: "chat",
    content: `
### Endpoint
\`POST /v1/chat/completions\`

### Request Body
\`\`\`json
{
  "model": "NCAIR1/N-ATLaS",
  "messages": [
    {"role": "system", "content": "You are N-ATLaS, an AI assistant fluent in Nigerian languages."},
    {"role": "user", "content": "Explain blockchain technology in Nigerian Pidgin."}
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 512
}
\`\`\`

### SSE Event Stream
\`\`\`text
data: {"id":"chat-123","choices":[{"delta":{"content":"No "}}]}
data: {"id":"chat-123","choices":[{"delta":{"content":"wahala! "}}]}
data: {"id":"chat-123","choices":[{"delta":{"content":"Blockchain "}}]}
data: {"id":"chat-123","choices":[{"delta":{"content":"dey "}}]}
data: {"id":"chat-123","choices":[{"delta":{"content":"like "}}]}
data: {"id":"chat-123","choices":[{"delta":{"content":"ledger... "}}]}
data: [DONE]
\`\`\`

### Tool Calling & Agentic Functions
N-ATLaS 8B supports OpenAI-compatible function calling:

\`\`\`json
{
  "model": "NCAIR1/N-ATLaS",
  "messages": [{"role": "user", "content": "How much is USD in Naira?"}],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_cbn_fx_rate",
        "description": "Fetch official Central Bank of Nigeria exchange rate",
        "parameters": {
          "type": "object",
          "properties": {"currency": {"type": "string"}},
          "required": ["currency"]
        }
      }
    }
  ],
  "tool_choice": "auto"
}
\`\`\`
    `
  },

  "llm-translation": {
    title: "Native Cultural Translation (/v1/translate)",
    subtitle: "Direct African language machine translation with dialect sensitivity.",
    badge: "NMT Engine",
    studioLink: "translate",
    content: `
### Endpoint: \`POST /v1/translate\`

\`\`\`json
{
  "text": "The harvest was plentiful this year, and all the villagers celebrated.",
  "source_lang": "en",
  "target_lang": "yo"
}
\`\`\`

### Response:
\`\`\`json
{
  "source_text": "The harvest was plentiful this year, and all the villagers celebrated.",
  "target_text": "Ìkórè pọ̀ púpọ̀ ní ọdún yìí, gbogbo àwọn ará abúlé sì ṣe ayẹyẹ.",
  "source_lang": "en",
  "target_lang": "yo"
}
\`\`\`
    `
  },

  "llm-africanize": {
    title: "Cultural Tone Adapter (/v1/africanize)",
    subtitle: "Transform standard English prompts and responses into culturally natural Nigerian expressions.",
    badge: "Tone Adapter",
    studioLink: "africanize",
    content: `
### Available Tones

- **\`formal\`**: Professional Nigerian business context (respectful honorifics, boardroom standard).
- **\`colloquial\`**: Casual everyday Nigerian English conversation.
- **\`street\`**: Lagos street slang, high energy, urban vernacular.
- **\`pidgin\`**: Authentic Nigerian Pidgin English (Waffi/Lagos cadence).

### Example Request:
\`\`\`json
{
  "text": "Please confirm if you received the document I sent earlier.",
  "tone": "pidgin"
}
\`\`\`

### Example Output:
\`\`\`json
{
  "original": "Please confirm if you received the document I sent earlier.",
  "africanized": "Abeg confirm say you see that document wey I send earlier o.",
  "tone": "pidgin"
}
\`\`\`
    `
  },

  "finetune-overview": {
    title: "Fine-Tuning Starter Kit: LoRA Pipeline",
    subtitle: "Adapt N-ATLaS or Llama-3 checkpoints to specific enterprise domains and dialects.",
    badge: "LoRA & Unsloth",
    content: `
### Modular Fine-Tuning Pipeline

The complete toolkit pipeline is located in [\`finetune-starter-kit/\`](https://github.com/samolubukun/N-Atlas-Toolkit/tree/main/finetune-starter-kit):

- **Memory Efficiency**: 4-bit / 8-bit quantized fine-tuning via Unsloth & PEFT.
- **Rerunnable Scripts**: Standalone scripts for dataset preparation, training, evaluation, and adapter export.
- **Target Modules**: \`q_proj\`, \`k_proj\`, \`v_proj\`, \`o_proj\`, \`gate_proj\`, \`up_proj\`, \`down_proj\`.
- **Config-Driven**: Configured via [\`config/config.yaml\`](https://github.com/samolubukun/N-Atlas-Toolkit/blob/main/finetune-starter-kit/config/config.yaml).

\`\`\`bash
# 1. Navigate to the starter kit directory:
cd finetune-starter-kit

# 2. Run LoRA fine-tuning with Unsloth:
python train.py --config config/config.yaml

# (Or standard Hugging Face Trainer fallback):
python train_hf.py --config config/config.yaml
\`\`\`
    `
  },

  "finetune-data": {
    title: "Dataset Preparation for Multilingual Finetuning",
    subtitle: "Formatting, cleaning, and tokenizing indigenous language corpora.",
    badge: "Data Prep",
    content: `
### Dataset Tools in \`finetune-starter-kit/data/\`

Located in [\`finetune-starter-kit/data/\`](https://github.com/samolubukun/N-Atlas-Toolkit/tree/main/finetune-starter-kit/data):

1. **Import Custom Data ([\`data/import_custom_data.py\`](https://github.com/samolubukun/N-Atlas-Toolkit/blob/main/finetune-starter-kit/data/import_custom_data.py))**:
   - Converts CSV, JSON, or JSONL files into the standard ShareGPT training format.
   - Automatically applies **Unicode NFC Normalisation** to protect tonal accents (\`ẹ̀\`, \`ọ́\`, \`ƙ\`, \`ɗ\`, \`ị\`, \`ụ\`).
2. **Deduplication & Filtering ([\`data/prepare_data.py\`](https://github.com/samolubukun/N-Atlas-Toolkit/blob/main/finetune-starter-kit/data/prepare_data.py))**:
   - Strips duplicates, filters empty tokens, and normalises whitespace and punctuation.
3. **Stratified Splitting ([\`data/split_data.py\`](https://github.com/samolubukun/N-Atlas-Toolkit/blob/main/finetune-starter-kit/data/split_data.py))**:
   - Partitions data into balanced \`train\`, \`val\`, and \`test\` splits across Hausa, Igbo, Yoruba, and English.

### CLI Example

\`\`\`bash
# 1. Navigate to the starter kit directory:
cd finetune-starter-kit

# 2. Import custom CSV data:
python data/import_custom_data.py \\
    --input my_dataset.csv \\
    --output data/raw_mine \\
    --prompt-col question \\
    --response-col answer \\
    --language Hausa

# 3. Clean and prepare dataset:
python data/prepare_data.py --config config/config.yaml
\`\`\`
    `
  },

  "finetune-eval": {
    title: "Model Evaluation & Benchmark Harness",
    subtitle: "Evaluate perplexity, BLEU, chrF++, and cultural safety.",
    badge: "Evaluation",
    content: `
### Evaluation Harness in \`finetune-starter-kit/eval/\`

Located in [\`finetune-starter-kit/eval/\`](https://github.com/samolubukun/N-Atlas-Toolkit/tree/main/finetune-starter-kit/eval):

Runs the base model and fine-tuned adapter side-by-side using greedy decoding:

\`\`\`bash
# 1. Navigate to the starter kit directory:
cd finetune-starter-kit

# 2. Compare base model vs trained LoRA adapter:
python eval/compare.py --adapter outputs/checkpoints/final_adapters

# 3. Run automated benchmark suite:
python eval/benchmarks.py --model-path ./output/checkpoint-final --dataset eval_set.jsonl

# 4. Generate comparison report:
python eval/report.py --compare eval/comparison.json
\`\`\`
    `
  },

  "api-endpoints": {
    title: "REST API Endpoint Reference",
    subtitle: "Comprehensive route table with authentication specifications.",
    badge: "OpenAPI Specification",
    content: `
| Method | Endpoint | Service | Description | Authentication |
| :--- | :--- | :--- | :--- | :--- |
| \`GET\` | \`/healthz\` | Both | Healthcheck, GPU device, and model status | Public |
| \`GET\` | \`/v1/models\` | LLM | Model catalog discovery | \`Bearer <API_KEY>\` |
| \`POST\` | \`/v1/chat/completions\` | LLM | Chat completion (SSE streaming supported) | \`Bearer <API_KEY>\` |
| \`POST\` | \`/v1/completions\` | LLM | Raw prompt text completion | \`Bearer <API_KEY>\` |
| \`POST\` | \`/v1/translate\` | LLM | Direct African language translation | \`Bearer <API_KEY>\` |
| \`POST\` | \`/v1/africanize\` | LLM | Nigerian cultural tone adapter | \`Bearer <API_KEY>\` |
| \`POST\` | \`/v1/audio/transcriptions\` | ASR | Sovereign audio speech-to-text with word alignment | \`Bearer <API_KEY>\` |
| \`WSS\` | \`/ws/realtime\` | LLM | Conversational voice token streaming | WebSocket |
    `
  },

  "deploy-modal": {
    title: "Deployment: Modal Cloud Serverless",
    subtitle: "Deploy scale-to-zero NVIDIA A10G / L4 endpoints on Modal in one command.",
    badge: "Cloud Serverless",
    content: `
### Deploying the Complete Suite to Modal

\`\`\`bash
# Authenticate Modal CLI
modal setup

# Deploy both LLM and ASR inference engines
modal deploy natlas_engine.py
\`\`\`

Modal provisions auto-scaling GPU containers that scale to zero when idle, saving significant infrastructure costs.
    `
  },

  "deploy-docker": {
    title: "Deployment: Docker GPU & Gateway",
    subtitle: "Run on-premises or sovereign private cloud with Docker Compose.",
    badge: "Self-Hosted",
    content: `
### 1-Command Local/Private Docker Compose

\`\`\`bash
# Copy and configure environment variables
cp .env.example .env

# Run local development stack
docker compose -f docker-compose.local.yml up -d
\`\`\`

Includes reverse proxy routing, CPU fallback for development, and NVIDIA Container Toolkit pass-through for production GPUs.
    `
  },

  "yo-intro": {
    title: "Èdè Yorùbá: Ìbẹ̀rẹ̀ Kíákíá",
    subtitle: "Àwọn ìwé ìtọ́ni ní èdè abínibí Yorùbá fún àwọn olùgbédide software.",
    badge: "Bilingual: Yorùbá",
    studioLink: "chat",
    content: `
Ẹ kú àbọ̀ sí ojú ewé ìtọ́ni fún **N-ATLaS**, ẹ̀rọ orí kọ̀ǹpútà fún èdè Yorùbá àti àwọn èdè ilẹ̀ Nàìjíríà.

### Bí a ṣe ń fi SDK sori kọ̀ǹpútà (Installation):

\`\`\`bash
# Python
pip install ./python-sdk

# JavaScript / TypeScript
npm install ./js-sdk
\`\`\`

### Àpẹẹrẹ Ìbánisọ̀rọ̀ Kíákíá (First Chat in Yoruba):

\`\`\`python
import natlas

client = natlas.Client()

response = client.chat([
    natlas.system_prompt(natlas.YO),
    {"role": "user", "content": "Ẹ n lẹ́ o! Ṣé àlàáfíà ni gbogbo nkan?"}
])

print(response.message.content)
\`\`\`
    `
  },

  "ha-intro": {
    title: "Harshen Hausa: Farawa Cikin Sauri",
    subtitle: "Takardar jagora a harshen Hausa ga masu haɓaka software.",
    badge: "Bilingual: Hausa",
    studioLink: "chat",
    content: `
Wannan ita ce takardar jagora a harshen Hausa ga masu haɓaka software (developers) da ke son amfani da fasahar **N-ATLaS**.

### Shigarwa (Installation):

\`\`\`bash
# Python
pip install ./python-sdk

# JavaScript / TypeScript
npm install ./js-sdk
\`\`\`

### Misalin Tattaunawa na Farko (First Chat in Hausa):

\`\`\`python
import natlas

client = natlas.Client()

response = client.chat([
    natlas.system_prompt(natlas.HA),
    {"role": "user", "content": "Sannu! Ka ba ni misali na yadda fasahar AI za ta taimaki manoma a Najeriya."}
])

print(response.message.content)
\`\`\`
    `
  },

  "ig-intro": {
    title: "Asụsụ Igbo: Mbido Ọsọ Ọsọ",
    subtitle: "Akwụkwọ ntuziaka n'asụsụ Igbo maka ndị mmepe software.",
    badge: "Bilingual: Igbo",
    studioLink: "chat",
    content: `
Nnọọ na akwụkwọ ntuziaka maka **N-ATLaS**, ụbụrụ ọgụgụ isi (AI) nke ala anyị Naịjirịa maka asụsụ Igbo.

### Nwụnye (Installation):

\`\`\`bash
# Python
pip install ./python-sdk

# JavaScript / TypeScript
npm install ./js-sdk
\`\`\`

### Mkparịta ụka Mbụ n'Asụsụ Igbo (First Chat in Igbo):

\`\`\`python
import natlas

client = natlas.Client()

response = client.chat([
    natlas.system_prompt(natlas.IG),
    {"role": "user", "content": "Kedu ka ị mere? Kọwaa uru AI bara na nchịkọta ahụike."}
])

print(response.message.content)
\`\`\`
    `
  }
};
