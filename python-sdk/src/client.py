"""Synchronous and asynchronous N-ATLaS clients.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import AsyncIterator, Iterator, Sequence
from pathlib import Path
from types import TracebackType
from typing import Any, Literal, TypeVar, overload

from pydantic import BaseModel
from typing_extensions import Self, Unpack

from ._types import (
    ChatOptions,
    ChatRequest,
    ChatResponse,
    GenerateOptions,
    GenerateRequest,
    GenerateResponse,
    LiveTranscriptionEvent,
    MessageInput,
    TranscriptionResponse,
    normalize_messages,
)
from .exceptions import ConfigurationError
from .hosted import (
    DEFAULT_BASE_URL,
    DEFAULT_MODEL,
    AsyncHostedBackend,
    HostedBackend,
)
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

    def transcribe(
        self,
        audio: Any,
        language: str | None = None,
        model: str | None = None,
        timestamp_granularities: list[str] | None = None,
    ) -> TranscriptionResponse:
        """Transcribe speech in Nigerian languages (Yoruba, Hausa, Igbo, Nigerian English).

        N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
        """
        return self.audio.transcriptions.create(
            file=audio,
            model=model,
            language=language,
            timestamp_granularities=timestamp_granularities,
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

    async def transcribe(
        self,
        audio: Any,
        language: str | None = None,
        model: str | None = None,
        timestamp_granularities: list[str] | None = None,
    ) -> TranscriptionResponse:
        """Asynchronously transcribe speech in Nigerian languages (Yoruba, Hausa, Igbo, Nigerian English).

        N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
        """
        return await self.audio.transcriptions.create(
            file=audio,
            model=model,
            language=language,
            timestamp_granularities=timestamp_granularities,
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

        # httpx requires Content-Type omitted or popped so it can format multipart boundaries
        req_headers = dict(self._client._hosted._http.headers)
        req_headers.pop("content-type", None)

        target_url = "audio/transcriptions"

        raw_res = self._client._hosted._http.post(
            target_url,
            files=files,
            data=data,
            headers=req_headers,
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
            # Use a thread so large audio reads don't block the event loop
            content = await asyncio.to_thread(Path(file).read_bytes)
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

        # httpx requires Content-Type omitted or popped so it can format multipart boundaries
        req_headers = dict(self._client._hosted._http.headers)
        req_headers.pop("content-type", None)

        target_url = "audio/transcriptions"

        raw_res = await self._client._hosted._http.post(
            target_url,
            files=files,
            data=data,
            headers=req_headers,
        )
        if raw_res.status_code >= 400:
            from .hosted import _status_error
            raise _status_error(raw_res)

        return TranscriptionResponse.model_validate(raw_res.json())

    def connect_live(
        self,
        language: str | None = None,
        model: str | None = None,
    ) -> AsyncLiveTranscriptionSession:
        """Connect to the real-time Deepgram-style streaming ASR WebSocket endpoint."""
        return AsyncLiveTranscriptionSession(
            client=self._client,
            language=language,
            model=model,
        )


class AsyncLiveTranscriptionSession:
    """Asynchronous WebSocket session for real-time streaming speech recognition (Deepgram protocol)."""

    def __init__(
        self,
        client: AsyncClient,
        language: str | None = None,
        model: str | None = None,
    ) -> None:
        self._client = client
        self.language = language
        self.model = model
        self._ws: Any = None

    async def connect(self) -> Self:
        try:
            import websockets
        except ImportError as err:
            # Fallback to standard websockets or raise a clean error
            raise ConfigurationError(
                "Streaming WebSocket ASR requires the 'websockets' library. "
                "Install with: pip install websockets"
            ) from err

        raw_url = self._client.base_url or "https://<workspace>--natlas-engine-natlasasrengine-serve.modal.run/v1/"
        ws_proto = "wss://" if raw_url.startswith("https://") else "ws://"
        host_path = raw_url.split("://", 1)[-1].rstrip("/")
        ws_url = f"{ws_proto}{host_path}/audio/transcriptions/streaming"

        query_params = []
        if self.language:
            query_params.append(f"language={self.language}")
        if self.model:
            query_params.append(f"model={self.model}")
        if query_params:
            ws_url = f"{ws_url}?{'&'.join(query_params)}"

        headers = {"Authorization": f"Bearer {self._client._hosted.api_key}"} if self._client._hosted else {}
        self._ws = await websockets.connect(ws_url, extra_headers=headers)
        return self

    async def send(self, data: bytes) -> None:
        """Send a chunk of raw binary audio (e.g. PCM 16-bit 16kHz mono)."""
        if self._ws is None:
            raise ConfigurationError("WebSocket is not connected. Call await session.connect() or use async with.")
        await self._ws.send(data)

    async def receive(self) -> LiveTranscriptionEvent:
        """Receive the next live transcription event."""
        if self._ws is None:
            raise ConfigurationError("WebSocket is not connected.")
        msg = await self._ws.recv()
        import json
        payload = json.loads(msg)
        return LiveTranscriptionEvent.model_validate(payload)

    def __aiter__(self) -> AsyncIterator[LiveTranscriptionEvent]:
        return self

    async def __anext__(self) -> LiveTranscriptionEvent:
        try:
            return await self.receive()
        except Exception as err:
            raise StopAsyncIteration from err

    async def close(self) -> None:
        if self._ws is not None:
            import json
            with contextlib.suppress(Exception):
                await self._ws.send(json.dumps({"type": "CloseStream"}))
            await self._ws.close()
            self._ws = None

    async def __aenter__(self) -> Self:
        return await self.connect()

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.close()


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
