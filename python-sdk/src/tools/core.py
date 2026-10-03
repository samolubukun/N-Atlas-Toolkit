"""100% Free, zero-API-key built-in developer & agent tools for N-ATLaS.

Includes:
- web_search: DuckDuckGo search (zero-key)
- fetch_webpage: Local clean text/markdown reader (zero-key)
- weather_lookup: Open-Meteo weather forecasts (zero-key)
- cbn_fx_rates: Open public foreign exchange rates (zero-key)
- nigeria_gazetteer: Offline 36 states + 774 LGAs directory (zero-key)
- wikipedia_lookup: Public multilingual MediaWiki reader (zero-key)
- math_eval: Safe AST arithmetic calculator (zero-key)
"""

from __future__ import annotations

import ast
import json
import operator
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

import httpx

# ---------------------------------------------------------------------------
# 1. Nigeria Gazetteer (Offline Local Dataset)
# ---------------------------------------------------------------------------
_DATA_DIR = Path(__file__).resolve().parent / "data"
_NIGERIA_DATA_FILE = _DATA_DIR / "nigeria.json"
_GAZETTEER_CACHE: Optional[Dict[str, Any]] = None


def _load_gazetteer() -> Dict[str, Any]:
    global _GAZETTEER_CACHE
    if _GAZETTEER_CACHE is None:
        if _NIGERIA_DATA_FILE.exists():
            with open(_NIGERIA_DATA_FILE, "r", encoding="utf-8") as f:
                _GAZETTEER_CACHE = json.load(f)
        else:
            _GAZETTEER_CACHE = {"states": {}}
    return _GAZETTEER_CACHE


def nigeria_gazetteer(query: str) -> Dict[str, Any]:
    """Look up authoritative administrative details for Nigerian States or LGAs (100% offline).

    Args:
        query: State name (e.g. 'Kano', 'Lagos', 'Oyo') or LGA name (e.g. 'Ikeja', 'Alimosho').

    Returns:
        Dict with state details, capital, geopolitical zone, and associated LGAs.
    """
    data = _load_gazetteer()
    states = data.get("states", {})
    clean_query = query.strip().lower()

    # 1. Exact or partial State match
    for state_name, info in states.items():
        if state_name.lower() == clean_query:
            return {
                "found": True,
                "type": "state",
                "state": state_name,
                "capital": info.get("capital"),
                "zone": info.get("zone"),
                "total_lgas": len(info.get("lgas", [])),
                "lgas": info.get("lgas", []),
            }

    # 2. LGA match
    matched_lgas: List[Dict[str, str]] = []
    for state_name, info in states.items():
        for lga in info.get("lgas", []):
            if clean_query in lga.lower():
                matched_lgas.append({
                    "lga": lga,
                    "state": state_name,
                    "zone": info.get("zone", ""),
                    "state_capital": info.get("capital", ""),
                })

    if matched_lgas:
        return {
            "found": True,
            "type": "lga_matches",
            "matches_count": len(matched_lgas),
            "results": matched_lgas[:15],
        }

    return {
        "found": False,
        "query": query,
        "message": f"No Nigerian State or LGA matched query '{query}'.",
        "available_states": list(states.keys()),
    }


