import { describe, it, expect } from "vitest";
import {
  nigeriaGazetteer,
  mathEval,
  getOpenAITools,
  executeTool,
} from "../src/tools/index.js";

describe("N-ATLaS JS/TS Tools", () => {
  it("looks up Nigerian State info offline", () => {
    const res = nigeriaGazetteer("Lagos");
    expect(res.found).toBe(true);
    if (res.found && res.type === "state") {
      expect(res.capital).toBe("Ikeja");
      expect(res.total_lgas).toBe(20);
      expect(res.lgas).toContain("Ikeja");
    }
  });

  it("looks up Nigerian LGA info offline", () => {
    const res = nigeriaGazetteer("Alimosho");
    expect(res.found).toBe(true);
    if (res.found && res.type === "lga_matches") {
      expect(res.results.some((m) => m.lga === "Alimosho" && m.state === "Lagos")).toBe(true);
    }
  });

  it("safely evaluates math expressions", () => {
    const res = mathEval("(100000 * 0.075) + 500");
    expect(res.result).toBe(8000);
  });

  it("generates OpenAI tool schemas", () => {
    const schemas = getOpenAITools(["web_search", "weather_lookup"]);
    expect(schemas.length).toBe(2);
    expect(schemas[0].type).toBe("function");
  });

  it("executes tools via dispatcher", async () => {
    const res = await executeTool("nigeria_gazetteer", { query: "Kano" });
    expect(res.found).toBe(true);
    expect(res.capital).toBe("Kano");
  });
});
