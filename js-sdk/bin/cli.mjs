#!/usr/bin/env node

/**
 * N-ATLaS CLI for Node.js / JavaScript developers (`npx natlas`).
 *
 * Provides terminal commands for:
 * - `natlas chat [prompt]`
 * - `natlas transcribe <file>`
 * - `natlas stream-asr <file>`
 * - `natlas translate <text>`
 * - `natlas africanize <text>`
 * - `natlas models`
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { NatlasClient, detectLanguage, systemPrompt, YO, HA, IG, EN_NG } from "../dist/index.mjs";

const LANG_MAP = {
  yo: YO,
  yoruba: YO,
  ha: HA,
  hausa: HA,
  ig: IG,
  igbo: IG,
  en: EN_NG,
  english: EN_NG,
};

function parseArgs(args) {
  const result = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    } else {
      result._.push(arg);
    }
  }
  return result;
}

function printHelp() {
  console.log(`
N-ATLaS CLI (JavaScript / Node.js)
Usage: natlas <command> [options]

Commands:
  chat [prompt]         Chat with N-ATLaS (interactive REPL or one-shot SSE streaming)
  transcribe <file>     Speech-to-text audio transcription
  stream-asr <file>     Real-time WebSocket streaming transcription (Deepgram protocol)
  translate <text>      Translate text into an African language
  africanize <text>     Adapt tone to Nigerian cultural context
  models                List available models
  help                  Show this help message

Options:
  --baseURL <url>       Target LLM base URL
  --asrURL <url>        Target ASR base URL
  --apiKey <key>        N-ATLaS API Key
  --lang <language>     Language code (yo, ha, ig, en)
  --target <language>   Target language for translation (default: Yoruba)
  --context <preset>    Tone context (Lagos-Urban, Northern-Formal, etc.)
  --timestamps          Include word timestamps for transcription
`);
}

async function handleChat(client, args) {
  const prompt = args._.slice(1).join(" ");
  const langKey = args.lang ? LANG_MAP[args.lang.toLowerCase()] || args.lang : null;

  if (prompt) {
    const messages = [];
    if (langKey) messages.push(systemPrompt(langKey));
    messages.push({ role: "user", content: prompt });

    const stream = await client.chat(messages, { stream: true });
    for await (const chunk of stream) {
      process.stdout.write(chunk.message.content || "");
    }
    console.log();
    return;
  }

  // Interactive console
  console.log("=================================================");
  console.log("N-ATLaS Interactive Multilingual Console (Node)");
  console.log("Type 'exit' or Ctrl+C to quit.");
  console.log("=================================================\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const history = [];
  if (langKey) history.push(systemPrompt(langKey));

  const promptUser = () => {
    rl.question("You > ", async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        rl.close();
        return;
      }

      const detected = langKey || detectLanguage(trimmed);
      const activeHistory = [...history];
      if (history.length === 0 && detected) {
        activeHistory.push(systemPrompt(detected));
      }
      activeHistory.push({ role: "user", content: trimmed });

      process.stdout.write(`N-ATLaS [${detected || "general"}] > `);
      let fullReply = "";
      try {
        const stream = await client.chat(activeHistory, { stream: true });
        for await (const chunk of stream) {
          const content = chunk.message.content || "";
          process.stdout.write(content);
          fullReply += content;
        }
        console.log("\n");
        history.push({ role: "user", content: trimmed });
        history.push({ role: "assistant", content: fullReply });
      } catch (err) {
        console.error("\nError:", err.message);
      }
      promptUser();
    });
  };

  promptUser();
}

async function handleTranscribe(client, args) {
  const filePath = args._[1];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error("Error: Please provide a valid audio file path.");
    process.exit(1);
  }

  console.log(`Transcribing ${path.basename(filePath)}...`);
  const buf = fs.readFileSync(filePath);
  const options = {
    language: args.lang || "yoruba",
    timestamp_granularities: args.timestamps ? ["word"] : undefined,
  };

  const res = await client.audio.transcriptions.create(buf, options);
  console.log("\n=================================================");
  console.log("TRANSCRIPTION RESULT");
  console.log("=================================================");
  console.log("Text     :", res.text);
  console.log("Language :", res.language);
  console.log("Duration :", res.duration ? `${res.duration.toFixed(2)}s` : "N/A");
  if (res.words && res.words.length > 0) {
    console.log("\nWord Timestamps:");
    res.words.slice(0, 15).forEach((w) => {
      console.log(`  ${w.word.padEnd(15)} [${w.start.toFixed(2)}s -> ${w.end.toFixed(2)}s]`);
    });
  }
  console.log("=================================================");
}

async function handleStreamASR(client, args) {
  const filePath = args._[1];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error("Error: Please provide a valid audio file path to stream.");
    process.exit(1);
  }

  const lang = args.lang || "hausa";
  console.log(`Streaming ${path.basename(filePath)} via WebSocket (${lang})...`);
  const live = client.audio.transcriptions.live({ language: lang });

  live.on("transcript", (event) => {
    const text = event.channel?.alternatives?.[0]?.transcript;
    if (text) {
      console.log(`[${event.is_final ? "FINAL" : "INTERIM"}] ${text}`);
    }
  });

  live.on("error", (err) => console.error("Stream error:", err));

  const stream = fs.createReadStream(filePath, { highWaterMark: 4096 });
  for await (const chunk of stream) {
    live.send(chunk);
    await new Promise((r) => setTimeout(r, 50));
  }

  await new Promise((r) => setTimeout(r, 1000));
  live.close();
}

async function handleTranslate(client, args) {
  const text = args._.slice(1).join(" ");
  if (!text) {
    console.error("Error: Please provide text to translate.");
    process.exit(1);
  }

  const res = await client.post("translate", {
    text,
    target_lang: args.target || "Yoruba",
    tone: args.tone || "formal",
  });
  console.log(res.translation || res);
}

async function handleAfricanize(client, args) {
  const text = args._.slice(1).join(" ");
  if (!text) {
    console.error("Error: Please provide text to adapt.");
    process.exit(1);
  }

  const res = await client.post("africanize", {
    content: text,
    culture_context: args.context || "Lagos-Urban",
    formality: args.formality || "natural",
  });
  console.log(res.adapted_text || res);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (!command || command === "help" || args.help) {
    printHelp();
    return;
  }

  const client = new NatlasClient({
    baseURL: args.baseURL,
    asrBaseURL: args.asrURL,
    apiKey: args.apiKey || process.env.NATLAS_API_KEY,
  });

  switch (command) {
    case "chat":
      await handleChat(client, args);
      break;
    case "transcribe":
      await handleTranscribe(client, args);
      break;
    case "stream-asr":
      await handleStreamASR(client, args);
      break;
    case "translate":
      await handleTranslate(client, args);
      break;
    case "africanize":
      await handleAfricanize(client, args);
      break;
    case "models": {
      const models = await client.get("models");
      console.log("Available Models:", models);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("CLI Error:", err.message);
  process.exit(1);
});
