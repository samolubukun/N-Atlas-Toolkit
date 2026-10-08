# Built-in Agent Tools

N-ATLaS ships **7 built-in, zero-API-key agent tools** in both the Python and JavaScript SDKs.
No external accounts, no credit cards, no rate limits beyond what the underlying free services impose.

---

## Tool Reference

| Tool | Description | Network? | Key Required? |
|------|-------------|----------|---------------|
| `web_search` / `webSearch` | DuckDuckGo web search | ✅ | ❌ |
| `fetch_webpage` / `fetchWebpage` | Clean text extractor from any URL | ✅ | ❌ |
| `weather_lookup` / `weatherLookup` | Live weather via Open-Meteo geocoding + forecast | ✅ | ❌ |
| `fx_rates` / `fxRates` | Live FX rates via open.er-api.com | ✅ | ❌ |
| `wikipedia_lookup` / `wikipediaLookup` | Wikipedia REST API (en, ha, yo, ig) | ✅ | ❌ |
| `nigeria_gazetteer` / `nigeriaGazetteer` | Offline 36 states + FCT + 774 LGAs | ❌ | ❌ |
| `math_eval` / `mathEval` | Safe AST arithmetic evaluator | ❌ | ❌ |

---

## Python SDK

### Installation

```bash
pip install natlas-sdk
# or editable / dev mode:
pip install natlas-sdk
```

### Usage

```python
from natlas import tools

# Offline tools — instant, no network
state = tools.nigeria_gazetteer("Lagos")
# {"found": True, "type": "state", "capital": "Ikeja", "total_lgas": 20, "lgas": [...]}

lga = tools.nigeria_gazetteer("Alimosho")
# {"found": True, "type": "lga_matches", "results": [{"lga": "Alimosho", "state": "Lagos", ...}]}

calc = tools.math_eval("(200000 * 0.075) + 500")
# {"expression": "(200000 * 0.075) + 500", "result": 15500.0}

# Free live tools — no API key
results = tools.web_search("latest Nigerian AI startups", max_results=5)
# [{"title": "...", "link": "...", "snippet": "..."}, ...]

weather = tools.weather_lookup("Abuja")
# {"location": "Abuja, Nigeria", "temperature_celsius": 28.4, "relative_humidity_percent": 62, ...}

rate = tools.fx_rates("USD", "NGN")
# {"base": "USD", "target": "NGN", "rate": 1620.5, "last_update": "...", "source": "..."}

wiki = tools.wikipedia_lookup("Hausa people", lang="ha")
# {"found": True, "title": "Hausawa", "summary": "...", "url": "...", "lang": "ha"}

page = tools.fetch_webpage("https://ncc.gov.ng", max_chars=3000)
# {"url": "...", "title": "...", "content": "...", "truncated": False}
```

### OpenAI Function-Calling Schemas

```python
from natlas import tools

# Get all 7 tool schemas (ready for any OpenAI-compatible model)
schemas = tools.get_openai_tools()

# Get a subset
schemas = tools.get_openai_tools(["web_search", "fx_rates", "nigeria_gazetteer"])

# Execute a tool by name (used after the model returns tool_calls)
result = tools.execute_tool("fx_rates", {"base": "USD", "target": "NGN"})
result = tools.execute_tool("fx_rates", '{"base": "USD", "target": "NGN"}')  # JSON string also accepted
```

### Full Agent Loop Example

```python
import natlas
from natlas import tools

client = natlas.Client()

schemas = tools.get_openai_tools(["web_search", "fx_rates", "weather_lookup"])

messages = [{"role": "user", "content": "What's USD to Naira today and weather in Lagos?"}]

response = client.chat(messages, tools=schemas, tool_choice="auto")

while response.done_reason == "tool_calls":
    messages.append(response.message.model_dump())
    for tc in response.message.tool_calls:
        tool_result = tools.execute_tool(tc.function.name, tc.function.arguments)
        messages.append({
            "role": "tool",
            "tool_call_id": tc.id,
            "content": str(tool_result),
        })
    response = client.chat(messages, tools=schemas, tool_choice="auto")

print(response.message.content)
```

### Register Custom Tools

