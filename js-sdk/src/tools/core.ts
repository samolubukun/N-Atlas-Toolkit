/**
 * 100% Free, zero-API-key built-in developer & agent tools for N-ATLaS (JS/TS).
 */

import nigeriaData from "./data/nigeria.json";

// ---------------------------------------------------------------------------
// 1. Nigeria Gazetteer (Offline Local Dataset)
// ---------------------------------------------------------------------------
export interface StateDetails {
  capital: string;
  zone: string;
  lgas: string[];
}

export interface GazetteerStateResult {
  found: true;
  type: "state";
  state: string;
  capital: string;
  zone: string;
  total_lgas: number;
  lgas: string[];
}

export interface GazetteerLgaResult {
  found: true;
  type: "lga_matches";
  matches_count: number;
  results: Array<{
    lga: string;
    state: string;
    zone: string;
    state_capital: string;
  }>;
}

export interface GazetteerNotFound {
  found: false;
  query: string;
  message: string;
  available_states: string[];
}

export type GazetteerResponse =
  | GazetteerStateResult
  | GazetteerLgaResult
  | GazetteerNotFound;

export function nigeriaGazetteer(query: string): GazetteerResponse {
  const clean = query.trim().toLowerCase();
  const states = (nigeriaData as { states: Record<string, StateDetails> }).states;

  // 1. Exact or case-insensitive State match
  for (const [stateName, info] of Object.entries(states)) {
    if (stateName.toLowerCase() === clean) {
      return {
        found: true,
        type: "state",
        state: stateName,
        capital: info.capital,
        zone: info.zone,
        total_lgas: info.lgas.length,
        lgas: info.lgas,
      };
    }
  }

  // 2. LGA substring match
  const matches: Array<{
    lga: string;
    state: string;
    zone: string;
    state_capital: string;
  }> = [];

  for (const [stateName, info] of Object.entries(states)) {
    for (const lga of info.lgas) {
      if (lga.toLowerCase().includes(clean)) {
        matches.push({
          lga,
          state: stateName,
          zone: info.zone,
          state_capital: info.capital,
        });
      }
    }
  }

  if (matches.length > 0) {
    return {
      found: true,
      type: "lga_matches",
      matches_count: matches.length,
      results: matches.slice(0, 15),
    };
  }

  return {
    found: false,
    query,
    message: `No Nigerian State or LGA matched query '${query}'.`,
    available_states: Object.keys(states),
  };
}

// ---------------------------------------------------------------------------
// 2. Web Search (DuckDuckGo Lite Engine - Zero Key)
// ---------------------------------------------------------------------------
export interface SearchResultItem {
  title: string;
  link: string;
  snippet: string;
}

