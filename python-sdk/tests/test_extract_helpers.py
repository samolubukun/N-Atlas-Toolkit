"""Test extract and semantic helper wrappers in python-sdk."""

from typing import Any
from unittest.mock import MagicMock

from pydantic import BaseModel, Field

from src import Client
from src._types import ChatResponse
from src.extract import clean_and_parse_json


class Invoice(BaseModel):
    merchant: str
    amount: float
    items: list[str] = Field(default_factory=list)


def test_clean_and_parse_json() -> None:
    # 1. Markdown code block
    raw1 = "```json\n{\"merchant\": \"Shoprite\", \"amount\": 15000}\n```"
    assert clean_and_parse_json(raw1) == {"merchant": "Shoprite", "amount": 15000}

    # 2. Trailing comma
    raw2 = '{"merchant": "Kano Market", "amount": 500, }'
    assert clean_and_parse_json(raw2) == {"merchant": "Kano Market", "amount": 500}


def test_client_extract_sync(monkeypatch: Any) -> None:
    client = Client(mode="hosted", api_key="test-key")

    mock_chat_response = ChatResponse.model_validate({
        "created": 12345678,
        "model": "NCAIR1/N-ATLaS",
        "message": {
            "role": "assistant",
            "content": '```json\n{"merchant": "Alaba Market", "amount": 4500.50, "items": ["cables"]}\n```',
        },
    })

    monkeypatch.setattr(client, "chat", MagicMock(return_value=mock_chat_response))

    result = client.extract(
        response_model=Invoice,
        prompt="Bought cables at Alaba Market for 4500.50",
    )
    assert isinstance(result, Invoice)
    assert result.merchant == "Alaba Market"
    assert result.amount == 4500.50
    assert result.items == ["cables"]


def test_client_helpers(monkeypatch: Any) -> None:
    client = Client(mode="hosted", api_key="test-key")

    # Mock translate
    trans_resp = ChatResponse.model_validate({
        "created": 1,
        "model": "NCAIR1/N-ATLaS",
        "message": {"role": "assistant", "content": "Good morning"},
    })
    monkeypatch.setattr(client, "chat", MagicMock(return_value=trans_resp))
    assert client.translate("E kaaro", target_language="en") == "Good morning"
