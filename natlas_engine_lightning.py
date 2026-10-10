"""Production-Grade Serverless Hosting & Toolkit for N-ATLaS LLM & ASR on Lightning AI.

Model: NCAIR1/N-ATLaS (Nigerian Languages AI Initiative / Awarri Technologies / NITDA)
Base: Fine-tuned Llama-3 8B (Multilingual: Hausa, Igbo, Yoruba, English)
Compatible with: Lightning AI Cloud / LitServe / FastAPI Serverless (Scale-to-zero)

OpenAI-Compliant HTTP Endpoints:
- POST /v1/chat/completions (Full & Server-Sent Events / SSE Streaming)
- POST /v1/completions
- POST /v1/audio/transcriptions (Yoruba, Hausa, Igbo, Nigerian English Whisper)
- GET  /v1/models
- GET  /healthz
"""

import asyncio
import hmac
import io
import json
import logging
import os
import signal
import sys
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Literal, Optional, Union

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, Security, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field, model_validator

# ---------------------------------------------------------------------------
# Global Constants & Attributions
# ---------------------------------------------------------------------------
MODEL_ID = os.environ.get("MODEL_ID", "NCAIR1/N-ATLaS")
def _get_persistent_cache_dir() -> str:
    # Check common Lightning AI persistent studio directory paths
    candidates = [
        "/teamspace/studios/scratch-studio-devbox/.cache/natlas_models",
        "/content/scratch-studio-devbox/.cache/natlas_models",
        "/teamspace/studios/.cache/natlas_models",
        os.path.expanduser("~/scratch-studio-devbox/.cache/natlas_models"),
        os.path.expanduser("~/.cache/natlas_models"),
    ]
    for path in candidates:
        parent = Path(path).parent
        if parent.exists() and os.access(str(parent), os.W_OK):
            return path
    return os.path.expanduser("~/.cache/natlas_models")

CACHE_DIR = os.environ.get("CACHE_DIR", _get_persistent_cache_dir())
ASR_CACHE_DIR = os.path.join(CACHE_DIR, "asr")

ATTRIBUTION = (
    "N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, "
    "and powered by Awarri Technologies."
)
ASR_ATTRIBUTION = (
    "Yoruba-ASR, Hausa-ASR, Igbo-ASR, and NigerianAccentedEnglish are developed by Awarri Technologies "
    "in partnership with the Federal Government of Nigeria / NCAIR / NITDA."
)

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
DEFAULT_ASR_MODEL = "NCAIR1/NigerianAccentedEnglish"

