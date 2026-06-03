# AI Assistant Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui.

## Features

- **Login / Register** — `auth-service` (`POST /auth/login`, `/auth/register`)
- **Chat** — `ai-gateway-service` conversations & messages (async agent runs with live todo polling)
- **Streaming UX** — assistant replies render with a typewriter effect; tool steps update while the agent runs
- **Markdown** — `react-markdown` + GFM for assistant messages
- **Knowledge** — upload, list, delete, and semantic search via `knowledge-service`
- **Conversation history** — sidebar with create/delete
- **Tool execution panel** — live todo status and tool hints (`knowledge_retrieval`, `sql`, `calculator`)

## Prerequisites

Backend services running locally:

| Service | Port |
|---------|------|
| auth-service | 3001 |
| knowledge-service | 3002 |
| tool-execution-service | 3003 |
| ai-gateway-service | 3004 |

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
