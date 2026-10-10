# services/asr_service.py

import io
import logging
import httpx
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class NATLaSASRService:
    """
    Handles voice notes from WhatsApp Cloud API and Telegram Bot API,
    transcribing them via N-ATLaS Sovereign Whisper endpoints.
    Supported native targets: Yoruba, Hausa, Igbo, and English.
    """

    @staticmethod
    async def download_whatsapp_media(media_id: str) -> bytes:
        """Fetch binary audio from Meta Graph API using media_id."""
        url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{media_id}"
        headers = {"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            meta_res = await client.get(url, headers=headers)
            meta_res.raise_for_status()
            download_url = meta_res.json().get("url")
            
            audio_res = await client.get(download_url, headers=headers)
            audio_res.raise_for_status()
            return audio_res.content

    @staticmethod
    async def download_telegram_media(file_id: str) -> bytes:
        """Fetch binary audio from Telegram Bot API using file_id."""
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getFile?file_id={file_id}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            meta_res = await client.get(url)
            meta_res.raise_for_status()
            file_path = meta_res.json().get("result", {}).get("file_path")
            
            download_url = f"https://api.telegram.org/file/bot{settings.TELEGRAM_BOT_TOKEN}/{file_path}"
            audio_res = await client.get(download_url)
            audio_res.raise_for_status()
            return audio_res.content

    @classmethod
    async def transcribe_audio(
        cls, 
        audio_bytes: bytes, 
        filename: str = "voice_note.ogg", 
        language: str = None
    ) -> str:
        """
        Transcribes audio bytes using the N-ATLaS Sovereign ASR Whisper endpoint.
        Languages: 'yoruba', 'hausa', 'igbo', 'english'.
        """
        asr_url = settings.NATLAS_ASR_URL
        lang = language or settings.DEFAULT_ASR_LANGUAGE

        logger.info(f"Submitting {len(audio_bytes)} bytes audio to N-ATLaS ASR at {asr_url} (lang={lang})...")

        try:
            # Map language to exact NCAIR Whisper checkpoint identifier
            checkpoint_map = {
                "yoruba": "NCAIR1/Yoruba-ASR",
                "hausa": "NCAIR1/Hausa-ASR",
                "igbo": "NCAIR1/Igbo-ASR",
                "english": "NCAIR1/NigerianAccentedEnglish",
            }
            asr_model = checkpoint_map.get(lang.lower(), "NCAIR1/NigerianAccentedEnglish")

            files = {
                "file": (filename, io.BytesIO(audio_bytes), "audio/ogg")
            }
            data = {
                "model": asr_model,
                "language": lang
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(asr_url, files=files, data=data)
                res.raise_for_status()
                result_json = res.json()
                transcribed_text = result_json.get("text", "").strip()
                logger.info(f"N-ATLaS Transcribed text: '{transcribed_text}'")
                return transcribed_text
        except Exception as e:
            logger.error(f"Error calling N-ATLaS ASR service: {e}", exc_info=True)
            return ""

asr_service = NATLaSASRService()
