"""Synchronous and asynchronous N-ATLaS clients.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Iterator, Sequence
from pathlib import Path
from types import TracebackType
from typing import Any, Literal, NoReturn, TypeVar, overload

from pydantic import BaseModel
from typing_extensions import Self, Unpack

from ._types import (
    ChatOptions,
    ChatRequest,
    ChatResponse,
    GenerateOptions,
    GenerateRequest,
    GenerateResponse,
    LanguageValue,
    MessageInput,
    TranscriptionResponse,
    normalize_messages,
)
from .exceptions import ConfigurationError
from .hosted import DEFAULT_BASE_URL, DEFAULT_MODEL, AsyncHostedBackend, HostedBackend
from .local import LocalASRBackend, LocalBackend

Mode = Literal["local", "hosted"]
T = TypeVar("T")


_STREAM_END = object()


async def _iterate_async(iterator: Iterator[Any]) -> AsyncIterator[Any]:
    try:
        while True:
            item = await asyncio.to_thread(next, iterator, _STREAM_END)
            if item is _STREAM_END:
                return
            yield item
    finally:
        close = getattr(iterator, "close", None)
        if close is not None:
            await asyncio.to_thread(close)


class Client:
    """Synchronous N-ATLaS client with local and hosted backends.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """

    def __init__(
        self,
        mode: Mode = "hosted",
        base_url: str | None = None,
        api_key: str | None = None,
        hf_token: str | None = None,
        model: str = DEFAULT_MODEL,
        timeout: Any = 120.0,
        host: str | None = None,
        **client_kwargs: Any,
    ) -> None:
        if mode not in {"local", "hosted"}:
            raise ValueError("mode must be either 'local' or 'hosted'")
        resolved_base_url = base_url if base_url is not None else host
        self.mode = mode
        self.model = model
        self.base_url: str | None
        self._local: LocalBackend | None
        self._hosted: HostedBackend | None
        if mode == "local":
            self._local = LocalBackend(model=model, hf_token=hf_token)
            self._hosted = None
            self.base_url = None
        else:
            self._local = None
            self._hosted = HostedBackend(
                base_url=resolved_base_url,
                api_key=api_key,
                model=model,
                timeout=timeout,
                **client_kwargs,
            )
            self.base_url = self._hosted.base_url
        self.audio = Audio(self)

    @overload
    def chat(
        self,
        messages: Sequence[MessageInput],
        stream: Literal[False] = False,
        **sampling_params: Unpack[ChatOptions],
    ) -> ChatResponse: ...

    @overload
    def chat(
        self,
        messages: Sequence[MessageInput],
        stream: Literal[True],
        **sampling_params: Unpack[ChatOptions],
    ) -> Iterator[ChatResponse]: ...

    @overload
    def chat(
        self,
        messages: Sequence[MessageInput],
        stream: bool,
        **sampling_params: Unpack[ChatOptions],
    ) -> ChatResponse | Iterator[ChatResponse]: ...

    def chat(
        self,
        messages: Sequence[MessageInput],
        stream: bool = False,
        **sampling_params: Unpack[ChatOptions],
    ) -> ChatResponse | Iterator[ChatResponse]:
        """Chat with N-ATLaS, optionally yielding typed streaming chunks."""
        request = ChatRequest.model_validate(
            {
                "model": self.model,
                "messages": normalize_messages(messages),
                "stream": stream,
                **sampling_params,
            }
        )
        if self._local is not None:
            return self._local.chat(request)
        assert self._hosted is not None
        if stream:
            return self._hosted.stream_chat(request)
        return self._hosted.chat(request)

    @overload
    def generate(
        self,
        prompt: str,
        stream: Literal[False] = False,
        **sampling_params: Unpack[GenerateOptions],
    ) -> GenerateResponse: ...

    @overload
    def generate(
        self,
        prompt: str,
        stream: Literal[True],
        **sampling_params: Unpack[GenerateOptions],
    ) -> Iterator[GenerateResponse]: ...

    @overload
    def generate(
        self,
        prompt: str,
        stream: bool,
        **sampling_params: Unpack[GenerateOptions],
    ) -> GenerateResponse | Iterator[GenerateResponse]: ...

    def generate(
        self,
        prompt: str,
        stream: bool = False,
        **sampling_params: Unpack[GenerateOptions],
    ) -> GenerateResponse | Iterator[GenerateResponse]:
        """Generate a completion, optionally yielding typed streaming chunks."""
        request = GenerateRequest.model_validate(
            {
                "model": self.model,
                "prompt": prompt,
                "stream": stream,
                **sampling_params,
            }
        )
        if self._local is not None:
            return self._local.generate(request)
        assert self._hosted is not None
        if stream:
            return self._hosted.stream_generate(request)
        return self._hosted.generate(request)

    def transcribe(self, audio_path: str | Path, language: str = "nigerian_english") -> NoReturn:
        """Reserved for upcoming N-ATLaS ASR support.

        N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
        """
        del audio_path, language
        raise NotImplementedError(
            "N-ATLaS ASR models are not available yet; transcription is coming later."
        )

    @overload
    def get(self, path: str, *, cast_to: type[T]) -> T: ...

    @overload
    def get(self, path: str, *, cast_to: None = None) -> Any: ...

    def get(self, path: str, *, cast_to: type[T] | None = None) -> Any:
        """Call a hosted GET endpoint not represented by a dedicated method."""
        if self._hosted is None:
            raise ConfigurationError("HTTP escape hatches are only available in hosted mode")
        return self._hosted.get(path, cast_to=cast_to)

    @overload
    def post(
        self,
        path: str,
        *,
        body: dict[str, Any] | BaseModel | None = None,
        cast_to: type[T],
    ) -> T: ...

    @overload
    def post(
        self,
        path: str,
        *,
        body: dict[str, Any] | BaseModel | None = None,
        cast_to: None = None,
    ) -> Any: ...

    def post(
        self,
        path: str,
        *,
        body: dict[str, Any] | BaseModel | None = None,
        cast_to: type[T] | None = None,
    ) -> Any:
        """Call a hosted POST endpoint not represented by a dedicated method."""
        if self._hosted is None:
            raise ConfigurationError("HTTP escape hatches are only available in hosted mode")
        return self._hosted.post(path, body=body, cast_to=cast_to)

    def close(self) -> None:
        if self._hosted is not None:
            self._hosted.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        del exc_type, exc, traceback
        self.close()


class AsyncClient:
    """Asynchronous N-ATLaS client with matching sync interface.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """

    def __init__(
        self,
        mode: Mode = "hosted",
        base_url: str | None = None,
        api_key: str | None = None,
        hf_token: str | None = None,
        model: str = DEFAULT_MODEL,
        timeout: Any = 120.0,
        host: str | None = None,
        **client_kwargs: Any,
    ) -> None:
        if mode not in {"local", "hosted"}:
            raise ValueError("mode must be either 'local' or 'hosted'")
        resolved_base_url = base_url if base_url is not None else host
        self.mode = mode
        self.model = model
        self.base_url: str | None
        self._local: LocalBackend | None
        self._hosted: AsyncHostedBackend | None
        if mode == "local":
            self._local = LocalBackend(model=model, hf_token=hf_token)
            self._hosted = None
            self.base_url = None
        else:
            self._local = None
            self._hosted = AsyncHostedBackend(
                base_url=resolved_base_url,
                api_key=api_key,
                model=model,
                timeout=timeout,
                **client_kwargs,
            )
            self.base_url = self._hosted.base_url
        self.audio = AsyncAudio(self)

    @overload
    async def chat(
        self,
        messages: Sequence[MessageInput],
        stream: Literal[False] = False,
        **sampling_params: Unpack[ChatOptions],
    ) -> ChatResponse: ...

    @overload
    async def chat(
        self,
        messages: Sequence[MessageInput],
        stream: Literal[True],
        **sampling_params: Unpack[ChatOptions],
    ) -> AsyncIterator[ChatResponse]: ...

    @overload
    async def chat(
        self,
        messages: Sequence[MessageInput],
        stream: bool,
        **sampling_params: Unpack[ChatOptions],
    ) -> ChatResponse | AsyncIterator[ChatResponse]: ...

    async def chat(
        self,
        messages: Sequence[MessageInput],
        stream: bool = False,
        **sampling_params: Unpack[ChatOptions],
    ) -> ChatResponse | AsyncIterator[ChatResponse]:
        """Asynchronously chat with N-ATLaS."""
        request = ChatRequest.model_validate(
            {
                "model": self.model,
                "messages": normalize_messages(messages),
                "stream": stream,
                **sampling_params,
            }
        )
        if self._local is not None:
            if stream:
                iterator = await asyncio.to_thread(self._local.chat, request)
                assert not isinstance(iterator, ChatResponse)
                return _iterate_async(iterator)
            result = await asyncio.to_thread(self._local.chat, request)
            assert isinstance(result, ChatResponse)
            return result
        assert self._hosted is not None
        if stream:
            return self._hosted.stream_chat(request)
        return await self._hosted.chat(request)

    @overload
    async def generate(
        self,
        prompt: str,
        stream: Literal[False] = False,
        **sampling_params: Unpack[GenerateOptions],
    ) -> GenerateResponse: ...

    @overload
    async def generate(
        self,
        prompt: str,
        stream: Literal[True],
        **sampling_params: Unpack[GenerateOptions],
    ) -> AsyncIterator[GenerateResponse]: ...

    @overload
    async def generate(
        self,
        prompt: str,
        stream: bool,
        **sampling_params: Unpack[GenerateOptions],
    ) -> GenerateResponse | AsyncIterator[GenerateResponse]: ...

    async def generate(
        self,
        prompt: str,
        stream: bool = False,
        **sampling_params: Unpack[GenerateOptions],
    ) -> GenerateResponse | AsyncIterator[GenerateResponse]:
        """Asynchronously generate a completion."""
        request = GenerateRequest.model_validate(
            {
                "model": self.model,
                "prompt": prompt,
                "stream": stream,
                **sampling_params,
            }
        )
        if self._local is not None:
            if stream:
                iterator = await asyncio.to_thread(self._local.generate, request)
                assert not isinstance(iterator, GenerateResponse)
                return _iterate_async(iterator)
            result = await asyncio.to_thread(self._local.generate, request)
            assert isinstance(result, GenerateResponse)
            return result
        assert self._hosted is not None
        if stream:
            return self._hosted.stream_generate(request)
        return await self._hosted.generate(request)

    def transcribe(
        self, audio_path: str | Path, language: LanguageValue = "nigerian_english"
    ) -> NoReturn:
        """Reserved for upcoming asynchronous N-ATLaS ASR support."""
        del audio_path, language
        raise NotImplementedError(
            "N-ATLaS ASR models are not available yet; transcription is coming later."
        )

    @overload
    async def get(self, path: str, *, cast_to: type[T]) -> T: ...

    @overload
    async def get(self, path: str, *, cast_to: None = None) -> Any: ...

    async def get(self, path: str, *, cast_to: type[T] | None = None) -> Any:
        """Call a hosted GET endpoint not represented by a dedicated method."""
        if self._hosted is None:
            raise ConfigurationError("HTTP escape hatches are only available in hosted mode")
        return await self._hosted.get(path, cast_to=cast_to)

    @overload
    async def post(
        self,
        path: str,
        *,
        body: dict[str, Any] | BaseModel | None = None,
        cast_to: type[T],
    ) -> T: ...

    @overload
    async def post(
        self,
        path: str,
        *,
        body: dict[str, Any] | BaseModel | None = None,
        cast_to: None = None,
    ) -> Any: ...

    async def post(
        self,
        path: str,
        *,
        body: dict[str, Any] | BaseModel | None = None,
        cast_to: type[T] | None = None,
    ) -> Any:
        """Call a hosted POST endpoint not represented by a dedicated method."""
        if self._hosted is None:
            raise ConfigurationError("HTTP escape hatches are only available in hosted mode")
        return await self._hosted.post(path, body=body, cast_to=cast_to)

    async def close(self) -> None:
        if self._hosted is not None:
            await self._hosted.aclose()

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        del exc_type, exc, traceback
        await self.close()


class Transcriptions:
    """Synchronous audio transcriptions namespace."""

    def __init__(self, client: Client) -> None:
        self._client = client

    def create(
        self,
        file: Any,
        model: str | None = None,
        language: str | None = None,
        response_format: str = "json",
        timestamp_granularities: list[str] | None = None,
    ) -> TranscriptionResponse:
        """Transcribe an audio file using sovereign ASR (Yoruba, Hausa, Igbo, Nigerian English)."""
        # Read audio payload
        if hasattr(file, "read"):
            content = file.read()
        elif isinstance(file, (bytes, bytearray)):
            content = bytes(file)
        elif isinstance(file, (str, Path)):
            with open(file, "rb") as f:
                content = f.read()
        else:
            raise ValueError("file must be bytes, a file-like object, or a path")

        # 1. Local Mode Execution
        if self._client.mode == "local":
            asr = LocalASRBackend(hf_token=self._client._local.hf_token if self._client._local else None)
            res = asr.transcribe(
                content,
                model=model,
                language=language,
                return_timestamps=bool(timestamp_granularities and "word" in timestamp_granularities),
            )
            return TranscriptionResponse.model_validate(res)

        # 2. Hosted Mode Execution
        if self._client._hosted is None:
            raise ConfigurationError("Hosted backend is not initialized")

        files = {"file": ("audio.wav", content, "audio/wav")}
        data: dict[str, Any] = {"response_format": response_format}
        if model:
            data["model"] = model
        if language:
            data["language"] = language
        if timestamp_granularities:
            data["timestamp_granularities"] = timestamp_granularities

        raw_res = self._client._hosted._http.post(
            "audio/transcriptions",
            files=files,
            data=data,
        )
        if raw_res.status_code >= 400:
            from .hosted import _status_error
            raise _status_error(raw_res)

        return TranscriptionResponse.model_validate(raw_res.json())


class Audio:
    """Audio speech recognition namespace."""

    def __init__(self, client: Client) -> None:
        self.transcriptions = Transcriptions(client)


class AsyncTranscriptions:
    """Asynchronous audio transcriptions namespace."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def create(
        self,
        file: Any,
        model: str | None = None,
        language: str | None = None,
        response_format: str = "json",
        timestamp_granularities: list[str] | None = None,
    ) -> TranscriptionResponse:
        """Transcribe an audio file asynchronously."""
        if hasattr(file, "read"):
            content = file.read()
            if asyncio.iscoroutine(content):
                content = await content
        elif isinstance(file, (bytes, bytearray)):
            content = bytes(file)
        elif isinstance(file, (str, Path)):
            with open(file, "rb") as f:
                content = f.read()
        else:
            raise ValueError("file must be bytes, a file-like object, or a path")

        # 1. Local Mode Execution
        if self._client.mode == "local":
            asr = LocalASRBackend(hf_token=self._client._local.hf_token if self._client._local else None)
            res = await asyncio.to_thread(
                asr.transcribe,
                content,
                model=model,
                language=language,
                return_timestamps=bool(timestamp_granularities and "word" in timestamp_granularities),
            )
            return TranscriptionResponse.model_validate(res)

        # 2. Hosted Mode Execution
        if self._client._hosted is None:
            raise ConfigurationError("Hosted backend is not initialized")

        files = {"file": ("audio.wav", content, "audio/wav")}
        data: dict[str, Any] = {"response_format": response_format}
        if model:
            data["model"] = model
        if language:
            data["language"] = language
        if timestamp_granularities:
            data["timestamp_granularities"] = timestamp_granularities

        raw_res = await self._client._hosted._http.post(
            "audio/transcriptions",
            files=files,
            data=data,
        )
        if raw_res.status_code >= 400:
            from .hosted import _status_error
            raise _status_error(raw_res)

        return TranscriptionResponse.model_validate(raw_res.json())


class AsyncAudio:
    """Asynchronous audio speech recognition namespace."""

    def __init__(self, client: AsyncClient) -> None:
        self.transcriptions = AsyncTranscriptions(client)


__all__ = [
    "AsyncAudio",
    "AsyncClient",
    "Audio",
    "Client",
    "DEFAULT_BASE_URL",
    "DEFAULT_MODEL",
    "Mode",
]
