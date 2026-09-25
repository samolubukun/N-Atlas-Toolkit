"""Typed N-ATLaS requests and responses.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any, Literal, TypedDict

from pydantic import BaseModel, ConfigDict, Field, field_validator

Role = Literal["system", "user", "assistant", "function", "tool"]
FinishReason = str | None
LanguageValue = Literal["yoruba", "hausa", "igbo", "nigerian_english"]


class Message(BaseModel):
    """A typed chat message.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """

    model_config = ConfigDict(extra="allow")

    role: Role
    content: str
    name: str | None = None


class Usage(BaseModel):
    """Token usage reported by either backend."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatResponse(BaseModel):
    """A normalized chat response or streaming chunk.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """

    model: str
    created: int
    message: Message
    done: bool = True
    done_reason: FinishReason = None
    usage: Usage = Field(default_factory=Usage)


class GenerateResponse(BaseModel):
    """A normalized completion response or streaming chunk.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """

    model: str
    created: int
    response: str
    done: bool = True
    done_reason: FinishReason = None
    usage: Usage = Field(default_factory=Usage)


class SamplingOptions(BaseModel):
    """Validated parameters shared by chat and text generation."""

    model_config = ConfigDict(extra="forbid")

    max_tokens: int = Field(default=512, ge=1)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, allow_inf_nan=False)
    top_p: float = Field(default=0.9, gt=0.0, le=1.0, allow_inf_nan=False)
    top_k: int = Field(default=50, ge=-1)
    repetition_penalty: float = Field(default=1.12, gt=0.0, allow_inf_nan=False)
    stop: str | list[str] | None = None

    @field_validator("stop")
    @classmethod
    def validate_stop(cls, value: str | list[str] | None) -> str | list[str] | None:
        if isinstance(value, str):
            if not value:
                raise ValueError("stop must not be empty")
            return value
        if value is not None and any(not item for item in value):
            raise ValueError("stop strings must not be empty")
        return value


class ChatRequest(SamplingOptions):
    """Validated local or hosted chat request."""

    model: str
    messages: list[Message] = Field(min_length=1)
    stream: bool = False


class GenerateRequest(SamplingOptions):
    """Validated local or hosted text generation request."""

    model: str
    prompt: str = Field(min_length=1)
    stream: bool = False


class ChatOptions(TypedDict, total=False):
    """Static sampling keyword types accepted by ``chat``."""

    max_tokens: int
    temperature: float
    top_p: float
    top_k: int
    repetition_penalty: float
    stop: str | list[str]


class GenerateOptions(TypedDict, total=False):
    """Static sampling keyword types accepted by ``generate``."""

    max_tokens: int
    temperature: float
    top_p: float
    top_k: int
    repetition_penalty: float
    stop: str | list[str]


MessageInput = Message | Mapping[str, Any]


class TranscriptionWord(BaseModel):
    """Word-level alignment timestamp."""

    word: str
    start: float
    end: float
    confidence: float | None = None


class TranscriptionResponse(BaseModel):
    """OpenAI-compatible audio transcription response with sovereign attribution."""

    text: str
    duration: float | None = None
    model: str
    language: str | None = None
    words: list[TranscriptionWord] = Field(default_factory=list)
    attribution: str | None = None


def normalize_messages(messages: Sequence[MessageInput]) -> list[Message]:
    """Validate and normalize mapping or model chat messages."""
    if not messages:
        raise ValueError("messages must contain at least one message")
    normalized: list[Message] = []
    for message in messages:
        normalized.append(
            message if isinstance(message, Message) else Message.model_validate(message)
        )
    return normalized
