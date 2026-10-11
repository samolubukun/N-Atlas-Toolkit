/**
 * Resilient structured extraction with schema enforcement and error feedback retry.
 *
 * N-ATLaS is an initiative of the Federal Ministry of Communications,
 * Innovation and Digital Economy, and powered by Awarri Technologies.
 */

import { NatlasClient } from "./client.js";
import { Message } from "./types.js";

const CODE_BLOCK_RE = /```(?:json)?\s*([\s\S]*?)\s*```/i;

/**
 * Clean markdown fences, trailing commas, and single quotes before parsing.
 */
export function cleanAndParseJson<T = any>(raw: string): T {
  let text = raw.trim();

  const match = CODE_BLOCK_RE.exec(text);
  if (match && match[1]) {
    text = match[1].trim();
  }

  // 1. Try standard JSON parse
  try {
    return JSON.parse(text);
  } catch {
    // Continue cleaning
  }

  // 2. Strip trailing commas before closing braces/brackets
  const cleanedCommas = text.replace(/,\s*([\]}])/g, "$1");
  try {
    return JSON.parse(cleanedCommas);
  } catch {
    // Continue
  }

  // 3. Normalize single quotes to double quotes around properties/strings
  const cleanedQuotes = cleanedCommas.replace(/(?<=[\{\[,:])\s*'([^']+)'\s*(?=[\}\],:])/g, '"$1"');
  return JSON.parse(cleanedQuotes);
}

export interface ExtractOptions<T> {
  prompt: string | Message[];
  schema?: Record<string, any>;
  systemInstruction?: string;
  maxRetries?: number;
  temperature?: number;
  validate?: (parsed: any) => T;
}

export async function extract<T = any>(
  client: NatlasClient,
  options: ExtractOptions<T>
): Promise<T> {
  const {
    prompt,
    schema,
    systemInstruction = "Extract information according to the requested format.",
    maxRetries = 2,
    temperature = 0.1,
    validate,
  } = options;

  let schemaPrompt = systemInstruction;
  if (schema) {
    schemaPrompt += `\n\nCRITICAL: Respond ONLY with a valid JSON object matching this schema. Do not include markdown code fences or conversational text.\nSchema:\n${JSON.stringify(schema, null, 2)}`;
  } else {
    schemaPrompt += "\n\nCRITICAL: Respond ONLY with a valid JSON object. Do not include markdown code fences or conversational text.";
  }

  const conversation: Message[] = [
    { role: "system", content: schemaPrompt },
  ];

  if (typeof prompt === "string") {
    conversation.push({ role: "user", content: prompt });
  } else {
    conversation.push(...prompt);
  }

  let attempts = 0;
  let lastError: unknown = null;

  while (attempts <= maxRetries) {
    const response = await client.chat(conversation, {
      temperature,
    });

    const rawContent = response.message?.content || "";

    try {
      const parsed = cleanAndParseJson(rawContent);
      if (validate) {
        return validate(parsed);
      }
      return parsed as T;
    } catch (err) {
      lastError = err;
      attempts++;
      if (attempts > maxRetries) {
        break;
      }

      conversation.push({ role: "assistant", content: rawContent });
      conversation.push({
        role: "user",
        content: `Your previous response could not be parsed as valid JSON or failed validation: ${String(err)}. Please correct it and output strictly valid JSON.`,
      });
    }
  }

  throw new Error(`Failed to extract structured JSON after ${maxRetries} retries. Last error: ${String(lastError)}`);
}