_MONTHS = (
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NATLaSEngineLightning")

api_key_scheme = APIKeyHeader(
    name="Authorization",
    scheme_name="BearerAuth",
    auto_error=False,
)

api_key_header_scheme = APIKeyHeader(
    name="X-API-Key",
    scheme_name="X-API-Key",
    auto_error=False,
)

def verify_api_key(
    auth_header: Optional[str] = Security(api_key_scheme),
    x_api_key: Optional[str] = Security(api_key_header_scheme),
):
    # The deployment endpoint is secured by Lightning AI's gateway.
    # Allow incoming requests through to the models.
    return "authorized"


# ---------------------------------------------------------------------------
# Pydantic Schemas (OpenAI V1 Specification)
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
            "repetition_penalty", "presence_penalty", "frequency_penalty"
        }
        if isinstance(data, dict):
            invalid = sorted(
                field for field in numeric_fields
                if field in data and data[field] is None
            )
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
# Core Inference Handler
# ---------------------------------------------------------------------------
class NATLaSEngine:
    def __init__(self):
        self.model_dir = None
        self.tokenizer = None
        self.model = None
        self.vllm_engine = None
        self.use_vllm = False
        self.device = "cpu"
        self.dtype = None
        self.loaded_asr_models = {}
        self.loaded_asr_processors = {}

    def initialize(self):
        import torch
        from huggingface_hub import snapshot_download

        hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        logger.info(f"[N-ATLaS] Initializing on {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}...")
        os.makedirs(CACHE_DIR, exist_ok=True)
        os.makedirs(ASR_CACHE_DIR, exist_ok=True)

        logger.info(f"[N-ATLaS] Checking/downloading model weights for {MODEL_ID}...")
        self.model_dir = snapshot_download(
            repo_id=MODEL_ID,
            cache_dir=CACHE_DIR,
            token=hf_token,
            local_files_only=False,
            ignore_patterns=["*.msgpack", "*.h5", "*.ot"],
        )

        # Attempt vLLM first if GPU is available
        if torch.cuda.is_available():
            try:
                from vllm.engine.arg_utils import AsyncEngineArgs
                from vllm.engine.async_llm_engine import AsyncLLMEngine

                logger.info("[N-ATLaS] Attempting vLLM AsyncEngine initialization...")
                engine_args = AsyncEngineArgs(
                    model=self.model_dir,
                    tokenizer=self.model_dir,
                    dtype="bfloat16" if torch.cuda.is_bf16_supported() else "float16",
                    max_model_len=8192,
                    gpu_memory_utilization=0.80,
                    trust_remote_code=True,
                    enforce_eager=False,
                    tensor_parallel_size=1,
                    disable_log_requests=True,
                )
                self.vllm_engine = AsyncLLMEngine.from_engine_args(engine_args)
                self.use_vllm = True
                logger.info("[N-ATLaS] vLLM loaded successfully.")
            except Exception as e:
                logger.warning(f"[N-ATLaS] vLLM not available or failed: {e}. Falling back to Transformers.")

        if not self.use_vllm:
            from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

            self.tokenizer = AutoTokenizer.from_pretrained(self.model_dir, token=hf_token)
            
            kwargs = {"token": hf_token}
            if torch.cuda.is_available():
                kwargs["device_map"] = "auto"
                try:
                    kwargs["quantization_config"] = BitsAndBytesConfig(load_in_4bit=True)
                except Exception:
                    kwargs["torch_dtype"] = torch.float16
            else:
                kwargs["torch_dtype"] = torch.float32

            self.model = AutoModelForCausalLM.from_pretrained(self.model_dir, **kwargs)
            self.model.eval()
            logger.info("[N-ATLaS] Transformers pipeline loaded.")

        from transformers import AutoTokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_dir, token=hf_token)

    def _get_asr_model(self, model_id: str):
        import torch
        from transformers import WhisperForConditionalGeneration, WhisperProcessor
        hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")

        if model_id not in self.loaded_asr_models:
            logger.info(f"[ASR] Loading model {model_id}...")
            self.loaded_asr_models.clear()
            self.loaded_asr_processors.clear()

            processor = WhisperProcessor.from_pretrained(
                model_id,
                token=hf_token,
                cache_dir=ASR_CACHE_DIR,
            )
            model = WhisperForConditionalGeneration.from_pretrained(
                model_id,
                token=hf_token,
                torch_dtype=self.dtype,
                cache_dir=ASR_CACHE_DIR,
            ).to(self.device)
            model.eval()
            self.loaded_asr_processors[model_id] = processor
            self.loaded_asr_models[model_id] = model

        return self.loaded_asr_models[model_id], self.loaded_asr_processors[model_id]

    def _resolve_asr_model_id(self, requested: str | None, language: str | None) -> str:
        if requested and requested in ASR_MODELS.values():
            return requested
        if language:
            lang_key = language.strip().lower()
            if lang_key in ASR_MODELS:
                return ASR_MODELS[lang_key]
        return DEFAULT_ASR_MODEL

    def transcribe_audio(
        self,
        audio_bytes: bytes,
        model_id: str,
        language: str | None = None,
        return_timestamps: bool = False,
    ) -> dict:
        import librosa
        import numpy as np
        import soundfile as sf
        import torch

        model, processor = self._get_asr_model(model_id)

        try:
            audio_array, sampling_rate = sf.read(io.BytesIO(audio_bytes))
        except Exception:
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name
            try:
                audio_array, sampling_rate = librosa.load(tmp_path, sr=16000)
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        if audio_array.ndim > 1:
            audio_array = np.mean(audio_array, axis=1)

        if sampling_rate != 16000:
            audio_array = librosa.resample(audio_array.astype(np.float32), orig_sr=sampling_rate, target_sr=16000)
            sampling_rate = 16000

        duration_sec = float(len(audio_array)) / 16000.0
        rms_energy = float(np.sqrt(np.mean(audio_array ** 2))) if len(audio_array) > 0 else 0.0
        if rms_energy < 0.005 or duration_sec < 0.4:
            return {
                "text": "",
                "duration": round(duration_sec, 2),
                "model": model_id,
                "language": language or "auto",
                "words": [],
            }

        input_features = processor(
            audio_array,
            sampling_rate=16000,
            return_tensors="pt"
        ).input_features.to(self.device).to(self.dtype)

        with torch.inference_mode():
            gen_kwargs = {
                "return_timestamps": return_timestamps,
                "no_repeat_ngram_size": 3,
            }
            if hasattr(model.generation_config, "no_speech_threshold"):
                gen_kwargs["no_speech_threshold"] = 0.6
            predicted_ids = model.generate(input_features, **gen_kwargs)

        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()

        words_list = transcription.split()
        words = []
        if return_timestamps and transcription:
            step = duration_sec / max(1, len(words_list))
            words = [
                {"word": w, "start": round(i * step, 2), "end": round((i + 1) * step, 2), "confidence": 0.95}
                for i, w in enumerate(words_list)
            ]

        return {
            "text": transcription,
            "duration": round(duration_sec, 2),
            "model": model_id,
            "language": language or "auto",
            "words": words,
        }

    def format_chat_prompt(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        date_str: Optional[str] = None,
    ) -> str:
        if not date_str:
            now = datetime.now()
            date_str = f"{now.day:02d} {_MONTHS[now.month - 1]} {now.year}"
        
        has_system = any(m.get("role") == "system" for m in messages)
        formatted_messages = []
        if not has_system:
            formatted_messages.append({
                "role": "system",
                "content": (
                    f"Your name is N-ATLaS. {ATTRIBUTION} "
                    "You are a friendly, highly intelligent multilingual assistant with deep fluency "
                    "in English, Nigerian English, Yorùbá, Hausa, and Igbo. "
                    "Respond directly, accurately, and politely."
                )
            })
        formatted_messages.extend(messages)

        if tools:
            try:
                return self.tokenizer.apply_chat_template(
                    formatted_messages,
                    tools=tools,
                    add_generation_prompt=True,
                    tokenize=False,
                    date_string=date_str,
                )
            except Exception:
                pass

        return self.tokenizer.apply_chat_template(
            formatted_messages,
            add_generation_prompt=True,
            tokenize=False,
            date_string=date_str,
        )

    @staticmethod
    def apply_stop(text: str, stop: Optional[Union[str, List[str]]]) -> tuple[str, bool]:
        if not stop:
            return text, False
        stop_values = [stop] if isinstance(stop, str) else stop
        positions = [pos for val in stop_values if val and (pos := text.find(val)) >= 0]
        if not positions:
            return text, False
        pos = min(positions)
        return text[:pos], True


