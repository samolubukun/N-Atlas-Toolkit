"""Hosted OpenAI-compatible HTTP backend for N-ATLaS.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import json
import os
import time
from collections.abc import AsyncIterator, Callable, Iterator
from typing import Any, TypeVar, cast
from urllib.parse import urlsplit, urlunsplit

import httpx
from pydantic import BaseModel, ValidationError

from ._types import ChatRequest, ChatResponse, GenerateRequest, GenerateResponse, Message, Usage
from .exceptions import (
    APIConnectionError,
    APIResponseValidationError,
    APIStatusError,
    APITimeoutError,
    ConfigurationError,
    StreamProtocolError,
)

DEFAULT_BASE_URL = "http://localhost:8000/v1"
DEFAULT_ASR_URL = "http://localhost:8000/v1"
DEFAULT_MODEL = "NCAIR1/N-ATLaS"
T = TypeVar("T")
ModelT = TypeVar("ModelT", bound=BaseModel)


def resolve_base_url(base_url: str | None = None) -> str:
    """Resolve, validate, and add the OpenAI-compatible ``/v1`` base path."""
    configured = (
        base_url
        if base_url is not None
        else (os.getenv("NATLAS_BASE_URL") or os.getenv("NATLAS_API_URL"))
    )
    if configured is None:
        configured = DEFAULT_BASE_URL
    if not isinstance(configured, str) or not configured.strip():
        raise ConfigurationError("Hosted mode base_url must not be empty")
    configured = configured.strip()
    try:
        parsed = urlsplit(configured)
        hostname = parsed.hostname
        _ = parsed.port
    except ValueError as exc:
        raise ConfigurationError("Hosted mode base_url is malformed") from exc
    if parsed.scheme not in {"http", "https"} or not hostname:
        raise ConfigurationError("Hosted mode requires an absolute HTTP(S) base_url")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ConfigurationError(
            "Hosted mode base_url must not contain credentials, a query, or a fragment"
        )
    path = parsed.path.rstrip("/")
    if not path.endswith("/v1"):
        path = f"{path}/v1"
    return urlunsplit((parsed.scheme, parsed.netloc, f"{path}/", "", ""))


def resolve_asr_url(asr_url: str | None = None, fallback_base_url: str | None = None) -> str:
    """Resolve the sovereign ASR base URL (split Modal microservice or unified Docker gateway)."""
    configured = asr_url if asr_url is not None else os.getenv("NATLAS_ASR_URL")
    if configured is None:
        if fallback_base_url is not None:
            # Use urlsplit hostname comparison — never substring match
            _fb = urlsplit(fallback_base_url)
            if _fb.hostname in ("localhost", "127.0.0.1", "::1"):
                # On-premises unified Nginx gateway (e.g. localhost:8000)
                return fallback_base_url
        configured = DEFAULT_ASR_URL
    return resolve_base_url(configured)


def resolve_api_key(api_key: str | None, base_url: str | None = None) -> str:
    """Resolve the hosted API key.
    
    If targeting localhost/127.0.0.1, API key is optional and defaults to empty string.
    Otherwise, fails before a request if neither api_key nor NATLAS_API_KEY is provided.
    """
    resolved = api_key if api_key is not None else os.getenv("NATLAS_API_KEY")
    if resolved is not None and resolved.strip():
        return resolved.strip()
    
    # Check if this is a local/self-hosted deployment (no auth required)
    if base_url:
        parsed = urlsplit(base_url)
        if parsed.hostname in ("localhost", "127.0.0.1", "::1"):
            return ""
            
    raise ConfigurationError(
        "Hosted mode requires an API key for remote endpoints. Pass api_key=... or set NATLAS_API_KEY."
    )


def _headers(api_key: str, supplied: Any) -> httpx.Headers:
    headers = httpx.Headers({"Accept": "application/json"})
    if supplied:
        headers.update(supplied)
    if api_key:
        authorization = f"Bearer {api_key}"
        if "authorization" in headers and headers["authorization"] != authorization:
            raise ConfigurationError("A custom Authorization header conflicts with api_key")
        headers["Authorization"] = authorization
    return headers


def _endpoint(path: str) -> str:
    if not isinstance(path, str) or not path:
        raise ValueError("path must be a non-empty relative endpoint path")
    if path.startswith("/") or urlsplit(path).scheme or urlsplit(path).netloc:
        raise ValueError("escape-hatch paths must be relative to the configured hosted origin")
    return path


def _error_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        detail = payload.get("detail")
        error = payload.get("error")
        message = payload.get("message")
        if isinstance(detail, str):
            return detail
        if isinstance(message, str):
            return message
        if isinstance(error, dict) and isinstance(error.get("message"), str):
            return cast(str, error["message"])
        if isinstance(error, str):
            return error
    return fallback


def _decode_json(response: httpx.Response) -> Any:
    try:
        return response.json()
    except (json.JSONDecodeError, ValueError) as exc:
        raise APIResponseValidationError("Hosted API returned invalid JSON") from exc


def _status_error(response: httpx.Response) -> APIStatusError:
    text = response.text
    try:
        payload = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        payload = None
    message = _error_message(
        payload, f"Hosted API request failed with status {response.status_code}"
    )
    return APIStatusError(
        message,
        status_code=response.status_code,
        response_text=text,
        method=response.request.method,
        url=str(response.request.url),
    )


def _validate(data: Any, response_type: type[ModelT]) -> ModelT:
    try:
        return response_type.model_validate(data)
    except ValidationError as exc:
        raise APIResponseValidationError(
            "Hosted API response did not match the SDK contract"
        ) from exc


def _usage(data: Any) -> Usage:
    if data is None:
        return Usage()
    if not isinstance(data, dict):
        raise ValueError("usage must be an object")
    values: dict[str, int] = {}
    for field in ("prompt_tokens", "completion_tokens", "total_tokens"):
        value = data.get(field, 0)
        if value is None:
            value = 0
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise ValueError(f"usage.{field} must be a non-negative integer")
        values[field] = value
    return Usage(**values)


def _created(data: dict[str, Any]) -> int:
    value: object = data.get("created", 0)
    if value is None:
        return 0
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError("created must be a non-negative integer")
    return value


def _chat_response(data: Any, fallback_model: str) -> ChatResponse:
    if (
        not isinstance(data, dict)
        or not isinstance(data.get("choices"), list)
        or not data["choices"]
    ):
        raise APIResponseValidationError("Hosted chat response is missing choices")
    choice = data["choices"][0]
    if not isinstance(choice, dict) or not isinstance(choice.get("message"), dict):
        raise APIResponseValidationError("Hosted chat choice is malformed")
    message = choice["message"]
    content = message.get("content")
    if content is None:
        content = ""
    if not isinstance(content, str):
        raise APIResponseValidationError("Hosted chat content must be text or null")
    model = data.get("model") or fallback_model
    if not isinstance(model, str):
        raise APIResponseValidationError("Hosted chat model must be text")
    try:
        msg_kwargs: dict[str, Any] = {
            "role": message.get("role", "assistant"),
            "content": content if content != "" else message.get("content"),
            "name": message.get("name"),
            "tool_calls": message.get("tool_calls"),
            "tool_call_id": message.get("tool_call_id"),
        }
        return ChatResponse(
            model=model,
            created=_created(data),
            message=Message.model_validate(msg_kwargs),
            done=True,
            done_reason=choice.get("finish_reason"),
            usage=_usage(data.get("usage")),
        )
    except (TypeError, ValueError, ValidationError) as exc:
        raise APIResponseValidationError("Hosted chat response is malformed") from exc


def _generate_response(data: Any, fallback_model: str) -> GenerateResponse:
    if (
        not isinstance(data, dict)
        or not isinstance(data.get("choices"), list)
        or not data["choices"]
    ):
        raise APIResponseValidationError("Hosted completion response is missing choices")
    choice = data["choices"][0]
    if not isinstance(choice, dict):
        raise APIResponseValidationError("Hosted completion choice is malformed")
    text = choice.get("text")
    if not isinstance(text, str):
        raise APIResponseValidationError("Hosted completion text must be text")
    model = data.get("model") or fallback_model
    if not isinstance(model, str):
        raise APIResponseValidationError("Hosted completion model must be text")
    try:
        return GenerateResponse(
            model=model,
            created=_created(data),
            response=text,
            done=True,
            done_reason=choice.get("finish_reason"),
            usage=_usage(data.get("usage")),
        )
    except (TypeError, ValueError, ValidationError) as exc:
        raise APIResponseValidationError("Hosted completion response is malformed") from exc


_SSE_DONE = object()


def _decode_sse_data(raw_data: str) -> dict[str, Any] | object:
    if raw_data.strip() == "[DONE]":
        return _SSE_DONE
    try:
        event = json.loads(raw_data)
    except json.JSONDecodeError as exc:
        raise StreamProtocolError("Hosted API returned malformed SSE JSON") from exc
    if not isinstance(event, dict):
        raise StreamProtocolError("Hosted API returned a non-object SSE event")
    if isinstance(event.get("error"), (dict, str)):
        raise StreamProtocolError(_error_message(event, "Hosted stream reported an error"))
    return event


def _sse_events(lines: Iterator[str]) -> Iterator[dict[str, Any]]:
    data_lines: list[str] = []
    completed = False
    for line in lines:
        if line == "":
            if not data_lines:
                continue
            event = _decode_sse_data("\n".join(data_lines))
            data_lines = []
            if event is _SSE_DONE:
                completed = True
                break
            yield cast(dict[str, Any], event)
        elif line.startswith("data:"):
            value = line[5:]
            data_lines.append(value[1:] if value.startswith(" ") else value)
    if not completed:
        raise StreamProtocolError("Hosted API stream ended before [DONE]")


async def _async_sse_events(lines: AsyncIterator[str]) -> AsyncIterator[dict[str, Any]]:
    data_lines: list[str] = []
    completed = False
    async for line in lines:
        if line == "":
            if not data_lines:
                continue
            event = _decode_sse_data("\n".join(data_lines))
            data_lines = []
            if event is _SSE_DONE:
                completed = True
                break
            yield cast(dict[str, Any], event)
        elif line.startswith("data:"):
            value = line[5:]
            data_lines.append(value[1:] if value.startswith(" ") else value)
    if not completed:
        raise StreamProtocolError("Hosted API stream ended before [DONE]")


def _chat_chunk(event: dict[str, Any], fallback_model: str) -> ChatResponse:
    choices = event.get("choices")
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        raise StreamProtocolError("Hosted chat stream event is missing a valid choice")
    choice = choices[0]
    delta = choice.get("delta")
    if not isinstance(delta, dict):
        raise StreamProtocolError("Hosted chat stream delta is malformed")
    content = delta.get("content")
    if content is None:
        content = ""
    if not isinstance(content, str):
        raise StreamProtocolError("Hosted chat stream content must be text or null")
    model = event.get("model") or fallback_model
    if not isinstance(model, str):
        raise StreamProtocolError("Hosted chat stream model must be text")
    try:
        return ChatResponse(
            model=model,
            created=_created(event),
            message=Message(role=delta.get("role", "assistant"), content=content),
            done=choice.get("finish_reason") is not None,
            done_reason=choice.get("finish_reason"),
            usage=_usage(event.get("usage")),
        )
    except (TypeError, ValueError, ValidationError) as exc:
        raise StreamProtocolError("Hosted chat stream event is malformed") from exc


def _generate_chunk(event: dict[str, Any], fallback_model: str) -> GenerateResponse:
    choices = event.get("choices")
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        raise StreamProtocolError("Hosted completion stream event is missing a valid choice")
    choice = choices[0]
    text = choice.get("text")
    if text is None:
        text = ""
    if not isinstance(text, str):
        raise StreamProtocolError("Hosted completion stream text must be text")
    model = event.get("model") or fallback_model
    if not isinstance(model, str):
        raise StreamProtocolError("Hosted completion stream model must be text")
    try:
        return GenerateResponse(
            model=model,
            created=_created(event),
            response=text,
            done=choice.get("finish_reason") is not None,
            done_reason=choice.get("finish_reason"),
            usage=_usage(event.get("usage")),
        )
    except (TypeError, ValueError, ValidationError) as exc:
        raise StreamProtocolError("Hosted completion stream event is malformed") from exc


# ---------------------------------------------------------------------------
# Retry helpers: back off on Modal cold-start 503s and rate-limit 429s
# ---------------------------------------------------------------------------
_RETRYABLE_STATUS = frozenset({429, 502, 503})
_RETRY_DELAYS = (2.0, 6.0, 18.0)   # 3 attempts: 2 s, 6 s, 18 s total


def _post_with_retry(http: httpx.Client, url: str, **kwargs: Any) -> httpx.Response:
    """POST with exponential backoff on 503/429 (Modal cold starts, rate limits)."""
    resp: httpx.Response | None = None
    for delay in (None, *_RETRY_DELAYS):
        if delay is not None:
            time.sleep(delay)
        resp = http.post(url, **kwargs)
        if resp.status_code not in _RETRYABLE_STATUS:
            return resp
    return resp  # type: ignore[return-value]


async def _apost_with_retry(http: httpx.AsyncClient, url: str, **kwargs: Any) -> httpx.Response:
    """Async POST with exponential backoff on 503/429."""
    import asyncio
    resp: httpx.Response | None = None
    for delay in (None, *_RETRY_DELAYS):
        if delay is not None:
            await asyncio.sleep(delay)
        resp = await http.post(url, **kwargs)
        if resp.status_code not in _RETRYABLE_STATUS:
            return resp
    return resp  # type: ignore[return-value]


class HostedBackend:
    """Synchronous thin HTTP wrapper for a hosted vLLM endpoint.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str = DEFAULT_MODEL,
        timeout: Any = 120.0,
        **client_kwargs: Any,
    ) -> None:
        self.base_url = resolve_base_url(base_url)
        self.api_key = resolve_api_key(api_key, base_url=self.base_url)
        self.model = model
        supplied_headers = client_kwargs.pop("headers", None)
        self._http = httpx.Client(
            base_url=self.base_url,
            headers=_headers(self.api_key, supplied_headers),
            timeout=timeout,
            **client_kwargs,
        )

    def close(self) -> None:
        self._http.close()

    def _parse(self, response: httpx.Response, cast_to: type[T] | None) -> Any:
        if cast_to is httpx.Response:
            return response
        data = _decode_json(response)
        if cast_to is None:
            return data
        if isinstance(cast_to, type) and issubclass(cast_to, BaseModel):
            return _validate(data, cast_to)
        constructor = cast(Callable[[Any], T], cast_to)
        try:
            return constructor(data)
        except (TypeError, ValueError) as exc:
            raise APIResponseValidationError("Hosted API response could not be converted") from exc

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: Any = None,
        cast_to: type[T] | None = None,
    ) -> Any:
        try:
            if method.upper() == "POST":
                response = _post_with_retry(self._http, _endpoint(path), json=body)
            else:
                response = self._http.request(method, _endpoint(path), json=body)
        except httpx.TimeoutException as exc:
            raise APITimeoutError(f"Hosted API request timed out ({self.base_url})") from exc
        except httpx.RequestError as exc:
            raise APIConnectionError(
                f"Could not connect to N-ATLaS at {self.base_url}. "
                "Ensure your engine or Docker container is running, or set NATLAS_BASE_URL to your remote endpoint."
            ) from exc
        if not response.is_success:
            raise _status_error(response)
        return self._parse(response, cast_to)

    def get(self, path: str, *, cast_to: type[T] | None = None) -> Any:
        """Call an arbitrary relative GET endpoint."""
        return self._request("GET", path, cast_to=cast_to)

    def post(
        self,
        path: str,
        *,
        body: dict[str, Any] | BaseModel | None = None,
        cast_to: type[T] | None = None,
    ) -> Any:
        """Call an arbitrary relative POST endpoint."""
        payload = (
            body.model_dump(mode="json", by_alias=True) if isinstance(body, BaseModel) else body
        )
        return self._request("POST", path, body=payload, cast_to=cast_to)

    def chat(self, request: ChatRequest) -> ChatResponse:
        payload = request.model_dump(mode="json", exclude_none=True)
        data = self._request("POST", "chat/completions", body=payload)
        return _chat_response(data, request.model)

    def generate(self, request: GenerateRequest) -> GenerateResponse:
        payload = request.model_dump(mode="json", exclude_none=True)
        data = self._request("POST", "completions", body=payload)
        return _generate_response(data, request.model)

    def stream_chat(self, request: ChatRequest) -> Iterator[ChatResponse]:
        payload = request.model_dump(mode="json", exclude_none=True)
        emitted_done = False
        try:
            with self._http.stream("POST", "chat/completions", json=payload) as response:
                if not response.is_success:
                    response.read()
                    raise _status_error(response)
                if response.headers.get("content-type", "").split(";", 1)[0] != "text/event-stream":
                    raise StreamProtocolError("Hosted chat response is not an SSE stream")
                for event in _sse_events(response.iter_lines()):
                    chunk = _chat_chunk(event, request.model)
                    emitted_done = emitted_done or chunk.done
                    yield chunk
        except httpx.TimeoutException as exc:
            raise APITimeoutError("Hosted API stream timed out") from exc
        except httpx.RequestError as exc:
            raise APIConnectionError("Hosted API stream failed") from exc
        if not emitted_done:
            raise StreamProtocolError("Hosted chat stream ended without a finish event")

    def stream_generate(self, request: GenerateRequest) -> Iterator[GenerateResponse]:
        payload = request.model_dump(mode="json", exclude_none=True)
        emitted_done = False
        try:
            with self._http.stream("POST", "completions", json=payload) as response:
                if not response.is_success:
                    response.read()
                    raise _status_error(response)
                if response.headers.get("content-type", "").split(";", 1)[0] != "text/event-stream":
                    raise StreamProtocolError("Hosted completion response is not an SSE stream")
                for event in _sse_events(response.iter_lines()):
                    chunk = _generate_chunk(event, request.model)
                    emitted_done = emitted_done or chunk.done
                    yield chunk
        except httpx.TimeoutException as exc:
            raise APITimeoutError("Hosted API stream timed out") from exc
        except httpx.RequestError as exc:
            raise APIConnectionError("Hosted API stream failed") from exc
        if not emitted_done:
            raise StreamProtocolError("Hosted completion stream ended without a finish event")


