# Python SDK Guide

The official typed Python SDK (`natlas`) provides synchronous and asynchronous clients, Server-Sent Events (SSE) streaming, language detection, audio transcription, and **7 built-in free agent tools**.

---

## Installation

```bash
pip install natlas-sdk
```

For local ONNX / PyTorch dependencies:
```bash
pip install "natlas-sdk[local]"
```

---

## Initialization

```python
import natlas

# Reads NATLAS_BASE_URL and NATLAS_API_KEY from environment
client = natlas.Client()

# Or configure explicitly:
client = natlas.Client(
    base_url="https://<workspace>--natlas-engine-natlasapi-serve.modal.run",
    api_key="your-key",
)
```

---

## 1. Chat Completion & Streaming

### Synchronous Chat
```python
response = client.chat([
    natlas.system_prompt(natlas.HA),
    {"role": "user", "content": "Sannu! Menene sabon labari?"}
])
print(response.message.content)
```

### Real-Time SSE Streaming
```python
stream = client.chat([
    {"role": "user", "content": "Tell me a story about Lagos traffic."}
], stream=True)

for chunk in stream:
    print(chunk.message.content, end="", flush=True)
print()
```

---

## 2. Speech-to-Text (ASR)

### Batch Audio File Transcription
```python
with open("hausa_audio.mp3", "rb") as f:
    result = client.audio.transcriptions.create(
        file=f,
        model="NCAIR1/Hausa-ASR",
        timestamp_granularities=["word"]
    )

print("Transcription:", result.text)
for word in result.words:
    print(f"{word.word}: {word.start:.2f}s -> {word.end:.2f}s")
```



---

## 3. High-Level Semantic Helpers

The SDK includes high-level convenience methods for common workflows:

### Translation
```python
translated = client.translate(
    "Good morning, how are you and your family?",
    target_language="hausa",
)
print(translated)
```

### Summarization
```python
summary = client.summarize(
    long_article_text,
    max_words=60,
    language="yoruba",
)
```

### Scam & Financial Fraud Classification
```python
result = client.classify_scam(
    "Your BVN has been blocked by CBN. Call 08012345678 immediately to unblock your account."
)
print("Is Scam:", result["is_scam"])
print("Reason:", result["reason"])
```

### Full-Duplex Voice Chat (`voice_chat`)
Transcribes input audio via sovereign ASR, feeds the text to the sovereign LLM, and returns the response:
```python
with open("user_speech.wav", "rb") as f:
    resp = client.voice_chat(f.read(), language="yoruba")
    print("User said:", resp["user_text"])
    print("Assistant replied:", resp["assistant_text"])
```

---

## 4. Structured Extraction (`client.extract`)

Extract type-safe structured data conforming to a Pydantic schema with automatic JSON repair and error feedback retries:

```python
from pydantic import BaseModel, Field

class VendorLedgerEntry(BaseModel):
    customer_name: str
    items_purchased: list[str] = Field(default_factory=list)
    total_amount_ngn: float
    amount_paid_ngn: float
    outstanding_debt_ngn: float

# Automatically extracts and coerces into VendorLedgerEntry
entry = client.extract(
    response_model=VendorLedgerEntry,
    prompt="Madam Blessing came to buy 3 bags of rice and 2 cartons of indomie for 120,000 naira. She paid 80k cash, remaining 40k tomorrow."
)

print(entry.customer_name)        # "Madam Blessing"
print(entry.total_amount_ngn)     # 120000.0
print(entry.outstanding_debt_ngn) # 40000.0
```

---

## 5. Language Helpers & Presets

```python
import natlas

phrase = "Ndị be anyị, kedu ka unu mere?"
detected_lang = natlas.detect_language(phrase)  # "igbo"

# Prepend sovereign cultural system message
messages = [
    natlas.system_prompt(detected_lang),
    {"role": "user", "content": phrase}
]
```

---

## 6. Agentic Tool Calling (Function Calling)

N-ATLaS 8B supports OpenAI-compatible function calling for autonomous multi-turn agents and tool execution:

```python
import natlas

client = natlas.Client()

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_cbn_fx_rate",
            "description": "Fetch official Central Bank of Nigeria (CBN) foreign exchange rate for a currency pair.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pair": {"type": "string", "description": "Currency pair, e.g. USD/NGN, GBP/NGN"}
                },
                "required": ["pair"]
            }
        }
    }
]

messages = [
    {"role": "user", "content": "What is the current official CBN exchange rate for USD to Naira?"}
]

response = client.chat(messages, tools=tools)

if response.message.tool_calls:
    for tool_call in response.message.tool_calls:
        print(f"Tool to execute: {tool_call.function.name}")
        print(f"Arguments: {tool_call.function.arguments}")
```

---

## 7. Built-in Agent Tools (Zero-Key)

All 7 tools are available immediately after `pip install natlas-sdk` — no external API keys required:

```python
from natlas import tools

# Offline tools (no network needed)
tools.nigeria_gazetteer("Kano")           # 36 states + FCT + 774 LGAs
tools.math_eval("(50000 * 0.075) + 320")  # safe AST arithmetic

# Free live tools (no API key)
tools.web_search("N-ATLaS AI Nigeria")
tools.weather_lookup("Lagos")
tools.fx_rates("USD", "NGN")
tools.wikipedia_lookup("Yoruba language", lang="yo")
tools.fetch_webpage("https://example.com")
```

### Use with the N-ATLaS Agent Loop

```python
import natlas
from natlas import tools

client = natlas.Client()

# 1. Pass built-in schemas directly to the model
schemas = tools.get_openai_tools(["web_search", "fx_rates", "nigeria_gazetteer"])

response = client.chat(
    [{"role": "user", "content": "What is USD to Naira rate and latest Lagos news?"}],
    tools=schemas,
    tool_choice="auto",
)

# 2. Execute whichever tool the model chose
if response.done_reason == "tool_calls":
    for tc in response.message.tool_calls:
        result = tools.execute_tool(tc.function.name, tc.function.arguments)
        print(result)
```

### Register Custom Tools

```python
@tools.tool
def get_commodity_price(commodity: str, market: str = "Mile 12") -> dict:
    """Get Nigerian market commodity price."""
    return {"commodity": commodity, "market": market, "price_ngn": 4500}

# Your tool is now in TOOL_REGISTRY and OPENAI_TOOL_SCHEMAS
```

### MCP Server

```bash
# Expose all tools to Claude Desktop / Cursor / Antigravity
python python-sdk/src/mcp_server.py
```
