"""N-ATLaS Unified Replica for Hugging Face ZeroGPU Spaces.

Drop-in replacement for the Modal deployment (same OpenAI-compatible routes, schemas and auth):
    GET  /healthz
    GET  /v1/models
    POST /v1/chat/completions   (SSE streaming, stop sequences, tool calling)
    POST /v1/completions        (SSE streaming, stop sequences)
    POST /v1/audio/transcriptions

ZeroGPU notes:
- Models are loaded ONCE at import time. ZeroGPU attaches the GPU only while a @spaces.GPU
  function is running.
- No bitsandbytes / 4-bit. The 8B model is loaded in bf16.
- All GPU work lives in gpu_generate, gpu_stream and gpu_transcribe.
- The server MUST be started with demo.launch() so ZeroGPU can register the GPU functions.
  The API routes are attached to Gradio's server at the bottom of this file.
"""

import hmac
import io
import json
import logging
import os
import re
import threading
import time
import uuid
from datetime import datetime
from typing import Any, Dict, Iterator, List, Literal, Optional, Union

import gradio as gr
import gradio_client.utils
import spaces

# ---------------------------------------------------------------------------
# MONKEY-PATCH: Fix Gradio 5 schema introspection bug
# ---------------------------------------------------------------------------
_original_get_type = gradio_client.utils.get_type
def _patched_get_type(schema):
    if isinstance(schema, bool):
        return "boolean"
    return _original_get_type(schema)
gradio_client.utils.get_type = _patched_get_type
# ---------------------------------------------------------------------------

import librosa
import numpy as np
import soundfile as sf
import torch
from fastapi import Depends, FastAPI, File, Form, HTTPException, Security, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field, model_validator
from starlette.routing import BaseRoute, Match
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TextIteratorStreamer,
    WhisperForConditionalGeneration,
    WhisperProcessor,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("NATLaS-Replica")

# ---------------------------------------------------------------------------
# Constants & Model Catalog
# ---------------------------------------------------------------------------
LLM_MODEL_ID = os.environ.get("MODEL_ID", "NCAIR1/N-ATLaS")
DEFAULT_ASR_MODEL = "NCAIR1/NigerianAccentedEnglish"
ASR_MODELS = {
    "yo": "NCAIR1/Yoruba-ASR",
    "yoruba": "NCAIR1/Yoruba-ASR",
    "ha": "NCAIR1/Hausa-ASR",
    "hausa": "NCAIR1/Hausa-ASR",
    "ig": "NCAIR1/Igbo-ASR",
    "igbo": "NCAIR1/Igbo-ASR",
    "en": "NCAIR1/NigerianAccentedEnglish",
    "en-ng": "NCAIR1/NigerianAccentedEnglish",
    "nigerian-english": "NCAIR1/NigerianAccentedEnglish",
}
ASR_UNIQUE_IDS = sorted(set(ASR_MODELS.values()))

ATTRIBUTION = (
    "N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation "
    "and Digital Economy, and powered by Awarri Technologies."
)
ASR_ATTRIBUTION = (
    "Yoruba-ASR, Hausa-ASR, Igbo-ASR, and NigerianAccentedEnglish are developed by "
    "Awarri Technologies in partnership with the Federal Government of Nigeria / NCAIR / NITDA."
)

# Exact INPUT wording from the official model card example. The chat template itself prepends
# "your name is AwaGPT, " (visible in the card's printed output), so don't repeat it here.
SYSTEM_PROMPT_DEFAULT = (
    "you are a large language model trained by Awarri AI technologies. "
    "You are a friendly assistant and you are here to help."
)

HF_TOKEN = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN", "")

_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

# ---------------------------------------------------------------------------
# Load all models at startup (ZeroGPU pattern)
# ---------------------------------------------------------------------------
logger.info(f"Loading tokenizer + LLM {LLM_MODEL_ID} ...")
tokenizer = AutoTokenizer.from_pretrained(LLM_MODEL_ID, token=HF_TOKEN or None, trust_remote_code=True)
llm = AutoModelForCausalLM.from_pretrained(
    LLM_MODEL_ID,
    token=HF_TOKEN or None,
    trust_remote_code=True,
    torch_dtype=torch.bfloat16,
).to("cuda")
llm.eval()

# Llama-3 chat turns end with <|eot_id|>; make sure generation stops on it as well as on EOS.
EOS_IDS: List[int] = []
for _tid in (tokenizer.eos_token_id, tokenizer.convert_tokens_to_ids("<|eot_id|>")):
    if _tid is not None and _tid != tokenizer.unk_token_id and _tid not in EOS_IDS:
        EOS_IDS.append(_tid)
logger.info(f"LLM ready. Stop token ids: {EOS_IDS}")

