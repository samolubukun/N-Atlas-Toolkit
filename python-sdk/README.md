# N-ATLaS Python SDK (`natlas`)

A typed Python SDK for Nigeria's sovereign multilingual LLM, [NCAIR1/N-ATLaS](https://huggingface.co/NCAIR1/N-ATLaS), built for the National AI Innovation Challenge.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.

This `python-sdk/` directory is the complete Python SDK project inside the N-ATLaS monorepo. Its package metadata, environment template, tests, examples, and SDK documentation live here; the Modal engine remains at the monorepo root.

`natlas` exposes one unified interface over two backends:

- `mode="local"` loads the gated model with Transformers in FP16 and `device_map="auto"`.
- `mode="hosted"` calls an OpenAI-compatible vLLM endpoint through a thin HTTPX wrapper.

## Features

- Synchronous `Client` and `AsyncClient`
- Typed `ChatResponse`, `GenerateResponse`, `Message`, and `Usage` models
- Synchronous and asynchronous streaming with `stream=True`
- Module-level `chat()` and `generate()` convenience functions
- Automatic N-ATLaS `date_string` chat-template handling
- Hausa, Igbo, Nigerian English, and Yoruba presets
- Deterministic language detection and language-specific system prompts
- Typed `get()` and `post()` escape hatches for additional hosted endpoints
- Clear configuration, connection, timeout, response, and stream errors
- Lazy model loading, so importing `natlas` does not download weights
- **Built-in agent tools** — 7 free, zero-API-key tools (`web_search`, `weather_lookup`, `fx_rates`, `nigeria_gazetteer`, `wikipedia_lookup`, `fetch_webpage`, `math_eval`) available as `natlas.tools`
- **MCP server** — standard Model Context Protocol stdio server for Cursor, Claude Desktop, Antigravity, and Windsurf

## Installation

Python 3.10 or newer is required.

From PyPI, install the hosted SDK:

```bash
python -m pip install natlas-sdk
```

Install local-inference dependencies as well (for offline use with GPUs):

```bash
python -m pip install "natlas-sdk[local]"
```

For development / editable install (also works):

```bash
python -m pip install -e ./python-sdk
# or from inside the sdk directory:
cd python-sdk
python -m pip install -e ".[test]"
```

The local extra installs PyTorch, Transformers, and Accelerate. These are intentionally optional because hosted users do not need the multi-gigabyte model stack.

## Hugging Face access

`NCAIR1/N-ATLaS` is gated. Before local use:

1. Sign in to Hugging Face.
2. Open the model page and accept its access conditions.
3. Create a token with permission to read gated repositories.
4. Export it as `HF_TOKEN` or pass it as `Client(hf_token=...)`.

A missing token raises `ConfigurationError` before model loading begins.

## Client Quickstart: 3 Ways to Run N-ATLaS

The `natlas` SDK seamlessly supports three execution environments with identical method signatures:

### 1. Hosted Live on Modal Cloud (Default)

Connect to the live production endpoint hosted on an NVIDIA A10G GPU:

```bash
export NATLAS_BASE_URL="https://samuelolubukun--natlas-engine-natlasapi-serve.modal.run"
export NATLAS_API_KEY="your-hosted-api-key"
```

```python
import natlas

# Uses NATLAS_BASE_URL (or host=...) and NATLAS_API_KEY
client = natlas.Client(
    mode="hosted",
    host="https://samuelolubukun--natlas-engine-natlasapi-serve.modal.run",
    api_key="your-api-key",
)

response = client.chat(
    [
        natlas.system_prompt(natlas.HA),
        {"role": "user", "content": "Sannu! Ka ba ni misali biyu na ayuka masu fa'idar da AI."},
    ],
    max_tokens=256,
)
print(response.message.content)

# 1b. Agentic Tool Calling (OpenAI Specification)
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_cbn_fx_rate",
            "description": "Fetch official Central Bank of Nigeria exchange rate",
            "parameters": {
                "type": "object",
                "properties": {"currency": {"type": "string"}},
                "required": ["currency"],
            },
        },
    }
]
tool_resp = client.chat(
    [{"role": "user", "content": "How much is USD to Naira right now?"}],
    tools=tools,
    tool_choice="auto",
)
if tool_resp.done_reason == "tool_calls":
    print("Tool invoked:", tool_resp.message.tool_calls[0].function.name)
```

