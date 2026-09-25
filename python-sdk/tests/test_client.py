from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest
import respx

import natlas
from natlas import (
    APIStatusError,
    ChatResponse,
    Client,
    ConfigurationError,
    GenerateResponse,
    Message,
    StreamProtocolError,
)


def chat_payload() -> dict[str, object]:
    return {
        "id": "chatcmpl-test",
        "object": "chat.completion",
        "created": 1_789_000_000,
        "model": "NCAIR1/N-ATLaS",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "Sannu!"},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 8,
            "completion_tokens": 2,
            "total_tokens": 10,
        },
    }


def completion_payload() -> dict[str, object]:
    return {
        "id": "cmpl-test",
        "object": "text_completion",
        "created": 1_789_000_000,
        "model": "NCAIR1/N-ATLaS",
        "choices": [
            {
                "text": " N-ATLaS",
                "index": 0,
                "logprobs": None,
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 3,
            "completion_tokens": 1,
            "total_tokens": 4,
        },
    }


@respx.mock
def test_hosted_chat_typed_response_and_request_contract() -> None:
    route = respx.post("https://example.test/v1/chat/completions").mock(
        return_value=httpx.Response(200, json=chat_payload())
    )
    with Client(
        base_url="https://example.test", api_key="secret", model="NCAIR1/N-ATLaS"
    ) as client:
        response = client.chat(
            [{"role": "user", "content": "Sannu!"}],
            max_tokens=64,
            temperature=0.2,
        )
    assert isinstance(response, ChatResponse)
    assert response.message.content == "Sannu!"
    assert response.done is True
    assert response.usage.total_tokens == 10
    request = route.calls.last.request
    assert request.headers["authorization"] == "Bearer secret"
    body = json.loads(request.content)
    assert body["model"] == "NCAIR1/N-ATLaS"
    assert body["repetition_penalty"] == 1.12
    assert body["stream"] is False
    assert body["max_tokens"] == 64


@respx.mock
def test_hosted_generate_and_base_url_normalization() -> None:
    route = respx.post("https://example.test/api/v1/completions").mock(
        return_value=httpx.Response(200, json=completion_payload())
    )
    with Client(base_url="https://example.test/api", api_key="secret") as client:
        response = client.generate("Write a greeting", repetition_penalty=1.3)
    assert isinstance(response, GenerateResponse)
    assert response.response == " N-ATLaS"
    assert json.loads(route.calls.last.request.content)["repetition_penalty"] == 1.3


@respx.mock
def test_hosted_chat_streaming_parses_sse() -> None:
    stream = "\n".join(
        [
            'data: {"id":"1","created":1,"model":"NCAIR1/N-ATLaS","choices":[{"index":0,"delta":{"role":"assistant","content":"San"},"finish_reason":null}]}',
            "",
            'data: {"id":"1","created":1,"model":"NCAIR1/N-ATLaS","choices":[{"index":0,"delta":{"content":"nu"},"finish_reason":"stop"}]}',
            "",
            "data: [DONE]",
            "",
            "",
        ]
    )
    route = respx.post("https://example.test/v1/chat/completions").mock(
        return_value=httpx.Response(
            200,
            text=stream,
            headers={"content-type": "text/event-stream"},
        )
    )
    with Client(base_url="https://example.test", api_key="secret") as client:
        chunks = list(client.chat([{"role": "user", "content": "Hello"}], stream=True))
    assert "".join(chunk.message.content for chunk in chunks) == "Sannu"
    assert chunks[-1].done is True
    assert json.loads(route.calls.last.request.content)["stream"] is True


@respx.mock
def test_hosted_generate_streaming_parses_sse() -> None:
    stream = "\n".join(
        [
            'data: {"created":1,"model":"NCAIR1/N-ATLaS","choices":[{"text":"Hello","finish_reason":null}]}',
            "",
            'data: {"created":1,"model":"NCAIR1/N-ATLaS","choices":[{"text":"","finish_reason":"length"}]}',
            "",
            "data: [DONE]",
            "",
            "",
        ]
    )
    respx.post("https://example.test/v1/completions").mock(
        return_value=httpx.Response(200, text=stream, headers={"content-type": "text/event-stream"})
    )
    with Client(base_url="https://example.test", api_key="secret") as client:
        chunks = list(client.generate("Hello", stream=True))
    assert "".join(chunk.response for chunk in chunks) == "Hello"
    assert chunks[-1].done_reason == "length"


@respx.mock
def test_hosted_stream_supports_multiline_sse_events() -> None:
    stream = (
        'data: {"created":1,"choices":[\n'
        'data: {"delta":{"content":"Habari"},"finish_reason":"stop"}]}\n'
        "\n"
        "data: [DONE]\n\n"
    )
    respx.post("https://example.test/v1/chat/completions").mock(
        return_value=httpx.Response(200, text=stream, headers={"content-type": "text/event-stream"})
    )
    with Client(base_url="https://example.test", api_key="secret") as client:
        chunks = list(client.chat([{"role": "user", "content": "Hello"}], stream=True))
    assert chunks[-1].message.content == "Habari"
    assert chunks[-1].done is True


@respx.mock
def test_hosted_stream_rejects_truncated_and_non_sse_responses() -> None:
    truncated = (
        'data: {"created":1,"choices":[{"delta":{"content":"partial"},"finish_reason":"stop"}]}\n\n'
    )
    route = respx.post("https://example.test/v1/chat/completions")
    route.mock(
        return_value=httpx.Response(
            200, text=truncated, headers={"content-type": "text/event-stream"}
        )
    )
    with (
        Client(base_url="https://example.test", api_key="secret") as client,
        pytest.raises(StreamProtocolError, match=r"\[DONE\]"),
    ):
        list(client.chat([{"role": "user", "content": "Hello"}], stream=True))
    route.mock(
        return_value=httpx.Response(
            200, json={"choices": []}, headers={"content-type": "application/json"}
        )
    )
    with (
        Client(base_url="https://example.test", api_key="secret") as client,
        pytest.raises(StreamProtocolError, match="not an SSE stream"),
    ):
        list(client.chat([{"role": "user", "content": "Hello"}], stream=True))


@respx.mock
def test_hosted_status_error_is_structured() -> None:
    respx.post("https://example.test/v1/chat/completions").mock(
        return_value=httpx.Response(401, json={"detail": "Invalid API key"})
    )
    with (
        Client(base_url="https://example.test", api_key="wrong") as client,
        pytest.raises(APIStatusError) as error,
    ):
        client.chat([{"role": "user", "content": "Hello"}])
    assert error.value.status_code == 401
    assert str(error.value) == "Invalid API key"
    assert "wrong" not in str(error.value)


@respx.mock
def test_escape_hatches_parse_models_and_reject_absolute_urls() -> None:
    respx.get("https://example.test/v1/healthz").mock(
        return_value=httpx.Response(200, json={"status": "ok"})
    )
    respx.post("https://example.test/v1/custom").mock(
        return_value=httpx.Response(200, json={"role": "assistant", "content": "Sannu!"})
    )
    with Client(base_url="https://example.test", api_key="secret") as client:
        assert client.get("healthz") == {"status": "ok"}
        parsed = client.post("custom", body={"x": 1}, cast_to=Message)
        assert isinstance(parsed, Message)
        with pytest.raises(ValueError, match="relative"):
            client.get("https://attacker.invalid/steal")
        with pytest.raises(ValueError, match="relative"):
            client.get("/healthz")


def test_configuration_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("NATLAS_API_KEY", raising=False)
    monkeypatch.delenv("HF_TOKEN", raising=False)
    monkeypatch.delenv("HUGGING_FACE_HUB_TOKEN", raising=False)
    with pytest.raises(ConfigurationError, match="API key"):
        Client(mode="hosted", base_url="https://example.test")
    with pytest.raises(ConfigurationError, match="Hugging Face token"):
        Client(mode="local")
    with pytest.raises(ValueError, match="mode"):
        Client(mode="invalid")


def test_environment_configuration_precedence(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NATLAS_BASE_URL", "https://env.example")
    monkeypatch.setenv("NATLAS_API_KEY", "env-secret")
    with Client() as client:
        assert client.base_url == "https://env.example/v1/"
    with Client(base_url="https://explicit.example", api_key="explicit") as client:
        assert client.base_url == "https://explicit.example/v1/"
    with pytest.raises(ConfigurationError, match="base_url"):
        Client(base_url="", api_key="explicit")
    with pytest.raises(ConfigurationError, match="API key"):
        Client(base_url="https://explicit.example", api_key="")
    with pytest.raises(ConfigurationError, match="malformed"):
        Client(base_url="https://example.test:invalid", api_key="explicit")
    with pytest.raises(ConfigurationError, match="Authorization"):
        Client(
            base_url="https://explicit.example",
            api_key="explicit",
            headers={"Authorization": "Bearer conflicting"},
        )


def test_transcribe_is_a_clean_stub(tmp_path: Path) -> None:
    with (
        Client(base_url="https://example.test", api_key="secret") as client,
        pytest.raises(NotImplementedError, match="coming later"),
    ):
        client.transcribe(tmp_path / "audio.wav")
    local = Client(mode="local", hf_token="token")
    with pytest.raises(ConfigurationError, match="hosted mode"):
        local.get("healthz")


@respx.mock
def test_module_level_hosted_chat(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NATLAS_BASE_URL", "https://module.example")
    monkeypatch.setenv("NATLAS_API_KEY", "module-secret")
    monkeypatch.setattr(natlas, "_default_client", None)
    respx.post("https://module.example/v1/chat/completions").mock(
        return_value=httpx.Response(200, json=chat_payload())
    )
    response = natlas.chat([{"role": "user", "content": "Hello"}])
    assert isinstance(response, ChatResponse)
    natlas._get_default_client().close()
    monkeypatch.setattr(natlas, "_default_client", None)
