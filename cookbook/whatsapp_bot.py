"""
Recipe 1: WhatsApp Voice & Text Bot with Multilingual Routing.

Demonstrates how a production WhatsApp bot:
1. Receives incoming text or audio voice note messages.
2. If voice note: transcribes audio using Sovereign ASR (Hausa/Yoruba/Igbo/English).
3. Detects language and constructs culturally aligned sovereign system prompt.
4. Streams or returns response in the user's native language.
"""

import os
import natlas

client = natlas.Client()


def handle_incoming_message(message_type: str, content: bytes | str) -> str:
    """Process an incoming WhatsApp message (voice or text)."""
    if message_type == "audio":
        print("[WhatsApp] Received Voice Note. Transcribing with Sovereign ASR...")
        # Step 1: Transcribe incoming audio voice note
        transcription = client.audio.transcriptions.create(
            file=content,
            language="yoruba", # or auto-detect
        )
        user_text = transcription.text
        print(f"[WhatsApp] Transcribed: '{user_text}'")
    else:
        user_text = str(content)
        print(f"[WhatsApp] Received Text: '{user_text}'")

    # Step 2: Detect Nigerian language
    lang = natlas.detect_language(user_text)
    print(f"[WhatsApp] Detected Language: {lang}")

    # Step 3: Generate culturally grounded reply
    response = client.chat([
        natlas.system_prompt(lang),
        {
            "role": "user",
            "content": f"You are a friendly WhatsApp customer assistant for a Nigerian service. Answer concisely: {user_text}",
        }
    ], max_tokens=150)

    reply_text = response.message.content
    print(f"[WhatsApp] Reply: '{reply_text}'")
    return reply_text


if __name__ == "__main__":
    print("--- WhatsApp Bot Recipe Demonstration ---")
    sample_text = "Ẹ n lẹ́ o! Báwo ni mo ṣe lè san owó iná mànàmáná mi?"
    handle_incoming_message("text", sample_text)