### 2. Private On-Premises Server (Docker Compose + vLLM)

For enterprise or government data centers requiring 100% on-premises data isolation:

1. In the repository root, start the pre-configured vLLM engine:
   ```bash
   docker compose up -d
   ```
2. Connect your application using the SDK:
   ```python
   import os
   import natlas

   client = natlas.Client(
       host="http://localhost:8000",
       api_key=os.environ.get("NATLAS_API_KEY", "<YOUR_API_KEY>"),
   )

   response = client.chat([{"role": "user", "content": "Sannu!"}])
   print(response.message.content)
   ```

### 3. Pure In-Process Local Execution (Zero-Server / Offline)

An 8B FP16 model runs directly inside your Python process with local GPU or CPU:

```bash
pip install "./python-sdk[local]"
```

```python
import os
import natlas

# Runs in-process via Transformers & PyTorch (reads HF_TOKEN)
client = natlas.Client(
    mode="local",
    hf_token=os.environ["HF_TOKEN"],
    model="NCAIR1/N-ATLaS",
)

response = client.chat(
    [{"role": "user", "content": "What is artificial intelligence?"}],
    max_tokens=256,
)
print(response.message.content)
```

The first call downloads and caches the gated model (~16GB). Later calls reuse the Hugging Face cache. For guaranteed offline operation, set `HF_HUB_OFFLINE=1` after the initial successful load. Alternatively, run the diagnostic runner:
```bash
python run_local.py
```

Local inference automatically calls:

```python
tokenizer.apply_chat_template(
    messages,
    add_generation_prompt=True,
    tokenize=False,
    date_string="24 Sep 2026",
)
```

The SDK generates the current date in the model's required `DD Mon YYYY` format, independent of the operating system's locale.

## Text generation

```python
response = client.generate(
    "Explain Nigeria's multilingual technology opportunities in two paragraphs.",
    max_tokens=350,
    temperature=0.1,
    repetition_penalty=1.12,
)

print(response.response)
```

## Streaming

Synchronous streaming returns an iterator of the same typed response model:

```python
stream = client.chat(
    [{"role": "user", "content": "List three benefits of preserving Nigerian languages."}],
    stream=True,
    max_tokens=200,
)

for chunk in stream:
    print(chunk.message.content, end="", flush=True)
print()
```

The asynchronous interface mirrors the synchronous one:

```python
import asyncio

import natlas


async def main() -> None:
    async with natlas.AsyncClient(mode="hosted") as client:
        response = await client.chat(
            [{"role": "user", "content": "Hello!"}],
            max_tokens=80,
        )
        print(response.message.content)

        stream = await client.chat(
            [{"role": "user", "content": "Count from one to five."}],
            stream=True,
        )
        async for chunk in stream:
            print(chunk.message.content, end="", flush=True)


asyncio.run(main())
```

## Language helpers

```python
import natlas

question = "Kí ni o ṣe? Mo fẹ́ kọ́ ìwé Yorùbá."
language = natlas.detect_language(question)

response = client.chat(
    [
        natlas.system_prompt(language),
        {"role": "user", "content": question},
    ]
)
```

Presets:

```python
natlas.YO == "yoruba"
natlas.HA == "hausa"
natlas.IG == "igbo"
natlas.EN_NG == "nigerian_english"
```

`detect_language()` uses a deterministic, dependency-free heuristic based on language-specific characters and common words. It is suitable for routing prompts, not for linguistic research. `system_prompt(language)` returns a typed system `Message` ready to prepend to a conversation.

