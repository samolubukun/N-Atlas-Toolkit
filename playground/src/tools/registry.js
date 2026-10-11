import {
  fetchWebpage,
  fxRates,
  mathEval,
  nigeriaGazetteer,
  weatherLookup,
  webSearch,
  wikipediaLookup,
} from "./core.js";

export const OPENAI_TOOL_SCHEMAS = {
  web_search: {
    type: "function",
    function: {
      name: "web_search",
      description: "Perform real-time web search via DuckDuckGo without any API key.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          max_results: { type: "integer", default: 5 },
        },
        required: ["query"],
      },
    },
  },
  fetch_webpage: {
    type: "function",
    function: {
      name: "fetch_webpage",
      description: "Extract clean text/markdown from a URL.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to fetch" },
          max_chars: { type: "integer", default: 4000 },
        },
        required: ["url"],
      },
    },
  },
  fx_rates: {
    type: "function",
    function: {
      name: "fx_rates",
      description: "Live foreign exchange rates for Naira (NGN) and global currencies via open feeds.",
      parameters: {
        type: "object",
        properties: {
          base: { type: "string", default: "USD" },
          target: { type: "string", default: "NGN" },
        },
      },
    },
  },
  weather_lookup: {
    type: "function",
    function: {
      name: "weather_lookup",
      description: "Live weather conditions for any location via Open-Meteo.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City or region name" },
        },
        required: ["location"],
      },
    },
  },
  nigeria_gazetteer: {
    type: "function",
    function: {
      name: "nigeria_gazetteer",
      description: "Authoritative offline lookup of Nigeria's 36 States, FCT, and 774 LGAs.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "State or LGA name" },
        },
        required: ["query"],
      },
    },
  },
  wikipedia_lookup: {
    type: "function",
    function: {
      name: "wikipedia_lookup",
      description: "Wikipedia factual summaries in English, Hausa (ha), Yoruba (yo), or Igbo (ig).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Topic to lookup" },
          lang: { type: "string", enum: ["en", "ha", "yo", "ig"], default: "en" },
        },
        required: ["query"],
      },
    },
  },
  math_eval: {
    type: "function",
    function: {
      name: "math_eval",
      description: "Safely calculate arithmetic formulas, percentages, VAT, or interest.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Math formula, e.g. '(50000 * 0.075) + 100'" },
        },
        required: ["expression"],
      },
    },
  },
};

export const CUSTOM_TOOL_EXECUTORS = {};

export function registerTool(toolDef) {
  OPENAI_TOOL_SCHEMAS[toolDef.name] = {
    type: "function",
    function: {
      name: toolDef.name,
      description: toolDef.description,
      parameters: toolDef.parameters,
    },
  };
  CUSTOM_TOOL_EXECUTORS[toolDef.name] = toolDef.execute;
}

export function getOpenAITools(toolNames) {
  if (!toolNames) {
    return Object.values(OPENAI_TOOL_SCHEMAS);
  }
  return toolNames.map((name) => OPENAI_TOOL_SCHEMAS[name]).filter(Boolean);
}

export async function executeTool(name, args) {
  const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;

  if (CUSTOM_TOOL_EXECUTORS[name]) {
    try {
      return await CUSTOM_TOOL_EXECUTORS[name](parsedArgs);
    } catch (err) {
      return { error: `Error executing custom tool '${name}': ${err.message}` };
    }
  }

  switch (name) {
    case "web_search":
      return await webSearch(parsedArgs.query, parsedArgs.max_results);
    case "fetch_webpage":
      return await fetchWebpage(parsedArgs.url, parsedArgs.max_chars);
    case "fx_rates":
      return await fxRates(parsedArgs.base, parsedArgs.target);
    case "weather_lookup":
      return await weatherLookup(parsedArgs.location);
    case "nigeria_gazetteer":
      return nigeriaGazetteer(parsedArgs.query);
    case "wikipedia_lookup":
      return await wikipediaLookup(parsedArgs.query, parsedArgs.lang);
    case "math_eval":
      return mathEval(parsedArgs.expression);
    default:
      return { error: `Tool '${name}' is not recognized.` };
  }
}
