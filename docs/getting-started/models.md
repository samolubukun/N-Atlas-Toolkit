# Model Catalog

Detailed architecture, training data, and intended use cases for all models in the N-ATLaS ecosystem.

---

## Sovereign Multilingual LLM

### `NCAIR1/N-ATLaS`
* **Base Architecture**: Meta-Llama-3-8B-Instruct
* **Parameters**: 8.03 Billion
* **Context Length**: 8,192 tokens
* **Primary Languages**: Yoruba (`yo`), Hausa (`ha`), Igbo (`ig`), Nigerian English (`en_ng`), 
* **Special Features**:
    - **Date-Aware Chat Template**: Accepts dynamic `date_string` for temporal grounding.
    - **Cultural Alignment**: Trained on authentic Nigerian literature, proverbs, idioms, news, and conversational dialogues.
* **Intended Use Cases**:
    - Multilingual chatbots and virtual customer service agents.
    - Cultural reasoning, translation, and localized educational content.
    - Document summarization in indigenous languages.

!!! important "Gated Repository Access & Hugging Face Token"
    `NCAIR1/N-ATLaS` is a **gated repository** on Hugging Face. To download weights or deploy private instances:
    
    1. Visit [huggingface.co/NCAIR1/N-ATLaS](https://huggingface.co/NCAIR1/N-ATLaS) and click **"Agree and access repository"** to accept terms.
    2. Generate a Read token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
    3. Set `export HF_TOKEN="your_hf_token"` in your environment before downloading or building containers.
    
    *(The four sovereign Whisper speech models are fully open and do not require gated approval).*

---

## Sovereign Whisper ASR Speech Models

All speech models are built on the **Whisper Small (244M)** architecture, fine-tuned across the six geopolitical zones of Nigeria:

| Model ID | Language | Dataset Size | Key Phonetic Strengths |
| :--- | :--- | :--- | :--- |
| **`NCAIR1/Yoruba-ASR`** | Yoruba (`yo`) | 120+ hours | Acute/grave tone accents (`é`, `è`), sub-dots (`ẹ`, `ọ`, `ṣ`). |
| **`NCAIR1/Hausa-ASR`** | Hausa (`ha`) | 120+ hours | Hooked implosive consonants (`ɓ`, `ɗ`, `ƙ`), glottal stops. |
| **`NCAIR1/Igbo-ASR`** | Igbo (`ig`) | 120+ hours | Sub-dot vowel harmony (`ị`, `ọ`, `ụ`), nasal compounds (`ṅ`, `nw`, `ny`). |
| **`NCAIR1/NigerianAccentedEnglish`** | Nigerian English (`en-ng`) | 120+ hours | Heavy West African pitch, syllable-timed stress patterns, local vocabulary. |

### Intended Use Cases
- Voice IVR (Interactive Voice Response) systems for African telecom and banking.
- Real-time courtroom, legislative, and broadcast transcription.
- Accessibility tools for non-literate speakers of Nigerian languages.
- Voice-enabled AI assistants.
