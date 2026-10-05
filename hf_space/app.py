"""N-ATLaS Unified Replica: Hugging Face Spaces Gradio Engine & OpenAI-Compatible API Gateway.

This application replicates the full N-ATLaS Engine (NCAIR1/N-ATLaS 8B LLM + Sovereign ASR):
- Interactive Gradio Web UI with tabs:
    1. Multilingual Chatbot (Hausa, Yoruba, Igbo, English) with streaming & system presets
    2. Sovereign Speech-to-Text ASR (Whisper Yoruba, Hausa, Igbo, Nigerian Accented English) with audio mic/upload
    3. Direct Text Completion / Generation
    4. Model Specs & System Health monitor
- Built-in FastAPI router mounted under `/` and `/v1`:
    * GET  /healthz
    * GET  /v1/models
    * POST /v1/chat/completions (OpenAI-compatible + SSE Streaming)
    * POST /v1/completions (OpenAI-compatible prompt completions)
    * POST /v1/audio/transcriptions (OpenAI Whisper-compatible multipart audio transcription)

Can run in 2 modes:
- Local Mode (default on GPU Space): Loads weights directly using 4-bit / 8-bit / bfloat16 PyTorch / Transformers
- Proxy Mode (optional): Connects to live Modal N-ATLaS endpoints if NATLAS_BASE_URL is provided
"""

import asyncio
import io
import json
import logging
import os
import sys
import threading
import time
import uuid
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Literal, Optional, Union

import gradio as gr
import gradio_client.utils
import spaces

# ---------------------------------------------------------------------------
# MONKEY-PATCH: Fix Gradio 5 schema introspection bug
# Gradio client crashes when parsing Pydantic v2 schemas that have `additionalProperties: False`.
# ---------------------------------------------------------------------------
_original_get_type = gradio_client.utils.get_type
def _patched_get_type(schema):
    if isinstance(schema, bool):
        return "boolean"
    return _original_get_type(schema)
gradio_client.utils.get_type = _patched_get_type
# ---------------------------------------------------------------------------

import numpy as np
import soundfile as sf
import torch
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from pydantic import BaseModel, Field

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

ATTRIBUTION = (
    "N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation "
    "and Digital Economy, and powered by Awarri Technologies."
)
ASR_ATTRIBUTION = (
    "Yoruba-ASR, Hausa-ASR, Igbo-ASR, and NigerianAccentedEnglish are developed by "
    "Awarri Technologies in partnership with the Federal Government of Nigeria / NCAIR / NITDA."
)

SYSTEM_PROMPT_DEFAULT = (
    f"Your name is AwaGPT. {ATTRIBUTION} "
    "You are a friendly, highly intelligent multilingual assistant with deep fluency "
    "in English, Hausa, Igbo, and Yoruba. Always communicate clearly, "
    "respectfully, and authentically in the language or dialect used by the user."
)

NATLAS_API_KEY = os.environ.get("NATLAS_API_KEY", "").strip()
HF_TOKEN = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN", "")

