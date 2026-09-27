/**
 * SSE (Server-Sent Events) parser utility for streaming LLM responses.
 *
 * N-ATLaS is an initiative of the Federal Ministry of Communications,
 * Innovation and Digital Economy, and powered by Awarri Technologies.
 */

import { StreamProtocolError } from "./errors.js";

export const SSE_DONE = Symbol("SSE_DONE");

/**
 * Parses raw SSE string into JSON data or returns SSE_DONE.
 */
export function decodeSSEData(rawData: string): Record<string, unknown> | typeof SSE_DONE {
  const trimmed = rawData.trim();
  if (trimmed === "[DONE]") {
    return SSE_DONE;
  }
  let event: unknown;
  try {
    event = JSON.parse(rawData);
  } catch (err) {
    throw new StreamProtocolError("Hosted API returned malformed SSE JSON");
  }

  if (typeof event !== "object" || event === null || Array.isArray(event)) {
    throw new StreamProtocolError("Hosted API returned a non-object SSE event");
  }

  const obj = event as Record<string, unknown>;
  if (obj.error) {
    const msg =
      typeof obj.error === "object" && obj.error !== null && "message" in obj.error
        ? String((obj.error as { message?: unknown }).message)
        : typeof obj.error === "string"
        ? obj.error
        : "Hosted stream reported an error";
    throw new StreamProtocolError(msg);
  }

  return obj;
}

/**
 * Asynchronously iterate over chunks from a ReadableStream of Uint8Array,
 * yielding parsed JSON events until [DONE].
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<Record<string, unknown>, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let dataLines: string[] = [];
  let completed = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      // Keep incomplete trailing line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line === "") {
          if (dataLines.length > 0) {
            const raw = dataLines.join("\n");
            dataLines = [];
            const event = decodeSSEData(raw);
            if (event === SSE_DONE) {
              completed = true;
              return;
            }
            yield event;
          }
        } else if (line.startsWith("data:")) {
          let val = line.slice(5);
          if (val.startsWith(" ")) {
            val = val.slice(1);
          }
          dataLines.push(val);
        }
      }
    }

    // Flush any remaining line
    if (buffer.length > 0) {
      if (buffer.startsWith("data:")) {
        let val = buffer.slice(5);
        if (val.startsWith(" ")) {
          val = val.slice(1);
        }
        dataLines.push(val);
      }
      if (dataLines.length > 0) {
        const raw = dataLines.join("\n");
        const event = decodeSSEData(raw);
        if (event === SSE_DONE) {
          completed = true;
          return;
        }
        yield event;
      }
    }

    if (!completed) {
      throw new StreamProtocolError("Hosted API stream ended before [DONE]");
    }
  } finally {
    reader.releaseLock();
  }
}