asr_models: Dict[str, Any] = {}
asr_processors: Dict[str, Any] = {}
for _mid in ASR_UNIQUE_IDS:
    try:
        logger.info(f"Loading ASR model {_mid} ...")
        asr_processors[_mid] = WhisperProcessor.from_pretrained(_mid, token=HF_TOKEN or None)
        _m = WhisperForConditionalGeneration.from_pretrained(
            _mid, token=HF_TOKEN or None, torch_dtype=torch.float16
        ).to("cuda")
        _m.eval()
        asr_models[_mid] = _m
    except Exception as err:  # keep the Space alive even if one ASR model fails
        logger.error(f"Failed to load ASR model {_mid}: {err}")
logger.info("Startup model loading finished.")


# ---------------------------------------------------------------------------
# Prompt / text helpers
# ---------------------------------------------------------------------------
def resolve_model_id(requested: Optional[str], language: Optional[str]) -> str:
    """Same resolution rules as the Modal ASR engine."""
    if requested and requested in ASR_MODELS.values():
        return requested
    if language:
        key = language.strip().lower()
        if key in ASR_MODELS:
            return ASR_MODELS[key]
    return DEFAULT_ASR_MODEL


def format_messages_to_prompt(
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Apply the N-ATLaS Llama-3 chat template (with optional tools), like the Modal engine."""
    now = datetime.now()
    date_str = f"{now.day:02d} {_MONTHS[now.month - 1]} {now.year}"

    has_system = any(m.get("role") == "system" for m in messages)
    formatted: List[Dict[str, Any]] = []
    if not has_system:
        formatted.append({"role": "system", "content": SYSTEM_PROMPT_DEFAULT})
    formatted.extend(messages)

    if tools:
        try:
            return tokenizer.apply_chat_template(
                formatted,
                tools=tools,
                add_generation_prompt=True,
                tokenize=False,
                date_string=date_str,
            )
        except Exception as e:
            logger.info(f"Chat-template tools fallback: {e}")
            tools_prompt = (
                "\n\n# Tools\n"
                "You have access to the following functions. To call a function, respond with a JSON object "
                "containing 'name' and 'parameters'.\n"
                f"{json.dumps(tools, indent=2)}"
            )
            if formatted and formatted[0].get("role") == "system":
                formatted[0] = {**formatted[0], "content": str(formatted[0].get("content", "")) + tools_prompt}
            else:
                formatted.insert(0, {"role": "system", "content": tools_prompt.strip()})

    try:
        return tokenizer.apply_chat_template(
            formatted,
            add_generation_prompt=True,
            tokenize=False,
            date_string=date_str,
        )
    except Exception:
        prompt = ""
        for m in formatted:
            prompt += f"<|start_header_id|>{m['role']}<|end_header_id|>\n\n{m.get('content') or ''}<|eot_id|>"
        prompt += "<|start_header_id|>assistant<|end_header_id|>\n\n"
        return prompt


def encode_prompt(prompt: str):
    """Tokenize without adding a second BOS when the chat template already included one."""
    bos = tokenizer.bos_token or ""
    add_special = not (bos and prompt.startswith(bos))
    return tokenizer(prompt, return_tensors="pt", add_special_tokens=add_special)


def normalize_stop(stop: Optional[Union[str, List[str]]]) -> List[str]:
    if not stop:
        return []
    values = [stop] if isinstance(stop, str) else list(stop)
    return [s for s in values if s]


def apply_stop(text: str, stop: Optional[Union[str, List[str]]]) -> "tuple[str, bool]":
    stops = normalize_stop(stop)
    if not stops:
        return text, False
    positions = [p for s in stops if (p := text.find(s)) >= 0]
    if not positions:
        return text, False
    return text[: min(positions)], True


def iter_with_stop(pieces: Iterator[str], stop: Optional[Union[str, List[str]]], state: Dict[str, Any]):
    """Re-chunk a text stream so stop sequences are never sent to the client.

    Holds back the last (longest_stop - 1) characters until it is sure they are not the start
    of a stop sequence. `state` collects {"text": emitted_text, "stopped": bool}.
    """
    stops = normalize_stop(stop)
    hold = max((len(s) for s in stops), default=1) - 1
    buf = ""
    for piece in pieces:
        buf += piece
        if not stops:
            state["text"] += buf
            yield buf
            buf = ""
            continue
        cut, hit = apply_stop(buf, stops)
        if hit:
            state["stopped"] = True
            state["text"] += cut
            if cut:
                yield cut
            for _ in pieces:  # let the GPU generator finish cleanly
                pass
            return
        safe = len(buf) - hold
        if safe > 0:
            out, buf = buf[:safe], buf[safe:]
            state["text"] += out
            yield out
    if buf:
        state["text"] += buf
        yield buf


def count_tokens(text: str) -> int:
    return len(tokenizer.encode(text, add_special_tokens=False))


def parse_llama_tool_calls(text: str) -> Optional[List[Dict[str, Any]]]:
    """Detect Llama-3.1 style function calls or JSON tool calls (same logic as the Modal engine)."""
    cleaned = text.strip()
    if not cleaned:
        return None

    # 1. python_tag syntax: <|python_tag|>function_name(arg="val")
    match = re.search(r"(?:<\|python_tag\|>)?([a-zA-Z0-9_]+)\((.*?)\)", cleaned, re.DOTALL)
    if match and not cleaned.startswith("{"):
        func_name = match.group(1)
        raw_args = match.group(2).strip()
        args_dict: Dict[str, Any] = {}
        if raw_args:
            try:
                args_dict = json.loads(f"{{{raw_args}}}")
            except Exception:
                for kv in re.finditer(r'([a-zA-Z0-9_]+)\s*=\s*(?:"(.*?)"|\'(.*?)\'|([^,\s]+))', raw_args):
                    k = kv.group(1)
                    v = kv.group(2) if kv.group(2) is not None else (
                        kv.group(3) if kv.group(3) is not None else kv.group(4)
                    )
                    args_dict[k] = v
        return [{
            "id": f"call_{uuid.uuid4().hex[:9]}",
            "type": "function",
            "function": {"name": func_name, "arguments": json.dumps(args_dict)},
        }]

    # 2. JSON syntax: {"name": "func_name", "parameters": {...}}
    if "{" in cleaned and "}" in cleaned:
        candidate = cleaned[cleaned.find("{"): cleaned.rfind("}") + 1]
        try:
            payload = json.loads(candidate)
            if isinstance(payload, dict):
                name = payload.get("name") or payload.get("function")
                args = payload.get("parameters") or payload.get("arguments") or payload.get("args") or {}
                if name and isinstance(name, str):
                    return [{
                        "id": f"call_{uuid.uuid4().hex[:9]}",
                        "type": "function",
                        "function": {
                            "name": name,
                            "arguments": json.dumps(args) if isinstance(args, dict) else str(args),
                        },
                    }]
        except Exception:
            pass
    return None


def decode_audio(audio_bytes: bytes):
    try:
        audio_array, sampling_rate = sf.read(io.BytesIO(audio_bytes))
    except Exception:
        try:
            audio_array, sampling_rate = librosa.load(io.BytesIO(audio_bytes), sr=16000)
        except Exception:
            audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            sampling_rate = 16000
    if audio_array.ndim > 1:
        audio_array = np.mean(audio_array, axis=1)
    if sampling_rate != 16000:
        audio_array = librosa.resample(audio_array.astype(np.float32), orig_sr=sampling_rate, target_sr=16000)
    return audio_array.astype(np.float32)


def build_gen_kwargs(
    max_new_tokens: int,
    temperature: float,
    top_p: float,
    top_k: int,
    repetition_penalty: float,
    stop: Optional[List[str]],
) -> Dict[str, Any]:
    kw: Dict[str, Any] = dict(
        max_new_tokens=int(max_new_tokens),
        repetition_penalty=float(repetition_penalty),
        pad_token_id=tokenizer.eos_token_id,
        eos_token_id=EOS_IDS,
    )
    if temperature and temperature > 0:
        kw.update(
            do_sample=True,
            temperature=max(float(temperature), 0.01),
            top_p=float(top_p),
            top_k=max(int(top_k), 0),  # -1 (disabled) -> 0
        )
    else:
        kw["do_sample"] = False
    if stop:
        kw["stop_strings"] = stop
        kw["tokenizer"] = tokenizer
    return kw


# ---------------------------------------------------------------------------
# GPU functions (the ONLY places that touch the GPU)
# ---------------------------------------------------------------------------
@spaces.GPU(duration=120)
def gpu_generate(
    prompt: str,
    max_new_tokens: int,
    temperature: float,
    top_p: float,
    top_k: int,
    repetition_penalty: float,
    stop: Optional[List[str]] = None,
):
    """Non-streaming generation. Returns (text, prompt_tokens, completion_tokens, finish_reason)."""
    inputs = encode_prompt(prompt).to("cuda")
    prompt_tokens = inputs.input_ids.shape[-1]
    kw = build_gen_kwargs(max_new_tokens, temperature, top_p, top_k, repetition_penalty, stop)
    with torch.inference_mode():
        outputs = llm.generate(**inputs, **kw)
    out_tokens = outputs[0][prompt_tokens:]
    n = len(out_tokens)
    last = int(out_tokens[-1]) if n else None
    hit_eos = last in EOS_IDS if last is not None else False
    finish = "length" if (n >= int(max_new_tokens) and not hit_eos) else "stop"
    text = tokenizer.decode(out_tokens, skip_special_tokens=True)
    return text, prompt_tokens, (n - 1 if hit_eos else n), finish


@spaces.GPU(duration=120)
def gpu_stream(
    prompt: str,
    max_new_tokens: int,
    temperature: float,
    top_p: float,
    top_k: int,
    repetition_penalty: float,
    stop: Optional[List[str]] = None,
):
    """Streaming generation. Yields text pieces."""
    inputs = encode_prompt(prompt).to("cuda")
    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    kw = build_gen_kwargs(max_new_tokens, temperature, top_p, top_k, repetition_penalty, stop)
    gen_kwargs = dict(**inputs, streamer=streamer, **kw)
    thread = threading.Thread(target=llm.generate, kwargs=gen_kwargs)
    thread.start()
    for piece in streamer:
        yield piece
    thread.join()


@spaces.GPU(duration=60)
def gpu_transcribe(
    audio_bytes: bytes,
    model_id: str,
    language: Optional[str] = None,
    return_timestamps: bool = False,
) -> Dict[str, Any]:
    resolved = model_id if model_id in asr_models else DEFAULT_ASR_MODEL
    if resolved not in asr_models:
        raise RuntimeError(f"ASR model {resolved} is not loaded.")
    model, processor = asr_models[resolved], asr_processors[resolved]

    audio = decode_audio(audio_bytes)
    duration_sec = float(len(audio)) / 16000.0

    # Silence / low-energy gate (avoids Whisper hallucinations on silence)
    rms = float(np.sqrt(np.mean(audio ** 2))) if len(audio) > 0 else 0.0
    if rms < 0.005 or duration_sec < 0.4:
        return {"text": "", "duration": round(duration_sec, 2), "model": resolved,
                "language": language or "auto", "words": []}

    feats = processor(audio, sampling_rate=16000, return_tensors="pt").input_features
    feats = feats.to("cuda", dtype=torch.float16)

    gen_kwargs: Dict[str, Any] = {"return_timestamps": return_timestamps, "no_repeat_ngram_size": 3}
    if hasattr(model.generation_config, "no_speech_threshold"):
        gen_kwargs["no_speech_threshold"] = 0.6

    with torch.inference_mode():
        predicted_ids = model.generate(feats, **gen_kwargs)
    text = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()

    # Drop degenerate repeating-word loops
    words_list = text.split()
    if len(words_list) >= 4:
        most_frequent = max(set(words_list), key=words_list.count)
        if words_list.count(most_frequent) / len(words_list) > 0.45:
            text = ""
            words_list = []

    words: List[Dict[str, Any]] = []
    if return_timestamps and text:
        step = duration_sec / max(1, len(words_list))
        words = [
            {"word": w, "start": round(i * step, 2), "end": round((i + 1) * step, 2), "confidence": 0.95}
            for i, w in enumerate(words_list)
        ]

    return {"text": text, "duration": round(duration_sec, 2), "model": resolved,
            "language": language or "auto", "words": words}


# ---------------------------------------------------------------------------
# Auth (same behavior as Modal: 503 if no key configured, 401 on mismatch)
# ---------------------------------------------------------------------------
_api_key_scheme = APIKeyHeader(name="Authorization", scheme_name="BearerAuth", auto_error=False)


def verify_api_key(auth_header: Optional[str] = Security(_api_key_scheme)):
    expected = os.environ.get("NATLAS_API_KEY")
    if not expected:
        raise HTTPException(status_code=503, detail="Server authentication is not configured.")

    token = ""
    if auth_header:
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
        else:
            token = auth_header.strip()

    if not hmac.compare_digest(token.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid NATLAS API key or Bearer token.",
        )
    return token


# ---------------------------------------------------------------------------
# Pydantic schemas (same as the Modal deployment)
# ---------------------------------------------------------------------------
class FunctionCall(BaseModel):
    name: str
    arguments: str


class ToolCall(BaseModel):
    id: str = Field(default_factory=lambda: f"call_{uuid.uuid4().hex[:9]}")
    type: Literal["function"] = "function"
    function: FunctionCall


class FunctionDefinition(BaseModel):
    name: str
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class ToolDefinition(BaseModel):
    type: Literal["function"] = "function"
    function: FunctionDefinition


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant", "function", "tool"]
    content: Optional[str] = None
    name: Optional[str] = None
    tool_calls: Optional[List[ToolCall]] = None
    tool_call_id: Optional[str] = None


class SamplingRequest(BaseModel):
    @model_validator(mode="before")
    @classmethod
    def reject_null_numeric_settings(cls, data):
        numeric_fields = {
            "temperature", "top_p", "top_k", "max_tokens",
            "repetition_penalty", "presence_penalty", "frequency_penalty",
        }
        if isinstance(data, dict):
            invalid = sorted(f for f in numeric_fields if f in data and data[f] is None)
            if invalid:
                raise ValueError(f"Settings cannot be null: {', '.join(invalid)}")
        return data


class ChatCompletionRequest(SamplingRequest):
    model: str = Field(default="NCAIR1/N-ATLaS")
    messages: List[ChatMessage]
    tools: Optional[List[ToolDefinition]] = None
    tool_choice: Optional[Union[str, Dict[str, Any]]] = None
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0, allow_inf_nan=False)
    top_p: Optional[float] = Field(default=0.9, gt=0.0, le=1.0, allow_inf_nan=False)
    top_k: Optional[int] = Field(default=50, ge=-1)
    max_tokens: Optional[int] = Field(default=1024, ge=1, le=8192)
    stream: Optional[bool] = False
    repetition_penalty: Optional[float] = Field(default=1.12, gt=0.0, le=2.0, allow_inf_nan=False)
    stop: Optional[Union[str, List[str]]] = None
    presence_penalty: Optional[float] = Field(default=0.0)
    frequency_penalty: Optional[float] = Field(default=0.0)


class CompletionRequest(SamplingRequest):
    model: str = Field(default="NCAIR1/N-ATLaS")
    prompt: str
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0, allow_inf_nan=False)
    top_p: Optional[float] = Field(default=0.9, gt=0.0, le=1.0, allow_inf_nan=False)
    max_tokens: Optional[int] = Field(default=512, ge=1, le=8192)
    stream: Optional[bool] = False
    repetition_penalty: Optional[float] = Field(default=1.12, gt=0.0, le=2.0, allow_inf_nan=False)
    stop: Optional[Union[str, List[str]]] = None


# ---------------------------------------------------------------------------
# FastAPI app (OpenAI compatible)
# ---------------------------------------------------------------------------
fastapi_app = FastAPI(
    title="N-ATLaS Multilingual LLM Serving API",
    description="OpenAI-compliant hosting of N-ATLaS (Llama-3 8B fine-tuned for Hausa, Igbo, Yoruba, English) "
                "plus Sovereign Nigerian ASR. Runs on Hugging Face ZeroGPU.",
    version="1.0.0",
)
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@fastapi_app.get("/healthz")
def health_check():
    return {
        "status": "healthy",
        "service": "natlas-engine",
        "model": LLM_MODEL_ID,
        "engine": "PyTorch-Transformers",
        "gpu": "ZeroGPU (shared NVIDIA GPU)",
        "timestamp": datetime.now().isoformat(),
        "supported_models": ASR_UNIQUE_IDS,
        "asr_models_loaded": sorted(asr_models.keys()),
        "attribution": ATTRIBUTION,
    }


@fastapi_app.get("/v1/models")
def list_models(auth=Depends(verify_api_key)):
    return {
        "object": "list",
        "data": [
            {
                "id": "NCAIR1/N-ATLaS",
                "object": "model",
                "created": 1726000000,
                "owned_by": "Awarri / NCAIR / NITDA",
                "root": "Llama-3-8B",
                "languages": ["English", "Hausa", "Igbo", "Yoruba"],
                "context_window": 8192,
            },
            {
                "id": "natlas-8b",
                "object": "model",
                "created": 1726000000,
                "owned_by": "Awarri / NCAIR / NITDA",
                "root": "NCAIR1/N-ATLaS",
                "context_window": 8192,
            },
        ],
    }


# NOTE: chat/completions routes are plain `def` so FastAPI runs them in a threadpool and the
# blocking GPU calls don't freeze the event loop.
@fastapi_app.post("/v1/chat/completions")
def chat_completions(req: ChatCompletionRequest, auth=Depends(verify_api_key)):
    created_time = int(time.time())
    request_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"

    messages_dicts = [m.model_dump(exclude_none=True) for m in req.messages]
    tools_dicts = [t.model_dump(exclude_none=True) for t in req.tools] if req.tools else None
    prompt = format_messages_to_prompt(messages_dicts, tools=tools_dicts)
    stop = normalize_stop(req.stop)

    sampling = dict(
        max_new_tokens=req.max_tokens,
        temperature=req.temperature,
        top_p=req.top_p,
        top_k=req.top_k,
        repetition_penalty=req.repetition_penalty,
        stop=stop or None,
    )

    def chunk(delta_text: str, finish_reason: Optional[str]) -> str:
        obj = {
            "id": request_id,
            "object": "chat.completion.chunk",
            "created": created_time,
            "model": req.model,
            "choices": [{"index": 0, "delta": {"content": delta_text}, "finish_reason": finish_reason}],
        }
        return f"data: {json.dumps(obj)}\n\n"

    # 1. STREAMING (Server-Sent Events)
    if req.stream:
        def event_generator():
            state: Dict[str, Any] = {"text": "", "stopped": False}
            try:
                for delta in iter_with_stop(gpu_stream(prompt, **sampling), stop, state):
                    yield chunk(delta, None)
            except Exception as err:
                logger.error(f"Streaming generation failed: {err}")
                yield f"data: {json.dumps({'error': {'message': str(err), 'type': 'gpu_error'}})}\n\n"
            if state["stopped"]:
                finish = "stop"
            else:
                finish = "length" if count_tokens(state["text"]) >= req.max_tokens else "stop"
            yield chunk("", finish)
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    # 2. NON-STREAMING
    try:
        out_text, prompt_tokens, completion_tokens, finish_reason = gpu_generate(prompt, **sampling)
    except Exception as err:
        raise HTTPException(status_code=503, detail=f"GPU unavailable or quota exceeded: {err}")

    out_text, stopped = apply_stop(out_text, stop)
    if stopped:
        finish_reason = "stop"

    tool_calls = None
    clean_content: Optional[str] = out_text.strip()
    if req.tools:
        parsed = parse_llama_tool_calls(clean_content)
        if parsed:
            tool_calls = parsed
            finish_reason = "tool_calls"
            clean_content = None

    message_payload: Dict[str, Any] = {"role": "assistant", "content": clean_content}
    if tool_calls:
        message_payload["tool_calls"] = tool_calls

    return {
        "id": request_id,
        "object": "chat.completion",
        "created": created_time,
        "model": req.model,
        "choices": [{"index": 0, "message": message_payload, "finish_reason": finish_reason}],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        },
    }


@fastapi_app.post("/v1/completions")
def text_completions(req: CompletionRequest, auth=Depends(verify_api_key)):
    created_time = int(time.time())
    request_id = f"cmpl-{uuid.uuid4().hex[:12]}"
    stop = normalize_stop(req.stop)

    sampling = dict(
        max_new_tokens=req.max_tokens,
        temperature=req.temperature,
        top_p=req.top_p,
        top_k=50,
        repetition_penalty=req.repetition_penalty,
        stop=stop or None,
    )

    def chunk(text: str, finish_reason: Optional[str]) -> str:
        obj = {
            "id": request_id,
            "object": "text_completion",
            "created": created_time,
            "model": req.model,
            "choices": [{"text": text, "index": 0, "logprobs": None, "finish_reason": finish_reason}],
        }
        return f"data: {json.dumps(obj)}\n\n"

    if req.stream:
        def event_generator():
            state: Dict[str, Any] = {"text": "", "stopped": False}
            try:
                for delta in iter_with_stop(gpu_stream(req.prompt, **sampling), stop, state):
                    yield chunk(delta, None)
            except Exception as err:
                logger.error(f"Streaming completion failed: {err}")
                yield f"data: {json.dumps({'error': {'message': str(err), 'type': 'gpu_error'}})}\n\n"
            if state["stopped"]:
                finish = "stop"
            else:
                finish = "length" if count_tokens(state["text"]) >= req.max_tokens else "stop"
            yield chunk("", finish)
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    try:
        text, p_tokens, c_tokens, finish_reason = gpu_generate(req.prompt, **sampling)
    except Exception as err:
        raise HTTPException(status_code=503, detail=f"GPU unavailable or quota exceeded: {err}")

    text, stopped = apply_stop(text, stop)
    if stopped:
        finish_reason = "stop"

    return {
        "id": request_id,
        "object": "text_completion",
        "created": created_time,
        "model": req.model,
        "choices": [{"text": text, "index": 0, "logprobs": None, "finish_reason": finish_reason}],
        "usage": {
            "prompt_tokens": p_tokens,
            "completion_tokens": c_tokens,
            "total_tokens": p_tokens + c_tokens,
        },
    }


@fastapi_app.post("/v1/audio/transcriptions")
async def create_transcription(
    file: UploadFile = File(...),
    model: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    response_format: Optional[str] = Form("json"),
    timestamp_granularities: Optional[List[str]] = Form(None),
    auth=Depends(verify_api_key),
):
    """Drop-in OpenAI Whisper compatible audio transcription endpoint."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file provided.")

    model_id = resolve_model_id(model, language)
    return_words = bool(timestamp_granularities and "word" in timestamp_granularities)

    try:
        result = await run_in_threadpool(gpu_transcribe, content, model_id, language, return_words)
    except Exception as err:
        raise HTTPException(status_code=503, detail=f"GPU unavailable or quota exceeded: {err}")

    if response_format == "text":
        return PlainTextResponse(result["text"])

    return JSONResponse({
        "text": result["text"],
        "duration": result["duration"],
        "model": result["model"],
        "language": result["language"],
        "words": result["words"],
        "attribution": ASR_ATTRIBUTION,
    })