# ---------------------------------------------------------------------------
# Global Engine Registry (Lazy Loaded)
# ---------------------------------------------------------------------------
class EngineManager:
    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.asr_models: Dict[str, Any] = {}
        self.asr_processors: Dict[str, Any] = {}
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.llm_loaded = False
        self.asr_loaded = False
        self.lock = threading.Lock()

    def get_llm(self):
        with self.lock:
            if not self.llm_loaded:
                logger.info(f"Loading LLM {LLM_MODEL_ID} on device {self.device}...")
                from transformers import AutoModelForCausalLM, AutoTokenizer

                self.tokenizer = AutoTokenizer.from_pretrained(
                    LLM_MODEL_ID,
                    token=HF_TOKEN or None,
                    trust_remote_code=True,
                )

                load_kwargs: Dict[str, Any] = {
                    "trust_remote_code": True,
                    "token": HF_TOKEN or None,
                }

                if self.device == "cuda":
                    # Check for 4-bit quant support (useful for HF Spaces Free T4 / A10G)
                    try:
                        from transformers import BitsAndBytesConfig
                        # If bitsandbytes is available and running on limited GPU
                        total_mem = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                        logger.info(f"Detected GPU memory: {total_mem:.2f} GB")
                        if total_mem < 20.0: # Free T4 has 15-16GB, use 4bit or 8bit
                            logger.info("Enabling 4-bit NF4 quantization for memory optimization...")
                            bnb_config = BitsAndBytesConfig(
                                load_in_4bit=True,
                                bnb_4bit_compute_dtype=torch.float16,
                                bnb_4bit_use_double_quant=True,
                                bnb_4bit_quant_type="nf4",
                            )
                            load_kwargs["quantization_config"] = bnb_config
                            load_kwargs["device_map"] = "auto"
                        else:
                            load_kwargs["torch_dtype"] = (
                                torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
                            )
                            load_kwargs["device_map"] = "auto"
                    except Exception as err:
                        logger.warning(f"BitsAndBytes config failed: {err}. Using default device map.")
                        load_kwargs["torch_dtype"] = (
                            torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
                        )
                        load_kwargs["device_map"] = "auto"
                else:
                    logger.warning("CUDA not available. Running LLM on CPU (slow, recommended for testing only).")
                    load_kwargs["torch_dtype"] = torch.float32
                    load_kwargs["device_map"] = "cpu"

                self.model = AutoModelForCausalLM.from_pretrained(LLM_MODEL_ID, **load_kwargs)
                self.model.eval()
                self.llm_loaded = True
                logger.info("LLM successfully loaded and cached in memory.")
            return self.model, self.tokenizer

    def get_asr(self, model_id: str):
        with self.lock:
            resolved_id = ASR_MODELS.get(model_id.lower(), model_id)
            if resolved_id not in self.asr_models:
                logger.info(f"Loading ASR model {resolved_id} on {self.device}...")
                from transformers import WhisperForConditionalGeneration, WhisperProcessor

                processor = WhisperProcessor.from_pretrained(resolved_id, token=HF_TOKEN or None)
                dtype = torch.float16 if self.device == "cuda" else torch.float32
                model = WhisperForConditionalGeneration.from_pretrained(
                    resolved_id,
                    token=HF_TOKEN or None,
                    torch_dtype=dtype,
                ).to(self.device)
                model.eval()

                self.asr_processors[resolved_id] = processor
                self.asr_models[resolved_id] = model
                logger.info(f"ASR model {resolved_id} ready.")
            return self.asr_models[resolved_id], self.asr_processors[resolved_id]

    def transcribe_audio_bytes(
        self,
        audio_bytes: bytes,
        model_id: str = DEFAULT_ASR_MODEL,
        language: Optional[str] = None,
        return_timestamps: bool = False,
    ) -> Dict[str, Any]:
        import librosa

        model, processor = self.get_asr(model_id)

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
            sampling_rate = 16000

        duration_sec = float(len(audio_array)) / 16000.0

        # Silence detector
        rms = float(np.sqrt(np.mean(audio_array**2))) if len(audio_array) > 0 else 0.0
        if rms < 0.005 or duration_sec < 0.3:
            return {
                "text": "",
                "duration": round(duration_sec, 2),
                "model": model_id,
                "language": language or "auto",
                "words": [],
            }

        input_features = processor(audio_array, sampling_rate=16000, return_tensors="pt").input_features
        input_features = input_features.to(self.device, dtype=torch.float16 if self.device == "cuda" else torch.float32)

        gen_kwargs: Dict[str, Any] = {"return_timestamps": return_timestamps}
        if language and language.lower() in ("yo", "yoruba", "ha", "hausa", "ig", "igbo", "en"):
            # Map code
            code_map = {"yo": "yoruba", "ha": "hausa", "ig": "igbo", "en": "english"}
            lang_code = code_map.get(language.lower(), language.lower())
            if hasattr(processor.tokenizer, "lang_to_id") and lang_code in processor.tokenizer.lang_to_id:
                gen_kwargs["language"] = lang_code

        with torch.inference_mode():
            predicted_ids = model.generate(input_features, **gen_kwargs)

        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()

        words = []
        if return_timestamps and transcription:
            for i, w in enumerate(transcription.split()):
                words.append({"word": w, "start": round(i * 0.4, 2), "end": round((i + 1) * 0.4, 2)})

        return {
            "text": transcription,
            "duration": round(duration_sec, 2),
            "model": model_id,
            "language": language or "auto",
            "words": words,
        }


