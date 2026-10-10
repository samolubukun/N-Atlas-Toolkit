# api/telegram.py

import logging
from fastapi import APIRouter, Request, Response, BackgroundTasks, HTTPException, Header, Depends
from typing import Annotated

from core.config import get_settings
from api.dependencies import get_api_key
from models.whatsapp import OutboundMessagePayload
from services.ai_service import generate_reply, get_or_create_user, save_chat_message
from services.telegram_service import send_telegram_message

router = APIRouter(prefix="/telegram", tags=["Telegram"])
logger = logging.getLogger(__name__)
settings = get_settings()

async def process_telegram_and_reply(chat_id_raw: str, user_name: str, user_text: str):
    """
    Background worker for incoming Telegram messages.
    Uses 'tg_<chat_id>' as the unique user_id in the DB.
    """
    user_id = f"tg_{chat_id_raw}"
    user_text = user_text.strip()

    try:
        # 1. Fetch / initialize user record
        user = await get_or_create_user(user_id, user_name)

        if user.is_ai_paused:
            logger.info(f"AI is PAUSED for Telegram user {user_id} (Human Takeover Active). Saving message.")
            await save_chat_message(user_id, "user", user_text)
            return

        # 2. AI generates consultative response
        final_reply_text = await generate_reply(
            user_id=user_id,
            user_text=user_text,
            contact_name=user_name,
            send_message_callback=send_telegram_message
        )

        # 3. Send outbound response to Telegram
        if final_reply_text:
            await send_telegram_message(to=user_id, text=final_reply_text)

    except Exception as e:
        logger.error(f"Error processing Telegram background reply: {e}", exc_info=True)


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_telegram_bot_api_secret_token: str = Header(None)
):
    """
    Receives incoming updates from Telegram Webhook.
    """
    # Verify secret token if configured
    if settings.TELEGRAM_WEBHOOK_SECRET and x_telegram_bot_api_secret_token:
        if x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET:
            logger.warning("Telegram webhook received with invalid secret token.")
            raise HTTPException(status_code=403, detail="Invalid webhook secret token")

    try:
        data = await request.json()
        logger.info(f"Received Telegram webhook: {data}")

        # Check if this update has a message with text or voice note
        if "message" in data:
            message = data["message"]
            chat_id = str(message["chat"]["id"])
            first_name = message.get("from", {}).get("first_name", "")
            last_name = message.get("from", {}).get("last_name", "")
            username = message.get("from", {}).get("username", "")
            user_name = f"{first_name} {last_name}".strip() or username or "Telegram User"

            user_text = ""

            if "text" in message:
                user_text = message["text"]
            elif "voice" in message or "audio" in message:
                from services.asr_service import asr_service
                media_obj = message.get("voice") or message.get("audio")
                file_id = media_obj.get("file_id")
                try:
                    logger.info(f"Downloading Telegram voice note {file_id}...")
                    audio_bytes = await asr_service.download_telegram_media(file_id)
                    user_text = await asr_service.transcribe_audio(audio_bytes, filename=f"tg_{chat_id}.ogg")
                    logger.info(f"Transcribed Telegram voice: '{user_text}'")
                except Exception as e:
                    logger.error(f"Failed to transcribe Telegram audio: {e}", exc_info=True)
                    user_text = "[Voice Note - Audio could not be transcribed]"

            if user_text:
                # Schedule background reply
                background_tasks.add_task(process_telegram_and_reply, chat_id, user_name, user_text)

    except Exception as e:
        logger.error(f"Error parsing Telegram webhook update: {e}", exc_info=True)

    return Response(status_code=200)


@router.post(
    "/send",
    summary="Send outbound message via Telegram",
    dependencies=[Depends(get_api_key)]
)
async def send_outbound_telegram(payload: OutboundMessagePayload):
    """
    Send outbound message via Telegram (for n8n or external triggers).
    """
    try:
        await send_telegram_message(to=payload.to, text=payload.text)
        return {"status": "success", "message": f"Telegram message sent to {payload.to}."}
    except Exception as e:
        logger.error(f"Failed to send outbound Telegram message: {e}")
        raise HTTPException(status_code=500, detail=str(e))
