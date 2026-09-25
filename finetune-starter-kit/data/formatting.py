"""
Shared chat-template formatting. train.py, eval/run_eval.py, eval/llm_judge.py
and inference.py all import from here so the formatting logic lives in one
place and train/inference can never drift apart.

Everything about the conversation schema is read from config.yaml rather
than hardcoded, so switching dataset schemas or base models means editing
config, not chasing string literals through the codebase.

Two base-model modes:

  use_tokenizer_template: false (default)
      Unsloth's get_chat_template() builds the prompt from
      data.chat_template + data.role_mapping. Use this when training from
      a stock base model like meta-llama/Meta-Llama-3-8B.

  use_tokenizer_template: true
      Keep the base model's OWN chat template exactly as shipped, and
      convert this kit's ShareGPT-style `conversations` into the
      role/content message list that template expects. Use this for
      NCAIR1/N-ATLaS, whose tokenizer ships a custom date-aware template.

The date-aware case matters: N-ATLaS's template renders "Cutting Knowledge
Date" and "Today Date" into the system block and takes a `date_string`
argument. We do NOT hardcode its template (it is gated and can change) —
we read the template off the tokenizer at load time and detect whether it
references `date_string`, then supply it only if it does. Note that
`date_string` is optional there and silently defaults to the stock Llama-3
value "26 Jul 2024", so omitting it is not safe.
"""

import datetime

DEFAULT_ROLE_MAPPING = {
    "role": "from",
    "content": "value",
    "user": "human",
    "assistant": "gpt",
}

# ShareGPT role value -> OpenAI-style role name, for base models whose
# native template expects role/content rather than from/value.
_SHAREGPT_TO_OPENAI = {
    "human": "user",
    "user": "user",
    "gpt": "assistant",
    "assistant": "assistant",
    "system": "system",
    "tool": "tool",
    "function": "function",
    "observation": "tool",
}

# Frozen once per process so every example in a training run sees the same
# date, and so a train/eval run started on the same day matches.
_FROZEN_DATE = None


def get_role_mapping(cfg):
    """Mapping for unsloth's get_chat_template, which expects keys named
    role/content/user/assistant mapping dataset field names to the
    ShareGPT-style keys this kit uses."""
    rm = (cfg.get("data") or {}).get("role_mapping") or DEFAULT_ROLE_MAPPING
    return {
        "role": rm["role"],
        "content": rm["content"],
        "user": rm["user"],
        "assistant": rm["assistant"],
    }


def get_chat_format(cfg=None):
    """Return (role_key, content_key, user_role, assistant_role) for this
    kit's conversations — e.g. ("from", "value", "human", "gpt").

    role_key is the *field name* holding the role ("from"); user_role is the
    *value* stored there ("human"). Both matter when hand-building a prompt.
    """
    rm = ((cfg or {}).get("data") or {}).get("role_mapping") or DEFAULT_ROLE_MAPPING
    return rm["role"], rm["content"], rm["user"], rm["assistant"]


def get_system_prompt(cfg=None):
    """Optional system message, e.g. N-ATLaS's Awarri persona. Applied at
    eval/inference/judge time only — see data.inject_system_prompt."""
    return ((cfg or {}).get("model") or {}).get("system_prompt")


def uses_tokenizer_template(cfg=None):
    return bool(((cfg or {}).get("data") or {}).get("use_tokenizer_template"))


def get_date_string(cfg=None):
    """The `date_string` value for date-aware templates, e.g. "11 Jun 2025".

    data.date_string pins it (recommended, so runs are reproducible across
    days); otherwise today's date is frozen once per process.
    """
    global _FROZEN_DATE
    pinned = ((cfg or {}).get("data") or {}).get("date_string")
    if pinned:
        return pinned
    if _FROZEN_DATE is None:
        _FROZEN_DATE = datetime.datetime.now().strftime("%d %b %Y")
    return _FROZEN_DATE


def template_kwargs(tokenizer, cfg=None):
    """Extra context to hand apply_chat_template.

    Only supplies date_string if the loaded template actually references it,
    so this is a no-op for stock Llama-3 templates and correct for
    N-ATLaS-style ones — determined from the template text, not hardcoded.
    """
    tmpl = getattr(tokenizer, "chat_template", None) or ""
    if "date_string" in tmpl:
        return {"date_string": get_date_string(cfg)}
    return {}


