import nigeriaData from "./data/nigeria.json";

// 1. Nigeria Gazetteer (Offline Local Dataset)
export function nigeriaGazetteer(query) {
  const clean = (query || "").trim().toLowerCase();
  const states = nigeriaData.states || {};

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

  const matches = [];
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

// 2. Web Search (DuckDuckGo Lite + Instant Answer fallback)
export async function webSearch(query, maxResults = 5) {
  const clean = (query || "").trim();
  if (!clean) return [];

  // In the browser, scraping DuckDuckGo HTML fails due to CORS or proxy timeouts.
  // Instead, we use the DuckDuckGo Instant Answer JSON API which supports CORS natively.
  try {
    const apiRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(clean)}&format=json`);
    if (!apiRes.ok) throw new Error(`HTTP ${apiRes.status}`);
    
    const apiData = await apiRes.json();
    const results = [];
    
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
    
    if (results.length === 0) {
      results.push({
        title: "No Instant Answer Found",
        link: "",
        snippet: "DuckDuckGo API did not return an abstract for this query.",
      });
    }
    
    return results;
  } catch (err) {
    return [{ title: "Search Error", link: "", snippet: `DuckDuckGo lookup: ${err.message}` }];
  }
}

// 3. Web Page Reader / Fetcher
export async function fetchWebpage(url, maxChars = 4000) {
  try {
    const res = await fetch(url);
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
  } catch (err) {
    return { error: `Failed to fetch webpage: ${err.message}` };
  }
}

// 4. FX Rates
export async function fxRates(base = "USD", target = "NGN") {
  const b = (base || "USD").trim().toUpperCase();
  const t = (target || "NGN").trim().toUpperCase();

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${b}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
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
  } catch (err) {
    return { error: `FX fetch failed: ${err.message}` };
  }
}

// 5. Weather Lookup (Open-Meteo)
export async function weatherLookup(location) {
  const clean = (location || "").trim();
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=en&format=json`
    );
    if (!geoRes.ok) throw new Error(`Geocoding HTTP ${geoRes.status}`);
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      return { error: `Could not find coordinates for location '${location}'` };
    }

    const first = geoData.results[0];
    const { latitude, longitude, name, country } = first;

    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`
    );
    if (!wRes.ok) throw new Error(`Weather API HTTP ${wRes.status}`);
    const wData = await wRes.json();
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
  } catch (err) {
    return { error: `Weather lookup failed: ${err.message}` };
  }
}

// 6. Wikipedia Lookup
export async function wikipediaLookup(query, lang = "en") {
  const clean = (query || "").trim();
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`;
  try {
    const res = await fetch(url);
    if (res.status === 404) return { found: false, query, lang };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      found: true,
      title: data.title,
      summary: data.extract,
      url: data.content_urls?.desktop?.page || "",
      lang,
    };
  } catch (err) {
    return { error: `Wikipedia lookup failed: ${err.message}` };
  }
}

// 7. Math Evaluator
export function mathEval(expression) {
  try {
    const clean = (expression || "").replace(/\s+/g, "");
    if (!/^[\d\.\+\-\*\/\(\)\%]+$/.test(clean)) {
      return { expression, error: "Expression contains invalid characters" };
    }
    const fn = new Function(`return (${clean})`);
    return { expression, result: Number(fn()) };
  } catch (err) {
    return { expression, error: `Invalid expression: ${err.message}` };
  }
}
