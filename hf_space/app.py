"""N-ATLaS Unified Replica for Hugging Face ZeroGPU Spaces.

- Gradio UI: Chatbot, ASR, Raw Completion, API docs
- FastAPI routes: /healthz, /v1/models, /v1/chat/completions, /v1/completions, /v1/audio/transcriptions

ZeroGPU notes:
- Models are loaded ONCE at import time (module level). ZeroGPU attaches the GPU only while a
  @spaces.GPU function is running.
- No bitsandbytes / 4-bit (not supported on ZeroGPU). The 8B model is loaded in bf16.
- All GPU work lives in the three @spaces.GPU functions below (gpu_generate, gpu_stream, gpu_transcribe).
"""

import io
import json
import logging
import os
import threading
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

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
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from pydantic import BaseModel
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

# Same wording as the official model card example.
SYSTEM_PROMPT_DEFAULT = (
    "your name is AwaGPT, you are a large language model trained by Awarri AI technologies. "
    "You are a friendly assistant and you are here to help."
)

NATLAS_API_KEY = os.environ.get("NATLAS_API_KEY", "").strip()
HF_TOKEN = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN", "")

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
logger.info("LLM ready.")

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
# Helpers
# ---------------------------------------------------------------------------
def resolve_asr_id(name: Optional[str]) -> str:
    if not name:
        return DEFAULT_ASR_MODEL
    if name in asr_models:
        return name
    return ASR_MODELS.get(name.lower(), DEFAULT_ASR_MODEL)


def format_messages_to_prompt(messages: List[Dict[str, Any]]) -> str:
    has_system = any(m.get("role") == "system" for m in messages)
    formatted = []
    if not has_system:
        formatted.append({"role": "system", "content": SYSTEM_PROMPT_DEFAULT})
    formatted.extend(messages)
    try:
        return tokenizer.apply_chat_template(
            formatted,
            tokenize=False,
            add_generation_prompt=True,
            date_string=datetime.now().strftime("%d %b %Y"),
        )
    except Exception:
        prompt = ""
        for m in formatted:
            prompt += f"<|start_header_id|>{m['role']}<|end_header_id|>\n\n{m.get('content', '')}<|eot_id|>"
        prompt += "<|start_header_id|>assistant<|end_header_id|>\n\n"
        return prompt


def encode_prompt(prompt: str):
    """Tokenize without adding a second BOS when the chat template already included one."""
    bos = tokenizer.bos_token or ""
    add_special = not (bos and prompt.startswith(bos))
    return tokenizer(prompt, return_tensors="pt", add_special_tokens=add_special)


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


# ---------------------------------------------------------------------------
# GPU functions (the ONLY places that touch the GPU)
# ---------------------------------------------------------------------------
@spaces.GPU(duration=120)
def gpu_generate(
    prompt: str,
    max_new_tokens: int,
    temperature: float,
    top_p: float,
    repetition_penalty: float,
):
    """Non-streaming generation. Returns (text, prompt_tokens, completion_tokens)."""
    inputs = encode_prompt(prompt).to("cuda")
    prompt_tokens = inputs.input_ids.shape[-1]
    with torch.inference_mode():
        outputs = llm.generate(
            **inputs,
            max_new_tokens=int(max_new_tokens),
            do_sample=temperature > 0,
            temperature=max(float(temperature), 0.01),
            top_p=float(top_p),
            repetition_penalty=float(repetition_penalty),
            pad_token_id=tokenizer.eos_token_id,
        )
    out_tokens = outputs[0][prompt_tokens:]
    text = tokenizer.decode(out_tokens, skip_special_tokens=True)
    return text, prompt_tokens, len(out_tokens)


