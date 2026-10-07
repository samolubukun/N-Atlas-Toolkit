import { describe, it, expect } from "vitest";
import {
  detectLanguage,
  systemPrompt,
  YO,
  HA,
  IG,
  EN_NG,
} from "../src/languages.js";
import { resolveBaseURL, resolveApiKey, NatlasClient } from "../src/client.js";
import { decodeSSEData, SSE_DONE } from "../src/sse.js";
import { ConfigurationError } from "../src/errors.js";

describe("Languages & Presets", () => {
  it("detects Yoruba phrases correctly", () => {
    expect(detectLanguage("Bawo ni nkan ṣe n lọ?")).toBe(YO);
    expect(detectLanguage("kí ló ń ṣẹlẹ̀ níbí yìí?")).toBe(YO);
  });

  it("detects Hausa phrases correctly", () => {
    expect(detectLanguage("Sannu da yamma, yaya aiki?")).toBe(HA);
    expect(detectLanguage("Barka da zuwa wannan gari")).toBe(HA);
  });

  it("detects Igbo phrases correctly", () => {
    expect(detectLanguage("Kedu ka ihe si aga nwa m?")).toBe(IG);
    expect(detectLanguage("Gịnị ka ị na-eme mgbe niile?")).toBe(IG);
  });

  it("detects Nigerian English as default or fallback", () => {
    expect(
      detectLanguage("What is the capital of Nigeria and how does AI work?")
    ).toBe(EN_NG);
    expect(detectLanguage("")).toBe(EN_NG);
  });

  it("generates system prompts with sovereign attribution", () => {
    const pYO = systemPrompt(YO);
    expect(pYO.role).toBe("system");
    expect(pYO.content).toContain("Jẹ́ òṣìṣẹ́ ọ̀nà N-ATLaS");
    expect(pYO.content).toContain("Awarri Technologies");

    const pHA = systemPrompt(HA);
    expect(pHA.content).toContain("Kuwa da taimakon N-ATLaS");

    const pIG = systemPrompt(IG);
    expect(pIG.content).toContain("Ọ bụla enyem N-ATLaS");

    const pEN = systemPrompt(EN_NG);
    expect(pEN.content).toContain("Nigerian English assistant");
  });
});

describe("Client URL and Key Resolution", () => {
  it("normalizes base URL with /v1/", () => {
    expect(resolveBaseURL("https://example.com")).toBe("https://example.com/v1/");
    expect(resolveBaseURL("https://example.com/v1")).toBe("https://example.com/v1/");
    expect(resolveBaseURL("https://example.com/v1/")).toBe("https://example.com/v1/");
    expect(resolveBaseURL("http://localhost:8000")).toBe("http://localhost:8000/v1/");
  });

  it("throws on invalid URLs", () => {
    expect(() => resolveBaseURL("not-a-url")).toThrow(ConfigurationError);
    expect(() => resolveBaseURL("ftp://example.com")).toThrow(ConfigurationError);
  });

  it("resolves API key", () => {
    expect(resolveApiKey("my-key")).toBe("my-key");
    expect(() => resolveApiKey("")).toThrow(ConfigurationError);
    expect(() => resolveApiKey(undefined)).toThrow(ConfigurationError);
  });


});

describe("SSE parser", () => {
  it("parses valid JSON data", () => {
    const raw = JSON.stringify({
      id: "chat-123",
      choices: [{ delta: { content: "Bawo" } }],
    });
    const parsed = decodeSSEData(raw) as any;
    expect(parsed.id).toBe("chat-123");
    expect(parsed.choices[0].delta.content).toBe("Bawo");
  });

  it("handles [DONE]", () => {
    expect(decodeSSEData("[DONE]")).toBe(SSE_DONE);
    expect(decodeSSEData(" [DONE] \n")).toBe(SSE_DONE);
  });
});

describe("Tool Calling & Function Execution", () => {
  it("handles tool_calls in chat response", async () => {
    const mockToolResponse = {
      id: "chatcmpl-tool-test",
      object: "chat.completion",
      created: 1720000000,
      model: "NCAIR1/N-ATLaS",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_abc",
                type: "function",
                function: {
                  name: "get_market_price",
                  arguments: JSON.stringify({ item: "rice", market: "Mile 12" }),
                },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
      usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
    };

    let capturedBody: any = null;
    const mockFetch = async (_url: any, init: any) => {
      capturedBody = JSON.parse(init.body);
      return new Response(JSON.stringify(mockToolResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = new NatlasClient({
      baseURL: "https://example.com",
      apiKey: "test-key",
      fetch: mockFetch,
    });

    const res = await client.chat(
      [{ role: "user", content: "How much is rice in Mile 12?" }],
      {
        tools: [
          {
            type: "function",
            function: {
              name: "get_market_price",
              description: "Look up commodity price",
              parameters: {
                type: "object",
                properties: { item: { type: "string" }, market: { type: "string" } },
              },
            },
          },
        ],
        tool_choice: "auto",
      }
    );

    expect(res.done_reason).toBe("tool_calls");
    expect(res.message.content).toBeNull();
    expect(res.message.tool_calls).toHaveLength(1);
    expect(res.message.tool_calls![0].function.name).toBe("get_market_price");

    // Check payload passed to backend
    expect(capturedBody.tools).toHaveLength(1);
    expect(capturedBody.tools[0].function.name).toBe("get_market_price");
    expect(capturedBody.tool_choice).toBe("auto");
  });
});
