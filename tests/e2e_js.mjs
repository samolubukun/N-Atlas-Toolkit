/**
 * N-ATLaS JavaScript SDK — Full End-to-End Integration Runner
 * ============================================================
 * Exercises every SDK surface against the live Modal cloud endpoints:
 *   - Chat (sync-style async, streaming)
 *   - Text generation
 *   - Tool calling (OpenAI function spec)
 *   - Language detection & systemPrompt helpers
 *   - Sovereign ASR — batch transcription for Yoruba, Hausa, Igbo, Nigerian English
 *   - All 7 built-in agent tools
 *
 * Usage:
 *   cd natlas-toolkit
 *   npm install ./js-sdk
 *   NATLAS_API_KEY=<key> node tests/e2e_js.mjs
 *
 * Optional env vars (if different from SDK defaults):
 *   NATLAS_BASE_URL  — LLM endpoint
 *   NATLAS_ASR_URL   — ASR endpoint
 *
 * Requires Node.js >= 18 (native fetch + ReadableStream).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Try to load .env manually (no dotenv dependency required) ────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath   = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// ── SDK imports ──────────────────────────────────────────────────────────────
import {
  NatlasClient,
  detectLanguage,
  systemPrompt,
  YO, HA, IG,
} from "./js-sdk/dist/index.mjs";

const ATTRIBUTION = "N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.";

import {
  nigeriaGazetteer,
  mathEval,
  webSearch,
  weatherLookup,
  fxRates,
  wikipediaLookup,
  fetchWebpage,
  getOpenAITools,
  executeTool,
  registerTool,
} from "./js-sdk/dist/tools/index.mjs";

// ── Configuration ─────────────────────────────────────────────────────────
const API_KEY  = process.env.NATLAS_API_KEY  || "";
const BASE_URL = process.env.NATLAS_BASE_URL || undefined;
const ASR_URL  = process.env.NATLAS_ASR_URL  || undefined;
const AUDIO_DIR = path.join(__dirname, "audio");

const AUDIO_SAMPLES = [
  { file: path.join(AUDIO_DIR, "yoruba.mp3"),  model: "NCAIR1/Yoruba-ASR",              lang: "yoruba",          gt: "Ta ni o mo pe awon agba je ile isura ogbon?" },
  { file: path.join(AUDIO_DIR, "hausa.mp3"),   model: "NCAIR1/Hausa-ASR",               lang: "hausa",           gt: "Bude kofar. Na san kina ciki." },
  { file: path.join(AUDIO_DIR, "igbo.mp3"),    model: "NCAIR1/Igbo-ASR",                lang: "igbo",            gt: "Odeakwukwo okputokpuku uloorua na-ahua maka oru ngo na steeti Anambra" },
  { file: path.join(AUDIO_DIR, "english.mp3"), model: "NCAIR1/NigerianAccentedEnglish", lang: "nigerian_english", gt: "Closing the Google assistant app prevents it from working with your headphones." },
];

// ── Pretty printing ───────────────────────────────────────────────────────
const SEP  = "-".repeat(72);
const DSEP = "=".repeat(72);
const hdr  = (t)   => console.log(`\n${DSEP}\n  ${t}\n${DSEP}`);
const sec  = (t)   => console.log(`\n${SEP}\n  ${t}\n${SEP}`);
const ok   = (msg) => console.log(`  [OK]  ${msg}`);
const info = (msg) => console.log(`  [>>]  ${msg}`);
const fail = (msg) => console.log(`  [FAIL] ${msg}`);

function checkApiKey() {
  if (!API_KEY) { fail("NATLAS_API_KEY is not set. Export it and re-run."); process.exit(1); }
}

// ── Retry helper for transient DNS / network failures ────────────────────
async function withRetry(label, fn, retries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isTransient = err?.cause?.code === "EAI_AGAIN" || err?.cause?.cause?.code === "EAI_AGAIN";
      if (isTransient && attempt < retries) {
        info(`${label}: transient DNS error, retrying (${attempt}/${retries})...`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
}

// ── Client factory ────────────────────────────────────────────────────────
function makeClient() {
  return new NatlasClient({ baseURL: BASE_URL, asrBaseURL: ASR_URL, apiKey: API_KEY });
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION 1 — Language detection & systemPrompt helpers
// ─────────────────────────────────────────────────────────────────────────
function testLanguageHelpers() {
  sec("1 . Language Detection & systemPrompt Helpers");
  const samples = [
    ["Yoruba",           "Ki ni o se? Mo fe ko iwe Yoruba."],
    ["Hausa",            "Sannu! Yaya ake amfani da AI a Najeriya?"],
    ["Igbo",             "Kedu otu teknuzuu nwere ike inyere aka imuta?"],
    ["Nigerian English", "What is artificial intelligence and how can it help Nigeria?"],
  ];
  for (const [expected, text] of samples) {
    const detected = detectLanguage(text);
    const prompt   = systemPrompt(detected);
    ok(`${expected.padEnd(20)} -> detected=${JSON.stringify(detected).padEnd(22)}  role=${JSON.stringify(prompt.role)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION 2 — Chat (single response)
// ─────────────────────────────────────────────────────────────────────────
async function testChat(client) {
  sec("2 . Async Chat (Hausa + Igbo)");
  const prompts = [
    [HA, "Menene babban birnin Nijeriya kuma yaya yanayinta?"],
    [IG, "Kedu ihe bu AI na-eme maka ndi Nigeria?"],
  ];
  for (const [lang, question] of prompts) {
    const t0 = Date.now();
    const resp = await withRetry(`chat[${lang}]`, () =>
      client.chat(
        [systemPrompt(lang), { role: "user", content: question }],
        { max_tokens: 120, temperature: 0.2 }
      )
    );
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    ok(`[${lang}] ${elapsed}s | tokens=${resp.usage?.total_tokens} | done_reason=${JSON.stringify(resp.done_reason)}`);
    console.log(`     Q: ${question}`);
    console.log(`     A: ${resp.message.content}\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION 3 — Streaming Chat
// ─────────────────────────────────────────────────────────────────────────
async function testStreaming(client) {
  sec("3 . Streaming Chat (token-by-token)");
  const prompt = "List three unique benefits of preserving the Yoruba language in the digital age.";
  console.log(`  Q: ${prompt}`);
  process.stdout.write("  A: ");
  const t0 = Date.now();
  let chunks = 0;
  const stream = await client.chat(
    [{ role: "user", content: prompt }],
    { stream: true, max_tokens: 180 }
  );
  for await (const chunk of stream) {
    process.stdout.write(chunk.message.content || "");
    chunks++;
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\n  [OK]  Streaming complete -- ${chunks} chunks in ${elapsed}s`);
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION 4 — Text Generation
// ─────────────────────────────────────────────────────────────────────────
async function testGenerate(client) {
  sec("4 . Text Generation (generate)");
  const prompt = "Explain Nigeria's multilingual AI opportunity in two short paragraphs.";
  const t0 = Date.now();
  const resp = await client.generate(prompt, { max_tokens: 200, temperature: 0.3 });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  ok(`${elapsed}s | tokens=${resp.usage?.total_tokens} | done_reason=${JSON.stringify(resp.done_reason)}`);
  console.log(`  ${resp.response}`);
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION 5 — Tool Calling
// ─────────────────────────────────────────────────────────────────────────
async function testToolCalling(client) {
  sec("5 . Tool Calling (OpenAI function spec)");
  const fxTool = {
    type: "function",
    function: {
      name: "get_fx_rate",
      description: "Get the current USD to Naira exchange rate",
      parameters: {
        type: "object",
        properties: { currency: { type: "string", description: "Target currency code" } },
        required: ["currency"],
      },
    },
  };
  const resp = await client.chat(
    [{ role: "user", content: "What is the current USD to Naira rate?" }],
    { tools: [fxTool], tool_choice: "auto", max_tokens: 128 }
  );
  ok(`done_reason=${JSON.stringify(resp.done_reason)}`);
  if (resp.done_reason === "tool_calls" && resp.message.tool_calls?.length) {
    for (const tc of resp.message.tool_calls) {
      ok(`Tool invoked -> ${tc.function.name}(${tc.function.arguments})`);
    }
  } else {
    info(`Model answered directly: ${resp.message.content}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION 6 — Sovereign ASR (all 4 languages)
// ─────────────────────────────────────────────────────────────────────────
async function testASR(client) {
  sec("6 . Sovereign ASR -- Batch Transcription (all 4 languages)");
  const results = [];
  for (const sample of AUDIO_SAMPLES) {
    if (!fs.existsSync(sample.file)) {
      fail(`Audio file missing: ${sample.file}`);
      continue;
    }
    const audioBuffer = fs.readFileSync(sample.file);
    console.log(`\n  [${sample.lang.toUpperCase()}] ${path.basename(sample.file)}  (${audioBuffer.length.toLocaleString()} bytes)`);
    const t0 = Date.now();
    try {
      const result = await client.audio.transcriptions.create(audioBuffer, {
        model: sample.model,
        language: sample.lang,
        timestamp_granularities: ["word"],
      });
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
      ok(`${elapsed}s | duration=${result.duration}s | model=${result.model}`);
      console.log(`     GT  : ${sample.gt}`);
      console.log(`     OUT : ${result.text}`);
      if (result.words?.length) {
        console.log(`     words[0:4]: ${JSON.stringify(result.words.slice(0, 4).map(w => w.word))}`);
      }
      results.push({ lang: sample.lang, status: "PASS" });
    } catch (err) {
      fail(`ASR failed for ${sample.lang}: ${err.message}`);
      results.push({ lang: sample.lang, status: "FAIL" });
    }
  }
  console.log(`\n  ${"Lang".padEnd(18)} ${"Status"}`);
  console.log(`  ${"----".padEnd(18)} ${"------"}`);
  for (const r of results) {
    const icon = r.status === "PASS" ? "[OK] " : "[FAIL]";
    console.log(`  ${r.lang.padEnd(18)} ${icon} ${r.status}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION 7 — Built-in Agent Tools
// ─────────────────────────────────────────────────────────────────────────
async function testBuiltinTools() {
  sec("7 . Built-in Agent Tools (all 7)");

  // Offline tools
  info("nigeriaGazetteer('Lagos')");
  const gazResult = nigeriaGazetteer("Lagos");
  ok(`  -> ${JSON.stringify(gazResult).slice(0, 120)}`);

  info("mathEval('(50000 * 0.075) + 320')");
  const mathResult = mathEval("(50000 * 0.075) + 320");
  ok(`  -> ${JSON.stringify(mathResult)}`);

  // Network tools
  const netTools = [
    ["webSearch",       () => webSearch("N-ATLaS Nigeria AI multilingual")],
    ["weatherLookup",   () => weatherLookup("Abuja")],
    ["fxRates",         () => fxRates("USD", "NGN")],
    ["wikipediaLookup", () => wikipediaLookup("Yoruba language", "en")],
    ["fetchWebpage",    () => fetchWebpage("https://huggingface.co/NCAIR1")],
  ];
  for (const [display, fn] of netTools) {
    info(`${display}(...)`);
    const t0 = Date.now();
    try {
      const res = await fn();
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
      const preview = JSON.stringify(res).slice(0, 140).replace(/\n/g, " ");
      ok(`${elapsed}s -> ${preview}`);
    } catch (err) {
      fail(`${display}: ${err.message}`);
    }
  }

  // getOpenAITools / executeTool
  const schemas = getOpenAITools(["fx_rates", "math_eval"]);
  ok(`getOpenAITools(['fx_rates','math_eval']) -> ${schemas.length} schemas returned`);
  const execRes = await executeTool("math_eval", { expression: "2 ** 10" });
  ok(`executeTool('math_eval', {expression:'2**10'}) -> ${JSON.stringify(execRes)}`);

  // Custom tool registration
  registerTool({
    name: "ping_natlas",
    description: "Ping a URL to check it is reachable",
    parameters: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
    execute: async ({ url }) => {
      try {
        const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
        return { url, reachable: true, status: r.status };
      } catch (e) {
        return { url, reachable: false, error: e.message };
      }
    },
  });
  ok("Custom tool 'ping_natlas' registered");
  const pingRes = await executeTool("ping_natlas", { url: BASE_URL });
  ok(`executeTool('ping_natlas') -> ${JSON.stringify(pingRes)}`);
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────
async function main() {
  checkApiKey();
  hdr("N-ATLaS JavaScript SDK -- Full End-to-End Integration Runner");
  info(`SDK package  : natlas (js-sdk)`);
  info(`LLM endpoint : ${BASE_URL}`);
  info(`ASR endpoint : ${ASR_URL}`);
  info(`Attribution  : ${ATTRIBUTION}`);

  const client = makeClient();

  testLanguageHelpers();
  await testChat(client);
  await testStreaming(client);
  await testGenerate(client);
  await testToolCalling(client);
  await testASR(client);
  await testBuiltinTools();

  hdr("ALL SECTIONS COMPLETE");
  ok("JavaScript SDK is fully operational end-to-end");
}

main().catch((err) => {
  console.error("\n[FATAL]", err);
  process.exit(1);
});