## Hosted escape hatches

Dedicated methods use the OpenAI-compatible routes. Additional hosted routes remain available through typed generic calls:

```python
from pydantic import BaseModel


class ModelList(BaseModel):
    object: str
    data: list[dict[str, object]]


models = client.get("models", cast_to=ModelList)

result = client.post(
    body={"content": "Let us work together.", "culture_context": "Lagos-Urban"},
)
```

Paths must be relative to the configured hosted origin. The SDK rejects absolute escape-hatch URLs so the API key cannot be redirected to another host.

## Sovereign Speech-to-Text (ASR)

The SDK provides first-class support for sovereign Nigerian speech recognition across Hausa, Igbo, Nigerian Accented English, and Yoruba using official Whisper Small models:

### Hosted Audio Transcription (`/v1/audio/transcriptions`)

```python
import os
import natlas

# Supports deterministic dual URL routing:
# base_url -> LLM endpoint
# asr_url  -> Sovereign ASR endpoint (or defaults to NATLAS_API_URL)
client = natlas.Client(
    base_url=os.environ.get("NATLAS_BASE_URL", "https://samuelolubukun--natlas-engine-natlasapi-serve.modal.run"),
    asr_url=os.environ.get("NATLAS_API_URL", "https://samuelolubukun--natlas-engine-natlasasrengine-serve.modal.run"),
    api_key=os.environ.get("NATLAS_API_KEY", "<YOUR_API_KEY>"),
)

# Hosted Transcription:
with open("yoruba_sample.wav", "rb") as audio_file:
    transcription = client.audio.transcriptions.create(
        file=audio_file,
        model="NCAIR1/Yoruba-ASR",
        language="yo",
        timestamp_granularities=["word"],
    )
    print(transcription.text)
    print(transcription.words)
```

### 3. Local In-Process Transcription (Pure Offline / On-Premise)

```python
with open("hausa_sample.wav", "rb") as audio_file:
    local_transcription = client.audio.transcriptions.create(
        file=audio_file,
        model="NCAIR1/Hausa-ASR",
        mode="local",
    )
    print(local_transcription.text)
```

Available Sovereign ASR Models:
* `NCAIR1/Hausa-ASR` (`language="ha"`)
* `NCAIR1/Igbo-ASR` (`language="ig"`)
* `NCAIR1/NigerianAccentedEnglish` (`language="en-ng"`)
* `NCAIR1/Yoruba-ASR` (`language="yo"`)

## Architecture

```text
                         Application
                              |
                +-------------+-------------+
                |                           |
         natlas.Client              natlas.AsyncClient
                |                           |
        +-------+-------+           +-------+-------+
        |               |           |               |
  LocalBackend    HostedBackend  LocalBackend   AsyncHostedBackend
        |               |               |               |
 Transformers     HTTPX JSON      thread bridge      HTTPX SSE
 fp16 + auto      OpenAI routes   + same types      OpenAI routes
 device map       + get/post()                      + get/post()
        |               |
 chat template   API errors,
 + date_string   typed responses
```


## Built-in Agent Tools

The `natlas.tools` namespace ships 7 ready-made, **100% free, zero-API-key** tools suitable for use in agent loops with any OpenAI-compatible LLM:

```python
from natlas import tools

# Offline tools (no network required)
tools.nigeria_gazetteer("Lagos")        # 36 states, FCT, 774 LGAs
tools.math_eval("(50000 * 0.075) + 320") # safe AST arithmetic

# Free network tools (no API key)
tools.web_search("N-ATLaS Nigeria AI")  # DuckDuckGo, no key
tools.weather_lookup("Abuja")           # Open-Meteo, no key
tools.fx_rates("USD", "NGN")           # open.er-api.com, no key
tools.wikipedia_lookup("Yoruba", lang="yo")  # Wikipedia REST API
tools.fetch_webpage("https://example.com")  # clean text extractor
```

### OpenAI Function-Calling Schemas