# ---------------------------------------------------------------------------
# Gradio handlers (plain functions that call the GPU functions above)
# ---------------------------------------------------------------------------
def gradio_chat_respond(
    message: str,
    history: List[Dict[str, str]],
    system_prompt: str,
    temperature: float,
    max_tokens: int,
    repetition_penalty: float,
):
    messages_payload = [{"role": "system", "content": system_prompt or SYSTEM_PROMPT_DEFAULT}]
    for item in history:
        if isinstance(item, dict):
            content = item.get("content", "")
            if isinstance(content, str) and item.get("role") in ("user", "assistant"):
                messages_payload.append({"role": item["role"], "content": content})
        elif isinstance(item, (list, tuple)) and len(item) == 2:
            u, a = item
            if u:
                messages_payload.append({"role": "user", "content": str(u)})
            if a:
                messages_payload.append({"role": "assistant", "content": str(a)})
    messages_payload.append({"role": "user", "content": message})
    prompt = format_messages_to_prompt(messages_payload)

    accumulated = ""
    for piece in gpu_stream(
        prompt,
        max_new_tokens=int(max_tokens),
        temperature=float(temperature),
        top_p=0.9,
        top_k=50,
        repetition_penalty=float(repetition_penalty),
    ):
        accumulated += piece
        yield accumulated


