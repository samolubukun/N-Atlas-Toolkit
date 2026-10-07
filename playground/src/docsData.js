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
      { id: "sdk-tools", title: "Built-in Agent Tools", icon: "Wrench" },
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
export NATLAS_API_URL="https://<workspace>--natlas-engine-natlasasrengine-serve.modal.run"
\`\`\`

### 2. Python SDK Installation

\`\`\`bash
# Install directly from the repository
pip install ./python-sdk

# Or install with local PyTorch/GPU support
pip install "./python-sdk[local]"

# Editable / development install (also supported)
pip install -e ./python-sdk
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

#### Built-in Zero-Key Tools (no API key needed):
\`\`\`python
from natlas import tools

tools.nigeria_gazetteer("Lagos")       # offline state/LGA lookup
tools.math_eval("50000 * 0.075")       # safe arithmetic
tools.fx_rates("USD", "NGN")           # live FX, no key
tools.weather_lookup("Abuja")          # live weather, no key
tools.web_search("Nigerian AI news")   # DuckDuckGo, no key
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

#### Built-in Zero-Key Tools:
\`\`\`typescript
import { nigeriaGazetteer, fxRates, webSearch, mathEval } from "natlas/tools";

nigeriaGazetteer("Kano");              // offline, instant
mathEval("(200000 * 0.075) + 500");   // offline, instant
await fxRates("USD", "NGN");          // free, no key
await webSearch("Lagos tech news");    // free, no key
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
- \`en\` - English
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

# Reads NATLAS_BASE_URL, NATLAS_API_URL, and NATLAS_API_KEY from environment
client = natlas.Client()

# Or configure explicitly:
client = natlas.Client(
    base_url="https://<workspace>--natlas-engine-natlasapi-serve.modal.run",
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

### 3. Built-in Agent Tools (Zero-Key)

All 7 tools work immediately after \`pip install ./python-sdk\` — no API keys:

\`\`\`python
from natlas import tools

# Offline tools
tools.nigeria_gazetteer("Oyo")            # capital: Ibadan, LGAs list
tools.math_eval("(200000 * 0.075) + 500") # safe AST arithmetic

# Free live tools
tools.web_search("Nigerian tech news")
tools.weather_lookup("Lagos")
tools.fx_rates("USD", "NGN")
tools.wikipedia_lookup("Yoruba", lang="yo")
tools.fetch_webpage("https://example.com")

# Get OpenAI schemas + execute tool by name
schemas = tools.get_openai_tools()  # all 7
result  = tools.execute_tool("fx_rates", {"base": "USD", "target": "NGN"})
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
  { role: "user", content: "Write a poem in English." }
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

### 3. Built-in Agent Tools (Zero-Key)

All 7 tools work immediately after \`npm install ./js-sdk\` — no API keys:

\`\`\`typescript
import { nigeriaGazetteer, mathEval, webSearch, fxRates,
         weatherLookup, wikipediaLookup, fetchWebpage,
         getOpenAITools, executeTool, registerTool } from "natlas/tools";

// Offline tools
nigeriaGazetteer("Rivers");           // state info + LGAs
mathEval("(200000 * 0.075) + 500");  // safe arithmetic

// Free live tools
await webSearch("Nigerian startup news");
await weatherLookup("Kano");
await fxRates("GBP", "NGN");
await wikipediaLookup("Igbo", "ig");
await fetchWebpage("https://example.com");

// OpenAI schemas + execute
const schemas = getOpenAITools();
const result  = await executeTool("fx_rates", { base: "USD", target: "NGN" });
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

    `
  },

  "cookbook": {
    title: "Developer Cookbook & Recipes",
    subtitle: "End-to-end practical recipes: WhatsApp bots, voice pipelines, agent tools, and Next.js integrations.",
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

### Built-in Zero-Key Tools Recipes

\`\`\`python
from natlas import tools

# Nigerian admin lookup — offline, instant
state = tools.nigeria_gazetteer("Ogun")
# → {capital: "Abeokuta", zone: "South West", total_lgas: 20, lgas: [...]}

# Safe arithmetic — no LLM hallucination
vat = tools.math_eval("200000 * 0.075")
# → {result: 15000.0}

# Live FX rates — no API key
rate = tools.fx_rates("USD", "NGN")
# → {rate: 1620.5, last_update: "..."}

# Web search — DuckDuckGo, no key
news = tools.web_search("latest Nigerian startup funding")

# Full agent loop with built-in tools
import natlas
client = natlas.Client()
schemas = tools.get_openai_tools(["web_search", "fx_rates", "nigeria_gazetteer"])
response = client.chat(
    [{"role": "user", "content": "USD to Naira rate and Lagos weather?"}],
    tools=schemas, tool_choice="auto"
)
if response.done_reason == "tool_calls":
    for tc in response.message.tool_calls:
        result = tools.execute_tool(tc.function.name, tc.function.arguments)
        print(result)
\`\`\`

### MCP Server — Use Tools in Claude Desktop / Cursor / Antigravity

\`\`\`bash
python python-sdk/src/mcp_server.py
\`\`\`

\`\`\`json
{
  "mcpServers": {
    "natlas-tools": {
      "command": "python",
      "args": ["/absolute/path/to/N-Atlas-Toolkit/python-sdk/src/mcp_server.py"]
    }
  }
}
\`\`\`
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
curl -X POST "https://<NATLAS_API_URL>/v1/audio/transcriptions" \\
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
    {"role": "user", "content": "Explain blockchain technology in English."}
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
  
  "finetune-overview": {
    title: "Fine-Tuning Architecture Overview",
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

| \`POST\` | \`/v1/audio/transcriptions\` | ASR | Sovereign audio speech-to-text with word alignment | \`Bearer <API_KEY>\` |
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
  },

  "sdk-tools": {
    title: "Built-in Agent Tools (Zero-Key)",
    subtitle: "7 free, zero-API-key tools for web search, FX rates, weather, Nigerian gazetteer, Wikipedia, math, and web fetching — ship inside both SDKs.",
    badge: "Zero-Key Tools",
    content: `
### Tool Reference

| Tool | Description | Network? | Key? |
| :--- | :--- | :--- | :--- |
| \`web_search\` / \`webSearch\` | DuckDuckGo web search | ✅ | ❌ |
| \`fetch_webpage\` / \`fetchWebpage\` | Clean text from any URL | ✅ | ❌ |
| \`weather_lookup\` / \`weatherLookup\` | Live weather via Open-Meteo | ✅ | ❌ |
| \`fx_rates\` / \`fxRates\` | Live FX rates via open.er-api.com | ✅ | ❌ |
| \`wikipedia_lookup\` / \`wikipediaLookup\` | Wikipedia REST API (en/ha/yo/ig) | ✅ | ❌ |
| \`nigeria_gazetteer\` / \`nigeriaGazetteer\` | Offline 36 states + FCT + 774 LGAs | ❌ | ❌ |
| \`math_eval\` / \`mathEval\` | Safe AST arithmetic evaluator | ❌ | ❌ |

---

### Python SDK

\`\`\`python
from natlas import tools

# Offline tools — instant, zero network
state = tools.nigeria_gazetteer("Lagos")
# {"found": True, "capital": "Ikeja", "total_lgas": 20, "lgas": [...]}

calc = tools.math_eval("(200000 * 0.075) + 500")
# {"result": 15500.0}

# Free live tools — no API key needed
news   = tools.web_search("Nigerian AI startups 2025", max_results=5)
wx     = tools.weather_lookup("Abuja")
rate   = tools.fx_rates("USD", "NGN")
wiki   = tools.wikipedia_lookup("Hausa people", lang="ha")
page   = tools.fetch_webpage("https://ncc.gov.ng", max_chars=3000)

# Get OpenAI-compatible schemas
schemas = tools.get_openai_tools()          # all 7 tools
schemas = tools.get_openai_tools(["web_search", "fx_rates"])

# Execute any tool by name
result = tools.execute_tool("fx_rates", {"base": "USD", "target": "NGN"})
\`\`\`

### Python — Full Agent Loop

\`\`\`python
import natlas
from natlas import tools

client = natlas.Client()
schemas = tools.get_openai_tools(["web_search", "fx_rates", "weather_lookup"])
messages = [{"role": "user", "content": "USD to Naira rate and weather in Lagos?"}]

response = client.chat(messages, tools=schemas, tool_choice="auto")

while response.done_reason == "tool_calls":
    messages.append(response.message.model_dump())
    for tc in response.message.tool_calls:
        result = tools.execute_tool(tc.function.name, tc.function.arguments)
        messages.append({"role": "tool", "tool_call_id": tc.id, "content": str(result)})
    response = client.chat(messages, tools=schemas, tool_choice="auto")

print(response.message.content)
\`\`\`

### Python — Custom Tool Registration

\`\`\`python
@tools.tool
def get_commodity_price(commodity: str, market: str = "Mile 12") -> dict:
    """Get current price for a commodity in a Nigerian market."""
    return {"commodity": commodity, "market": market, "price_ngn": 4500}

# Immediately available in schemas and dispatcher
schemas = tools.get_openai_tools()  # includes get_commodity_price
\`\`\`

---

### JavaScript / TypeScript SDK

\`\`\`typescript
// Tree-shakeable subpath import (recommended)
import {
  nigeriaGazetteer, mathEval, webSearch, weatherLookup,
  fxRates, wikipediaLookup, fetchWebpage,
  getOpenAITools, executeTool, registerTool,
} from "natlas/tools";

// Or from main barrel
import { tools } from "natlas";

// Offline tools
const state = nigeriaGazetteer("Kano");   // {capital: "Kano", total_lgas: 44, ...}
const calc  = mathEval("50000 * 0.075");  // {result: 3750}

// Free live tools
const results = await webSearch("Lagos fintech");
const weather = await weatherLookup("Port Harcourt");
const rate    = await fxRates("USD", "NGN");
const wiki    = await wikipediaLookup("Igbo people", "ig");
const page    = await fetchWebpage("https://example.com");

// OpenAI schemas and dispatcher
const schemas = getOpenAITools();
const result  = await executeTool("nigeria_gazetteer", { query: "Ogun" });
\`\`\`

### JavaScript — Custom Tool Registration

\`\`\`typescript
registerTool({
  name: "check_order",
  description: "Check delivery status for an order.",
  parameters: {
    type: "object",
    properties: { order_id: { type: "string" } },
    required: ["order_id"],
  },
  execute: async ({ order_id }) => ({ order_id, status: "in_transit" }),
});
\`\`\`

---

### MCP Server (Claude Desktop / Cursor / Antigravity)

\`\`\`bash
python python-sdk/src/mcp_server.py
\`\`\`

\`\`\`json
{
  "mcpServers": {
    "natlas-tools": {
      "command": "python",
      "args": ["/absolute/path/to/N-Atlas-Toolkit/python-sdk/src/mcp_server.py"]
    }
  }
}
\`\`\`
    `
  }
};
