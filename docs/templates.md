# Starter Kits & Application Templates

The **N-ATLaS Toolkit** includes production-grade starter templates pre-wired to connect to Sovereign N-ATLaS LLM (`NCAIR1/N-ATLaS`) and ASR (`Yoruba-ASR`, `Hausa-ASR`, `Igbo-ASR`, `NigerianAccentedEnglish`) endpoints.

---

## 1. WhatsApp & Telegram Multilingual AI Agent & CRM (`templates/whatsapp-telegram-crm/`)

A production-ready FastAPI boilerplate for deploying autonomous, sovereign multilingual AI consultants and customer support agents across **WhatsApp Cloud API** and **Telegram**.

### Key Highlights
- **Native Voice Note Transcription**: Accepts `.ogg`/`.opus` audio messages from WhatsApp and Telegram, routing them through N-ATLaS Whisper ASR models (**Yorùbá**, **Hausa**, **Igbo**, and **English**).
- **Sovereign Wazobia Multilingual Reasoning**: N-ATLaS answers with culturally authentic responses (slang/broken Pidgin is strictly restricted).
- **Autonomous Lead Qualification & Booking**:
  - `save_qualified_lead`: Persists contact info, niche, budget, and intent score (`HOT`, `WARM`, `COLD`).
  - `book_service_consultation`: Schedules appointments in SQLite/PostgreSQL.
- **Real-Time Admin CRM Hub (`/admin`)**: Dark-mode dashboard with channel filtering, live lead inspectors, and **one-click Live Human Takeover** to pause AI replies.

### Quickstart

```bash
cd templates/whatsapp-telegram-crm

# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env

# 3. Start server
uvicorn main:app --reload --port 8080
```

Access the Admin CRM Dashboard at `http://localhost:8080/admin` and Swagger API Docs at `http://localhost:8080/docs`.

---

## 2. React + NestJS Multilingual Chatbot (`templates/react-nestjs-chatbot/`)

A full-stack chat application built with **React** (frontend) and **NestJS** (backend), powered by the Sovereign N-ATLaS OpenAI-compatible endpoint.

### Key Highlights
- **Clean Full-Stack Architecture**: React (Vite) UI with Markdown rendering, typing indicators, and mobile-responsive styling.
- **Provider-Agnostic Backend**: NestJS service (`POST /chat`) with pre-built `natlas.provider.ts` communicating with `/v1/chat/completions`.
- **Indigenous Languages Support**: Greets and converses fluently in **Yorùbá**, **Hausa**, **Igbo**, and **English**.

### Quickstart

```bash
# 1. Start NestJS Backend
cd templates/react-nestjs-chatbot/backend
npm install
cp .env.example .env
npm run start:dev

# 2. Start React Frontend (in a new terminal)
cd templates/react-nestjs-chatbot/frontend
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.
