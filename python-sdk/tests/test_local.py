from __future__ import annotations

import sys
import types
from datetime import date
from typing import Any

import pytest

import src.local as local_module
from src import (
    ChatResponse,
    Client,
    ConfigurationError,
    GenerateResponse,
    LocalInferenceError,
    Message,
)
from src._types import ChatRequest, GenerateRequest
from src.local import LocalBackend, format_date_string


class FakeTensor:
    def __init__(self, length: int) -> None:
        self.shape = (1, length)

    def __len__(self) -> int:
        return self.shape[-1]

    def __getitem__(self, key: Any) -> FakeTensor:
        return self


class FakeEncoding(dict[str, Any]):
    def __init__(self, length: int) -> None:
        super().__init__(input_ids=FakeTensor(length))

    def to(self, device: object) -> FakeEncoding:
        self.device = device
        return self


class FakeTokenizer:
    def __init__(self, output_text: str = "Sannu, duniya!") -> None:
        self.eos_token_id = 2
        self.pad_token_id = 0
        self.output_text = output_text
        self.templates: list[dict[str, Any]] = []

    def apply_chat_template(self, messages: list[dict[str, Any]], **kwargs: Any) -> str:
        self.templates.append({"messages": messages, **kwargs})
        return "<formatted-prompt>"

    def __call__(self, text: str, **kwargs: Any) -> FakeEncoding:
        self.last_call = {"text": text, **kwargs}
        return FakeEncoding(4)

    def decode(self, tokens: object, **kwargs: Any) -> str:
        self.decode_call = {"tokens": tokens, **kwargs}
        return self.output_text


class FakeModel:
    def __init__(self) -> None:
        self.device = "cuda:0"
        self.generate_calls: list[dict[str, Any]] = []
        self.generate_error: BaseException | None = None
        self.output_length = 9

    def eval(self) -> None:
        self.evaluated = True

    def generate(self, **kwargs: Any) -> FakeTensor:
        self.generate_calls.append(kwargs)
        if self.generate_error is not None:
            raise self.generate_error
        return FakeTensor(self.output_length)


class FakeInferenceMode:
    def __enter__(self) -> None:
        return None

    def __exit__(self, *args: object) -> None:
        return None


class FakeTorch:
    float16 = "float16"

    def inference_mode(self) -> FakeInferenceMode:
        return FakeInferenceMode()


class FakeStreamer:
    def __init__(self, pieces: list[str] | None = None) -> None:
        self.pieces = pieces or ["Sannu", ", ", "duniya!"]

    def __iter__(self) -> Any:
        return iter(self.pieces)

    def end(self) -> None:
        return None


def make_backend() -> tuple[LocalBackend, FakeTokenizer, FakeModel]:
    tokenizer = FakeTokenizer()
    model = FakeModel()
    backend = LocalBackend(
        hf_token="hf-token",
        _tokenizer=tokenizer,
        _model_instance=model,
        _torch=FakeTorch(),
    )
    return backend, tokenizer, model


def test_date_format_is_exact_and_locale_independent() -> None:
    assert format_date_string(date(2026, 9, 24)) == "24 Sep 2026"
    assert format_date_string(date(2026, 12, 1)) == "01 Dec 2026"


