"""Python SDK for Nigeria's sovereign N-ATLaS language model.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

from collections.abc import Iterator, Sequence
from typing import Any, Literal, overload

from typing_extensions import Unpack

from . import tools
from ._types import (
    ChatOptions,
    ChatResponse,
    GenerateOptions,
    GenerateResponse,
    LanguageValue,
    LiveTranscriptionEvent,
    Message,
    MessageInput,
    TranscriptionResponse,
    TranscriptionWord,
    Usage,
)
from .client import AsyncAudio, AsyncClient, Audio, Client
from .exceptions import (
    APIConnectionError,
    APIError,
    APIResponseValidationError,
    APIStatusError,
    APITimeoutError,
    ConfigurationError,
    LocalDependencyError,
    LocalInferenceError,
    NatlasError,
    StreamProtocolError,
)
from .hosted import DEFAULT_BASE_URL, DEFAULT_MODEL
from .languages import EN_NG, HA, IG, SUPPORTED_LANGUAGES, YO, detect_language, system_prompt

__version__ = "0.2.0"
ATTRIBUTION = (
    "N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital "
    "Economy, and powered by Awarri Technologies."
)
_default_client: Client | None = None


def _get_default_client() -> Client:
    global _default_client
    if _default_client is None:
        _default_client = Client(mode="hosted")
    return _default_client


@overload
def chat(
    messages: Sequence[MessageInput],
    stream: Literal[False] = False,
    **sampling_params: Unpack[ChatOptions],
) -> ChatResponse: ...


@overload
def chat(
    messages: Sequence[MessageInput],
    stream: Literal[True],
    **sampling_params: Unpack[ChatOptions],
) -> Iterator[ChatResponse]: ...


@overload
def chat(
    messages: Sequence[MessageInput],
    stream: bool,
    **sampling_params: Unpack[ChatOptions],
) -> ChatResponse | Iterator[ChatResponse]: ...


def chat(
    messages: Sequence[MessageInput],
    stream: bool = False,
    **sampling_params: Unpack[ChatOptions],
) -> ChatResponse | Iterator[ChatResponse]:
    """Use a lazily configured hosted client for a module-level chat call.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """
    return _get_default_client().chat(messages, stream=stream, **sampling_params)


@overload
def generate(
    prompt: str,
    stream: Literal[False] = False,
    **sampling_params: Unpack[GenerateOptions],
) -> GenerateResponse: ...


@overload
def generate(
    prompt: str,
    stream: Literal[True],
    **sampling_params: Unpack[GenerateOptions],
) -> Iterator[GenerateResponse]: ...


@overload
def generate(
    prompt: str,
    stream: bool,
    **sampling_params: Unpack[GenerateOptions],
) -> GenerateResponse | Iterator[GenerateResponse]: ...


def generate(
    prompt: str,
    stream: bool = False,
    **sampling_params: Unpack[GenerateOptions],
) -> GenerateResponse | Iterator[GenerateResponse]:
    """Use a lazily configured hosted client for a module-level generation call."""
    return _get_default_client().generate(prompt, stream=stream, **sampling_params)


def transcribe(
    audio: Any,
    language: str | None = None,
    model: str | None = None,
    timestamp_granularities: list[str] | None = None,
) -> TranscriptionResponse:
    """Use a lazily configured hosted client for a module-level transcription call."""
    return _get_default_client().transcribe(
        audio=audio,
        language=language,
        model=model,
        timestamp_granularities=timestamp_granularities,
    )


def extract(
    response_model: Any,
    prompt: list[MessageInput] | str,
    system_instruction: str = "Extract information according to the requested schema.",
    max_retries: int = 2,
    temperature: float = 0.1,
    **kwargs: Any,
) -> Any:
    """Extract structured data adhering to a Pydantic schema using default client."""
    return _get_default_client().extract(
        response_model=response_model,
        prompt=prompt,
        system_instruction=system_instruction,
        max_retries=max_retries,
        temperature=temperature,
        **kwargs,
    )


def translate(
    text: str,
    target_language: str,
    source_language: str | None = None,
    **kwargs: Any,
) -> str:
    """Translate text using default client."""
    return _get_default_client().translate(
        text=text,
        target_language=target_language,
        source_language=source_language,
        **kwargs,
    )


def summarize(
    text: str,
    max_words: int = 80,
    language: str | None = None,
    **kwargs: Any,
) -> str:
    """Summarize text using default client."""
    return _get_default_client().summarize(
        text=text,
        max_words=max_words,
        language=language,
        **kwargs,
    )


def classify(
    text: str,
    labels: list[str],
    instruction: str = "Classify the following text into exactly one of the provided categories.",
    **kwargs: Any,
) -> str:
    """Classify text using default client."""
    return _get_default_client().classify(
        text=text,
        labels=labels,
        instruction=instruction,
        **kwargs,
    )


def classify_scam(
    text: str,
    **kwargs: Any,
) -> dict[str, Any]:
    """Check message for fraud/scams using default client."""
    return _get_default_client().classify_scam(
        text=text,
        **kwargs,
    )


def voice_chat(
    audio: Any,
    language: str | None = None,
    system_prompt: str | None = None,
    **kwargs: Any,
) -> dict[str, str]:
    """Pipeline audio transcription to chat using default client."""
    return _get_default_client().voice_chat(
        audio=audio,
        language=language,
        system_prompt=system_prompt,
        **kwargs,
    )


__all__ = [
    "APIConnectionError",
    "APIError",
    "APIResponseValidationError",
    "APIStatusError",
    "APITimeoutError",
    "ATTRIBUTION",
    "AsyncAudio",
    "AsyncClient",
    "Audio",
    "ChatOptions",
    "ChatResponse",
    "Client",
    "ConfigurationError",
    "DEFAULT_ASR_URL",
    "DEFAULT_BASE_URL",
    "DEFAULT_MODEL",
    "EN_NG",
    "GenerateOptions",
    "GenerateResponse",
    "HA",
    "IG",
    "LanguageValue",
    "LiveTranscriptionEvent",
    "LocalDependencyError",
    "LocalInferenceError",
    "Message",
    "MessageInput",
    "NatlasError",
    "SUPPORTED_LANGUAGES",
    "StreamProtocolError",
    "TranscriptionResponse",
    "TranscriptionWord",
    "Usage",
    "YO",
    "__version__",
    "chat",
    "classify",
    "classify_scam",
    "detect_language",
    "extract",
    "generate",
    "summarize",
    "system_prompt",
    "tools",
    "transcribe",
    "translate",
    "voice_chat",
]
