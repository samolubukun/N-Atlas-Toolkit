#!/usr/bin/env python3
"""Standard Model Context Protocol (MCP) stdio server for N-ATLaS.

Provides 100% free, zero-key tools (DuckDuckGo Search, Weather, FX, Nigerian Gazetteer, Wikipedia)
directly to Claude Desktop, Cursor, Antigravity IDE, Windsurf, or any MCP-compatible agent.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

# Ensure local repo imports work when executed directly
_REPO_SRC = Path(__file__).resolve().parent
if str(_REPO_SRC) not in sys.path:
    sys.path.insert(0, str(_REPO_SRC))

from tools.registry import OPENAI_TOOL_SCHEMAS, execute_tool  # noqa: E402

SERVER_NAME = "natlas-tools-mcp"
SERVER_VERSION = "0.1.0"


def _format_mcp_tools() -> list[dict[str, Any]]:
    """Format tools according to MCP ListTools protocol."""
    mcp_tools = []
    for name, schema in OPENAI_TOOL_SCHEMAS.items():
        fn = schema.get("function", {})
        mcp_tools.append({
            "name": name,
            "description": fn.get("description", ""),
            "inputSchema": fn.get("parameters", {"type": "object", "properties": {}}),
        })
    return mcp_tools


def handle_request(req: dict[str, Any]) -> dict[str, Any] | None:
    method = req.get("method")
    req_id = req.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {"listChanged": False}
                },
                "serverInfo": {
                    "name": SERVER_NAME,
                    "version": SERVER_VERSION,
                },
            },
        }

    elif method == "notifications/initialized":
        # Notification from client, no response required
        return None

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": _format_mcp_tools()
            },
        }

    elif method == "tools/call":
        params = req.get("params", {})
        tool_name = params.get("name")
        tool_args = params.get("arguments", {})

        result = execute_tool(tool_name, tool_args)
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(result, indent=2, ensure_ascii=False) if not isinstance(result, str) else result,
                    }
                ],
                "isError": isinstance(result, dict) and "error" in result,
            },
        }

    elif method == "ping":
        return {"jsonrpc": "2.0", "id": req_id, "result": {}}

    # Standard JSON-RPC Method not found
    if req_id is not None:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Method '{method}' not found"},
        }
    return None


def main() -> None:
    """Run stdio JSON-RPC loop."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            res = handle_request(req)
            if res is not None:
                sys.stdout.write(json.dumps(res) + "\n")
                sys.stdout.flush()
        except Exception as e:
            err_resp = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": f"Parse error or exception: {str(e)}"},
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
