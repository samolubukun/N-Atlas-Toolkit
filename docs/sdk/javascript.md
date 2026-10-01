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

console.log("Transcript:", result.text);
console.log("Words:", result.words);
```


