/**
 * OpenTelemetry + Langfuse — must be imported before other application modules.
 * @see https://langfuse.com/docs/observability/get-started
 */
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';

const langfuseEnabled =
  process.env.LANGFUSE_ENABLED !== 'false' &&
  Boolean(process.env.LANGFUSE_PUBLIC_KEY) &&
  Boolean(process.env.LANGFUSE_SECRET_KEY);

function langfuseProcessorParams() {
  const params: {
    publicKey: string;
    secretKey: string;
    baseUrl?: string;
    environment?: string;
  } = {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
    secretKey: process.env.LANGFUSE_SECRET_KEY!,
  };
  if (process.env.LANGFUSE_BASE_URL) {
    params.baseUrl = process.env.LANGFUSE_BASE_URL;
  }
  const env = process.env.LANGFUSE_TRACING_ENVIRONMENT ?? process.env.NODE_ENV;
  if (env) params.environment = env;
  return params;
}

export const langfuseSpanProcessor = langfuseEnabled
  ? new LangfuseSpanProcessor(langfuseProcessorParams())
  : null;

const otelSdk = langfuseSpanProcessor
  ? new NodeSDK({ spanProcessors: [langfuseSpanProcessor] })
  : null;

otelSdk?.start();

async function flushLangfuse() {
  if (langfuseSpanProcessor) {
    await langfuseSpanProcessor.forceFlush();
  }
}

for (const signal of ['SIGINT', 'SIGTERM', 'beforeExit'] as const) {
  process.on(signal, () => {
    void flushLangfuse();
  });
}

export { langfuseEnabled };
