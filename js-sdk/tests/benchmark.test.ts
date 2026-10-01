import { describe, it, expect } from "vitest";
import { NatlasClient } from "../src/client.js";

describe("JavaScript SDK Benchmark & Throughput Suite", () => {
  it("measures client initialization time", () => {
    const t0 = performance.now();
    const client = new NatlasClient({ apiKey: "test-bench-key" });
    const elapsed = performance.now() - t0;
    expect(client).toBeDefined();
    expect(elapsed).toBeLessThan(10); // Instant in-memory instantiation
  });

  it("evaluates stream chunk handling throughput", async () => {
    // Generate synthetic SSE payload representing 50 tokens
    const tokens = Array.from({ length: 50 }, (_, i) => `token_${i} `);
    const sseLines = tokens.map(
      (tok) => `data: ${JSON.stringify({ choices: [{ delta: { content: tok } }] })}\n\n`
    ).join("") + "data: [DONE]\n\n";

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(sseLines));
        controller.close();
      }
    });

    const mockFetch = async () => new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });

    const client = new NatlasClient({
      fetch: mockFetch,
      apiKey: "bench-key"
    });

    const t0 = performance.now();
    const chunks = [];
    const chatStream = await client.chat([{ role: "user", content: "Benchmark" }], { stream: true });

    for await (const chunk of chatStream) {
      chunks.push(chunk.message.content);
    }
    const durationMs = performance.now() - t0;

    expect(chunks.length).toBe(50);
    // 50 tokens processed swiftly across heterogeneous CI virtualized runners
    expect(durationMs).toBeLessThan(500);
  });
});