def gradio_transcribe_audio(audio_file, asr_choice: str):
    if audio_file is None:
        return "Please record or upload an audio clip."
    with open(audio_file, "rb") as f:
        audio_bytes = f.read()

    result = gpu_transcribe(audio_bytes, resolve_model_id(None, asr_choice))

    out = f"### Transcription Result ({result['duration']}s)\n\n"
    out += f"> **{result['text'] if result['text'] else '[No audible speech detected]'}**\n\n"
    out += f"- **Model Used:** `{result['model']}`\n"
    out += f"- **Language Profile:** `{result['language']}`\n"
    out += f"- *{ASR_ATTRIBUTION}*"
    return out


def gradio_text_complete(prompt: str, max_tokens: int, temperature: float, repetition_penalty: float):
    if not prompt.strip():
        return "Please enter a prompt to complete."
    text, _, _, _ = gpu_generate(
        prompt,
        max_new_tokens=int(max_tokens),
        temperature=float(temperature),
        top_p=0.9,
        top_k=50,
        repetition_penalty=float(repetition_penalty),
    )
    return text


# ---------------------------------------------------------------------------
# Gradio UI
# ---------------------------------------------------------------------------
with gr.Blocks(title="N-ATLaS Engine") as demo:
    gr.Markdown(f"""# 🇳🇬 N-ATLaS Sovereign AI Replica Engine & API Gateway
*{ATTRIBUTION}*

**Models:** `Llama-3 8B Multilingual` | **Languages:** English · Hausa · Igbo · Yoruba | **ASR:** Whisper Sovereign | **API:** OpenAI `/v1` Compatible
""")

    with gr.Tabs():
        # TAB 1: CHAT
        with gr.TabItem("💬 Multilingual Chatbot"):
            with gr.Row():
                with gr.Column(scale=3):
                    chatbot = gr.Chatbot(height=500, type="messages", label="N-ATLaS Conversation (AwaGPT)")
                    with gr.Row():
                        msg = gr.Textbox(
                            show_label=False,
                            placeholder="Type in English, Hausa, Yoruba, or Igbo...",
                            scale=8,
                        )
                        send_btn = gr.Button("Send 🚀", variant="primary", scale=1)

                    gr.Examples(
                        examples=[
                            ["Sannu! Menene amfanin fasahar zamani wajen bunkasa ilimi a Najeriya?"],
                            ["Bawo ni! Ki ni pataki imo-ero ayelujara si idagbasoke eto-eko?"],
                            ["Kedu otu teknụzụ nwere ike isi nyere ụmụ akwụkwọ aka ịmụta ihe ọhụrụ?"],
                            ["Explain in simple terms why multilingual sovereign LLMs are vital for cultural heritage."],
                        ],
                        inputs=msg,
                    )

                with gr.Column(scale=1):
                    gr.Markdown("### ⚙️ Generation Controls")
                    system_input = gr.Textbox(label="System Prompt", value=SYSTEM_PROMPT_DEFAULT, lines=4)
                    temp = gr.Slider(0.0, 1.5, value=0.3, step=0.05, label="Temperature")
                    max_tok = gr.Slider(64, 4096, value=1024, step=64, label="Max New Tokens")
                    rep_pen = gr.Slider(1.0, 1.5, value=1.0, step=0.02, label="Repetition Penalty")
                    clear_btn = gr.Button("Clear Chat 🧹")

            def user_message(user_msg, hist):
                hist = hist or []
                if not user_msg or not user_msg.strip():
                    return "", hist
                return "", hist + [{"role": "user", "content": user_msg}]

            def bot_response(hist, sys_p, t, m_t, r_p):
                if not hist or hist[-1].get("role") != "user":
                    yield hist
                    return
                user_msg = hist[-1]["content"]
                past_hist = hist[:-1]
                hist = hist + [{"role": "assistant", "content": ""}]
                for update in gradio_chat_respond(user_msg, past_hist, sys_p, t, m_t, r_p):
                    hist[-1]["content"] = update
                    yield hist

            msg.submit(user_message, [msg, chatbot], [msg, chatbot], queue=False).then(
                bot_response, [chatbot, system_input, temp, max_tok, rep_pen], chatbot
            )
            send_btn.click(user_message, [msg, chatbot], [msg, chatbot], queue=False).then(
                bot_response, [chatbot, system_input, temp, max_tok, rep_pen], chatbot
            )
            clear_btn.click(lambda: [], None, chatbot, queue=False)

        # TAB 2: ASR
        with gr.TabItem("🎙️ Sovereign Speech-to-Text (ASR)"):
            gr.Markdown("""
            ### Voice Transcription for Nigerian Languages & Accents
            Fine-tuned Whisper models honoring Nigerian phonetics and tonal dialects.
            """)
            with gr.Row():
                with gr.Column():
                    audio_input = gr.Audio(sources=["microphone", "upload"], type="filepath",
                                           label="Voice Audio Input")
                    asr_lang = gr.Radio(
                        choices=["yoruba", "hausa", "igbo", "nigerian-english"],
                        value="yoruba",
                        label="Select Language ASR Model",
                    )
                    transcribe_btn = gr.Button("Transcribe Voice 🎙️", variant="primary")
                with gr.Column():
                    transcription_output = gr.Markdown(label="Transcript Output")

            transcribe_btn.click(gradio_transcribe_audio, inputs=[audio_input, asr_lang],
                                 outputs=transcription_output)

        # TAB 3: RAW COMPLETION
        with gr.TabItem("⚡ Raw Completion"):
            gr.Markdown("### Direct Prompt Text Completion (`/v1/completions`)")
            prompt_input = gr.Textbox(lines=5, label="Input Prompt", placeholder="Enter raw prompt...")
            complete_btn = gr.Button("Complete Prompt", variant="primary")
            output_complete = gr.Textbox(lines=6, label="Engine Output")
            complete_btn.click(
                gradio_text_complete,
                inputs=[prompt_input, max_tok, temp, rep_pen],
                outputs=output_complete,
            )

        # TAB 4: API DOCS
        with gr.TabItem("🔌 API Documentation & SDK"):
            gr.Markdown(f"""
            ### 🌐 OpenAI-Compatible API Endpoints

            - `GET /healthz` - Service health (no auth)
            - `GET /v1/models` - Model catalog
            - `POST /v1/chat/completions` - Chat completions (SSE streaming, stop sequences, tool calling)
            - `POST /v1/completions` - Raw text completion (SSE streaming)
            - `POST /v1/audio/transcriptions` - ASR speech-to-text (multipart)

            All `/v1/*` routes require `Authorization: Bearer <NATLAS_API_KEY>`.

            > This Space runs on **ZeroGPU**. API calls share the free GPU quota, so heavy or
            > anonymous API usage can be rate-limited.

            ```python
            from openai import OpenAI

            client = OpenAI(
                base_url="https://samuelolubukun-natlas-sovereign-engine.hf.space/v1",
                api_key="your-api-key",
            )
            r = client.chat.completions.create(
                model="{LLM_MODEL_ID}",
                messages=[{{"role": "user", "content": "Bawo ni o se n lo loni?"}}],
            )
            print(r.choices[0].message.content)
            ```
            """)


