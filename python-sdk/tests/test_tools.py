import pytest
from natlas.tools.core import (
    fetch_webpage,
    fx_rates,
    math_eval,
    nigeria_gazetteer,
    weather_lookup,
    web_search,
    wikipedia_lookup,
)
from natlas.tools.registry import OPENAI_TOOL_SCHEMAS, execute_tool, get_openai_tools


def test_gazetteer_state_lookup():
    res = nigeria_gazetteer("Lagos")
    assert res["found"] is True
    assert res["type"] == "state"
    assert res["capital"] == "Ikeja"
    assert res["total_lgas"] == 20
    assert "Ikeja" in res["lgas"]


def test_gazetteer_lga_lookup():
    res = nigeria_gazetteer("Alimosho")
    assert res["found"] is True
    assert res["type"] == "lga_matches"
    assert any(m["lga"] == "Alimosho" and m["state"] == "Lagos" for m in res["results"])


def test_math_eval():
    res = math_eval("(250000 * 0.075) + 500")
    assert res["result"] == 19250.0


def test_tool_schemas():
    tools = get_openai_tools(["web_search", "weather_lookup", "nigeria_gazetteer"])
    assert len(tools) == 3
    assert all(t["type"] == "function" for t in tools)


def test_execute_tool_dispatcher():
    res = execute_tool("nigeria_gazetteer", {"query": "Oyo"})
    assert res["found"] is True
    assert res["capital"] == "Ibadan"
