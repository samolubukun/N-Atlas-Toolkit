# Chat & Completions (LLM Guide)

Guide to prompt construction, date-aware system templates, and multilingual chat completions with N-ATLaS.

---

## The N-ATLaS Chat Template

N-ATLaS is built on Llama-3-8B with a sovereign, **date-aware** chat template format:

```text
<|start_header_id|>system<|end_header_id|>

Cutting Knowledge Date: December 2023
Today Date: 28 Sep 2026

You are a helpful sovereign multilingual assistant.<|eot_id|>
<|start_header_id|>user<|end_header_id|>

Sannu!<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
```

The Python and JS SDKs handle this date string template automatically without requiring manual string formatting.

---

## 1. Multilingual Chat Examples

=== "Python"
    ```python
    import natlas

    client = natlas.Client()

    response = client.chat([
        natlas.system_prompt(natlas.HA),
        {"role": "user", "content": "Ka ba ni shawara game da noma a lokacin damina."}
    ], temperature=0.7, max_tokens=300)

    print(response.message.content)
    ```

=== "TypeScript"
    ```typescript
    import { NatlasClient, systemPrompt, HA } from "natlas-sdk";

    const client = new NatlasClient();

    const response = await client.chat([
      systemPrompt(HA),
      { role: "user", content: "Ka ba ni shawara game da noma a lokacin damina." }
    ], { temperature: 0.7, max_tokens: 300 });

    console.log(response.message.content);
    ```

---

## 2. Server-Sent Events (SSE) Streaming

For interactive web applications, stream responses token-by-token:

=== "Python"
    ```python
    stream = client.chat([
        {"role": "user", "content": "Kedu uru teknụzụ bara taa?"}
    ], stream=True)

    for chunk in stream:
        print(chunk.message.content, end="", flush=True)
    ```

=== "TypeScript"
    ```typescript
    const stream = await client.chat([
      { role: "user", content: "Kedu uru teknụzụ bara taa?" }
    ], { stream: true });

---

## 3. Agentic Tool Calling (Function Calling)

N-ATLaS 8B supports structured tool definition and execution for autonomous agents:

=== "Python"
    ```python
    tools = [
        {
            "type": "function",
            "function": {
                "name": "lookup_food_price",
                "description": "Find current retail food market prices in Nigerian cities",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "commodity": {"type": "string"},
                        "city": {"type": "string"}
                    },
                    "required": ["commodity", "city"]
                }
            }
        }
    ]

    response = client.chat([
        {"role": "user", "content": "How much is a bag of rice in Kano today?"}
    ], tools=tools)

    if response.message.tool_calls:
        print(response.message.tool_calls[0].function.arguments)
    ```

=== "TypeScript"
    ```typescript
    const response = await client.chat([
      { role: "user", content: "How much is a bag of rice in Kano today?" }
    ], {
      tools: [
        {
          type: "function",
          function: {
            name: "lookup_food_price",
            description: "Find current retail food market prices in Nigerian cities",
            parameters: {
              type: "object",
              properties: {
                commodity: { type: "string" },
                city: { type: "string" }
              },
              required: ["commodity", "city"]
            }
          }
        }
      ]
    });
    ```
