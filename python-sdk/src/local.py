"""Local Transformers backend for N-ATLaS.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import os
import threading
import time
from collections.abc import Iterator
from datetime import date, datetime
from typing import Any, cast

from ._types import ChatRequest, ChatResponse, GenerateRequest, GenerateResponse, Message, Usage
from .exceptions import ConfigurationError, LocalDependencyError, LocalInferenceError
from .languages import EN_NG, system_prompt

DEFAULT_MODEL = "NCAIR1/N-ATLaS"
_MONTHS = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
)


def format_date_string(value: date | None = None) -> str:
    """Format a date exactly as required by the N-ATLaS chat template."""
    current = value or datetime.now().date()
    return f"{current.day:02d} {_MONTHS[current.month - 1]} {current.year}"


def _offline_mode() -> bool:
    values = (os.getenv("HF_HUB_OFFLINE"), os.getenv("TRANSFORMERS_OFFLINE"))
    return any(value and value.casefold() in {"1", "true", "yes", "on"} for value in values)


def _stop_values(request: ChatRequest | GenerateRequest) -> list[str]:
    if request.stop is None:
        return []
    return [request.stop] if isinstance(request.stop, str) else request.stop


def _truncate_at_stop(text: str, stops: list[str]) -> tuple[str, bool]:
    positions = [text.find(stop) for stop in stops if stop and stop in text]
    if not positions:
        return text, False
    position = min(positions)
    return text[:position], True


class LocalBackend:
    """Load and run N-ATLaS locally with Transformers.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        hf_token: str | None = None,
        *,
        _tokenizer: Any = None,
        _model_instance: Any = None,
        _torch: Any = None,
    ) -> None:
        resolved_token = (
            hf_token
            if hf_token is not None
            else os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN")
        )
        if not resolved_token:
            raise ConfigurationError(
                "A Hugging Face token is required for local mode because NCAIR1/N-ATLaS is gated. "
                "Pass hf_token=... or set HF_TOKEN."
            )
        self.model = model
        self.hf_token = resolved_token
        self._tokenizer = _tokenizer
        self._model_instance = _model_instance
        self._torch = _torch
        self._load_lock = threading.Lock()

    def _ensure_loaded(self) -> None:
        if (
            self._tokenizer is not None
            and self._model_instance is not None
            and self._torch is not None
        ):
            return
        with self._load_lock:
            if (
                self._tokenizer is not None
                and self._model_instance is not None
                and self._torch is not None
            ):
                return
            try:
                import torch
                from transformers import AutoModelForCausalLM, AutoTokenizer
            except ImportError as exc:
                raise LocalDependencyError(
                    "Local mode requires optional dependencies. Install them with: "
                    "pip install 'natlas[local]'."
                ) from exc
            local_files_only = _offline_mode()
            tokenizer = AutoTokenizer.from_pretrained(
                self.model,
                token=self.hf_token,
                local_files_only=local_files_only,
            )
            model_instance = AutoModelForCausalLM.from_pretrained(
                self.model,
                token=self.hf_token,
                torch_dtype=torch.float16,
                device_map="auto",
                local_files_only=local_files_only,
            )
            model_instance.eval()
            self._tokenizer = tokenizer
            self._model_instance = model_instance
            self._torch = torch

    def format_prompt(self, messages: list[dict[str, Any]]) -> str:
        """Apply N-ATLaS's chat template with the required current-date argument."""
        self._ensure_loaded()
        normalized = list(messages)
        if not any(message.get("role") == "system" for message in normalized):
            normalized.insert(0, system_prompt(EN_NG).model_dump(exclude_none=True))
        return str(
            self._tokenizer.apply_chat_template(
                normalized,
                add_generation_prompt=True,
                tokenize=False,
                date_string=format_date_string(),
            )
        )

    def _encode(self, prompt: str) -> tuple[Any, int]:
        inputs = self._tokenizer(prompt, return_tensors="pt", add_special_tokens=False)
        model_inputs = inputs.to(self._model_instance.device)
        return model_inputs, int(model_inputs["input_ids"].shape[-1])

    def _generation_kwargs(self, request: ChatRequest | GenerateRequest) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "max_new_tokens": request.max_tokens,
            "repetition_penalty": request.repetition_penalty,
            "use_cache": True,
            "return_dict_in_generate": False,
            "pad_token_id": (
                self._tokenizer.eos_token_id
                if self._tokenizer.eos_token_id is not None
                else self._tokenizer.pad_token_id
            ),
        }
        if request.temperature > 0:
            kwargs.update(
                {
                    "do_sample": True,
                    "temperature": request.temperature,
                    "top_p": request.top_p,
                    "top_k": request.top_k if request.top_k >= 0 else 0,
                }
            )
        else:
            kwargs["do_sample"] = False
        stops = _stop_values(request)
        if stops:
            kwargs["stop_strings"] = stops
            kwargs["tokenizer"] = self._tokenizer
        return kwargs

    def _generate(self, request: ChatRequest | GenerateRequest, **extra: Any) -> Any:
        with self._torch.inference_mode():
            return self._model_instance.generate(
                **self._generation_kwargs(request),
                **extra,
            )

    def _decode_output(
        self,
        outputs: Any,
        prompt_tokens: int,
        request: ChatRequest | GenerateRequest,
    ) -> tuple[str, int, str]:
        generated = outputs[0][prompt_tokens:]
        text = str(self._tokenizer.decode(generated, skip_special_tokens=True)).strip()
        text, stopped = _truncate_at_stop(text, _stop_values(request))
        completion_tokens = max(0, int(outputs.shape[-1]) - prompt_tokens)
        done_reason = "stop" if stopped or completion_tokens < request.max_tokens else "length"
        return text, completion_tokens, done_reason

    def _usage(self, prompt_tokens: int, completion_tokens: int) -> Usage:
        return Usage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
        )

    def chat(self, request: ChatRequest) -> ChatResponse | Iterator[ChatResponse]:
        """Run a validated local chat request."""
        if request.stream:
            return cast(Iterator[ChatResponse], self._stream(request, chat=True))
        self._ensure_loaded()
        prompt = self.format_prompt(
            [message.model_dump(exclude_none=True) for message in request.messages]
        )
        inputs, prompt_tokens = self._encode(prompt)
        outputs = self._generate(request, **inputs)
        text, completion_tokens, done_reason = self._decode_output(outputs, prompt_tokens, request)
        del inputs
        return ChatResponse(
            model=request.model,
            created=int(time.time()),
            message=Message(role="assistant", content=text),
            done=True,
            done_reason=done_reason,
            usage=self._usage(prompt_tokens, completion_tokens),
        )

    def generate(self, request: GenerateRequest) -> GenerateResponse | Iterator[GenerateResponse]:
        """Run a validated local completion request."""
        if request.stream:
            return cast(Iterator[GenerateResponse], self._stream(request, chat=False))
        self._ensure_loaded()
        prompt = self.format_prompt([{"role": "user", "content": request.prompt}])
        inputs, prompt_tokens = self._encode(prompt)
        outputs = self._generate(request, **inputs)
        text, completion_tokens, done_reason = self._decode_output(outputs, prompt_tokens, request)
        del inputs
        return GenerateResponse(
            model=request.model,
            created=int(time.time()),
            response=text,
            done=True,
            done_reason=done_reason,
            usage=self._usage(prompt_tokens, completion_tokens),
        )

    def _streamer(self) -> Any:
        try:
            from transformers import TextIteratorStreamer
        except ImportError as exc:
            raise LocalDependencyError(
                "Local streaming requires optional dependencies. Install them with: "
                "pip install 'natlas[local]'."
            ) from exc
        return TextIteratorStreamer(
            self._tokenizer,
            skip_prompt=True,
            skip_special_tokens=True,
        )

    def _count_text_tokens(self, text: str) -> int:
        if not text:
            return 0
        encoded = self._tokenizer(text, add_special_tokens=False)
        token_ids = encoded["input_ids"] if hasattr(encoded, "__getitem__") else encoded.input_ids
        shape = getattr(token_ids, "shape", None)
        return int(shape[-1]) if shape is not None else len(token_ids)

    def _stream(
        self,
        request: ChatRequest | GenerateRequest,
        *,
        chat: bool,
    ) -> Iterator[ChatResponse] | Iterator[GenerateResponse]:
        self._ensure_loaded()
        if chat:
            assert isinstance(request, ChatRequest)
            message_dump = [message.model_dump(exclude_none=True) for message in request.messages]
        else:
            assert isinstance(request, GenerateRequest)
            message_dump = [{"role": "user", "content": request.prompt}]
        prompt = self.format_prompt(message_dump)
        inputs, prompt_tokens = self._encode(prompt)
        streamer = self._streamer()
        errors: list[BaseException] = []
        generation_kwargs = self._generation_kwargs(request)

        def run_generation() -> None:
            try:
                with self._torch.inference_mode():
                    self._model_instance.generate(
                        **inputs,
                        **generation_kwargs,
                        streamer=streamer,
                    )
            except BaseException as exc:
                errors.append(exc)
            finally:
                streamer.end()

        worker = threading.Thread(
            target=run_generation, name="natlas-local-generation", daemon=True
        )
        worker.start()
        accumulated = ""
        stopped_generation = False
        stops = _stop_values(request)
        try:
            for piece in streamer:
                if not piece:
                    continue
                combined = accumulated + piece
                truncated, stopped = _truncate_at_stop(combined, stops)
                delta = truncated[len(accumulated) :]
                accumulated = truncated
                if delta:
                    response: ChatResponse | GenerateResponse
                    if chat:
                        response = ChatResponse(
                            model=request.model,
                            created=int(time.time()),
                            message=Message(role="assistant", content=delta),
                            done=False,
                        )
                    else:
                        response = GenerateResponse(
                            model=request.model,
                            created=int(time.time()),
                            response=delta,
                            done=False,
                        )
                    yield response
                if stopped:
                    stopped_generation = True
                    break
        finally:
            worker.join()
        if errors:
            raise LocalInferenceError("Local N-ATLaS generation failed") from errors[0]
        completion_tokens = self._count_text_tokens(accumulated)
        done_reason = (
            "stop" if stopped_generation or completion_tokens < request.max_tokens else "length"
        )
        if chat:
            final: ChatResponse | GenerateResponse = ChatResponse(
                model=request.model,
                created=int(time.time()),
                message=Message(role="assistant", content=""),
                done=True,
                done_reason=done_reason,
                usage=self._usage(prompt_tokens, completion_tokens),
            )
        else:
            final = GenerateResponse(
                model=request.model,
                created=int(time.time()),
                response="",
                done=True,
                done_reason=done_reason,
                usage=self._usage(prompt_tokens, completion_tokens),
            )
        yield final


