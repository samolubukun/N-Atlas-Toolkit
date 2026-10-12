# JavaScript & TypeScript SDK Guide

The official typed JavaScript and TypeScript SDK (`natlas-sdk`) is designed for modern runtimes (Node.js >= 18, Bun, Deno, Next.js, and web browsers) using native `fetch` and standard Web Streams.

---

## Installation

Install directly from npm:

```bash
npm install natlas-sdk
# or: pnpm add natlas-sdk / bun add natlas-sdk / yarn add natlas-sdk
```

---

## 1. Chat Completion & Streaming

### Standard Chat
```typescript
import { NatlasClient, systemPrompt, YO } from "natlas-sdk";

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
import { NatlasClient } from "natlas-sdk";

const client = new NatlasClient();

const stream = await client.chat([
  { role: "user", content: "Write a poem in English." }
], { stream: true });

for await (const chunk of stream) {
  process.stdout.write(chunk.message.content);
}
```

---

## 2. Speech-to-Text (ASR)

### Batch Transcription
```typescript
import { NatlasClient } from "natlas-sdk";
import * as fs from "node:fs";

const client = new NatlasClient();
const audioBuffer = fs.readFileSync("audio_sample.wav");

const result = await client.audio.transcriptions.create(audioBuffer, {
  language: "hausa",
  timestamp_granularities: ["word"]
});

console.log("Transcribed text:", result.text);
console.log("Word timestamps:", result.words);
```

---

## 3. High-Level Semantic Helpers

The JavaScript SDK includes high-level convenience methods:

### Translation
```typescript
const translated = await client.translate(
  "Good morning, how are you?",
  "yoruba"
);
console.log(translated);
```

### Summarization
```typescript
const summary = await client.summarize(longText, {
  maxWords: 50,
  language: "hausa",
});
```

### Scam & Fraud Classification
```typescript
const result = await client.classifyScam(
  "Your BVN has been blocked. Call 08012345678 immediately to unblock your account."
);
console.log("Is scam:", result.is_scam);
console.log("Confidence:", result.confidence);
console.log("Category:", result.category);
console.log("Explanation:", result.explanation);
```

### Voice Chat
```typescript
import * as fs from "node:fs";

const audioBuffer = fs.readFileSync("voice_note.wav");
const chatResult = await client.voiceChat(audioBuffer, { language: "igbo" });
console.log("User:", chatResult.transcription);
console.log("Assistant:", chatResult.response);
```

---

## 4. Structured Extraction (`client.extract`)

Extract JSON conforming to a JSON Schema with automatic recovery and repair retries:

```typescript
const ledgerSchema = {
  type: "object",
  properties: {
    customer_name: { type: "string" },
    total_amount_ngn: { type: "number" },
    amount_paid_ngn: { type: "number" },
    outstanding_debt_ngn: { type: "number" },
  },
  required: ["customer_name", "total_amount_ngn", "amount_paid_ngn", "outstanding_debt_ngn"],
};

const entry = await client.extract({
  prompt: "Alhaji Musa bought 2 bags of fertilizer for 70,000 naira and paid 50,000 cash.",
  schema: ledgerSchema,
});

console.log(entry.customer_name);        // "Alhaji Musa"
console.log(entry.total_amount_ngn);     // 70000
console.log(entry.outstanding_debt_ngn); // 20000
```

---

## 5. Typed Errors Hierarchy

The SDK exports dedicated error subclasses for robust API error handling:

```typescript
import {
  NatlasClient,
  AuthError,
  RateLimitError,
  BadRequestError,
  ServerError,
  APIConnectionError,
} from "natlas-sdk";

try {
  await client.chat([{ role: "user", content: "Hello" }]);
} catch (err) {
  if (err instanceof AuthError) {
    console.error("Invalid API Key (HTTP 401)");
  } else if (err instanceof RateLimitError) {
    console.error("Rate limit reached (HTTP 429). Retry after:", err.retryAfter);
  } else if (err instanceof BadRequestError) {
    console.error("Bad request payload (HTTP 400):", err.message);
  } else if (err instanceof ServerError) {
    console.error("Remote gateway error (HTTP 5xx):", err.statusCode);
  }
}
```

---

## 6. Agentic Tool Calling (Function Calling)

N-ATLaS 8B supports OpenAI-compatible tool calling for building autonomous agents:

```typescript
import { NatlasClient } from "natlas-sdk";

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

---

## 7. Built-in Agent Tools (Zero-Key)

All 7 tools are available immediately after `npm install natlas-sdk` — no external API keys needed:

```typescript
import { tools } from "natlas-sdk";
// or tree-shakeable subpath import:
import {
  nigeriaGazetteer, mathEval, webSearch, weatherLookup,
  fxRates, wikipediaLookup, fetchWebpage,
  getOpenAITools, executeTool, registerTool,
} from "natlas-sdk/tools";

// Offline (no network required)
nigeriaGazetteer("Lagos");           // 36 states, FCT, 774 LGAs
mathEval("(50000 * 0.075) + 320");   // safe arithmetic evaluator

// Free live tools (no API key)
await webSearch("N-ATLaS Nigeria AI");   // DuckDuckGo, no key
await weatherLookup("Abuja");            // Open-Meteo, no key
await fxRates("USD", "NGN");            // open.er-api.com, no key
await wikipediaLookup("Hausa", "ha");    // Wikipedia REST API
await fetchWebpage("https://example.com"); // clean text extractor
```

### Use with the N-ATLaS Agent Loop

```typescript
import { NatlasClient } from "natlas-sdk";
import { getOpenAITools, executeTool } from "natlas-sdk/tools";

const client = new NatlasClient();

const response = await client.chat(
  [{ role: "user", content: "What's USD to Naira today and weather in Lagos?" }],
  { tools: getOpenAITools(["fx_rates", "weather_lookup"]), tool_choice: "auto" }
);

if (response.message.tool_calls) {
  for (const tc of response.message.tool_calls) {
    const result = await executeTool(tc.function.name, JSON.parse(tc.function.arguments));
    console.log(result);
  }
}
```

### Register Custom Tools

```typescript
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

// Custom tool is now in getOpenAITools() and executeTool()
```

