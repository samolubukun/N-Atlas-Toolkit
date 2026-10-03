# REST API Endpoints Reference

Complete OpenAPI/REST route specification for the N-ATLaS ecosystem.

---

| Method | Endpoint | Service | Description | Authentication |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/healthz` | Both | Healthcheck, GPU device, and model status | Public |
| `GET` | `/v1/models` | LLM | Model catalog discovery | `Bearer <API_KEY>` |
| `POST` | `/v1/chat/completions` | LLM | Chat completion (SSE streaming supported) | `Bearer <API_KEY>` |
| `POST` | `/v1/completions` | LLM | Raw prompt text completion | `Bearer <API_KEY>` |
| `POST` | `/v1/audio/transcriptions` | ASR | Sovereign audio speech-to-text with word alignment | `Bearer <API_KEY>` |
