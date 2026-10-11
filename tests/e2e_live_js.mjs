import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Import local js-sdk from src directly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JS_SDK_PATH = path.resolve(__dirname, "../js-sdk/src/index.ts");

// We import NatlasClient directly from the built dist
import { NatlasClient, tools } from "../js-sdk/dist/index.mjs";

function logTest(name) {
  console.log(`\n[TEST] ---> ${name} ...`);
}

function passTest(msg = "PASS") {
  console.log(`       [OK] ${msg}`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("N-ATLaS JavaScript/TypeScript SDK Live End-to-End Test Suite");
  console.log("=".repeat(60));

  const baseURL = process.env.NATLAS_BASE_URL || "https://samuelolubukun-natlas-sovereign-engine.hf.space";
  const apiKey = process.env.NATLAS_API_KEY || "natlas-super-secret-key-2026";

  console.log(`Target Gateway: ${baseURL}`);
  console.log(`API Key:        ${apiKey.slice(0, 10)}...`);

  const client = new NatlasClient({
    baseURL,
    apiKey,
  });

  // 1. Connection and Models
  logTest("1. Checking Gateway Connection & Models List");
  const models = await client.get("models");
  if (!models || !models.data) {
    throw new Error(`Unexpected models response: ${JSON.stringify(models)}`);
  }
  const modelIds = models.data.map((m) => m.id);
  passTest(`Connected successfully! Available models: ${modelIds.join(", ")}`);

  // 2. Chat completion
  logTest("2. Non-Streaming Chat Completion");
  const chatRes = await client.chat([
    { role: "system", content: "You are N-ATLaS. Greet the user in Hausa." },
    { role: "user", content: "Good morning!" },
  ], {
    max_tokens: 50,
    temperature: 0.1,
  });
  const reply = chatRes.message?.content || "";
  if (!reply.trim()) {
    throw new Error("Chat response empty!");
  }
  passTest(`Model replied: '${reply.trim()}'`);

  // 3. Streaming Chat completion
  logTest("3. Streaming Chat Completion (SSE)");
  const stream = await client.chat([
    { role: "user", content: "Say 'Nigeria' in Igbo." }
  ], {
    stream: true,
    max_tokens: 30,
  });
  let fullStream = "";
  for await (const chunk of stream) {
    fullStream += chunk.message?.content || "";
  }
  if (!fullStream.trim()) {
    throw new Error("Streaming response empty!");
  }
  passTest(`Streamed response: '${fullStream.trim()}'`);

  // 4. Agent Tools test
  logTest("4. Built-in Nigerian Agent Tools Execution");
  const gaz = tools.nigeriaGazetteer("Kano");
  if (!gaz || !gaz.capital) {
    throw new Error(`Gazetteer lookup failed: ${JSON.stringify(gaz)}`);
  }
  const fx = await tools.fxRates("USD", "NGN");
  if (!fx || !fx.rate) {
    throw new Error(`FX rate failed: ${JSON.stringify(fx)}`);
  }
  passTest(`Gazetteer Kano verified (Capital: ${gaz.capital}). FX USD->NGN: ${fx.rate}`);

  // 5. Audio Whisper ASR Transcription
  logTest("5. Sovereign Whisper ASR Transcription");
  const audioFile = path.resolve(__dirname, "audio/yoruba.mp3");
  const audioBuf = fs.readFileSync(audioFile);
  const asrRes = await client.transcribe(audioBuf, { language: "yoruba" });
  if (!asrRes || !asrRes.text) {
    throw new Error("Audio transcription returned empty text!");
  }
  passTest(`Transcribed Yoruba audio: '${asrRes.text.trim()}'`);

  // 6. Structured JSON Extraction
  logTest("6. Resilient Structured JSON Extraction");
  const extracted = await client.extract({
    prompt: "Amina bought 3 cartons of biscuits for 18,500 naira and paid in full.",
    schema: {
      type: "object",
      properties: {
        customer: { type: "string" },
        amount_naira: { type: "number" },
        item: { type: "string" },
      },
      required: ["customer", "amount_naira", "item"],
    },
    temperature: 0.0,
  });
  if (!extracted || !extracted.customer) {
    throw new Error(`Extraction failed: ${JSON.stringify(extracted)}`);
  }
  passTest(`Extracted JSON object: ${JSON.stringify(extracted)}`);

  // 7. Semantic Helpers: Translate
  logTest("7. Semantic Helper: translate()");
  const trans = await client.translate("Good morning, how are you?", "yoruba");
  if (!trans) throw new Error("Translation failed");
  passTest(`Translated: '${trans}'`);

  // 8. Semantic Helpers: Summarize
  logTest("8. Semantic Helper: summarize()");
  const summary = await client.summarize(
    "The Federal Government of Nigeria is accelerating digital transformation and sovereign artificial intelligence initiatives through NCAIR and FMCIDE.",
    { maxWords: 15 }
  );
  if (!summary) throw new Error("Summary failed");
  passTest(`Summarized: '${summary}'`);

  // 9. Semantic Helpers: Classify
  logTest("9. Semantic Helper: classify()");
  const cat = await client.classify(
    "My card was debited 5,000 naira but the ATM did not dispense cash.",
    ["atm_dispense_error", "pin_reset", "loan_inquiry"]
  );
  passTest(`Classified category: '${cat}'`);

  // 10. Semantic Helpers: Classify Scam
  logTest("10. Semantic Helper: classifyScam()");
  const scamRes = await client.classifyScam(
    "Congratulations! Your phone number won 500,000 naira from CBN. Send 3,000 naira to claim."
  );
  passTest(`Scam analysis: ${JSON.stringify(scamRes)}`);

  // 11. Semantic Helpers: Voice Chat
  logTest("11. Semantic Helper: voiceChat() (ASR + Chat Pipeline)");
  const voiceRes = await client.voiceChat(audioBuf, {
    language: "yoruba",
    systemPrompt: "Acknowledge the voice note briefly in English.",
  });
  if (!voiceRes.transcription || !voiceRes.response) {
    throw new Error("Voice chat pipeline failed!");
  }
  passTest(`Voice chat succeeded! Transcribed: '${voiceRes.transcription.slice(0, 35)}...', Reply: '${voiceRes.response.slice(0, 35)}...'`);

  console.log("\n" + "=".repeat(60));
  console.log("ALL 11 JAVASCRIPT / TYPESCRIPT SDK CAPABILITIES PASSED PERFECTLY!");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\n❌ E2E JS Test Error:", err);
  process.exit(1);
});
