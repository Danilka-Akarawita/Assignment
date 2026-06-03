import { startActiveObservation, startObservation } from '@langfuse/tracing';
import { langfuseEnabled } from '../instrumentation.js';

export type TraceMetadata = Record<string, string | number | boolean | undefined>;

function spanAttrs(meta?: TraceMetadata): { metadata?: Record<string, unknown> } {
  if (!meta) return {};
  const metadata = Object.fromEntries(
    Object.entries(meta).filter(([, v]) => v !== undefined)
  );
  return Object.keys(metadata).length > 0 ? { metadata } : {};
}

/** Top-level trace for a full agent pipeline run. */
export async function traceAgentPipeline<T>(
  params: {
    name: string;
    userId: number;
    conversationId: number;
    agentRunId: number;
    input: unknown;
    metadata?: TraceMetadata;
  },
  fn: () => Promise<T>
): Promise<T> {
  if (!langfuseEnabled) return fn();

  return startActiveObservation(
    params.name,
    async (span) => {
      span.update({
        input: params.input,
        ...spanAttrs({
          userId: params.userId,
          conversationId: params.conversationId,
          agentRunId: params.agentRunId,
          service: 'ai-gateway-service',
          ...params.metadata,
        }),
      });
      try {
        const output = await fn();
        span.update({ output });
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        span.update({ level: 'ERROR', statusMessage: message });
        throw err;
      }
    },
    { asType: 'span' }
  );
}

/** Nested span for agent steps (plan, executor, synthesis, query rewrite). */
export async function traceAgentStep<T>(
  name: string,
  input: unknown,
  metadata: TraceMetadata | undefined,
  fn: () => Promise<T>
): Promise<T> {
  if (!langfuseEnabled) return fn();

  return startActiveObservation(
    name,
    async (span) => {
      span.update({ input, ...spanAttrs(metadata) });
      try {
        const output = await fn();
        span.update({ output });
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        span.update({ level: 'ERROR', statusMessage: message });
        throw err;
      }
    },
    { asType: 'span' }
  );
}

/** Record an ADK / LLM step output without wrapping async work. */
export function recordAgentStepOutput(
  name: string,
  input: unknown,
  output: unknown,
  metadata?: TraceMetadata
): void {
  if (!langfuseEnabled) return;

  const obs = startObservation(name, { input, ...spanAttrs(metadata) }, { asType: 'span' });
  obs.update({ output }).end();
}

/** LLM generation observation (OpenAI / Gemini via custom LLM). */
export async function traceGeneration<T>(
  params: {
    name: string;
    model: string;
    input: unknown;
    metadata?: TraceMetadata;
  },
  fn: () => Promise<T>
): Promise<T> {
  if (!langfuseEnabled) return fn();

  return startActiveObservation(
    params.name,
    async (gen) => {
      gen.update({
        model: params.model,
        input: params.input,
        ...spanAttrs(params.metadata),
      });
      try {
        const output = await fn();
        gen.update({ output });
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        gen.update({ level: 'ERROR', statusMessage: message });
        throw err;
      }
    },
    { asType: 'generation' }
  );
}

/** Tool execution (knowledge_retrieval, sql, calculator). */
export async function traceToolCall<T>(
  toolName: string,
  input: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  if (!langfuseEnabled) return fn();

  return startActiveObservation(
    `tool.${toolName}`,
    async (tool) => {
      tool.update({ input: { tool: toolName, arguments: input } });
      try {
        const output = await fn();
        tool.update({ output });
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        tool.update({ level: 'ERROR', statusMessage: message });
        throw err;
      }
    },
    { asType: 'tool' }
  );
}

export async function flushLangfuseTraces(): Promise<void> {
  const { langfuseSpanProcessor } = await import('../instrumentation.js');
  if (langfuseSpanProcessor) {
    await langfuseSpanProcessor.forceFlush();
  }
}
