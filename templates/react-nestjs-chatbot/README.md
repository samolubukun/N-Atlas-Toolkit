# N-ATLaS React + NestJS Multilingual Chatbot App

A full-stack, open-source chat application built with **React** (frontend) and **NestJS** (backend), powered by **N-ATLaS Sovereign AI** (`NCAIR1/N-ATLaS` 8.03B LLM).

Fully responsive across desktop, tablet, and mobile with Markdown rendering, clean user/assistant chat bubbles, and authentic multilingual communication in **Yorùbá**, **Hausa**, **Igbo**, and **English**.

---

## Architecture

- **Frontend**: React (Vite) + Markdown support + mobile-responsive CSS.
- **Backend**: NestJS REST API (`POST /chat`) + Axios client communicating with Sovereign N-ATLaS OpenAI-compatible endpoints (`/v1/chat/completions`).
- **Sovereign Provider**: `src/chat/providers/natlas.provider.ts` injects authentic Wazobia cultural instructions and interfaces with N-ATLaS endpoints (Modal, Lightning AI, Hugging Face Spaces, or local vLLM/Ollama).

---

## Quick Start

### 1. Backend Setup

```bash
cd templates/react-nestjs-chatbot/backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Ensure your `.env` contains:
```env
NATLAS_API_URL=http://localhost:8000/v1/chat/completions
NATLAS_API_KEY=natlas-local
NATLAS_MODEL=NCAIR1/N-ATLaS
PORT=3000
```

Start the backend:
```bash
npm run start:dev
```

### 2. Frontend Setup

In a new terminal:
```bash
cd templates/react-nestjs-chatbot/frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open your browser at `http://localhost:5173`.