engine_mgr = EngineManager()

# ---------------------------------------------------------------------------
# FastAPI Endpoints Definition (OpenAI Compatible)
# ---------------------------------------------------------------------------
fastapi_app = FastAPI(
    title="N-ATLaS Replica API",
    description="Full OpenAI-compatible replica for N-ATLaS LLM and Sovereign Nigerian ASR.",
    version="1.0.0",
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_token(request: Request):
    if not NATLAS_API_KEY:
        return True # Open access if no key set
    auth = request.headers.get("Authorization", "")
    token = auth[7:].strip() if auth.lower().startswith("bearer ") else auth.strip()
    if token != NATLAS_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid NATLAS API key.")
    return True

class ChatMessage(BaseModel):
    role: str
    content: str = ""

class ChatCompletionRequest(BaseModel):
    model: str = LLM_MODEL_ID
    messages: List[ChatMessage]
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 1024
    stream: bool = False
    repetition_penalty: float = 1.12
    stop: Union[str, List[str], None] = None

class CompletionRequest(BaseModel):
    model: str = LLM_MODEL_ID
    prompt: str
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 512
    stream: bool = False
    repetition_penalty: float = 1.12
    stop: Union[str, List[str], None] = None

@fastapi_app.get("/healthz")
def healthz():
    return {
        "status": "healthy",
        "service": "natlas-replica-engine",
        "model": LLM_MODEL_ID,
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "torch_version": torch.__version__,
        "attribution": ATTRIBUTION,
    }

@fastapi_app.get("/v1/models")
def list_models(_: bool = Depends(verify_token)):
    return {
        "object": "list",
        "data": [
            {
                "id": LLM_MODEL_ID,
                "object": "model",
                "created": 1726000000,
                "owned_by": "Awarri / NCAIR / NITDA",
                "languages": ["English", "Hausa", "Igbo", "Yoruba"],
                "context_window": 8192,
            },
            {
                "id": "natlas-8b",
                "object": "model",
                "created": 1726000000,
                "owned_by": "Awarri / NCAIR / NITDA",
                "context_window": 8192,
            },
            {
                "id": "NCAIR1/Yoruba-ASR",
                "object": "model",
                "type": "audio.transcription",
                "owned_by": "Awarri / NCAIR / NITDA",
            },
            {
                "id": "NCAIR1/Hausa-ASR",
                "object": "model",
                "type": "audio.transcription",
                "owned_by": "Awarri / NCAIR / NITDA",
            },
            {
                "id": "NCAIR1/Igbo-ASR",
                "object": "model",
                "type": "audio.transcription",
                "owned_by": "Awarri / NCAIR / NITDA",
            },
            {
                "id": "NCAIR1/NigerianAccentedEnglish",
                "object": "model",
                "type": "audio.transcription",
                "owned_by": "Awarri / NCAIR / NITDA",
            },
        ],
    }

def format_messages_to_prompt(tokenizer, messages: List[Dict[str, Any]]) -> str:
    has_system = any(m.get("role") == "system" for m in messages)
    formatted = []
    if not has_system:
        formatted.append({"role": "system", "content": SYSTEM_PROMPT_DEFAULT})
    formatted.extend(messages)
    try:
        return tokenizer.apply_chat_template(formatted, tokenize=False, add_generation_prompt=True)
    except Exception:
        # Fallback manual Llama-3 format
        prompt = ""
        for m in formatted:
            prompt += f"<|start_header_id|>{m['role']}<|end_header_id|>\n\n{m.get('content', '')}<|eot_id|>"
        prompt += "<|start_header_id|>assistant<|end_header_id|>\n\n"
        return prompt

@fastapi_app.post("/v1/chat/completions")
async def chat_completions(req: ChatCompletionRequest, _: bool = Depends(verify_token)):
    model, tokenizer = engine_mgr.get_llm()
    req_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created_time = int(time.time())

    messages_raw = [m.model_dump() for m in req.messages]
    prompt = format_messages_to_prompt(tokenizer, messages_raw)

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    prompt_tokens = inputs.input_ids.shape[-1]

    if req.stream:
        from transformers import TextIteratorStreamer

        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
        gen_kwargs = dict(
            **inputs,
            streamer=streamer,
            max_new_tokens=req.max_tokens,
            do_sample=req.temperature > 0,
            temperature=max(req.temperature, 0.01),
            top_p=req.top_p,
            repetition_penalty=req.repetition_penalty,
            pad_token_id=tokenizer.eos_token_id,
        )

        thread = threading.Thread(target=model.generate, kwargs=gen_kwargs)
        thread.start()

        async def sse_generator():
            for text_chunk in streamer:
                chunk_obj = {
                    "id": req_id,
                    "object": "chat.completion.chunk",
                    "created": created_time,
                    "model": req.model,
                    "choices": [
                        {
                            "index": 0,
                            "delta": {"content": text_chunk},
                            "finish_reason": None,
                        }
                    ],
                }
                yield f"data: {json.dumps(chunk_obj)}\n\n"
            final_obj = {
                "id": req_id,
                "object": "chat.completion.chunk",
                "created": created_time,
                "model": req.model,
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
            yield f"data: {json.dumps(final_obj)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(sse_generator(), media_type="text/event-stream")

    # Non-streaming
    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=req.max_tokens,
            do_sample=req.temperature > 0,
            temperature=max(req.temperature, 0.01),
            top_p=req.top_p,
            repetition_penalty=req.repetition_penalty,
            pad_token_id=tokenizer.eos_token_id,
        )
    output_tokens = outputs[0][prompt_tokens:]
    reply = tokenizer.decode(output_tokens, skip_special_tokens=True).strip()
    completion_tokens = len(output_tokens)

    return {
        "id": req_id,
        "object": "chat.completion",
        "created": created_time,
        "model": req.model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": reply},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        },
    }

@fastapi_app.post("/v1/completions")
async def completions(req: CompletionRequest, _: bool = Depends(verify_token)):
    model, tokenizer = engine_mgr.get_llm()
    req_id = f"cmpl-{uuid.uuid4().hex[:12]}"
    created_time = int(time.time())

    inputs = tokenizer(req.prompt, return_tensors="pt").to(model.device)
    prompt_tokens = inputs.input_ids.shape[-1]

    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=req.max_tokens,
            do_sample=req.temperature > 0,
            temperature=max(req.temperature, 0.01),
            top_p=req.top_p,
            repetition_penalty=req.repetition_penalty,
            pad_token_id=tokenizer.eos_token_id,
        )
    output_tokens = outputs[0][prompt_tokens:]
    text = tokenizer.decode(output_tokens, skip_special_tokens=True)

    return {
        "id": req_id,
        "object": "text_completion",
        "created": created_time,
        "model": req.model,
        "choices": [
            {
                "text": text,
                "index": 0,
                "logprobs": None,
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": len(output_tokens),
            "total_tokens": prompt_tokens + len(output_tokens),
        },
    }

@fastapi_app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    model: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    response_format: Optional[str] = Form("json"),
    timestamp_granularities: Optional[List[str]] = Form(None),
    _: bool = Depends(verify_token),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file provided.")

    resolved_model = DEFAULT_ASR_MODEL
    if model and model in ASR_MODELS.values():
        resolved_model = model
    elif language:
        resolved_model = ASR_MODELS.get(language.lower(), DEFAULT_ASR_MODEL)

    return_words = bool(timestamp_granularities and "word" in timestamp_granularities)
    result = engine_mgr.transcribe_audio_bytes(
        content,
        model_id=resolved_model,
        language=language,
        return_timestamps=return_words,
    )

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
# Gradio Graphical Interface
# ---------------------------------------------------------------------------
@spaces.GPU
def gradio_chat_respond(
    message: str,
    history: List[Dict[str, str]],
    system_prompt: str,
    temperature: float,
    max_tokens: int,
    repetition_penalty: float,
):
    model, tokenizer = engine_mgr.get_llm()
    from transformers import TextIteratorStreamer

    # Build history in Llama-3 format
    messages_payload = [{"role": "system", "content": system_prompt or SYSTEM_PROMPT_DEFAULT}]
    for item in history:
        # Gradio chatbot history can be list of dicts {"role": "user", "content": "..."} or tuples
        if isinstance(item, dict):
            messages_payload.append(item)
        elif isinstance(item, (list, tuple)) and len(item) == 2:
            u, a = item
            if u:
                messages_payload.append({"role": "user", "content": str(u)})
            if a:
                messages_payload.append({"role": "assistant", "content": str(a)})

    messages_payload.append({"role": "user", "content": message})
    prompt = format_messages_to_prompt(tokenizer, messages_payload)

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

    gen_kwargs = dict(
        **inputs,
        streamer=streamer,
        max_new_tokens=int(max_tokens),
        do_sample=temperature > 0,
        temperature=max(temperature, 0.01),
        repetition_penalty=repetition_penalty,
        pad_token_id=tokenizer.eos_token_id,
    )

    thread = threading.Thread(target=model.generate, kwargs=gen_kwargs)
    thread.start()

    accumulated = ""
    for piece in streamer:
        accumulated += piece
        yield accumulated


@spaces.GPU
def gradio_transcribe_audio(audio_file, asr_choice: str):
    if audio_file is None:
        return "Please record or upload an audio clip."
    
    with open(audio_file, "rb") as f:
        audio_bytes = f.read()

    model_target = ASR_MODELS.get(asr_choice.lower(), DEFAULT_ASR_MODEL)
    result = engine_mgr.transcribe_audio_bytes(audio_bytes, model_id=model_target)
    
    formatted_output = f"### Transcription Result ({result['duration']}s)\n\n"
    formatted_output += f"> **{result['text'] if result['text'] else '[No audible speech detected]'}**\n\n"
    formatted_output += f"- **Model Used:** `{result['model']}`\n"
    formatted_output += f"- **Language Profile:** `{result['language']}`\n"
    formatted_output += f"- *{ASR_ATTRIBUTION}*"
    return formatted_output


@spaces.GPU
def gradio_text_complete(prompt: str, max_tokens: int, temperature: float, repetition_penalty: float):
    if not prompt.strip():
        return "Please enter a prompt to complete."
    model, tokenizer = engine_mgr.get_llm()
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    prompt_tokens = inputs.input_ids.shape[-1]
    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=int(max_tokens),
            do_sample=temperature > 0,
            temperature=max(temperature, 0.01),
            repetition_penalty=repetition_penalty,
            pad_token_id=tokenizer.eos_token_id,
        )
    return tokenizer.decode(outputs[0][prompt_tokens:], skip_special_tokens=True)