# ---------------------------------------------------------------------------
# 2. Web Search (DuckDuckGo Lite Engine - Zero Key)
# ---------------------------------------------------------------------------
def web_search(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Perform a free web search via DuckDuckGo without any API key or subscription.

    Args:
        query: Search query string.
        max_results: Max number of result items to return (default 5).

    Returns:
        List of dicts with title, link, and snippet.
    """
    clean_query = query.strip()
    if not clean_query:
        return []

    url = f"https://html.duckduckgo.com/html/?q={quote_plus(clean_query)}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    }

    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            html = resp.text

        results: List[Dict[str, str]] = []
        titles = re.findall(r'<h2[^>]*class="result__title"[^>]*>\s*<a[^>]*>(.*?)</a>', html, re.DOTALL)
        snippets = re.findall(r'<a[^>]+class="result__snippet[^"]*"[^>]*>(.*?)</a>', html, re.DOTALL)
        links = re.findall(r'<a[^>]+class="result__url"[^>]*href="([^"]+)"', html)

        import html as html_lib
        from urllib.parse import parse_qs, urlparse

        for i in range(min(len(titles), max_results)):
            raw_title = html_lib.unescape(re.sub(r"<[^>]+>", "", titles[i])).strip()
            raw_snip = html_lib.unescape(re.sub(r"<[^>]+>", "", snippets[i])).strip() if i < len(snippets) else ""
            raw_url = links[i].strip() if i < len(links) else ""

            # Unpack real destination URL from DuckDuckGo redirect uddg
            if "uddg=" in raw_url:
                parsed_q = parse_qs(urlparse(raw_url).query)
                if "uddg" in parsed_q:
                    raw_url = parsed_q["uddg"][0]
            elif raw_url.startswith("//"):
                raw_url = f"https:{raw_url}"

            if raw_title:
                results.append({
                    "title": raw_title,
                    "link": raw_url,
                    "snippet": raw_snip,
                })

        # Fallback to DuckDuckGo Instant Answer API if HTML was challenged
        if not results:
            api_url = f"https://api.duckduckgo.com/?q={quote_plus(clean_query)}&format=json"
            with httpx.Client(timeout=6.0) as client:
                api_res = client.get(api_url, headers=headers)
                if api_res.status_code == 200:
                    api_data = api_res.json()
                    heading = api_data.get("Heading", "")
                    abstract = api_data.get("AbstractText", "")
                    abs_url = api_data.get("AbstractURL", "")
                    if heading and abstract:
                        results.append({"title": heading, "link": abs_url, "snippet": abstract})
                    for topic in api_data.get("RelatedTopics", []):
                        if len(results) >= max_results:
                            break
                        if isinstance(topic, dict) and "Text" in topic:
                            results.append({
                                "title": topic.get("FirstURL", "").split("/")[-1].replace("_", " "),
                                "link": topic.get("FirstURL", ""),
                                "snippet": topic.get("Text", ""),
                            })

        return results
    except Exception as e:
        return [{"error": f"Search execution failed: {str(e)}", "query": query}]


# ---------------------------------------------------------------------------
# 3. Web Page Reader / Fetcher (Clean text extraction - Zero Key)
# ---------------------------------------------------------------------------
def fetch_webpage(url: str, max_chars: int = 4000) -> Dict[str, Any]:
    """Fetch an open webpage and extract its clean readable text/markdown (Zero Key).

    Args:
        url: Full HTTP or HTTPS web URL.
        max_chars: Maximum characters of text to return (default 4000).

    Returns:
        Dict with url, title, and cleaned text content.
    """
    try:
        headers = {"User-Agent": "Mozilla/5.0 (N-ATLaS Toolkit Agent)"}
        with httpx.Client(timeout=12.0, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            html = resp.text

        # Extract title
        title_m = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        title = title_m.group(1).strip() if title_m else ""

        # Strip scripts, styles, svg
        clean = re.sub(r"<(script|style|svg|noscript)[^>]*>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
        # Strip all HTML tags
        text = re.sub(r"<[^>]+>", " ", clean)
        # Collapse whitespace
        text = re.sub(r"\s+", " ", text).strip()

        return {
            "url": url,
            "title": title,
            "content": text[:max_chars],
            "truncated": len(text) > max_chars,
        }
    except Exception as e:
        return {"error": f"Failed to fetch webpage: {str(e)}", "url": url}


# ---------------------------------------------------------------------------
# 4. FX Rates (Open Public API - Zero Key)
# ---------------------------------------------------------------------------
def fx_rates(base: str = "USD", target: str = "NGN") -> Dict[str, Any]:
    """Get live foreign exchange rates (e.g. USD to NGN) using open public feeds (Zero Key).

    Args:
        base: Base currency code (e.g. 'USD', 'EUR', 'GBP').
        target: Target currency code (e.g. 'NGN', 'GHS', 'KES').

    Returns:
        Dict with base currency, target currency, rate, and timestamp.
    """
    base_clean = base.strip().upper()
    target_clean = target.strip().upper()

    try:
        url = f"https://open.er-api.com/v6/latest/{base_clean}"
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
            data = resp.json()

        rates = data.get("rates", {})
        rate = rates.get(target_clean)

        if rate is not None:
            return {
                "base": base_clean,
                "target": target_clean,
                "rate": float(rate),
                "last_update": data.get("time_last_update_utc", ""),
                "source": "open.er-api.com (public feed)",
            }
        return {
            "error": f"Target currency '{target_clean}' not found in exchange rate feed.",
            "base": base_clean,
        }
    except Exception as e:
        return {"error": f"FX rate fetch failed: {str(e)}", "base": base_clean, "target": target_clean}


# ---------------------------------------------------------------------------
# 5. Weather Lookup (Open-Meteo - Zero Key)
# ---------------------------------------------------------------------------
def weather_lookup(location: str) -> Dict[str, Any]:
    """Get current weather forecast for any city or region via Open-Meteo (100% Free, Zero Key).

    Args:
        location: City or location name (e.g. 'Abuja', 'Lagos', 'Kano', 'London').

    Returns:
        Dict with temperature, condition, humidity, and location details.
    """
    clean_loc = location.strip()
    try:
        # 1. Geocode location via Open-Meteo geocoding API (free, zero-key)
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={quote_plus(clean_loc)}&count=1&language=en&format=json"
        with httpx.Client(timeout=8.0) as client:
            geo_res = client.get(geo_url)
            geo_res.raise_for_status()
            geo_data = geo_res.json()

        results = geo_data.get("results")
        if not results:
            return {"error": f"Could not find coordinates for location '{location}'."}

        first = results[0]
        lat = first["latitude"]
        lon = first["longitude"]
        name = first.get("name", location)
        country = first.get("country", "")

        # 2. Fetch current weather
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
        )
        with httpx.Client(timeout=8.0) as client:
            w_res = client.get(weather_url)
            w_res.raise_for_status()
            w_data = w_res.json()

        curr = w_data.get("current", {})
        return {
            "location": f"{name}, {country}".strip(", "),
            "latitude": lat,
            "longitude": lon,
            "temperature_celsius": curr.get("temperature_2m"),
            "relative_humidity_percent": curr.get("relative_humidity_2m"),
            "wind_speed_kmh": curr.get("wind_speed_10m"),
            "source": "Open-Meteo (Free Open API)",
        }
    except Exception as e:
        return {"error": f"Weather lookup failed: {str(e)}", "location": location}


# ---------------------------------------------------------------------------
# 6. Wikipedia Lookup (Public MediaWiki API - Zero Key)
# ---------------------------------------------------------------------------
def wikipedia_lookup(query: str, lang: str = "en") -> Dict[str, Any]:
    """Look up Wikipedia encyclopedic summaries in English, Hausa (ha), Yoruba (yo), or Igbo (ig).

    Args:
        query: Subject or entity to look up.
        lang: Language code ('en', 'ha', 'yo', 'ig'). Defaults to 'en'.

    Returns:
        Dict with title, summary, and article link.
    """
    clean_query = query.strip()
    target_lang = lang.strip().lower()
    url = f"https://{target_lang}.wikipedia.org/api/rest_v1/page/summary/{quote_plus(clean_query)}"

    try:
        headers = {"User-Agent": "Mozilla/5.0 (N-ATLaS Toolkit Agent)"}
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 404:
                return {"found": False, "query": query, "lang": target_lang}
            resp.raise_for_status()
            data = resp.json()

        return {
            "found": True,
            "title": data.get("title"),
            "summary": data.get("extract"),
            "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            "lang": target_lang,
        }
    except Exception as e:
        return {"error": f"Wikipedia query failed: {str(e)}", "query": query}


# ---------------------------------------------------------------------------
# 7. Math Evaluator (Safe AST Arithmetic - Zero Key)
# ---------------------------------------------------------------------------
_SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.Mod: operator.mod,
}


def math_eval(expression: str) -> Dict[str, Any]:
    """Safely calculate mathematical expressions using AST (Zero LLM hallucination, 100% offline).

    Args:
        expression: Math expression string, e.g. '(15000 * 0.075) + 320'.

    Returns:
        Dict with the evaluated result.
    """
    def _eval(node: ast.AST) -> Any:
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        elif isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError("Constants must be numeric")
        elif isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type in _SAFE_OPERATORS:
                return _SAFE_OPERATORS[op_type](_eval(node.left), _eval(node.right))
            raise ValueError(f"Unsupported binary operator: {op_type}")
        elif isinstance(node, ast.UnaryOp):
            op_type = type(node.op)
            if op_type in _SAFE_OPERATORS:
                return _SAFE_OPERATORS[op_type](_eval(node.operand))
            raise ValueError(f"Unsupported unary operator: {op_type}")
        raise ValueError(f"Unsupported expression node: {type(node)}")

    try:
        clean_expr = expression.strip()
        parsed = ast.parse(clean_expr, mode="eval")
        result = _eval(parsed)
        return {"expression": clean_expr, "result": result}
    except Exception as e:
        return {"error": f"Invalid math expression: {str(e)}", "expression": expression}
