# AI Assistant

Microservices backend + Next.js frontend for RAG chat with agent tools.

## Services

| Service | Port | Description |
|---------|------|-------------|
| [frontend](services/frontend) | 3000 | Next.js UI (login, chat, knowledge) |
| [auth-service](services/auth-service) | 3001 | JWT auth |
| [knowledge-service](services/knowledge-service) | 3002 | Document upload & search |
| [tool-execution-service](services/tool-execution-service) | 3003 | Agent tools |
| [ai-gateway-service](services/ai-gateway-service) | 3004 | Chat & agent orchestration |

## Quick start (local)

```powershell
docker compose up -d db rabbitmq
# Start each service (see service README / .env.example)
cd services/frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

## Observability (Langfuse)

Agent and LLM traces from **ai-gateway-service** are sent to [Langfuse](https://langfuse.com) when configured. See [services/ai-gateway-service/docs/LANGFUSE.md](services/ai-gateway-service/docs/LANGFUSE.md).