ASR_MODELS = {
    "yo": "NCAIR1/Yoruba-ASR",
    "ha": "NCAIR1/Hausa-ASR",
    "ig": "NCAIR1/Igbo-ASR",
    "en": "NCAIR1/NigerianAccentedEnglish",
    "en-ng": "NCAIR1/NigerianAccentedEnglish",
}


class LocalASRBackend:
    """Run sovereign Whisper Small ASR locally with Transformers."""

    def __init__(self, hf_token: str | None = None) -> None:
        self.hf_token = (
            hf_token
            if hf_token is not None
            else os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN")
        )
        if not self.hf_token:
            raise ConfigurationError(
                "A Hugging Face token is required for local ASR because NCAIR1 models are gated. "
                "Pass hf_token=... or set HF_TOKEN."
            )
        self._models: dict[str, Any] = {}
        self._processors: dict[str, Any] = {}
        self._lock = threading.Lock()

    def transcribe(
        self,
        audio_bytes: bytes,
        model: str | None = None,
        language: str | None = None,
        return_timestamps: bool = False,
    ) -> dict[str, Any]:
        """Transcribe an audio buffer locally with lazy model loading."""
        import io
        try:
            import librosa
            import numpy as np
            import soundfile as sf
            import torch
            from transformers import WhisperForConditionalGeneration, WhisperProcessor
        except ImportError as exc:
            raise LocalDependencyError(
                "Local ASR requires extra dependencies. Install with: pip install 'natlas[local]'."
            ) from exc

        model_id = model or (ASR_MODELS.get(language.lower()) if language else None) or "NCAIR1/NigerianAccentedEnglish"

        with self._lock:
            if model_id not in self._models:
                device = "cuda" if torch.cuda.is_available() else "cpu"
                dtype = torch.float16 if torch.cuda.is_available() else torch.float32
                proc = WhisperProcessor.from_pretrained(model_id, token=self.hf_token)
                mod = WhisperForConditionalGeneration.from_pretrained(
                    model_id, token=self.hf_token, torch_dtype=dtype
                ).to(device)
                mod.eval()
                self._processors[model_id] = proc
                self._models[model_id] = mod

        processor = self._processors[model_id]
        model_inst = self._models[model_id]
        device = next(model_inst.parameters()).device
        dtype = next(model_inst.parameters()).dtype

        try:
            audio_array, sampling_rate = sf.read(io.BytesIO(audio_bytes))
        except Exception:
            audio_array, sampling_rate = librosa.load(io.BytesIO(audio_bytes), sr=16000)

        if getattr(audio_array, "ndim", 1) > 1:
            audio_array = np.mean(audio_array, axis=1)

        if sampling_rate != 16000:
            audio_array = librosa.resample(audio_array.astype(np.float32), orig_sr=sampling_rate, target_sr=16000)

        duration = float(len(audio_array)) / 16000.0
        inputs = processor(audio_array, sampling_rate=16000, return_tensors="pt").input_features.to(device).to(dtype)

        with torch.inference_mode():
            predicted_ids = model_inst.generate(inputs, return_timestamps=return_timestamps)

        text = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()

        words = []
        if return_timestamps:
            words = [{"word": w, "start": 0.0, "end": round(duration, 2)} for w in text.split()]

        return {
            "text": text,
            "duration": round(duration, 2),
            "model": model_id,
            "language": language or "auto",
            "words": words,
            "attribution": "Yoruba-ASR, Hausa-ASR, Igbo-ASR, and NigerianAccentedEnglish are developed by Awarri Technologies in partnership with the Federal Government of Nigeria.",
        }
