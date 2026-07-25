# ContextOS

> An AI middleware layer that adds semantic memory, prompt security, intelligent routing, and real-time observability to any LLM application.

ContextOS sits between your application and an LLM. Every request flows through a 7-stage pipeline that adds context, security, and observability before the model ever sees your prompt.

<p align="center">

[![Live Demo](https://img.shields.io/badge/Live-Demo-success)](https://contextos-zeta.vercel.app)
[![API Docs](https://img.shields.io/badge/API-Docs-blue)](https://contextos-backend-9pbu.onrender.com/docs)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</p>

---

## What It Does

Instead of building memory, security, routing, and monitoring into every LLM project separately, ContextOS centralizes all of it into one reusable middleware service. Send a request to ContextOS instead of directly to an LLM and get back a sanitized, context-aware, validated response — along with a full execution trace.

---

## The Pipeline

```mermaid
flowchart TD
A[User Request]
B[PII & Injection Guard]
C[Vector Memory Retriever]
D[Context Compressor]
E[Intelligent Model Router]
F[LLM Execution]
G[Output Safety Validator]
H[Trace Logger]
I[Response + Live Trace]

A-->B-->C-->D-->E-->F-->G-->H-->I
```

| Stage | What it does |
|---|---|
| PII & Injection Guard | Masks emails, phones, Aadhaar, PAN. Blocks jailbreak attempts. |
| Vector Memory Retriever | Embeds prompt via Gemini, retrieves semantically similar past messages from pgvector. |
| Context Compressor | Trims retrieved memory to fit user's token budget using tiktoken. |
| Intelligent Model Router | Classifies prompt and routes to cheapest capable model. |
| LLM Execution | Calls Groq or Gemini with injected context. Exponential backoff retry. |
| Output Safety Validator | LLM-as-judge toxicity scoring. Blocks above user threshold. |
| Trace Logger | Batch writes all stage traces to DB. Streams live via WebSocket. |

---

## System Architecture

```mermaid
flowchart LR
Client["Application"] --> Gateway["ContextOS API"]
Gateway --> Pipeline["7-Stage Pipeline"]
Pipeline --> DB["Supabase PostgreSQL + pgvector"]
Pipeline --> LLM["Groq / Gemini"]
Pipeline --> Dashboard["Real-Time Dashboard"]
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, Tailwind CSS v4, Zustand, Recharts |
| Backend | FastAPI, async SQLAlchemy, asyncpg |
| Database | Supabase PostgreSQL, pgvector (3072-dim vectors) |
| AI — Generation | Groq (Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B) |
| AI — Embeddings | Gemini embedding-001 |
| Authentication | JWT + bcrypt + API keys (`ctx_` prefix) |
| Real-Time | WebSockets (FastAPI native) |
| Deployment | Vercel (frontend), Render (backend) |

---

## Getting Started

```bash
git clone https://github.com/dishi575/contextos.git
cd contextos
```

**Backend**
```bash
cd backend
pip install -r requirements.txt  # requires Python 3.11
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

**`backend/.env`**

| Variable | Description |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://...supabase.co/postgres` |
| `SECRET_KEY` | JWT signing secret (`openssl rand -hex 32`) |
| `GEMINI_API_KEY` | From aistudio.google.com |
| `GROQ_API_KEY` | From console.groq.com |
| `DEBUG` | `True` for local, `False` for production |

**`frontend/.env.local`**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket URL (`ws://` or `wss://`) |

---

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register operator account |
| POST | `/api/auth/login` | Login, returns JWT |
| PATCH | `/api/auth/policy` | Update pipeline config |
| POST | `/api/chat/` | Run request through full pipeline |
| GET | `/api/chat/sessions` | List conversation sessions |
| GET | `/api/traces/{message_id}` | Get pipeline traces for a message |
| GET | `/api/traces/stats/summary` | Aggregate dashboard stats |
| WS | `/ws/traces?token=JWT` | Live trace event stream |
| GET | `/health` | Health check |

Full API docs at [contextos-backend-9pbu.onrender.com/docs](https://contextos-backend-9pbu.onrender.com/docs)

---

## Engineering Highlights

- 7-stage configurable middleware pipeline with per-stage trace logging
- Semantic memory using pgvector cosine similarity (`<=>` operator) in PostgreSQL
- Token budget context compression with tiktoken — logs tokens saved per request
- Multi-provider model routing — Groq for speed, Gemini for reasoning/coding, with automatic fallback
- Per-user pipeline policy (token budget, temperature, toxicity threshold, memory chunks, PII masking, provider preference)
- Real-time WebSocket trace streaming with live pipeline stage animation
- Indian-context PII detection (Aadhaar, PAN, +91 phone numbers)
- LLM-as-judge output toxicity validation with configurable threshold
- JWT + API key dual authentication

---

## Roadmap

- [x] 7-stage middleware pipeline
- [x] Semantic memory with pgvector
- [x] Multi-provider routing (Groq + Gemini)
- [x] Real-time observability dashboard
- [x] Per-user pipeline policy configuration
- [x] WebSocket live trace streaming
- [ ] Plugin SDK for custom pipeline stages
- [ ] Docker + docker-compose setup
- [ ] Multi-tenant architecture
- [ ] Distributed tracing (OpenTelemetry)

---

## Author

**Dishita Chaturvedi** — AI/ML Engineer · Full-Stack Developer  
[github.com/dishi575](https://github.com/dishi575)

---

## License

MIT
