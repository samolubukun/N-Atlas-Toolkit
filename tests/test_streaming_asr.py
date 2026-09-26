"""Real-Time Deepgram-Style Streaming ASR Simulation for N-ATLaS.

Simulates a live human speaker talking into a microphone in real-time by:
1. Converting test audio into raw 16kHz 16-bit mono PCM.
2. Pacing audio transmission in natural human speech chunks (e.g., 250ms chunks).
3. Packaging streaming frames compatible with the live Deepgram-style WebSocket endpoint.
4. Concurrently receiving real-time partial/final transcript emissions live on the fly.
"""

import asyncio
import io
import json
import os
import subprocess
import sys
import time
import wave
from pathlib import Path
import aiohttp

# Ensure proper UTF-8 output on Windows console for African language diacritics
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Load environment variables from .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent

WS_URL = os.environ.get(
    "NATLAS_ASR_WS_URL",
    "wss://samuelolubukun--natlas-engine-natlasasrengine-serve.modal.run/v1/audio/transcriptions/streaming",
)
API_KEY = os.environ.get("NATLAS_API_KEY")
if not API_KEY:
    print("ERROR: NATLAS_API_KEY environment variable is not set. Please set NATLAS_API_KEY in your .env or environment.")
    sys.exit(1)

SAMPLES = [
    {
        "language": "English",
        "lang_code": "en-ng",
        "file": BASE_DIR / "audio" / "english.mp3",
        "ground_truth": "Closing the Google assistant app prevents it from working with your headphones.",
    },
    {
        "language": "Hausa",
        "lang_code": "ha",
        "file": BASE_DIR / "audio" / "hausa.mp3",
        "ground_truth": "Bude kofar. Na san kina ciki.",
    },
    {
        "language": "Yoruba",
        "lang_code": "yo",
        "file": BASE_DIR / "audio" / "yoruba.mp3",
        "ground_truth": "Ta ni ò mọ̀ pé àwọn àgbà jẹ́ ilé ìṣura ọgbọ́n?",
    },
    {
        "language": "Igbo",
        "lang_code": "ig",
        "file": BASE_DIR / "audio" / "igbo.mp3",
        "ground_truth": "Odeakwụkwọ ọkpụtọrọkpụ ụlọọrụ na-ahụ maka ọrụ ngo na steeti Anambra",
    },
]


def mp3_to_pcm16_bytes(file_path: Path) -> bytes:
    """Use ffmpeg to decode MP3 into raw 16kHz 16-bit signed LE mono PCM."""
    cmd = [
        "ffmpeg",
        "-y",
        "-nostdin",
        "-threads", "1",
        "-i", str(file_path),
        "-ar", "16000",
        "-ac", "1",
        "-f", "s16le",
        "-",
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=True)
    return proc.stdout

def pcm_to_wav(pcm_data: bytes) -> bytes:
    """Wrap PCM bytes with a standard WAV RIFF header for soundfile/librosa compatibility."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(pcm_data)
    return buf.getvalue()

async def simulate_live_speech_session(session: aiohttp.ClientSession, sample: dict):
    lang_name = sample["language"]
    lang_code = sample["lang_code"]
    audio_file = Path(sample["file"])
    gt = sample["ground_truth"]

    print("\n" + "=" * 80)
    print(f"🎙️  LIVE STREAMING SIMULATION: {lang_name.upper()} ({lang_code})")
    print(f"Endpoint: {WS_URL}?language={lang_code}")
    print(f"Ground Truth: {gt}")
    print("=" * 80)

    if not audio_file.exists():
        print(f"Error: {audio_file} not found.")
        return

    pcm_bytes = mp3_to_pcm16_bytes(audio_file)
    total_samples = len(pcm_bytes) // 2
    audio_duration = total_samples / 16000.0
    print(f"Decoded speech length: {audio_duration:.2f}s ({len(pcm_bytes):,} raw PCM bytes)")

    url = f"{WS_URL}?language={lang_code}"
    headers = {"Authorization": f"Bearer {API_KEY}"}

    transcripts_received = []
    
    # We buffer into ~1.5s speech frames wrapped in WAV container (48,000 PCM bytes = 1.5s)
    # and send them in paced micro-bursts to simulate continuous real-time live speaker speech
    FRAME_SIZE = 48000
    
    try:
        async with session.ws_connect(url, headers=headers) as ws:
            print("Connected to WebSocket. Simulating live speaker talking into mic... 🗣️\n")

            async def receive_transcripts():
                try:
                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            data = json.loads(msg.data)
                            channel = data.get("channel", {})
                            alts = channel.get("alternatives", [])
                            if alts:
                                text = alts[0].get("transcript", "").strip()
                                if text:
                                    now = time.strftime("%H:%M:%S")
                                    print(f"  [{now}] 🔴 [LIVE EMISSION]: \"{text}\"")
                                    transcripts_received.append(text)
                        elif msg.type in (aiohttp.WSMsgType.CLOSE, aiohttp.WSMsgType.CLOSED):
                            break
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    print(f"Receiver notice: {e}")

            recv_task = asyncio.create_task(receive_transcripts())

            offset = 0
            start_time = time.time()
            chunk_num = 0

            while offset < len(pcm_bytes):
                chunk = pcm_bytes[offset : offset + FRAME_SIZE]
                chunk_len_sec = (len(chunk) // 2) / 16000.0
                chunk_num += 1

                print(f"  >> [Mic Stream] Sending voice chunk #{chunk_num} ({chunk_len_sec:.2f}s audio)...")
                wav_chunk = pcm_to_wav(chunk)
                await ws.send_bytes(wav_chunk)
                offset += FRAME_SIZE

                # Simulate speaking time for this audio chunk
                await asyncio.sleep(chunk_len_sec)

            stream_time = time.time() - start_time
            print(f"\n[Finished speaking {audio_duration:.2f}s of audio in {stream_time:.2f}s real-time]")

            # Await any in-flight transcription response
            await asyncio.sleep(2.0)
            await ws.send_str(json.dumps({"type": "CloseStream"}))
            await asyncio.sleep(0.5)

            recv_task.cancel()
            try:
                await recv_task
            except asyncio.CancelledError:
                pass

    except Exception as ex:
        print(f"Streaming error: {ex}")

    print("\n📝 SESSION SUMMARY:")
    print(f"   Ground Truth : {gt}")
    full_output = " ... ".join(transcripts_received) if transcripts_received else "(None)"
    print(f"   Live Stream  : {full_output}")
    print("-" * 80)

async def main():
    print("=" * 80)
    print("N-ATLaS DEEPGRAM-STYLE REAL-TIME STREAMING ASR SIMULATION")
    print("Simulating real-time human speaker streaming speech into WebSocket")
    print("=" * 80)

    timeout = aiohttp.ClientTimeout(total=300)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        for sample in SAMPLES:
            await simulate_live_speech_session(session, sample)
            await asyncio.sleep(1.0)

if __name__ == "__main__":
    asyncio.run(main())
