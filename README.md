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

**One-time setup:** copy each service `.env.example` → `.env`, run DB migrations ([docs/UI_TESTING_SQL.md](docs/UI_TESTING_SQL.md)), install dependencies:

```powershell
npm install
npm install --prefix services/auth-service
npm install --prefix services/knowledge-service
npm install --prefix services/tool-execution-service
npm install --prefix services/ai-gateway-service
npm install --prefix services/frontend
copy services\frontend\.env.local.example services\frontend\.env.local
```

**Start all services** (Postgres + Redis + RabbitMQ in Docker, then auth, knowledge, tools, gateway, frontend):

```powershell
npm run dev
```

| Command | What it does |
|---------|----------------|
| `npm run dev` | Build backends, then `npm start` |
| `npm start` | Start Docker infra + all 5 apps (no rebuild) |
| `npm run infra` | Only `db`, `redis`, `rabbitmq` |

Open http://localhost:3000

**UI test (SQL tool):** migrate DB, seed demo data (`cd scripts && npm install && npm run seed`), set `OPENAI_API_KEY` in tool-execution-service, log in as `demo@example.com` / `Demo123!`. See [docs/UI_TESTING_SQL.md](docs/UI_TESTING_SQL.md).

## Prompts

LLM prompts and agent-facing tool copy live in one file per service:

| Service | File |
|---------|------|
| ai-gateway-service | `services/ai-gateway-service/src/prompts/index.ts` |
| knowledge-service | `services/knowledge-service/src/prompts/index.ts` |
| tool-execution-service | `services/tool-execution-service/src/prompts/index.ts` |

Edit prompts there instead of scattering them across agents and services.

Structured agent outputs use Gemini `Schema` definitions in `services/ai-gateway-service/src/agents/output-schemas.ts` and `outputSchema` on each `LlmAgent` (see [ADK structured output](https://adk.dev/agents/llm-agents/)).

## Scaling considerations (SQL / database schema)

The agent can run **read-only SQL** via `tool-execution-service` (`sql_query` tool). Schema metadata comes from `GET /tools/sql/schema` (`getSchemaCatalog()` over `information_schema`, scoped by `SQL_ALLOWED_SCHEMAS`).

**Why not send the whole schema to the LLM every time?**

- Large databases have many tables and columns → huge prompts, higher cost, slower responses, and worse accuracy (wrong table/column picks).
- Dumping the full catalog on every chat turn does not scale.

**What we do instead (by size):**

| Size | Approach |
|------|----------|
| Small (roughly &lt; 25 agent-facing tables) | Curated table list + short descriptions; full column detail only when needed |
| Medium | **Schema retrieval**: embed table/column docs, fetch only the top few relevant tables per question, then generate SQL |
| Large | **Semantic layer**: stable SQL views + glossary; agent sees views, not every raw table |

**Current implementation (Phase A):** `tool-execution-service` generates SQL with OpenAI (`generateObject` via [AI SDK](https://ai-sdk.dev)) from a natural language `question` and schema catalog; the agent must not pass raw SQL. Set `OPENAI_API_KEY` and optional `SQL_GENERATOR_MODEL` (default `gpt-4.1-mini`) in tool-execution `.env`.

**Knowledge retrieval:** extract metadata filters from the query → pgvector search (with metadata fallback). See [docs/KNOWLEDGE_RETRIEVAL.md](docs/KNOWLEDGE_RETRIEVAL.md).

**Principles**

1. **Generate SQL in the app**, not inside Postgres — every generated query passes `validateReadOnlySql` twice (right after OpenAI, again before execute). `DELETE`, `UPDATE`, `INSERT`, DDL, `SELECT INTO`, and `FOR UPDATE` are rejected and never run ([tool-execution-service](services/tool-execution-service/src/services/sql-validator.ts)).
2. **Retrieve schema, don’t dump it** — same idea as document RAG: less context, more relevant context.
3. **On SQL errors**, retry with the error message and a small schema slice — not the full catalog again.

In-database NL→SQL extensions (e.g. [pg_ai_query](https://github.com/benodiwal/pg_ai_query)) are optional for ad-hoc DBA use; they are not the default path here because security, tenancy, and tracing stay in the microservices layer.

## Observability (Langfuse)

Agent and LLM traces from **ai-gateway-service** are sent to [Langfuse](https://langfuse.com) when configured. See [services/ai-gateway-service/docs/LANGFUSE.md](services/ai-gateway-service/docs/LANGFUSE.md).