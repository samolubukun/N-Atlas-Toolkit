# N-ATLaS JavaScript / TypeScript SDK (`@natlas/sdk` / `natlas`)

A typed JavaScript and TypeScript SDK for Nigeria's sovereign multilingual LLM and speech models, [NCAIR1/N-ATLaS](https://huggingface.co/NCAIR1/N-ATLaS), built for the National AI Innovation Challenge.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.

---

## Features

- **Universal Runtime Support**: Works seamlessly in Node.js (>= 18), Bun, Deno, Next.js, and modern browser environments using standard `fetch` and Web Streams.
- **Full TypeScript Types**: Complete TypeScript typings with strict type safety for chat completions, completions, speech-to-text, and token usages.
- **Real-time SSE Streaming**: Async iterable streaming (`stream: true`) with Server-Sent Events (SSE).
- **Audio Speech-to-Text (ASR)**: Sovereign multilingual audio transcription endpoint (`client.audio.transcriptions.create`) for Yoruba, Hausa, Igbo, and Nigerian English.
- **Language Detection & System Prompts**: Built-in deterministic language detection heuristics and culturally aligned sovereign system prompts (`YO`, `HA`, `IG`, `EN_NG`).
- **Flexible Deployment**: Connects to the hosted cloud endpoint on Modal or any self-hosted private on-premises vLLM / Docker instance.

---

## Installation

Install using your preferred package manager:

```bash
npm install natlas
# or
pnpm add natlas
# or
yarn add natlas
# or
bun add natlas
```

---

## Quickstart

### 1. Chat Completion

```typescript
import { NatlasClient, systemPrompt, YO } from "natlas";

const client = new NatlasClient({
  baseURL: "https://samuelolubukun--natlas-engine-natlasapi-serve.modal.run",
  apiKey: process.env.NATLAS_API_KEY,
});

async function main() {
  const response = await client.chat([
    systemPrompt(YO),
    { role: "user", content: "Bawo ni nkan? Ṣe àlàyé nípa ìmọ̀ ẹ̀rọ (AI)." }
  ]);

  console.log(response.message.content);
}

main();
```

### 2. Streaming Responses

```typescript
import { NatlasClient } from "natlas";

const client = new NatlasClient();

async function streamDemo() {
  const stream = await client.chat([
    { role: "user", content: "Tell me a short story in Nigerian English." }
  ], { stream: true });

  for await (const chunk of stream) {
    process.stdout.write(chunk.message.content);
  }
}

streamDemo();
```

### 3. Speech-to-Text (Batch Audio Transcription)

```typescript
import { NatlasClient } from "natlas";
import * as fs from "node:fs";

const client = new NatlasClient();

async function transcribeDemo() {
  const audioBuffer = fs.readFileSync("sample.wav");

  const result = await client.audio.transcriptions.create(audioBuffer, {
    language: "yoruba",
    timestamp_granularities: ["word"],
  });

  console.log("Transcribed text:", result.text);
  console.log("Word timestamps:", result.words);
}

transcribeDemo();
```

### 4. Real-Time Streaming ASR (Deepgram Protocol Clone)

Streams raw audio chunks (PCM 16kHz 16-bit mono) over WebSockets with immediate live transcription events:

```typescript
import { NatlasClient } from "natlas";

const client = new NatlasClient();

const live = client.audio.transcriptions.live({ language: "hausa" });

live.on("transcript", (event) => {
  const text = event.channel.alternatives[0]?.transcript;
  console.log("Live Transcript:", text);
});

live.on("error", (err) => console.error("Stream error:", err));

// Stream mic audio chunks:
live.send(audioChunk);

// When finished:
live.close();
```

### 5. Language Detection & System Prompts

```typescript
import { detectLanguage, systemPrompt } from "natlas";

const userInput = "Kedu ka ị mere taa?";
const lang = detectLanguage(userInput); // "igbo"

console.log("Detected language:", lang);
console.log("Sovereign prompt:", systemPrompt(lang));
```

---

## Configuration Options

| Option | Environment Variable | Default | Description |
| :--- | :--- | :--- | :--- |
| `baseURL` / `host` | `NATLAS_BASE_URL` | Modal Live LLM Endpoint | Target OpenAI-compatible server URL |
| `asrBaseURL` | `NATLAS_ASR_URL` | Modal Live ASR Endpoint | Dedicated Sovereign ASR server URL (auto-resolves for Docker localhost) |
| `apiKey` | `NATLAS_API_KEY` | None | API key for authentication |
| `model` | - | `NCAIR1/N-ATLaS` | Default model identifier |
| `timeout` | - | `120000` (2 min) | Request timeout in milliseconds |
| `headers` | - | `{}` | Custom request headers |
| `fetch` | - | `globalThis.fetch` | Custom fetch polyfill if required |

---

## License & Attribution

The SDK source is licensed under the Apache-2.0 License.

Required sovereign attribution:
> *"N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies."*