def test_local_chat_applies_chat_template_date_and_model_card_defaults(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(local_module, "format_date_string", lambda: "25 Sep 2026")
    backend, tokenizer, model = make_backend()
    request = ChatRequest(
        model="NCAIR1/N-ATLaS",
        messages=[Message(role="user", content="Sannu")],
    )
    response = backend.chat(request)
    assert isinstance(response, ChatResponse)
    assert response.message.content == "Sannu, duniya!"
    template = tokenizer.templates[0]
    assert template["date_string"] == "25 Sep 2026"
    assert template["add_generation_prompt"] is True
    assert template["tokenize"] is False
    assert template["messages"][0]["role"] == "system"
    assert model.generate_calls[0]["input_ids"] is not None
    assert model.generate_calls[0]["repetition_penalty"] == 1.12
    assert model.generate_calls[0]["max_new_tokens"] == 512
    assert model.generate_calls[0]["use_cache"] is True


def test_local_generate_uses_user_message(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(local_module, "format_date_string", lambda: "25 Sep 2026")
    backend, tokenizer, _ = make_backend()
    response = backend.generate(GenerateRequest(model="NCAIR1/N-ATLaS", prompt="Hello"))
    assert isinstance(response, GenerateResponse)
    assert response.response == "Sannu, duniya!"
    assert tokenizer.templates[0]["messages"][-1] == {"role": "user", "content": "Hello"}


def test_local_non_stream_honors_stop_and_length(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(local_module, "format_date_string", lambda: "25 Sep 2026")
    backend, tokenizer, model = make_backend()
    tokenizer.output_text = "Answer STOP hidden"
    request = ChatRequest(
        model="NCAIR1/N-ATLaS",
        messages=[Message(role="user", content="Hello")],
        stop="STOP",
    )
    response = backend.chat(request)
    assert isinstance(response, ChatResponse)
    assert response.message.content == "Answer "
    assert response.done_reason == "stop"
    model.output_length = 9
    request = ChatRequest(
        model="NCAIR1/N-ATLaS",
        messages=[Message(role="user", content="Hello")],
        max_tokens=5,
    )
    response = backend.chat(request)
    assert isinstance(response, ChatResponse)
    assert response.done_reason == "length"


def test_local_stream_returns_typed_chunks(monkeypatch: pytest.MonkeyPatch) -> None:
    backend, _, _ = make_backend()
    monkeypatch.setattr(backend, "_streamer", lambda: FakeStreamer())
    request = ChatRequest(
        model="NCAIR1/N-ATLaS",
        messages=[Message(role="user", content="Sannu")],
        stream=True,
    )
    chunks: list[ChatResponse] = list(backend.chat(request))  # type: ignore
    assert all(isinstance(chunk, ChatResponse) for chunk in chunks)
    assert "".join(chunk.message.content for chunk in chunks if chunk.message.content is not None) == "Sannu, duniya!"
    assert chunks[-1].done is True
    assert chunks[-1].usage.total_tokens > 0


def test_local_stream_honors_stop(monkeypatch: pytest.MonkeyPatch) -> None:
    backend, _, _ = make_backend()
    monkeypatch.setattr(
        backend,
        "_streamer",
        lambda: FakeStreamer(["Answer ", "STOP", " hidden"]),
    )
    request = ChatRequest(
        model="NCAIR1/N-ATLaS",
        messages=[Message(role="user", content="Sannu")],
        stream=True,
        stop="STOP",
    )
    chunks: list[ChatResponse] = list(backend.chat(request))  # type: ignore
    assert "".join(chunk.message.content for chunk in chunks if chunk.message.content is not None) == "Answer "
    assert chunks[-1].done is True
    assert chunks[-1].done_reason == "stop"


def test_local_stream_surfaces_worker_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    backend, _, model = make_backend()
    model.generate_error = RuntimeError("generation failed")
    monkeypatch.setattr(backend, "_streamer", lambda: FakeStreamer([]))
    request = GenerateRequest(
        model="NCAIR1/N-ATLaS",
        prompt="Hello",
        stream=True,
    )
    with pytest.raises(LocalInferenceError, match="generation failed"):
        list(backend.generate(request))


def test_local_load_uses_fp16_auto_device_and_token(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: dict[str, dict[str, Any]] = {}

    class FakeAutoTokenizer:
        @classmethod
        def from_pretrained(cls, model: str, **kwargs: Any) -> FakeTokenizer:
            calls["tokenizer"] = {"model": model, **kwargs}
            return FakeTokenizer()

    class FakeAutoModel:
        @classmethod
        def from_pretrained(cls, model: str, **kwargs: Any) -> FakeModel:
            calls["model"] = {"model": model, **kwargs}
            return FakeModel()

    torch_module = types.ModuleType("torch")
    torch_module.float16 = "float16"  # type: ignore
    transformers_module = types.ModuleType("transformers")
    transformers_module.AutoTokenizer = FakeAutoTokenizer  # type: ignore
    transformers_module.AutoModelForCausalLM = FakeAutoModel  # type: ignore
    monkeypatch.setitem(sys.modules, "torch", torch_module)
    monkeypatch.setitem(sys.modules, "transformers", transformers_module)
    monkeypatch.setenv("HF_HUB_OFFLINE", "1")
    backend = LocalBackend(hf_token="gated-token")
    backend._ensure_loaded()
    assert calls["model"]["torch_dtype"] == "float16"
    assert calls["model"]["device_map"] == "auto"
    assert calls["model"]["token"] == "gated-token"
    assert calls["model"]["local_files_only"] is True


def test_missing_hf_token_and_transcribe_stub(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("HF_TOKEN", raising=False)
    monkeypatch.delenv("HUGGING_FACE_HUB_TOKEN", raising=False)
    with pytest.raises(ConfigurationError, match="gated"):
        Client(mode="local")
    client = Client(mode="local", hf_token="token")
    monkeypatch.setattr(
        "src.local.LocalASRBackend.transcribe",
        lambda self, audio, **kwargs: {
            "text": "test",
            "duration": 1.0,
            "model": "model",
            "language": "en",
            "words": [],
        },
    )
    res = client.transcribe(b"RIFFdummydata")
    assert res.text == "test"
