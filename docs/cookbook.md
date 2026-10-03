# N-ATLaS Developer Cookbook

Production-ready, copy-pasteable recipe scripts demonstrating how to build actual applications with N-ATLaS.

---

## 1. WhatsApp Voice & Text Bot (`cookbook/whatsapp_bot.py`)
Demonstrates how to build a WhatsApp webhook handler that receives text or voice notes, transcribes voice notes via Sovereign ASR, detects language, and replies in the user's indigenous language.

```bash
python cookbook/whatsapp_bot.py
```

---

## 2. Customer Support & Dispute Classifier (`cookbook/customer_support_router.py`)
Demonstrates automating bank ticket resolution (POS decline, transfer delays, account queries) across Hausa, Igbo, Yoruba, and Nigerian Pidgin.

```bash
python cookbook/customer_support_router.py
```

---

Demonstrates a multi-stage AI pipeline:

---

## 4. Autonomous Agentic Tool Calling (`cookbook/agentic_tools.py`)
Demonstrates OpenAI-compatible multi-turn tool calling and function resolution with Nigerian-localized tools (`get_cbn_fx_rate`, `get_market_commodity_price`):

```bash
python cookbook/agentic_tools.py
```

---

## 5. Built-in Zero-Key Agent Tools

All 7 tools ship inside the SDK — no API key or sign-up required:

=== "Python"
    ```python
    from natlas import tools

    # Offline
    result = tools.nigeria_gazetteer("Ogun")  # state info + LGAs
    calc   = tools.math_eval("(200000 * 0.075) + 500")  # NGN VAT calc

    # Free live tools
    news   = tools.web_search("Nigerian AI startup funding 2025")
    rates  = tools.fx_rates("USD", "NGN")
    wx     = tools.weather_lookup("Port Harcourt")
    wiki   = tools.wikipedia_lookup("Igbo people", lang="ig")
    page   = tools.fetch_webpage("https://ncc.gov.ng")

    # OpenAI-compatible schemas for your agent loop
    schemas = tools.get_openai_tools()  # all 7 tools
    result  = tools.execute_tool("fx_rates", {"base": "USD", "target": "NGN"})
    ```

=== "JavaScript"
    ```typescript
    import { getOpenAITools, executeTool, nigeriaGazetteer, fxRates } from "natlas/tools";

    const state = nigeriaGazetteer("Rivers");
    const rate  = await fxRates("GBP", "NGN");
    const schemas = getOpenAITools();
    const result  = await executeTool("weather_lookup", { location: "Enugu" });
    ```

---

## 6. MCP Server — AI IDE Integration

Expose all N-ATLaS tools to Claude Desktop, Cursor, Antigravity, or Windsurf via the built-in MCP stdio server:

```bash
# Run from monorepo root
python python-sdk/src/mcp_server.py
```

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "natlas-tools": {
      "command": "python",
      "args": ["/absolute/path/to/N-Atlas-Toolkit/python-sdk/src/mcp_server.py"]
    }
  }
}
```
