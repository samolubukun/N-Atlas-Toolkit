"""Resilient structured JSON extraction with schema validation and error feedback retry.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import json
import re
from typing import TYPE_CHECKING, Any, TypeVar

from pydantic import BaseModel, ValidationError

from ._types import Message, MessageInput, normalize_messages

if TYPE_CHECKING:
    from .client import AsyncClient, Client

T = TypeVar("T", bound=BaseModel)

_CODE_BLOCK_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)


def clean_and_parse_json(raw: str) -> Any:
    """Clean markdown code fences, trailing commas, and single quotes before parsing JSON."""
    text = raw.strip()

    # Extract block if enclosed in markdown code fences
    match = _CODE_BLOCK_RE.search(text)
    if match:
        text = match.group(1).strip()

    # 1. First attempt: standard JSON parsing
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Fix common LLM format quirks: trailing commas before closing braces/brackets
    cleaned = re.sub(r",\s*([\]}])", r"\1", text)

    # Coerce currency formatting with commas inside quotes e.g. "15,000" to number if lone number
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # 3. Replace single quotes around keys/values with double quotes if valid JSON wasn't produced
    cleaned_quotes = re.sub(r"(?<=[\{\[,:])\s*'([^']+)'\s*(?=[\}\],:])", r'"\1"', cleaned)
    try:
        return json.loads(cleaned_quotes)
    except json.JSONDecodeError:
        pass

    # Re-raise standard json decode error on cleaned text
    return json.loads(text)


def build_schema_prompt(schema_cls: type[BaseModel], instruction: str) -> str:
    """Build a system prompt enforcing the JSON schema."""
    schema_json = json.dumps(schema_cls.model_json_schema(), indent=2)
    return (
        f"{instruction}\n\n"
        "CRITICAL: You must reply ONLY with a valid JSON object matching this schema. "
        "Do not include any explanation, conversational text, or markdown formatting outside the JSON.\n\n"
        f"Schema:\n{schema_json}"
    )


def extract_sync(
    client: Client,
    response_model: type[T],
    messages: list[MessageInput] | str,
    system_instruction: str = "Extract information according to the requested schema.",
    max_retries: int = 2,
    temperature: float = 0.1,
    **kwargs: Any,
) -> T:
    """Synchronously extract typed structured data from N-ATLaS with schema retry loops."""
    schema_prompt = build_schema_prompt(response_model, system_instruction)
    
    if isinstance(messages, str):
        conversation: list[Message] = [
            Message(role="system", content=schema_prompt),
            Message(role="user", content=messages),
        ]
    else:
        norm = normalize_messages(messages)
        conversation = [Message(role="system", content=schema_prompt), *norm]

    attempts = 0
    last_error: Exception | None = None

    while attempts <= max_retries:
        resp = client.chat(messages=conversation, temperature=temperature, **kwargs)
        raw_content = resp.message.content or ""

        try:
            parsed = clean_and_parse_json(raw_content)
            return response_model.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as e:
            last_error = e
            attempts += 1
            if attempts > max_retries:
                break
            
            # Feed validation error back into conversation for the model to self-correct
            conversation.append(Message(role="assistant", content=raw_content))
            conversation.append(
                Message(
                    role="user",
                    content=(
                        f"The previous output failed validation with the following error: {e}. "
                        "Please correct the JSON and return strictly valid JSON matching the schema."
                    ),
                )
            )

    raise ValueError(
        f"Failed to extract structured data matching {response_model.__name__} after {max_retries} retries. "
        f"Last error: {last_error}"
    )


async def extract_async(
    client: AsyncClient,
    response_model: type[T],
    messages: list[MessageInput] | str,
    system_instruction: str = "Extract information according to the requested schema.",
    max_retries: int = 2,
    temperature: float = 0.1,
    **kwargs: Any,
) -> T:
    """Asynchronously extract typed structured data from N-ATLaS with schema retry loops."""
    schema_prompt = build_schema_prompt(response_model, system_instruction)

    if isinstance(messages, str):
        conversation: list[Message] = [
            Message(role="system", content=schema_prompt),
            Message(role="user", content=messages),
        ]
    else:
        norm = normalize_messages(messages)
        conversation = [Message(role="system", content=schema_prompt), *norm]

    attempts = 0
    last_error: Exception | None = None

    while attempts <= max_retries:
        resp = await client.chat(messages=conversation, temperature=temperature, **kwargs)
        raw_content = resp.message.content or ""

        try:
            parsed = clean_and_parse_json(raw_content)
            return response_model.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as e:
            last_error = e
            attempts += 1
            if attempts > max_retries:
                break

            conversation.append(Message(role="assistant", content=raw_content))
            conversation.append(
                Message(
                    role="user",
                    content=(
                        f"The previous output failed validation with the following error: {e}. "
                        "Please correct the JSON and return strictly valid JSON matching the schema."
                    ),
                )
            )

    raise ValueError(
        f"Failed to extract structured data matching {response_model.__name__} after {max_retries} retries. "
        f"Last error: {last_error}"
    )