@spaces.GPU(duration=120)
def gpu_stream(
    prompt: str,
    max_new_tokens: int,
    temperature: float,
    top_p: float,
    repetition_penalty: float,
):
    """Streaming generation. Yields text pieces."""
    inputs = encode_prompt(prompt).to("cuda")
    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    gen_kwargs = dict(
        **inputs,
        streamer=streamer,
        max_new_tokens=int(max_new_tokens),
        do_sample=temperature > 0,
        temperature=max(float(temperature), 0.01),
        top_p=float(top_p),
        repetition_penalty=float(repetition_penalty),
        pad_token_id=tokenizer.eos_token_id,
    )
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
    resolved = resolve_asr_id(model_id)
    if resolved not in asr_models:
        raise RuntimeError(f"ASR model {resolved} is not loaded.")
    model, processor = asr_models[resolved], asr_processors[resolved]

    audio = decode_audio(audio_bytes)
    duration_sec = float(len(audio)) / 16000.0
    rms = float(np.sqrt(np.mean(audio**2))) if len(audio) > 0 else 0.0
    if rms < 0.005 or duration_sec < 0.3:
        return {"text": "", "duration": round(duration_sec, 2), "model": resolved,
                "language": language or "auto", "words": []}

    feats = processor(audio, sampling_rate=16000, return_tensors="pt").input_features
    feats = feats.to("cuda", dtype=torch.float16)

    gen_kwargs: Dict[str, Any] = {"return_timestamps": return_timestamps}
    if language and language.lower() in ("yo", "yoruba", "ha", "hausa", "ig", "igbo", "en"):
        code_map = {"yo": "yoruba", "ha": "hausa", "ig": "igbo", "en": "english"}
        lang_code = code_map.get(language.lower(), language.lower())
        if hasattr(processor.tokenizer, "lang_to_id") and lang_code in processor.tokenizer.lang_to_id:
            gen_kwargs["language"] = lang_code

    with torch.inference_mode():
        predicted_ids = model.generate(feats, **gen_kwargs)
    text = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()

    words = []
    if return_timestamps and text:
        for i, w in enumerate(text.split()):
            words.append({"word": w, "start": round(i * 0.4, 2), "end": round((i + 1) * 0.4, 2)})

    return {"text": text, "duration": round(duration_sec, 2), "model": resolved,
            "language": language or "auto", "words": words}


# ---------------------------------------------------------------------------
# FastAPI Endpoints (OpenAI Compatible)
# ---------------------------------------------------------------------------
fastapi_app = FastAPI(
    title="N-ATLaS Replica API",
    description="OpenAI-compatible replica for N-ATLaS LLM and Sovereign Nigerian ASR.",
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
        return True
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
        "hardware": "ZeroGPU",
        "asr_models_loaded": sorted(asr_models.keys()),
        "torch_version": torch.__version__,
        "attribution": ATTRIBUTION,
    }


@fastapi_app.get("/v1/models")
def list_models(_: bool = Depends(verify_token)):
    owner = "Awarri / NCAIR / NITDA"
    data = [
        {"id": LLM_MODEL_ID, "object": "model", "created": 1726000000, "owned_by": owner,
         "languages": ["English", "Hausa", "Igbo", "Yoruba"], "context_window": 8192},
        {"id": "natlas-8b", "object": "model", "created": 1726000000, "owned_by": owner,
         "context_window": 8192},
    ]
    for mid in ASR_UNIQUE_IDS:
        data.append({"id": mid, "object": "model", "type": "audio.transcription", "owned_by": owner})
    return {"object": "list", "data": data}


# NOTE: these are plain `def` routes (not async) so FastAPI runs them in a threadpool and
# the blocking GPU calls don't freeze the event loop.
@fastapi_app.post("/v1/chat/completions")
def chat_completions(req: ChatCompletionRequest, _: bool = Depends(verify_token)):
    req_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created_time = int(time.time())
    prompt = format_messages_to_prompt([m.model_dump() for m in req.messages])

    if req.stream:
        def sse_generator():
            try:
                for piece in gpu_stream(prompt, req.max_tokens, req.temperature, req.top_p,
                                        req.repetition_penalty):
                    chunk = {
                        "id": req_id, "object": "chat.completion.chunk", "created": created_time,
                        "model": req.model,
                        "choices": [{"index": 0, "delta": {"content": piece}, "finish_reason": None}],
                    }
                    yield f"data: {json.dumps(chunk)}\n\n"
            except Exception as err:
                err_chunk = {"error": {"message": str(err), "type": "gpu_error"}}
                yield f"data: {json.dumps(err_chunk)}\n\n"
            final = {
                "id": req_id, "object": "chat.completion.chunk", "created": created_time,
                "model": req.model, "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
            yield f"data: {json.dumps(final)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(sse_generator(), media_type="text/event-stream")

    try:
        text, p_tok, c_tok = gpu_generate(prompt, req.max_tokens, req.temperature, req.top_p,
                                          req.repetition_penalty)
    except Exception as err:
        raise HTTPException(status_code=503, detail=f"GPU unavailable or quota exceeded: {err}")

    return {
        "id": req_id,
        "object": "chat.completion",
        "created": created_time,
        "model": req.model,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text.strip()},
                     "finish_reason": "stop"}],
        "usage": {"prompt_tokens": p_tok, "completion_tokens": c_tok, "total_tokens": p_tok + c_tok},
    }


