from __future__ import annotations

import json

import httpx
import pytest
import respx

from src import AsyncClient, ChatResponse, GenerateResponse, Message


@respx.mock
@pytest.mark.asyncio
async def test_async_chat_and_generate() -> None:
    chat_route = respx.post("https://async.example/v1/chat/completions").mock(
        return_value=httpx.Response(
            200,
            json={
                "created": 1,
                "model": "NCAIR1/N-ATLaS",
                "choices": [
                    {
                        "message": {"role": "assistant", "content": "Habari"},
                        "finish_reason": "stop",
                    }
                ],
                "usage": {"prompt_tokens": 2, "completion_tokens": 1, "total_tokens": 3},
            },
        )
    )
    completion_route = respx.post("https://async.example/v1/completions").mock(
        return_value=httpx.Response(
            200,
            json={
                "created": 1,
                "model": "NCAIR1/N-ATLaS",
                "choices": [{"text": "Habari", "finish_reason": "stop"}],
            },
        )
    )
    async with AsyncClient(base_url="https://async.example", api_key="secret") as client:
        response = await client.chat([{"role": "user", "content": "Hello"}])
        completion = await client.generate("Hello")
    assert isinstance(response, ChatResponse)
    assert response.message.content == "Habari"
    assert isinstance(completion, GenerateResponse)
    assert completion.response == "Habari"
    assert json.loads(chat_route.calls.last.request.content)["stream"] is False
    assert json.loads(completion_route.calls.last.request.content)["stream"] is False


@respx.mock
@pytest.mark.asyncio
async def test_async_chat_streaming() -> None:
    stream = "\n".join(
        [
            'data: {"created":1,"choices":[{"delta":{"content":"Hab"},"finish_reason":null}]}',
            "",
            'data: {"created":1,"choices":[{"delta":{"content":"ari"},"finish_reason":"stop"}]}',
            "",
            "data: [DONE]",
            "",
            "",
        ]
    )
    respx.post("https://async.example/v1/chat/completions").mock(
        return_value=httpx.Response(200, text=stream, headers={"content-type": "text/event-stream"})
    )
    async with AsyncClient(base_url="https://async.example", api_key="secret") as client:
        chunks = await client.chat([{"role": "user", "content": "Hello"}], stream=True)
        received = [chunk async for chunk in chunks]
    assert "".join(chunk.message.content for chunk in received) == "Habari"
    assert received[-1].done is True


@respx.mock
@pytest.mark.asyncio
async def test_async_escape_hatches() -> None:
    respx.get("https://async.example/v1/status").mock(
        return_value=httpx.Response(200, json={"ok": True})
    )
    respx.post("https://async.example/v1/echo").mock(
        return_value=httpx.Response(200, json={"value": 7})
    )
    async with AsyncClient(base_url="https://async.example", api_key="secret") as client:
        assert await client.get("status") == {"ok": True}
        assert await client.post("echo", body={"value": 7}) == {"value": 7}


@pytest.mark.asyncio
async def test_async_local_stream_exhausts_cleanly() -> None:
    class FakeLocalBackend:
        def chat(self, request: object) -> object:
            del request
            return iter(
                [
                    ChatResponse(
                        model="NCAIR1/N-ATLaS",
                        created=1,
                        message=Message(role="assistant", content="Habari"),
                        done=True,
                        done_reason="stop",
                    )
                ]
            )

    client = AsyncClient(mode="local", hf_token="token")
    client._local = FakeLocalBackend()
    stream = await client.chat([{"role": "user", "content": "Hello"}], stream=True)
    chunks = [chunk async for chunk in stream]
    assert len(chunks) == 1
    assert chunks[0].message.content == "Habari"