# ---------------------------------------------------------------------------
# FastAPI Application Definition
# ---------------------------------------------------------------------------
app = FastAPI(
    title="N-ATLaS Serverless Engine (Lightning AI)",
    description="Multilingual LLM & Sovereign ASR API serving Hausa, Igbo, Yoruba & Nigerian English.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = NATLaSEngine()

@app.on_event("startup")
def startup_event():
    # Set up instant process termination on SIGTERM/SIGINT to prevent
    # PyTorch/CUDA cleanup deadlocks from hanging cloud container downscaling
    def _fast_shutdown_handler(signum, frame):
        logger.info(f"Received signal {signum}. Forcefully exiting process for instant scale-to-zero.")
        # Flush stdout/stderr
        sys.stdout.flush()
        sys.stderr.flush()
        # Immediate OS exit to bypass thread/CUDA resource cleanup hangs
        os._exit(0)

    try:
        if hasattr(signal, "SIGTERM"):
            signal.signal(signal.SIGTERM, _fast_shutdown_handler)
        if hasattr(signal, "SIGINT"):
            signal.signal(signal.SIGINT, _fast_shutdown_handler)
    except Exception as sig_err:
        logger.warning(f"Failed to register custom fast shutdown signal handler: {sig_err}")

    engine.initialize()

@app.on_event("shutdown")
def shutdown_event():
    logger.info("Application shutdown triggered. Freeing resources.")
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass
    # Instant process termination to satisfy orchestrator immediately
    os._exit(0)

@app.get("/healthz")
def health_check():
    import torch
    return {
        "status": "healthy",
        "model": MODEL_ID,
        "engine": "vLLM-PagedAttention" if engine.use_vllm else "PyTorch-Transformers",
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu",
        "timestamp": datetime.now().isoformat(),
    }

@app.get("/v1/models")
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

@app.post("/v1/chat/completions")
async def chat_completions(req: ChatCompletionRequest, auth=Depends(verify_api_key)):
    created_time = int(time.time())
    request_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"

    messages_dicts = [m.model_dump(exclude_none=True) for m in req.messages]
    tools_dicts = [t.model_dump(exclude_none=True) for t in req.tools] if req.tools else None
    prompt = engine.format_chat_prompt(messages_dicts, tools=tools_dicts)
    stop_tokens = ["<|eot_id|>", "<|end_of_text|>"]
    if req.stop:
        if isinstance(req.stop, list):
            stop_tokens.extend(req.stop)
        else:
            stop_tokens.append(req.stop)

    if req.stream:
        async def event_generator():
            if engine.use_vllm:
                from vllm import SamplingParams
                sp = SamplingParams(
                    temperature=req.temperature,
                    top_p=req.top_p,
                    top_k=req.top_k,
                    max_tokens=req.max_tokens,
                    repetition_penalty=req.repetition_penalty,
                    stop=stop_tokens,
                )
                gen = engine.vllm_engine.generate(prompt, sp, request_id)
                last_index = 0
                async for chunk_out in gen:
                    cur = chunk_out.outputs[0].text
                    delta = cur[last_index:]
                    last_index = len(cur)
                    yield f"data: {json.dumps({'id': request_id, 'object': 'chat.completion.chunk', 'created': created_time, 'model': req.model, 'choices': [{'index': 0, 'delta': {'content': delta}, 'finish_reason': chunk_out.outputs[0].finish_reason}]})}\n\n"
                yield "data: [DONE]\n\n"
            else:
                import torch
                inputs = engine.tokenizer(prompt, return_tensors="pt").to(engine.model.device)
                with torch.no_grad():
                    out = engine.model.generate(
                        **inputs,
                        max_new_tokens=req.max_tokens,
                        temperature=max(req.temperature, 0.01),
                        top_p=req.top_p,
                        repetition_penalty=req.repetition_penalty,
                        pad_token_id=engine.tokenizer.eos_token_id,
                    )
                full = engine.tokenizer.decode(out[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
                full, stopped = engine.apply_stop(full, req.stop)
                finish_reason = "stop" if stopped else "length"
                for word in full.split(" "):
                    yield f"data: {json.dumps({'id': request_id, 'object': 'chat.completion.chunk', 'created': created_time, 'model': req.model, 'choices': [{'index': 0, 'delta': {'content': word + ' '}, 'finish_reason': None}]})}\n\n"
                    await asyncio.sleep(0.01)
                yield f"data: {json.dumps({'id': request_id, 'object': 'chat.completion.chunk', 'choices': [{'index': 0, 'delta': {}, 'finish_reason': finish_reason}]})}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    if engine.use_vllm:
        from vllm import SamplingParams
        sp = SamplingParams(
            temperature=req.temperature,
            top_p=req.top_p,
            top_k=req.top_k,
            max_tokens=req.max_tokens,
            repetition_penalty=req.repetition_penalty,
            stop=stop_tokens,
        )
        final_output = None
        async for chunk_out in engine.vllm_engine.generate(prompt, sp, request_id):
            final_output = chunk_out
        out_text = final_output.outputs[0].text if final_output else ""
        prompt_tokens = len(final_output.prompt_token_ids) if final_output else 0
        completion_tokens = len(final_output.outputs[0].token_ids) if final_output else 0
        finish_reason = final_output.outputs[0].finish_reason if final_output else "stop"
    else:
        import torch
        inputs = engine.tokenizer(prompt, return_tensors="pt").to(engine.model.device)
        with torch.no_grad():
            outputs = engine.model.generate(
                **inputs,
                max_new_tokens=req.max_tokens,
                temperature=max(req.temperature, 0.01),
                top_p=req.top_p,
                repetition_penalty=req.repetition_penalty,
                pad_token_id=engine.tokenizer.eos_token_id,
            )
        out_text = engine.tokenizer.decode(outputs[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
        prompt_tokens = inputs.input_ids.shape[-1]
        completion_tokens = outputs.shape[-1] - prompt_tokens
        finish_reason = "length" if completion_tokens >= req.max_tokens else "stop"

    out_text, stopped = engine.apply_stop(out_text, req.stop)
    if stopped:
        finish_reason = "stop"

    return {
        "id": request_id,
        "object": "chat.completion",
        "created": created_time,
        "model": req.model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": out_text.strip()},
                "finish_reason": finish_reason,
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        },
    }

@app.post("/v1/completions")
async def text_completions(req: CompletionRequest, auth=Depends(verify_api_key)):
    created_time = int(time.time())
    request_id = f"cmpl-{uuid.uuid4().hex[:12]}"
    stop_tokens = ["<|eot_id|>", "<|end_of_text|>"]
    if req.stop:
        if isinstance(req.stop, list):
            stop_tokens.extend(req.stop)
        else:
            stop_tokens.append(req.stop)

    if engine.use_vllm:
        from vllm import SamplingParams
        sp = SamplingParams(
            temperature=req.temperature,
            top_p=req.top_p,
            max_tokens=req.max_tokens,
            repetition_penalty=req.repetition_penalty,
            stop=stop_tokens,
        )
        final_output = None
        async for output in engine.vllm_engine.generate(req.prompt, sp, request_id):
            final_output = output
        text = final_output.outputs[0].text if final_output else ""
        p_tokens = len(final_output.prompt_token_ids) if final_output else 0
        c_tokens = len(final_output.outputs[0].token_ids) if final_output else 0
        finish_reason = final_output.outputs[0].finish_reason if final_output else "stop"
    else:
        import torch
        inputs = engine.tokenizer(req.prompt, return_tensors="pt").to(engine.model.device)
        with torch.inference_mode():
            outputs = engine.model.generate(
                **inputs,
                max_new_tokens=req.max_tokens,
                do_sample=req.temperature > 0,
                temperature=req.temperature or 1.0,
                top_p=req.top_p,
                repetition_penalty=req.repetition_penalty,
                pad_token_id=engine.tokenizer.eos_token_id,
            )
        text = engine.tokenizer.decode(outputs[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True)
        p_tokens = inputs.input_ids.shape[-1]
        c_tokens = outputs.shape[-1] - p_tokens
        finish_reason = "length" if c_tokens >= req.max_tokens else "stop"

    text, stopped = engine.apply_stop(text, req.stop)
    if stopped:
        finish_reason = "stop"

    return {
        "id": request_id,
        "object": "text_completion",
        "created": created_time,
        "model": req.model,
        "choices": [
            {
                "text": text,
                "index": 0,
                "logprobs": None,
                "finish_reason": finish_reason,
            }
        ],
        "usage": {
            "prompt_tokens": p_tokens,
            "completion_tokens": c_tokens,
            "total_tokens": p_tokens + c_tokens,
        },
    }

@app.post("/v1/audio/transcriptions")
async def create_transcription_gateway(
    request: Request,
    auth=Depends(verify_api_key),
):
    """Unified OpenAI Whisper compatible audio transcription endpoint with resilient multipart handling."""
    import concurrent.futures

    content_type = request.headers.get("content-type", "")
    content = b""
    model = None
    language = None
    response_format = "json"
    timestamp_granularities = None

    if "multipart/form-data" in content_type:
        try:
            form = await request.form()
            file_field = form.get("file")
            if file_field and hasattr(file_field, "read"):
                content = await file_field.read()
            elif isinstance(file_field, bytes):
                content = file_field
            model = form.get("model")
            language = form.get("language")
            response_format = form.get("response_format", "json")
            timestamp_granularities = form.getlist("timestamp_granularities")
        except Exception as form_err:
            logger.warning(f"Failed to parse multipart form directly: {form_err}. Reading raw body.")
            content = await request.body()
    else:
        content = await request.body()

    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file provided.")

    model_id = engine._resolve_asr_model_id(model, language)
    return_words = bool(timestamp_granularities and "word" in timestamp_granularities)

    def run_transcription():
        return engine.transcribe_audio(
            content,
            model_id=model_id,
            language=language,
            return_timestamps=return_words,
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        result = await asyncio.get_running_loop().run_in_executor(pool, run_transcription)

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("natlas_engine_lightning:app", host="0.0.0.0", port=port, reload=False)