@fastapi_app.post("/v1/completions")
def completions(req: CompletionRequest, _: bool = Depends(verify_token)):
    req_id = f"cmpl-{uuid.uuid4().hex[:12]}"
    created_time = int(time.time())
    try:
        text, p_tok, c_tok = gpu_generate(req.prompt, req.max_tokens, req.temperature, req.top_p,
                                          req.repetition_penalty)
    except Exception as err:
        raise HTTPException(status_code=503, detail=f"GPU unavailable or quota exceeded: {err}")

    return {
        "id": req_id,
        "object": "text_completion",
        "created": created_time,
        "model": req.model,
        "choices": [{"text": text, "index": 0, "logprobs": None, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": p_tok, "completion_tokens": c_tok, "total_tokens": p_tok + c_tok},
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
    try:
        result = gpu_transcribe(content, resolved_model, language, return_words)
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
    for piece in gpu_stream(prompt, int(max_tokens), float(temperature), 0.9, float(repetition_penalty)):
        accumulated += piece
        yield accumulated


def gradio_transcribe_audio(audio_file, asr_choice: str):
    if audio_file is None:
        return "Please record or upload an audio clip."
    with open(audio_file, "rb") as f:
        audio_bytes = f.read()

    result = gpu_transcribe(audio_bytes, ASR_MODELS.get(asr_choice.lower(), DEFAULT_ASR_MODEL))

    out = f"### Transcription Result ({result['duration']}s)\n\n"
    out += f"> **{result['text'] if result['text'] else '[No audible speech detected]'}**\n\n"
    out += f"- **Model Used:** `{result['model']}`\n"
    out += f"- **Language Profile:** `{result['language']}`\n"
    out += f"- *{ASR_ATTRIBUTION}*"
    return out


def gradio_text_complete(prompt: str, max_tokens: int, temperature: float, repetition_penalty: float):
    if not prompt.strip():
        return "Please enter a prompt to complete."
    text, _, _ = gpu_generate(prompt, int(max_tokens), float(temperature), 0.9, float(repetition_penalty))
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
                    rep_pen = gr.Slider(1.0, 1.5, value=1.12, step=0.02, label="Repetition Penalty")
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

            - `GET /healthz` - Service health
            - `GET /v1/models` - Model catalog
            - `POST /v1/chat/completions` - Chat completions (SSE streaming supported)
            - `POST /v1/completions` - Raw text completion
            - `POST /v1/audio/transcriptions` - ASR speech-to-text (multipart)

            > This Space runs on **ZeroGPU**. API calls share the free GPU quota, so heavy or
            > anonymous API usage can be rate-limited.

            ```python
            from openai import OpenAI

            client = OpenAI(
                base_url="https://samuelolubukun-natlas-sovereign-engine.hf.space/v1",
                api_key="your-api-key-if-configured",
            )
            r = client.chat.completions.create(
                model="{LLM_MODEL_ID}",
                messages=[{{"role": "user", "content": "Bawo ni o se n lo loni?"}}],
            )
            print(r.choices[0].message.content)
            ```
            """)

# ---------------------------------------------------------------------------
# Mount Gradio onto FastAPI and serve ONE server (API routes + UI)
# ---------------------------------------------------------------------------
#
# ZeroGPU registers @spaces.GPU functions through demo.launch(), so we MUST start the server
# with launch() (not uvicorn.run). We then inject our /v1 + /healthz routes into Gradio's own
# FastAPI app, at the front of the route list so they take priority.
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

    api_routes = [
        r for r in fastapi_app.routes
        if getattr(r, "path", "").startswith(("/v1", "/healthz"))
    ]
    for r in reversed(api_routes):
        demo.app.router.routes.insert(0, r)
    logger.info(f"Injected {len(api_routes)} API routes into the Gradio server.")

    demo.block_thread()