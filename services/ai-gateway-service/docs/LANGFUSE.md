# Langfuse observability

The AI Gateway sends **LLM**, **agent workflow**, and **tool** traces to [Langfuse](https://langfuse.com).

## Setup

1. Create a project at https://cloud.langfuse.com (or self-host Langfuse).
2. Copy **Public Key** and **Secret Key** into `services/ai-gateway-service/.env`:

```env
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_TRACING_ENVIRONMENT=development
```

3. Restart `ai-gateway-service`.

Tracing is **off** when keys are missing or `LANGFUSE_ENABLED=false`.

## Trace hierarchy

| Observation | Description |
|-------------|-------------|
| `chat.agent-pipeline` | Full message handling (user query → assistant reply) |
| `agent.query-rewrite` | Query rewriter ADK agent |
| `agent.workflow` | Plan → executor → synthesis workflow |
| `agent.step.plan` | PlanAgent output |
| `agent.step.executor` | TodoExecutorAgent output |
| `agent.step.synthesis` | SynthesisAgent output |
| `tool.knowledge_retrieval` / `tool.sql` / `tool.calculator` | Remote tool calls |
| `openai.chat-completions` | OpenAI-backed ADK agents (when using `OpenAILLM`) |

Metadata on traces includes `userId`, `conversationId`, and `agentRunId` for filtering in Langfuse.

## Viewing traces

Open your Langfuse project → **Tracing** → filter by environment or trace name (e.g. `chat.agent-pipeline`).

## Guardrails + answer judge

Runtime checks use **Google ADK callbacks** (see `src/agents/callbacks/`):

| Callback | Agent | Purpose |
|----------|--------|---------|
| `beforeAgentCallback` | Plan, Executor, Synthesis | Block empty / oversized input |
| `beforeToolCallback` | TodoExecutor | Block unsafe SQL, invalid tool args |
| `afterModelCallback` | Synthesis | LLM judge: correct / partial / wrong |
| `afterAgentCallback` | Synthesis | Log judge result to Langfuse |

Judge settings: `GUARDRAIL_JUDGE_ENABLED`, `GUARDRAIL_MIN_SCORE`, `GUARDRAIL_BLOCK_ON_FAIL`.

You can also add a **Langfuse LLM-as-a-Judge evaluator** on production traces for offline monitoring (complements runtime callbacks).

## References

- [Langfuse + Google ADK](https://langfuse.com/integrations/frameworks/google-adk) (Python OTel instrumentor; Node uses manual SDK spans)
- [Langfuse JS/TS SDK](https://langfuse.com/docs/observability/sdk/typescript/overview)
