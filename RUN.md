# Runbook — Lex Legal Assistant

## Prerequisites

- Node.js 20+ recommended  
- **Supabase** project with migrations applied (`supabase/migrations/`).  
- **Anonymous sign-ins enabled** (Authentication → Providers → **Anonymous**) — required so `/app` can open **without** email/password while RLS still applies (`auth.uid()`).  
- **Chat**: either local Express (`VITE_CHAT_API_URL`) or Supabase Edge function (`VITE_SUPABASE_URL` + keys).

## One-time install

```bash
cd /path/to/legal-assistant-ai
npm install
npm run chat-api:install
```

## Environment

**Web app** (`.env` or `.env.local` in repo root):

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon / public key |
| `VITE_CHAT_API_URL` | e.g. `http://localhost:3001` — optional; if unset, chat uses the Edge function |

**Chat API** (`server/.env` from `server/.env.example`):

- `AI_API_KEY` — OpenAI-compatible gateway key  
- `PORT`, `CORS_ORIGIN`, `AI_BASE_URL`, `AI_MODEL` as needed  

## Run (two terminals)

**Terminal 1 — Express chat API (if using `VITE_CHAT_API_URL`)**

```bash
cd /path/to/legal-assistant-ai
npm run chat-api
```

**Terminal 2 — Vite app**

```bash
cd /path/to/legal-assistant-ai
npm run dev
```

Open the printed URL (often `http://localhost:5173`) and go to **`/app`**.

## Behaviour

- **No sign-in UI** — the app starts a **Supabase anonymous session** automatically so matters, messages, and documents persist under RLS.  
- **`/auth`** still redirects to **`/app`** for old links.  
- **Chat** uses `VITE_CHAT_API_URL` when set; otherwise the Supabase `agent` Edge function (needs URL + anon key).

## Quick check

```bash
curl http://localhost:3001/health
```