# ---------------------------------------------------------------------------
# Serve: Gradio UI + OpenAI API on ONE port
# ---------------------------------------------------------------------------
class ApiDelegateRoute(BaseRoute):
    """Hands /healthz and /v1/* requests to fastapi_app (routing, auth and CORS included)."""

    def matches(self, scope):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path == "/healthz" or path == "/v1" or path.startswith("/v1/"):
                return Match.FULL, {}
        return Match.NONE, {}

    async def handle(self, scope, receive, send):
        await fastapi_app(scope, receive, send)


# ZeroGPU registers @spaces.GPU functions through demo.launch(), so the server MUST be started
# with launch() (not uvicorn.run). Our API route is then inserted at the FRONT of Gradio's router.
if __name__ == "__main__":
    # Spaces expect the app on 7860. Don't read the generic PORT env var
    # (it caused "address already in use" on 7861 before).
    port = int(os.environ.get("GRADIO_SERVER_PORT", "7860"))

    demo.queue()
    demo.launch(
        server_name="0.0.0.0",
        server_port=port,
        ssr_mode=False,
        prevent_thread_lock=True,
    )

    demo.app.router.routes.insert(0, ApiDelegateRoute())
    logger.info("API routes (/healthz, /v1/*) attached to the Gradio server.")

    demo.block_thread()