# AI Assistant Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui.

## Features

- **Login / Register** — via API gateway (`POST /auth/login`, `/auth/register`)
- **Chat** — async agent runs with live todo updates via **WebSocket** (see root README — [Note for reviewers](../../README.md#note-for-reviewers--real-time-updates))
- **Typewriter UX** — assistant replies animate client-side after the full response arrives; tool/todo panel updates via WebSocket
- **Markdown** — `react-markdown` + GFM for assistant messages
- **Knowledge** — upload, list, delete, and semantic search (proxied via auth-service)
- **Conversation history** — sidebar with create/delete
- **Tool execution panel** — live todo status and tool hints (`knowledge_retrieval`, `sql`, `calculator`)

## Prerequisites

Backend services running locally (frontend talks only to **auth-service** on port 3001, which proxies to other services):

| Service | Port | Frontend access |
|---------|------|-----------------|
| auth-service (API gateway) | 3001 | Yes — single entry point |
| knowledge-service | 3002 | Internal only |
| tool-execution-service | 3003 | Internal only |
| ai-gateway-service | 3004 | Internal only |

Copy environment:

```powershell
copy .env.local.example .env.local
```

## Development

```powershell
cd services/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

```powershell
npm test                 # Vitest unit tests
npm run test:integration # Node integration smoke (requires backends)
npm run build            # Production build
```

## Project structure

```
src/
  app/              # App Router pages
  components/       # UI, chat, documents, layout
  lib/api/          # HTTP clients for auth, gateway, knowledge
  lib/auth/         # Token storage + Zustand store
  lib/hooks/        # Streaming chat & text hooks
```