def sharegpt_to_openai(convo, cfg=None):
    """Convert one `conversations` row to [{'role':..., 'content':...}] for
    base models whose native template expects role/content."""
    role_key, content_key, _, _ = get_chat_format(cfg)
    out = []
    for turn in convo or []:
        raw_role = turn.get(role_key)
        role = _SHAREGPT_TO_OPENAI.get(raw_role, raw_role or "user")
        out.append({"role": role, "content": turn.get(content_key, "")})
    return out


def _to_messages(convo, cfg=None):
    """Normalise a conversation into whatever shape the active template
    wants: role/content for native templates, from/value otherwise."""
    if uses_tokenizer_template(cfg):
        return sharegpt_to_openai(convo, cfg)
    return convo


def get_formatted_tokenizer(tokenizer, cfg):
    """Return a tokenizer whose apply_chat_template renders prompts the way
    this run's base model expects."""
    dcfg = cfg["data"]
    if dcfg.get("use_tokenizer_template"):
        # Keep the shipped template untouched. N-ATLaS's is custom and
        # gated; re-deriving it here would guarantee a mismatch.
        return tokenizer
    from unsloth.chat_templates import get_chat_template

    return get_chat_template(
        tokenizer,
        chat_template=dcfg["chat_template"],
        mapping=get_role_mapping(cfg),
    )


def should_inject_system_prompt(tokenizer, cfg=None):
    """Whether to prepend model.system_prompt during TRAINING.

    data.inject_system_prompt may be true, false, or null/absent for "auto".
    Auto = true when the loaded template references date_string, i.e. when the
    base model is N-ATLaS-shaped.

    Verified against the real NCAIR1/N-ATLaS template: it emits the system
    header UNCONDITIONALLY, and the date block ("Cutting Knowledge Date" /
    "Today Date") renders whether or not a system message was supplied. The
    date is therefore never the reason to inject. What injection changes is
    the system block's *body*: the Awarri persona, which N-ATLaS's own usage
    example puts there. Injecting it keeps training shaped like the
    documented inference prompt instead of an empty system turn.

    This is a persona-consistency choice, not a correctness requirement.
    Set data.inject_system_prompt: false to train without it.
    """
    explicit = ((cfg or {}).get("data") or {}).get("inject_system_prompt")
    if explicit is not None:
        return bool(explicit)
    return "date_string" in (getattr(tokenizer, "chat_template", None) or "")


def make_formatting_func(tokenizer, cfg=None):
    """Build the batched .map() fn that renders each conversation to text."""
    inject_system = should_inject_system_prompt(tokenizer, cfg)
    system_prompt = get_system_prompt(cfg)
    role_key, content_key, _, _ = get_chat_format(cfg)
    kw = template_kwargs(tokenizer, cfg)

    def formatting_prompts_func(examples):
        texts = []
        for convo in examples["conversations"]:
            if inject_system and system_prompt:
                convo = [{role_key: "system", content_key: system_prompt}] + list(convo)
            texts.append(
                tokenizer.apply_chat_template(
                    _to_messages(convo, cfg),
                    tokenize=False,
                    add_generation_prompt=False,
                    **kw,
                )
            )
        return {"text": texts}

    return formatting_prompts_func


def format_single_prompt(tokenizer, user_message: str, cfg=None, system_prompt=None) -> str:
    """Build a generation-ready prompt from a single user message.

    Pass cfg so the prompt matches the base model's template and this run's
    role mapping. Omitting cfg falls back to the kit's ShareGPT defaults.
    """
    role_key, content_key, user_role, _ = get_chat_format(cfg)
    if system_prompt is None:
        system_prompt = get_system_prompt(cfg)
    kw = template_kwargs(tokenizer, cfg)

    if uses_tokenizer_template(cfg):
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_message})
    else:
        messages = []
        if system_prompt:
            messages.append({role_key: "system", content_key: system_prompt})
        messages.append({role_key: user_role, content_key: user_message})

    return tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True, **kw
    )