class AsyncHostedBackend:
    """Asynchronous thin HTTP wrapper for a hosted vLLM endpoint.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str = DEFAULT_MODEL,
        timeout: Any = 120.0,
        **client_kwargs: Any,
    ) -> None:
        self.base_url = resolve_base_url(base_url)
        self.api_key = resolve_api_key(api_key, base_url=self.base_url)
        self.model = model
        supplied_headers = client_kwargs.pop("headers", None)
        self._http = httpx.AsyncClient(
            base_url=self.base_url,
            headers=_headers(self.api_key, supplied_headers),
            timeout=timeout,
            **client_kwargs,
        )

    async def aclose(self) -> None:
        await self._http.aclose()

    def _parse(self, response: httpx.Response, cast_to: type[T] | None) -> Any:
        if cast_to is httpx.Response:
            return response
        data = _decode_json(response)
        if cast_to is None:
            return data
        if isinstance(cast_to, type) and issubclass(cast_to, BaseModel):
            return _validate(data, cast_to)
        constructor = cast(Callable[[Any], T], cast_to)
        try:
            return constructor(data)
        except (TypeError, ValueError) as exc:
            raise APIResponseValidationError("Hosted API response could not be converted") from exc

    async def _request(
        self,
        method: str,
        path: str,
        *,
        body: Any = None,
        cast_to: type[T] | None = None,
    ) -> Any:
        try:
            if method.upper() == "POST":
                response = await _apost_with_retry(self._http, _endpoint(path), json=body)
            else:
                response = await self._http.request(method, _endpoint(path), json=body)
        except httpx.TimeoutException as exc:
            raise APITimeoutError(f"Hosted API request timed out ({self.base_url})") from exc
        except httpx.RequestError as exc:
            raise APIConnectionError(
                f"Could not connect to N-ATLaS at {self.base_url}. "
                "Ensure your engine or Docker container is running, or set NATLAS_BASE_URL to your remote endpoint."
            ) from exc
        if not response.is_success:
            raise _status_error(response)
        return self._parse(response, cast_to)

    async def get(self, path: str, *, cast_to: type[T] | None = None) -> Any:
        """Call an arbitrary relative GET endpoint."""
        return await self._request("GET", path, cast_to=cast_to)

    async def post(
        self,
        path: str,
        *,
        body: dict[str, Any] | BaseModel | None = None,
        cast_to: type[T] | None = None,
    ) -> Any:
        """Call an arbitrary relative POST endpoint."""
        payload = (
            body.model_dump(mode="json", by_alias=True) if isinstance(body, BaseModel) else body
        )
        return await self._request("POST", path, body=payload, cast_to=cast_to)

    async def chat(self, request: ChatRequest) -> ChatResponse:
        payload = request.model_dump(mode="json", exclude_none=True)
        data = await self._request("POST", "chat/completions", body=payload)
        return _chat_response(data, request.model)

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        payload = request.model_dump(mode="json", exclude_none=True)
        data = await self._request("POST", "completions", body=payload)
        return _generate_response(data, request.model)

    async def stream_chat(self, request: ChatRequest) -> AsyncIterator[ChatResponse]:
        payload = request.model_dump(mode="json", exclude_none=True)
        emitted_done = False
        try:
            async with self._http.stream("POST", "chat/completions", json=payload) as response:
                if not response.is_success:
                    await response.aread()
                    raise _status_error(response)
                if response.headers.get("content-type", "").split(";", 1)[0] != "text/event-stream":
                    raise StreamProtocolError("Hosted chat response is not an SSE stream")
                async for event in _async_sse_events(response.aiter_lines()):
                    chunk = _chat_chunk(event, request.model)
                    emitted_done = emitted_done or chunk.done
                    yield chunk
        except httpx.TimeoutException as exc:
            raise APITimeoutError("Hosted API stream timed out") from exc
        except httpx.RequestError as exc:
            raise APIConnectionError("Hosted API stream failed") from exc
        if not emitted_done:
            raise StreamProtocolError("Hosted chat stream ended without a finish event")

    async def stream_generate(self, request: GenerateRequest) -> AsyncIterator[GenerateResponse]:
        payload = request.model_dump(mode="json", exclude_none=True)
        emitted_done = False
        try:
            async with self._http.stream("POST", "completions", json=payload) as response:
                if not response.is_success:
                    await response.aread()
                    raise _status_error(response)
                if response.headers.get("content-type", "").split(";", 1)[0] != "text/event-stream":
                    raise StreamProtocolError("Hosted completion response is not an SSE stream")
                async for event in _async_sse_events(response.aiter_lines()):
                    chunk = _generate_chunk(event, request.model)
                    emitted_done = emitted_done or chunk.done
                    yield chunk
        except httpx.TimeoutException as exc:
            raise APITimeoutError("Hosted API stream timed out") from exc
        except httpx.RequestError as exc:
            raise APIConnectionError("Hosted API stream failed") from exc
        if not emitted_done:
            raise StreamProtocolError("Hosted completion stream ended without a finish event")
