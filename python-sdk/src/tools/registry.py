"""Tool schemas, registry, and OpenAI-compatible execution dispatcher."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

from .core import (
    fetch_webpage,
    fx_rates,
    math_eval,
    nigeria_gazetteer,
    weather_lookup,
    web_search,
    wikipedia_lookup,
)

TOOL_REGISTRY: dict[str, Callable[..., Any]] = {
    "web_search": web_search,
    "fetch_webpage": fetch_webpage,
    "fx_rates": fx_rates,
    "weather_lookup": weather_lookup,
    "nigeria_gazetteer": nigeria_gazetteer,
    "wikipedia_lookup": wikipedia_lookup,
    "math_eval": math_eval,
}

OPENAI_TOOL_SCHEMAS: dict[str, dict[str, Any]] = {
    "web_search": {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Perform a real-time web search via DuckDuckGo without any API key. Returns top relevant pages and summaries.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query string, e.g. 'recent tech developments in Lagos'",
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default 5)",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    },
    "fetch_webpage": {
        "type": "function",
        "function": {
            "name": "fetch_webpage",
            "description": "Extract clean readable text/markdown from a specific URL for document inspection or reading articles.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The full HTTP/HTTPS URL of the webpage to read",
                    },
                    "max_chars": {
                        "type": "integer",
                        "description": "Maximum text characters to return (default 4000)",
                        "default": 4000,
                    },
                },
                "required": ["url"],
            },
        },
    },
    "fx_rates": {
        "type": "function",
        "function": {
            "name": "fx_rates",
            "description": "Get live foreign exchange rates for Naira (NGN) and other currencies (USD, EUR, GBP, GHS, KES) via open feeds.",
            "parameters": {
                "type": "object",
                "properties": {
                    "base": {
                        "type": "string",
                        "description": "Base currency code, e.g. 'USD', 'EUR', 'GBP'",
                        "default": "USD",
                    },
                    "target": {
                        "type": "string",
                        "description": "Target currency code, e.g. 'NGN', 'KES', 'GHS'",
                        "default": "NGN",
                    },
                },
            },
        },
    },
    "weather_lookup": {
        "type": "function",
        "function": {
            "name": "weather_lookup",
            "description": "Get current weather conditions (temperature, humidity, wind) for any city or region via Open-Meteo without an API key.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City or place name, e.g. 'Lagos', 'Kano', 'London'",
                    }
                },
                "required": ["location"],
            },
        },
    },
    "nigeria_gazetteer": {
        "type": "function",
        "function": {
            "name": "nigeria_gazetteer",
            "description": "Authoritative offline lookup of Nigeria's 36 States, FCT, and 774 Local Government Areas (LGAs), state capitals, and geopolitical zones.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "State name (e.g. 'Oyo', 'Kaduna') or LGA name (e.g. 'Ikeja', 'Bichi')",
                    }
                },
                "required": ["query"],
            },
        },
    },
    "wikipedia_lookup": {
        "type": "function",
        "function": {
            "name": "wikipedia_lookup",
            "description": "Search Wikipedia summaries and facts in English, Hausa (ha), Yoruba (yo), or Igbo (ig).",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Topic or person to search",
                    },
                    "lang": {
                        "type": "string",
                        "description": "Language code: 'en', 'ha', 'yo', or 'ig'",
                        "enum": ["en", "ha", "yo", "ig"],
                        "default": "en",
                    },
                },
                "required": ["query"],
            },
        },
    },
    "math_eval": {
        "type": "function",
        "function": {
            "name": "math_eval",
            "description": "Safely compute mathematical formulas, arithmetic, percentages, VAT, or interest without LLM calculation errors.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Mathematical expression, e.g. '(50000 * 0.075) + 120'",
                    }
                },
                "required": ["expression"],
            },
        },
    },
}


def register_tool(
    name: str | None = None,
    func: Callable[..., Any] | None = None,
    description: str | None = None,
    schema: dict[str, Any] | None = None,
) -> Callable[..., Any]:
    """Register a custom tool into the N-ATLaS tool ecosystem.

    Can be used directly:
        register_tool(name="check_order", func=my_func, description="...")
    Or as a decorator:
        @tool
        def check_order(order_id: str) -> dict:
            '''Check order delivery status.'''
            ...
    """
    import inspect

    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        tool_name = name or fn.__name__
        tool_desc = description or (fn.__doc__ or f"Execute {tool_name}").strip()

        if schema is not None:
            tool_schema = schema
        else:
            # Auto-generate OpenAI schema from function signature
            sig = inspect.signature(fn)
            properties: dict[str, Any] = {}
            required: list[str] = []

            type_map = {
                str: "string",
                int: "integer",
                float: "number",
                bool: "boolean",
                list: "array",
                dict: "object",
            }

            for param_name, param in sig.parameters.items():
                if param_name in ("self", "cls"):
                    continue

                param_type = type_map.get(param.annotation, "string")
                prop: dict[str, Any] = {"type": param_type}
                if param.default is not inspect.Parameter.empty:
                    prop["default"] = param.default
                else:
                    required.append(param_name)
                properties[param_name] = prop

            tool_schema = {
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": tool_desc,
                    "parameters": {
                        "type": "object",
                        "properties": properties,
                        "required": required,
                    },
                },
            }

        TOOL_REGISTRY[tool_name] = fn
        OPENAI_TOOL_SCHEMAS[tool_name] = tool_schema
        return fn
    # If user used bare decorator @tool without parentheses:
    # def register_tool(name: Callable ...)
    if callable(name) and func is None:
        actual_func = name
        name = None
        return decorator(actual_func)

    if func is not None:
        return decorator(func)
    return decorator


tool = register_tool


def get_openai_tools(tool_names: list[str] | None = None) -> list[dict[str, Any]]:
    """Return OpenAI-compliant tool schemas for function calling.

    Args:
        tool_names: Optional list of tool names to include. If None, returns all available tools.
    """
    if tool_names is None:
        return list(OPENAI_TOOL_SCHEMAS.values())
    return [OPENAI_TOOL_SCHEMAS[name] for name in tool_names if name in OPENAI_TOOL_SCHEMAS]


def execute_tool(name: str, arguments: Any) -> Any:
    """Execute a registered tool by name with arguments (dict or JSON string)."""
    func = TOOL_REGISTRY.get(name)
    if not func:
        return {"error": f"Tool '{name}' is not recognized. Available tools: {list(TOOL_REGISTRY.keys())}"}

    parsed_args = arguments
    if isinstance(arguments, str):
        try:
            parsed_args = json.loads(arguments) if arguments.strip() else {}
        except json.JSONDecodeError as e:
            return {"error": f"Failed to parse tool arguments as JSON: {str(e)}"}

    if not isinstance(parsed_args, dict):
        return {"error": "Arguments must be a key-value mapping"}

    try:
        return func(**parsed_args)
    except Exception as e:
        return {"error": f"Error executing tool '{name}': {str(e)}"}
