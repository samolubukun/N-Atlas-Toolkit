"""
Recipe 3: Multilingual Voice Translation & Cultural Adaptation Pipeline.

End-to-End Pipeline:
Spoken Indigenous Audio (Yoruba / Hausa / Igbo)
     |
     v
[Sovereign Whisper ASR] -> Native Transcript
     |
     v
[N-ATLaS Translation Engine] -> English Translation
     |
     v
[Cultural Tone Adapter] -> Lagos-Urban / Nigerian Professional Tone
"""

import natlas

client = natlas.Client()


def process_voice_pipeline(audio_file_path: str, source_language: str):
    print(f"\n1. Transcribing spoken {source_language} audio: {audio_file_path}...")
    with open(audio_file_path, "rb") as audio:
        transcription = client.audio.transcriptions.create(
            file=audio,
            language=source_language,
        )
    raw_text = transcription.text
    print(f"   Transcribed: '{raw_text}'")

    print("\n2. Translating to English...")
    translation_res = client.post("translate", body={
        "text": raw_text,
        "target_lang": "English",
        "tone": "conversational",
    })
    english_text = translation_res.get("translation", raw_text)
    print(f"   English: '{english_text}'")

    print("\n3. Adapting to Urban Nigerian Tech / Business Context...")
    africanized_res = client.post("africanize", body={
        "content": english_text,
        "culture_context": "Lagos-Urban",
        "formality": "natural",
    })
    final_output = africanized_res.get("adapted_text", english_text)
    print(f"   Adapted Output: '{final_output}'")
    return final_output


if __name__ == "__main__":
    print("--- Voice Translation & Adaptation Pipeline Recipe ---")
    import pathlib
    sample = pathlib.Path(__file__).parent.parent / "tests" / "audio" / "yoruba.mp3"
    if sample.exists():
        process_voice_pipeline(str(sample), "yoruba")
