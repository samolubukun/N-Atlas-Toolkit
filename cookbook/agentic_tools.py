"""
Recipe 4: Agentic Tool Calling & Function Execution with N-ATLaS 8B.

Demonstrates autonomous agentic reasoning using OpenAI-compatible function calling
with Nigerian localized tools:
1. CBN Exchange Rate Lookup (Central Bank of Nigeria FX)
2. Lagos & Regional Market Commodity Price Tracker
3. Nigerian Corporate Registry (CAC) Search
"""

import json

import natlas

client = natlas.Client()

# ---------------------------------------------------------------------------
# Tool Definitions (OpenAI standard function calling schema)
# ---------------------------------------------------------------------------
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_cbn_fx_rate",
            "description": "Look up official Central Bank of Nigeria (CBN) and parallel market exchange rates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "currency": {
                        "type": "string",
                        "description": "Currency code to convert to Naira (e.g. USD, GBP, EUR)",
                    }
                },
                "required": ["currency"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_commodity_price",
            "description": "Look up wholesale commodity prices across major Nigerian markets (e.g. Mile 12 Lagos, Dawanau Kano, Bodija Ibadan).",
            "parameters": {
                "type": "object",
                "properties": {
                    "commodity": {
                        "type": "string",
                        "description": "Agricultural commodity (e.g. rice, beans, garri, yam)",
                    },
                    "market": {
                        "type": "string",
                        "description": "Market name or Nigerian city",
                    },
                },
                "required": ["commodity"],
            },
        },
    },
]

# ---------------------------------------------------------------------------
# Simulated Tool Implementations (Connecting to local databases/APIs)
# ---------------------------------------------------------------------------
def execute_tool(name: str, args: dict) -> dict:
    if name == "get_cbn_fx_rate":
        currency = args.get("currency", "USD").upper()
        rates = {
            "USD": {"official": 1490.50, "parallel": 1620.00, "date": "2026-10-01"},
            "GBP": {"official": 1940.20, "parallel": 2100.00, "date": "2026-10-01"},
            "EUR": {"official": 1630.00, "parallel": 1750.00, "date": "2026-10-01"},
        }
        return rates.get(currency, {"error": f"Currency {currency} not tracked"})

    if name == "get_market_commodity_price":
        commodity = args.get("commodity", "").lower()
        market = args.get("market", "Mile 12").title()
        return {
            "commodity": commodity,
            "market": market,
            "unit": "50kg bag",
            "price_ngn": 85000,
            "trend": "stable",
        }

    return {"error": f"Unknown tool: {name}"}


def run_agentic_turn(user_query: str):
    print(f"\nUser Query: '{user_query}'")
    messages = [
        {
            "role": "system",
            "content": "You are an autonomous Nigerian business research assistant. Use the tools provided when requested by the user.",
        },
        {"role": "user", "content": user_query},
    ]

    # Turn 1: Model decides whether to call a tool
    response = client.chat(messages, tools=TOOLS, tool_choice="auto")

    # If the model requested a tool call
    if response.done_reason == "tool_calls" and response.message.tool_calls:
        tool_call = response.message.tool_calls[0]
        func_name = tool_call.function.name
        func_args = json.loads(tool_call.function.arguments)

        print(f"-> Agent invoked tool: `{func_name}` with args: {func_args}")
        tool_result = execute_tool(func_name, func_args)
        print(f"-> Tool returned: {tool_result}")

        # Turn 2: Feed tool output back to model for final synthesized answer
        messages.append(response.message)
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "name": func_name,
            "content": json.dumps(tool_result),
        })

        final_response = client.chat(messages)
        print(f"-> Agent Final Answer:\n{final_response.message.content}")
    else:
        print(f"-> Direct Answer: {response.message.content}")


if __name__ == "__main__":
    print("--- N-ATLaS 8B Agentic Function Calling Demo ---")
    run_agentic_turn("How much is a bag of rice in Mile 12 market right now?")
    run_agentic_turn("Kí ni exchange rate ti US Dollar si Naira loni?")