```python
# Get ready-made schemas for any agent loop
schemas = tools.get_openai_tools()               # all 7
schemas = tools.get_openai_tools(["web_search", "fx_rates"])  # subset

# Execute by name (used by agent loops after tool_calls response)
result = tools.execute_tool("fx_rates", {"base": "USD", "target": "NGN"})
```

### Register Custom Tools

```python
# Decorator style
@tools.tool
def check_order_status(order_id: str) -> dict:
    """Check delivery status for an order."""
    return {"order_id": order_id, "status": "in_transit"}

# Function style
tools.register_tool(
    name="send_sms",
    func=my_sms_fn,
    description="Send an SMS via local gateway",
)
```

Custom tools are automatically added to `TOOL_REGISTRY` and `OPENAI_TOOL_SCHEMAS`, and are callable via `execute_tool()`.

### MCP Server (Cursor, Claude Desktop, Antigravity)

Run the built-in MCP stdio server to expose all N-ATLaS tools directly in any MCP-compatible AI IDE:

```bash
python python-sdk/src/mcp_server.py
```

Configure in your `claude_desktop_config.json` or Antigravity MCP config:

```json
{
  "mcpServers": {
    "natlas-tools": {
      "command": "python",
      "args": ["/absolute/path/to/python-sdk/src/mcp_server.py"]
    }
  }
}
```

---

## Package layout

```text
src/
  __init__.py       public exports and module-level functions
  client.py         Client, AsyncClient, Audio namespace, live ASR session
  _types.py         typed requests, responses, and sampling options
  local.py          Transformers backend & local Whisper ASR
  hosted.py         HTTPX hosted backend & ASR client
  languages.py      presets, detection, and system prompts
  exceptions.py     SDK exception hierarchy
  mcp_server.py     MCP stdio server for AI IDE integrations
  py.typed          PEP 561 marker
  tools/
    __init__.py     public tools exports
    core.py         7 built-in zero-key tool implementations
    registry.py     TOOL_REGISTRY, schemas, execute_tool, register_tool
    data/
      nigeria.json  offline gazetteer: 36 states, FCT, 774 LGAs
examples/
  local_chat.py
  hosted_chat_streaming.py
  language_detect.py
tests/
  mocked HTTP, SSE, local backend, typing, ASR, language, and tools tests
```

## Examples

```bash
python examples/language_detect.py

HF_TOKEN=... python examples/local_chat.py

NATLAS_BASE_URL=... NATLAS_API_KEY=... \
  python examples/hosted_chat_streaming.py
```

## Verification

```bash
cd python-sdk
python -m pytest                              # all tests
python -m pytest tests/test_tools.py -v       # tools-specific tests
python -m ruff check src tests examples
python -m ruff format --check src tests examples
python -m mypy src
```

Hosted tests use `respx`; no unit test calls the live Modal deployment or downloads model weights. The monorepo root `test_natlas.py` remains available as an opt-in live server smoke runner.

## Existing Modal deployment

The monorepo root server entrypoint remains `natlas_engine.py`:

```bash
cd ..
modal deploy natlas_engine.py
```

The hosted SDK does not import Modal or vLLM. It only needs the resulting OpenAI-compatible base URL and API key.

## License and attribution

The `natlas` SDK source is provided under the MIT License in `LICENSE`. The separate model-terms summary is in `MODEL_LICENSE.md`; the authoritative model card controls.

N-ATLaS itself is **not** covered by the SDK's MIT License. The model and derivatives are governed by the **N-ATLaS Open-Source Research and Innovation License**:

- Use is limited to organizations, institutions, or projects with no more than **1,000 active end-users** in a rolling 30-day period.
- Commercial use requires a separate licensing agreement with Awarri Technologies.
- Derivative works of N-ATLaS must be released under the same terms.
- Required public attribution must be retained.
- Renamed model derivatives must carry the suffix **“Powered by Awarri.”**

Required attribution:

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
