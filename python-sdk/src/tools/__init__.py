"""N-ATLaS tools module."""

from .core import (
    fetch_webpage,
    fx_rates,
    math_eval,
    nigeria_gazetteer,
    weather_lookup,
    web_search,
    wikipedia_lookup,
)
from .registry import (
    OPENAI_TOOL_SCHEMAS,
    TOOL_REGISTRY,
    execute_tool,
    get_openai_tools,
    register_tool,
    tool,
)

__all__ = [
    "web_search",
    "fetch_webpage",
    "fx_rates",
    "weather_lookup",
    "nigeria_gazetteer",
    "wikipedia_lookup",
    "math_eval",
    "TOOL_REGISTRY",
    "OPENAI_TOOL_SCHEMAS",
    "get_openai_tools",
    "execute_tool",
    "register_tool",
    "tool",
]
