from __future__ import annotations

import pytest
from pydantic import ValidationError

from natlas import ChatResponse, Message
from natlas._types import ChatRequest, GenerateRequest, normalize_messages


def test_chat_request_defaults_and_mapping_messages() -> None:
    request = ChatRequest(
        model="NCAIR1/N-ATLaS",
        messages=[{"role": "user", "content": "Hello"}],
    )
    assert request.max_tokens == 512
    assert request.temperature == 0.7
    assert request.repetition_penalty == 1.12
    assert request.stream is False
    assert request.messages[0].role == "user"
    payload = request.model_dump(mode="json", exclude_none=True)
    assert payload["messages"] == [{"role": "user", "content": "Hello"}]


def test_generate_request_and_message_extras() -> None:
    request = GenerateRequest(model="NCAIR1/N-ATLaS", prompt="Hello", max_tokens=8)
    assert request.prompt == "Hello"
    assert request.max_tokens == 8
    message = Message.model_validate({"role": "assistant", "content": "Hi", "custom": True})
    assert message.model_extra == {"custom": True}


def test_validation_errors() -> None:
    with pytest.raises(ValidationError):
        ChatRequest(model="", messages=[])
    with pytest.raises(ValidationError):
        ChatRequest(
            model="NCAIR1/N-ATLaS",
            messages=[{"role": "user", "content": "Hello"}],
            repetition_penalty=0,
        )
    with pytest.raises(ValidationError):
        ChatRequest(
            model="NCAIR1/N-ATLaS",
            messages=[{"role": "user", "content": "Hello"}],
            temperature=float("inf"),
        )
    with pytest.raises(ValueError, match="at least one"):
        normalize_messages([])


def test_response_models_are_typed() -> None:
    response = ChatResponse(
        model="NCAIR1/N-ATLaS",
        created=1,
        message={"role": "assistant", "content": "Hello"},
    )
    assert response.message.content == "Hello"
    assert response.usage.total_tokens == 0
