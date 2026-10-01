"""Chat template formatting utilities for N-ATLaS fine-tuning.

Provides the two functions imported by train.py:
  - get_formatted_tokenizer(tokenizer, cfg)
  - make_formatting_func(tokenizer, cfg)

N-ATLaS is an initiative of the Federal Ministry of Communications,
Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations
from typing import Any


def get_formatted_tokenizer(tokenizer, cfg: dict):
    """Return tokenizer configured correctly for fine-tuning.

    When use_tokenizer_template=True (the default for NCAIR1/N-ATLaS):
      - Keeps the model's OWN shipped template completely untouched.
      - Only ensures pad_token is set (required by SFTTrainer).

    When use_tokenizer_template=False (stock Llama-3 / custom base):
      - Applies unsloth's get_chat_template for the configured template.
    """
    data_cfg = cfg.get("data", {})
    use_tokenizer_template = data_cfg.get("use_tokenizer_template", True)

    if use_tokenizer_template:
        # N-ATLaS path: do NOT overwrite template, just ensure padding works
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        return tokenizer

    # Custom template path (e.g. stock Meta-Llama-3-8B)
    chat_template = data_cfg.get("chat_template", "llama-3")
    try:
        from unsloth.chat_templates import get_chat_template
        tokenizer = get_chat_template(tokenizer, chat_template=chat_template)
    except ImportError:
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

    return tokenizer


def make_formatting_func(tokenizer, cfg: dict):
    """Return a batched formatting function for SFTTrainer.

    Converts rows with a ``conversations`` column (list of
    {from: human/gpt, value: str} dicts) into single training strings
    using the model's chat template.

    Respects:
      - data.role_mapping   (from/value key names)
      - data.inject_system_prompt + model.system_prompt
      - data.date_string    (for N-ATLaS date-aware template)
      - data.use_tokenizer_template
    """
    data_cfg = cfg.get("data", {})
    model_cfg = cfg.get("model", {})

    role_map: dict = data_cfg.get("role_mapping", {
        "role": "from", "content": "value",
        "user": "human", "assistant": "gpt",
    })
    use_tokenizer_template: bool = data_cfg.get("use_tokenizer_template", True)
    system_prompt: str = model_cfg.get("system_prompt", "")
    date_string: str | None = data_cfg.get("date_string", None)
    _inject_cfg = data_cfg.get("inject_system_prompt", None)

    def formatting_func(examples: dict[str, Any]) -> dict[str, list[str]]:
        texts: list[str] = []

        for conversations in examples["conversations"]:
            messages: list[dict[str, str]] = []
            for turn in conversations:
                raw_role = turn.get(role_map.get("role", "from"), "")
                raw_content = turn.get(role_map.get("content", "value"), "")
                if raw_role == role_map.get("user", "human"):
                    messages.append({"role": "user", "content": raw_content})
                elif raw_role == role_map.get("assistant", "gpt"):
                    messages.append({"role": "assistant", "content": raw_content})

            if not messages:
                texts.append("")
                continue

            # Determine whether to inject a system prompt
            if _inject_cfg is None:
                should_inject = bool(use_tokenizer_template and system_prompt)
            else:
                should_inject = bool(_inject_cfg)

            if should_inject and messages[0]["role"] != "system":
                messages = [{"role": "system", "content": system_prompt}] + messages

            apply_kwargs: dict[str, Any] = {
                "tokenize": False,
                "add_generation_prompt": False,
            }
            if date_string:
                apply_kwargs["date_string"] = date_string

            try:
                text = tokenizer.apply_chat_template(messages, **apply_kwargs)
            except TypeError:
                apply_kwargs.pop("date_string", None)
                text = tokenizer.apply_chat_template(messages, **apply_kwargs)

            texts.append(text)

        return {"text": texts}

    return formatting_func
