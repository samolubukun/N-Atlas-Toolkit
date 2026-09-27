/**
 * Language presets and lightweight deterministic detection for N-ATLaS.
 *
 * N-ATLaS is an initiative of the Federal Ministry of Communications,
 * Innovation and Digital Economy, and powered by Awarri Technologies.
 */

import { LanguageValue, Message } from "./types.js";

export const YO = "yoruba" as const;
export const HA = "hausa" as const;
export const IG = "igbo" as const;
export const EN_NG = "nigerian_english" as const;

export const SUPPORTED_LANGUAGES: readonly LanguageValue[] = [
  YO,
  HA,
  IG,
  EN_NG,
] as const;

const YORUBA_WORDS = new Set([
  "bawo",
  "ẹ",
  "ẹ̀kọ́",
  "ìdí",
  "jẹ́",
  "jowo",
  "kini",
  "kí",
  "ko",
  "máa",
  "mo",
  "náà",
  "ni",
  "o",
  "ọ̀nà",
  "ṣe",
  "ṣùgbọ́n",
  "tani",
  "ti",
  "wọn",
  "yìí",
]);

const HAUSA_WORDS = new Set([
  "a",
  "barka",
  "da",
  "don",
  "ina",
  "kuma",
  "me",
  "sannu",
  "shin",
  "ta",
  "tare",
  "wannan",
  "yana",
  "yaya",
  "za",
  "zan",
  "zaman",
]);

const IGBO_WORDS = new Set([
  "aka",
  "dị",
  "e",
  "gịnị",
  "ihe",
  "ka",
  "kedu",
  "mara",
  "mgbe",
  "na",
  "nke",
  "nwa",
  "onye",
  "ụ",
  "ya",
]);

const ENGLISH_WORDS = new Set([
  "a",
  "and",
  "are",
  "artificial",
  "can",
  "do",
  "for",
  "how",
  "in",
  "intelligence",
  "is",
  "it",
  "of",
  "please",
  "the",
  "this",
  "to",
  "what",
  "with",
  "you",
]);

const STRONG_YORUBA = new Set([
  "bawo",
  "ìdí",
  "jẹ́",
  "jowo",
  "kini",
  "kí",
  "ṣe",
  "ṣùgbọ́",
  "tani",
  "wọn",
]);

const STRONG_HAUSA = new Set([
  "barka",
  "sannu",
  "wannan",
  "yana",
  "yaya",
  "zaman",
  "zan",
]);

const STRONG_IGBO = new Set(["gịnị", "kedu", "mgbe", "onye"]);

const YORUBA_MARKS = new Set("ẹọṣńṅ");
const IGBO_MARKS = new Set("ịọụ");
const HAUSA_MARKS = new Set("ƙɓɗʙ");

function getTokens(text: string): string[] {
  // Matches Unicode word characters, optionally with apostrophes (e.g., Nigerian contractions/words)
  const matches = text.toLowerCase().match(/[^\W\d_]+(?:'[^\W\d_]+)?/gu);
  return matches ?? [];
}

function wordScore(
  tokens: string[],
  vocab: Set<string>,
  strong: Set<string> = new Set()
): number {
  let score = 0;
  for (const token of tokens) {
    if (vocab.has(token)) {
      score += strong.has(token) ? 7 : 3;
    }
  }
  return score;
}

function countChars(text: string, chars: Set<string>): number {
  let count = 0;
  const lower = text.toLowerCase();
  for (const char of lower) {
    if (chars.has(char)) {
      count++;
    }
  }
  return count;
}

/**
 * Detect one of the four N-ATLaS language presets with a deterministic heuristic.
 */
export function detectLanguage(text: string): LanguageValue {
  const tokens = getTokens(text);
  if (tokens.length === 0) {
    return EN_NG;
  }

  const scores: Record<LanguageValue, number> = {
    [YO]:
      wordScore(tokens, YORUBA_WORDS, STRONG_YORUBA) +
      7 * countChars(text, YORUBA_MARKS),
    [HA]:
      wordScore(tokens, HAUSA_WORDS, STRONG_HAUSA) +
      7 * countChars(text, HAUSA_MARKS),
    [IG]:
      wordScore(tokens, IGBO_WORDS, STRONG_IGBO) +
      7 * countChars(text, IGBO_MARKS),
    [EN_NG]: wordScore(tokens, ENGLISH_WORDS),
  };

  let bestLang: LanguageValue = EN_NG;
  let bestScore = -1;

  for (const lang of [YO, HA, IG, EN_NG] as const) {
    if (scores[lang] > bestScore) {
      bestScore = scores[lang];
      bestLang = lang;
    }
  }

  return bestScore >= 6 ? bestLang : EN_NG;
}

/**
 * Build the language-specific system message to prepend to a chat.
 *
 * N-ATLaS is an initiative of the Federal Ministry of Communications,
 * Innovation and Digital Economy, and powered by Awarri Technologies.
 */
export function systemPrompt(language: LanguageValue = EN_NG): Message {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw new Error(
      `Unsupported language "${language}"; choose one of: ${SUPPORTED_LANGUAGES.join(", ")}`
    );
  }

  const prompts: Record<LanguageValue, string> = {
    [YO]:
      "Jẹ́ òṣìṣẹ́ ọ̀nà N-ATLaS. Pada kí àti nínú àwọn ìdí èdè Yorùbá; fi ìtọ́ni sí i " +
      "nípa ìwé ati ọ̀nà ìdá àgbé. N-ATLaS is an initiative of the Federal Ministry of " +
      "Communications, Innovation and Digital Economy, and powered by Awarri Technologies.",
    [HA]:
      "Kuwa da taimakon N-ATLaS. Amsa cikin Hausa tare da bambancin al'ada, girmama, " +
      "da tsaro. N-ATLaS is an initiative of the Federal Ministry of Communications, " +
      "Innovation and Digital Economy, and powered by Awarri Technologies.",
    [IG]:
      "Ọ bụla enyem N-ATLaS. Zuba onye ọrụ ma ọ bụla edozi okwu gịnị, ọ dị mma, n'ihi " +
      "na ọ dị n'ime ọtụtụ ọzọ. N-ATLaS is an initiative of the Federal Ministry of " +
      "Communications, Innovation and Digital Economy, and powered by Awarri Technologies.",
    [EN_NG]:
      "You are a helpful Nigerian English assistant. Give clear, culturally aware answers " +
      "and state uncertainty honestly. N-ATLaS is an initiative of the Federal Ministry of " +
      "Communications, Innovation and Digital Economy, and powered by Awarri Technologies.",
  };

  return {
    role: "system",
    content: prompts[language],
  };
}