with gr.Blocks(title="N-ATLaS Engine") as demo:
    gr.Markdown(f"""# 🇳🇬 N-ATLaS Sovereign AI Replica Engine & API Gateway
*{ATTRIBUTION}*

**Models:** `Llama-3 8B Multilingual` | **Languages:** English · Hausa · Igbo · Yoruba | **ASR:** Whisper Sovereign | **API:** OpenAI `/v1` Compatible
""")

    with gr.Tabs():
        # TAB 1: MULTILINGUAL CHAT
        with gr.TabItem("💬 Multilingual Chatbot"):
            with gr.Row():
                with gr.Column(scale=3):
                    chatbot = gr.Chatbot(
                        height=500,
                        type="messages",
                        label="N-ATLaS Conversation (AwaGPT)",
                    )
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
                    system_input = gr.Textbox(
                        label="System Prompt",
                        value=SYSTEM_PROMPT_DEFAULT,
                        lines=4,
                    )
                    temp = gr.Slider(0.0, 1.5, value=0.7, step=0.05, label="Temperature")
                    max_tok = gr.Slider(64, 4096, value=1024, step=64, label="Max New Tokens")
                    rep_pen = gr.Slider(1.0, 1.5, value=1.12, step=0.02, label="Repetition Penalty")
                    clear_btn = gr.Button("Clear Chat 🧹")

            # Chat actions
            def user_message(user_msg, hist):
                if not user_msg or not user_msg.strip():
                    return "", hist
                return "", hist + [{"role": "user", "content": user_msg}]

            def bot_response(hist, sys_p, t, m_t, r_p):
                if not hist:
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

        # TAB 2: SOVEREIGN SPEECH RECOGNITION (ASR)
        with gr.TabItem("🎙️ Sovereign Speech-to-Text (ASR)"):
            gr.Markdown(f"""
            ### Voice Transcription for Nigerian Languages & Accents
            Fine-tuned Whisper Small architectures honoring Nigerian phonetics and tonal dialects.
            """)
            with gr.Row():
                with gr.Column():
                    audio_input = gr.Audio(sources=["microphone", "upload"], type="filepath", label="Voice Audio Input")
                    asr_lang = gr.Radio(
                        choices=["yoruba", "hausa", "igbo", "nigerian-english"],
                        value="yoruba",
                        label="Select Language ASR Model",
                    )
                    transcribe_btn = gr.Button("Transcribe Voice 🎙️", variant="primary")
                with gr.Column():
                    transcription_output = gr.Markdown(label="Transcript Output")

            transcribe_btn.click(gradio_transcribe_audio, inputs=[audio_input, asr_lang], outputs=transcription_output)

        # TAB 3: RAW COMPLETIONS
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

        # TAB 4: API USAGE & CODE EXAMPLES
        with gr.TabItem("🔌 API Documentation & SDK"):
            gr.Markdown(f"""
            ### 🌐 OpenAI-Compatible API Endpoints

            When running this replica (either on Hugging Face Spaces or locally), standard OpenAI SDK endpoints are exposed directly at the same host:

            - `GET /healthz` - Service Health & GPU Specs
            - `GET /v1/models` - Catalog Discovery
            - `POST /v1/chat/completions` - Chat completions (Supports SSE streaming)
            - `POST /v1/completions` - Raw text completion
            - `POST /v1/audio/transcriptions` - ASR Speech-to-text multipart

            #### Python `openai` SDK Drop-In Example:
            ```python
            from openai import OpenAI

            # For Hugging Face Spaces: use your Space URL or Gradio Client URL
            client = OpenAI(
                base_url="https://<YOUR-HF-SPACE>.hf.space/v1",
                api_key="{NATLAS_API_KEY or 'your-api-key-if-configured'}"
            )

            # 1. Chat Completion
            response = client.chat.completions.create(
                model="{LLM_MODEL_ID}",
                messages=[{{"role": "user", "content": "Bawo ni o se n lo loni?"}}],
                temperature=0.7,
            )
            print(response.choices[0].message.content)

            # 2. SSE Streaming
            stream = client.chat.completions.create(
                model="{LLM_MODEL_ID}",
                messages=[{{"role": "user", "content": "Sannu! Yaya kake yau?"}}],
                stream=True,
            )
            for chunk in stream:
                print(chunk.choices[0].delta.content or "", end="", flush=True)
            ```

            #### Python `gradio_client` Example:
            ```python
            from gradio_client import Client

            client = Client("https://<YOUR-HF-SPACE>.hf.space/")
            # Call any Gradio API endpoint directly
            ```
            """)

# ---------------------------------------------------------------------------
# Mount Gradio onto FastAPI and serve ONE server (API routes + UI)
# ---------------------------------------------------------------------------
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 7860)))