export async function webSearch(
  query: string,
  maxResults = 5
): Promise<SearchResultItem[]> {
  const clean = query.trim();
  if (!clean) return [];

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(clean)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`DuckDuckGo returned HTTP ${res.status}`);
    }

    const html = await res.text();
    const results: SearchResultItem[] = [];

    const titleMatches = Array.from(html.matchAll(/<h2[^>]*class="result__title"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/gi));
    const snipMatches = Array.from(html.matchAll(/<a[^>]+class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi));
    const linkMatches = Array.from(html.matchAll(/<a[^>]+class="result__url"[^>]*href="([^"]+)"/gi));

    const count = Math.min(titleMatches.length, maxResults);
    for (let i = 0; i < count; i++) {
      const rawTitle = (titleMatches[i]?.[1] || "").replace(/<[^>]+>/g, "").trim();
      const rawSnip = (snipMatches[i]?.[1] || "").replace(/<[^>]+>/g, "").trim();
      let rawLink = (linkMatches[i]?.[1] || "").trim();

      if (rawLink.includes("uddg=")) {
        try {
          const matchUddg = /uddg=([^&]+)/.exec(rawLink);
          if (matchUddg && matchUddg[1]) {
            rawLink = decodeURIComponent(matchUddg[1]);
          }
        } catch {
          // ignore uri decode issues
        }
      } else if (rawLink.startsWith("//")) {
        rawLink = `https:${rawLink}`;
      }

      if (rawTitle) {
        results.push({
          title: rawTitle,
          link: rawLink,
          snippet: rawSnip,
        });
      }
    }

    // Fallback if HTML challenge was returned
    if (results.length === 0) {
      const apiRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(clean)}&format=json`);
      if (apiRes.ok) {
        const apiData = (await apiRes.json()) as any;
        if (apiData.Heading && apiData.AbstractText) {
          results.push({
            title: apiData.Heading,
            link: apiData.AbstractURL || "",
            snippet: apiData.AbstractText,
          });
        }
        for (const topic of apiData.RelatedTopics || []) {
          if (results.length >= maxResults) break;
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.FirstURL.split("/").pop()?.replace(/_/g, " ") || topic.Text.slice(0, 30),
              link: topic.FirstURL,
              snippet: topic.Text,
            });
          }
        }
      }
    }

    return results;
  } catch (err: any) {
    return [{ title: "Error", link: "", snippet: `Search failed: ${err.message}` }];
  }
}

// ---------------------------------------------------------------------------
// 3. Web Page Reader / Fetcher (Clean text extraction - Zero Key)
// ---------------------------------------------------------------------------
export async function fetchWebpage(
  url: string,
  maxChars = 4000
): Promise<{ url: string; title: string; content: string; truncated: boolean } | { error: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (N-ATLaS Toolkit Agent)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(html);
    const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : "";

    const clean = html
      .replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      url,
      title,
      content: clean.slice(0, maxChars),
      truncated: clean.length > maxChars,
    };
  } catch (err: any) {
    return { error: `Failed to fetch webpage: ${err.message}` };
  }
}

// ---------------------------------------------------------------------------
// 4. FX Rates (Open Public API - Zero Key)
// ---------------------------------------------------------------------------
export async function fxRates(
  base = "USD",
  target = "NGN"
): Promise<{ base: string; target: string; rate: number; last_update: string } | { error: string }> {
  const b = base.trim().toUpperCase();
  const t = target.trim().toUpperCase();

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${b}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as any;

    const rate = data.rates?.[t];
    if (rate !== undefined) {
      return {
        base: b,
        target: t,
        rate: Number(rate),
        last_update: data.time_last_update_utc || "",
      };
    }
    return { error: `Currency ${t} not found in exchange rate feed` };
  } catch (err: any) {
    return { error: `FX fetch failed: ${err.message}` };
  }
}

// ---------------------------------------------------------------------------
// 5. Weather Lookup (Open-Meteo - Zero Key)
// ---------------------------------------------------------------------------
export async function weatherLookup(location: string): Promise<Record<string, any>> {
  const clean = location.trim();
  try {
    // 1. Geocode
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=en&format=json`
    );
    if (!geoRes.ok) throw new Error(`Geocoding HTTP ${geoRes.status}`);
    const geoData = (await geoRes.json()) as any;

    if (!geoData.results || geoData.results.length === 0) {
      return { error: `Could not find coordinates for location '${location}'` };
    }

    const first = geoData.results[0];
    const { latitude, longitude, name, country } = first;

    // 2. Forecast
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`
    );
    if (!wRes.ok) throw new Error(`Weather API HTTP ${wRes.status}`);
    const wData = (await wRes.json()) as any;
    const curr = wData.current || {};

    return {
      location: `${name}, ${country || ""}`.trim().replace(/,\s*$/, ""),
      latitude,
      longitude,
      temperature_celsius: curr.temperature_2m,
      relative_humidity_percent: curr.relative_humidity_2m,
      wind_speed_kmh: curr.wind_speed_10m,
      source: "Open-Meteo (Free Open API)",
    };
  } catch (err: any) {
    return { error: `Weather lookup failed: ${err.message}` };
  }
}

// ---------------------------------------------------------------------------
// 6. Wikipedia Lookup (Public MediaWiki API - Zero Key)
// ---------------------------------------------------------------------------
export async function wikipediaLookup(
  query: string,
  lang: "en" | "ha" | "yo" | "ig" = "en"
): Promise<Record<string, any>> {
  const clean = query.trim();
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (N-ATLaS Toolkit Agent)" },
    });
    if (res.status === 404) {
      return { found: false, query, lang };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as any;

    return {
      found: true,
      title: data.title,
      summary: data.extract,
      url: data.content_urls?.desktop?.page || "",
      lang,
    };
  } catch (err: any) {
    return { error: `Wikipedia lookup failed: ${err.message}` };
  }
}

// ---------------------------------------------------------------------------
// 7. Math Evaluator (Safe Arithmetic - Zero Key)
// ---------------------------------------------------------------------------
export function mathEval(expression: string): { expression: string; result?: number; error?: string } {
  try {
    const clean = expression.replace(/\s+/g, "");
    // Ensure only safe math characters
    if (!/^[\d\.\+\-\*\/\(\)\%]+$/.test(clean)) {
      return { expression, error: "Expression contains invalid characters" };
    }
    // Safe evaluated arithmetic function
    const fn = new Function(`return (${clean})`);
    const val = fn();
    return { expression, result: Number(val) };
  } catch (err: any) {
    return { expression, error: `Invalid expression: ${err.message}` };
  }
}
