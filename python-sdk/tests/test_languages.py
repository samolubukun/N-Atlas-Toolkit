from __future__ import annotations

import pytest

import natlas
from natlas import EN_NG, HA, IG, YO, detect_language, system_prompt
from natlas._types import Message


def test_language_constants_and_detection() -> None:
    assert (YO, HA, IG, EN_NG) == (
        "yoruba",
        "hausa",
        "igbo",
        "nigerian_english",
    )
    assert detect_language("Kí ni o ṣe? Mo fẹ́ kọ́ ìwé Yorùbá.") == YO
    assert detect_language("Sannu! Yaya ake amfani da AI a Najeriya?") == HA
    assert detect_language("Kedu otu teknụzụ nwere ike inyere aka ịmụta?") == IG
    assert detect_language("What is artificial intelligence and how can I use it?") == EN_NG
    assert detect_language("I have a question") == EN_NG
    assert detect_language("Sannu!") == HA
    assert detect_language("") == EN_NG


def test_system_prompt_returns_prependable_message() -> None:
    for language in (YO, HA, IG, EN_NG):
        message = system_prompt(language)
        assert isinstance(message, Message)
        assert message.role == "system"
        assert message.content
        assert natlas.ATTRIBUTION in message.content
    with pytest.raises(ValueError, match="Unsupported language"):
        system_prompt("french")
