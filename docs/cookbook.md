# N-ATLaS Developer Cookbook

Production-ready, copy-pasteable recipe scripts demonstrating how to build actual applications with N-ATLaS.

---

## 1. WhatsApp Voice & Text Bot (`cookbook/whatsapp_bot.py`)
Demonstrates how to build a WhatsApp webhook handler that receives text or voice notes, transcribes voice notes via Sovereign ASR, detects language, and replies in the user's indigenous language.

```bash
python cookbook/whatsapp_bot.py
```

---

## 2. Customer Support & Dispute Classifier (`cookbook/customer_support_router.py`)
Demonstrates automating bank ticket resolution (POS decline, transfer delays, account queries) across Hausa, Igbo, Yoruba, and Nigerian Pidgin.

```bash
python cookbook/customer_support_router.py
```

---

## 3. Multilingual Speech-to-Speech Translation Pipeline (`cookbook/voice_translation_pipeline.py`)
Demonstrates a multi-stage AI pipeline:
$$\text{Spoken Audio (Yoruba)} \xrightarrow{\text{ASR}} \text{Transcript} \xrightarrow{\text{Translation}} \text{English} \xrightarrow{\text{Africanize}} \text{Lagos-Urban Tone}$$

---

## 4. Autonomous Agentic Tool Calling (`cookbook/agentic_tools.py`)
Demonstrates OpenAI-compatible multi-turn tool calling and function resolution with Nigerian-localized tools (`get_cbn_fx_rate`, `get_market_commodity_price`):

```bash
python cookbook/agentic_tools.py
```
