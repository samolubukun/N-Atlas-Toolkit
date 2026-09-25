"""Language presets and lightweight detection for N-ATLaS.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import re
from typing import Final

from ._types import LanguageValue, Message

YO: Final[LanguageValue] = "yoruba"
HA: Final[LanguageValue] = "hausa"
IG: Final[LanguageValue] = "igbo"
EN_NG: Final[LanguageValue] = "nigerian_english"

SUPPORTED_LANGUAGES: Final[tuple[LanguageValue, ...]] = (YO, HA, IG, EN_NG)

_YORUBA_WORDS = frozenset(
    {
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
    }
)
_HAUSA_WORDS = frozenset(
    {
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
    }
)
_IGBO_WORDS = frozenset(
    {
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
    }
)
_ENGLISH_WORDS = frozenset(
    {
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
    }
)
_STRONG_YORUBA = frozenset(
    {"bawo", "ìdí", "jẹ́", "jowo", "kini", "kí", "ṣe", "ṣùgbọ́", "tani", "wọn"}
)
_STRONG_HAUSA = frozenset({"barka", "sannu", "wannan", "yana", "yaya", "zaman", "zan"})
_STRONG_IGBO = frozenset({"gịnị", "kedu", "mgbe", "onye"})
_YORUBA_MARKS = frozenset("ẹọṣńṅ")
_IGBO_MARKS = frozenset("ịọụ")
_HAUSA_MARKS = frozenset("ƙɓɗʙ")


def _tokens(text: str) -> list[str]:
    return re.findall(r"[^\W\d_]+(?:'[^\W\d_]+)?", text.casefold(), flags=re.UNICODE)


def _word_score(
    tokens: list[str], vocabulary: frozenset[str], strong: frozenset[str] = frozenset()
) -> int:
    return sum(7 if token in strong else 3 for token in tokens if token in vocabulary)


def detect_language(text: str) -> LanguageValue:
    """Detect one of the four N-ATLaS language presets with a deterministic heuristic."""
    tokens = _tokens(text)
    if not tokens:
        return EN_NG
    scores: dict[LanguageValue, int] = {
        YO: _word_score(tokens, _YORUBA_WORDS, _STRONG_YORUBA)
        + 7 * sum(character in _YORUBA_MARKS for character in text.casefold()),
        HA: _word_score(tokens, _HAUSA_WORDS, _STRONG_HAUSA)
        + 7 * sum(character in _HAUSA_MARKS for character in text.casefold()),
        IG: _word_score(tokens, _IGBO_WORDS, _STRONG_IGBO)
        + 7 * sum(character in _IGBO_MARKS for character in text.casefold()),
        EN_NG: _word_score(tokens, _ENGLISH_WORDS),
    }
    best = max(scores, key=scores.__getitem__)
    return best if scores[best] >= 6 else EN_NG


def system_prompt(language: LanguageValue = EN_NG) -> Message:
    """Build the language-specific system message to prepend to a chat.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """
    if language not in SUPPORTED_LANGUAGES:
        supported = ", ".join(SUPPORTED_LANGUAGES)
        raise ValueError(f"Unsupported language {language!r}; choose one of: {supported}")
    prompts: dict[LanguageValue, str] = {
        YO: (
            "Jẹ́ òṣìṣẹ́ ọ̀nà N-ATLaS. Pada kí àti nínú àwọn ìdí èdè Yorùbá; fi ìtọ́ni sí i "
            "nípa ìwé ati ọ̀nà ìdá àgbé. N-ATLaS is an initiative of the Federal Ministry of "
            "Communications, Innovation and Digital Economy, and powered by Awarri Technologies."
        ),
        HA: (
            "Kuwa da taimakon N-ATLaS. Amsa cikin Hausa tare da bambancin al'ada, girmama, "
            "da tsaro. N-ATLaS is an initiative of the Federal Ministry of Communications, "
            "Innovation and Digital Economy, and powered by Awarri Technologies."
        ),
        IG: (
            "Ọ bụla enyem N-ATLaS. Zuba onye ọrụ ma ọ bụla edozi okwu gịnị, ọ dị mma, n'ihi "
            "na ọ dị n'ime ọtụtụ ọzọ. N-ATLaS is an initiative of the Federal Ministry of "
            "Communications, Innovation and Digital Economy, and powered by Awarri Technologies."
        ),
        EN_NG: (
            "You are a helpful Nigerian English assistant. Give clear, culturally aware answers "
            "and state uncertainty honestly. N-ATLaS is an initiative of the Federal Ministry of "
            "Communications, Innovation and Digital Economy, and powered by Awarri Technologies."
        ),
    }
    return Message(role="system", content=prompts[language])