```python
from natlas import tools

# Decorator style — schema auto-generated from type hints + docstring
@tools.tool
def get_commodity_price(commodity: str, market: str = "Mile 12") -> dict:
    """Get current price for a commodity in a Nigerian market."""
    return {"commodity": commodity, "market": market, "price_ngn": 4500}

# Function registration style
tools.register_tool(
    name="send_sms",
    func=my_sms_function,
    description="Send an SMS notification via local gateway.",
)

# Custom tools are immediately available in schemas and dispatcher
schemas = tools.get_openai_tools()              # includes custom tools
result  = tools.execute_tool("send_sms", {...})
```

### MCP Server

Expose all N-ATLaS tools to Claude Desktop, Cursor, Windsurf, or Antigravity IDE:

```bash
python python-sdk/src/mcp_server.py
```

Configure in `claude_desktop_config.json`:

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

---

## JavaScript / TypeScript SDK

### Installation

```bash
npm install natlas-sdk
# pnpm add ./js-sdk  /  bun add ./js-sdk
```

### Usage

```typescript
// Named namespace import (via main barrel)
import { tools } from "natlas";

// Or tree-shakeable subpath (smaller bundle)
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
} from "natlas/tools";

// Offline tools
const state = nigeriaGazetteer("Kano");
// { found: true, type: "state", capital: "Kano", total_lgas: 44, lgas: [...] }

const calc = mathEval("(200000 * 0.075) + 500");
// { expression: "...", result: 15500 }

// Free live tools
const results = await webSearch("Nigerian tech news", 5);
const weather = await weatherLookup("Lagos");
const rate    = await fxRates("GBP", "NGN");
const wiki    = await wikipediaLookup("Yoruba people", "yo");
const page    = await fetchWebpage("https://example.com", 3000);
```

### OpenAI Function-Calling Schemas

```typescript
import { getOpenAITools, executeTool } from "natlas/tools";

const schemas = getOpenAITools();                            // all 7
const subset  = getOpenAITools(["web_search", "fx_rates"]);  // subset

const result = await executeTool("fx_rates", { base: "USD", target: "NGN" });
```

### Register Custom Tools

```typescript
import { registerTool, getOpenAITools, executeTool } from "natlas/tools";

registerTool({
  name: "get_commodity_price",
  description: "Get the current price for a commodity in a Nigerian market.",
  parameters: {
    type: "object",
    properties: {
      commodity: { type: "string", description: "e.g. rice, tomatoes" },
      market:    { type: "string", description: "e.g. Mile 12, Oyingbo" },
    },
    required: ["commodity"],
  },
  execute: async ({ commodity, market = "Mile 12" }) => ({
    commodity,
    market,
    price_ngn: 4500,
  }),
});

// Immediately available in all helpers
const schemas = getOpenAITools();   // includes get_commodity_price
```

---

## Tool Details

### `nigeria_gazetteer` — Offline Nigerian Administrative Database

Queries an embedded static dataset of all **36 states + FCT and 774 LGAs**:

- Exact state match → returns `capital`, `geopolitical zone`, full LGA list
- Partial LGA match → returns all matching LGAs across states
- Works 100% offline, zero latency

### `math_eval` — Safe Arithmetic Evaluator

Parses and evaluates arithmetic expressions using Python's AST (not `eval`). Supports `+`, `-`, `*`, `/`, `**`, `%`, and parentheses. Rejects any non-numeric input. Zero hallucination risk.

### `web_search` — DuckDuckGo Search

Queries the DuckDuckGo HTML endpoint with no API key. Falls back to the DuckDuckGo Instant Answer JSON API if HTML parsing returns empty results.

### `weather_lookup` — Open-Meteo

Two-step: geocodes the location name → fetches current conditions (temperature, humidity, wind speed). Open-Meteo is a fully open, no-registration weather API.

### `fx_rates` — Exchange Rates

Uses [open.er-api.com](https://open.er-api.com) free tier — no key, updated daily. Ideal for NGN/USD/GBP/EUR/GHS/KES conversions.

### `wikipedia_lookup` — Wikipedia REST API

Fetches article summaries via the standard MediaWiki REST v1 API. Supports `en`, `ha` (Hausa), `yo` (Yoruba), and `ig` (Igbo) language editions.

### `fetch_webpage` — Web Page Reader

Fetches any public URL, strips scripts/styles/SVG, collapses whitespace, and returns clean readable text. Useful for grounding agents on specific documents or pages.
