# JavaScript & TypeScript SDK Guide

The official typed JavaScript and TypeScript SDK (`natlas`) is designed for modern runtimes (Node.js >= 18, Bun, Deno, Next.js, and web browsers) using native `fetch` and standard Web Streams.

---

## Installation

Install directly from the repository:

```bash
npm install ./js-sdk
# or: pnpm add ./js-sdk / bun add ./js-sdk
```

---

## 1. Chat Completion & Streaming

### Standard Chat
```typescript
import { NatlasClient, systemPrompt, YO } from "natlas";

const client = new NatlasClient({
  apiKey: process.env.NATLAS_API_KEY,
});

const response = await client.chat([
  systemPrompt(YO),
  { role: "user", content: "Ẹ n lẹ́ o! Ṣé àlàáfíà ni?" }
]);

console.log(response.message.content);
```

### Server-Sent Events (SSE) Streaming
```typescript
import { NatlasClient } from "natlas";

const client = new NatlasClient();

const stream = await client.chat([
  { role: "user", content: "Write a poem in Nigerian Pidgin." }
], { stream: true });

for await (const chunk of stream) {
  process.stdout.write(chunk.message.content);
}
```

---

## 2. Speech-to-Text (ASR)

### Batch Transcription
```typescript
import { NatlasClient } from "natlas";
import * as fs from "node:fs";

const client = new NatlasClient();
const audioBuffer = fs.readFileSync("audio_sample.wav");

const result = await client.audio.transcriptions.create(audioBuffer, {
  language: "hausa",
  timestamp_granularities: ["word"]
});

---

## 3. Agentic Tool Calling (Function Calling)

N-ATLaS 8B supports OpenAI-compatible tool calling for building autonomous agents:

```typescript
import { NatlasClient } from "natlas";

const client = new NatlasClient();

const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_cbn_fx_rate",
      description: "Fetch official Central Bank of Nigeria (CBN) FX rate for a currency pair.",
      parameters: {
        type: "object",
        properties: {
          pair: { type: "string", description: "Currency pair, e.g. USD/NGN, GBP/NGN" }
        },
        required: ["pair"]
      }
    }
  }
];

const response = await client.chat([
  { role: "user", content: "What is the official CBN rate for USD to NGN?" }
], { tools });

if (response.message.tool_calls) {
  for (const call of response.message.tool_calls) {
    console.log("Execute tool:", call.function.name);
    console.log("Arguments:", call.function.arguments);
  }
}
```


