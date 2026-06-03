import { AsyncLocalStorage } from 'node:async_hooks';

export interface GatewayRequestContext {
  userId: number;
  authToken: string;
  agentRunId?: number;
}

export const gatewayContext = new AsyncLocalStorage<GatewayRequestContext>();

export function getGatewayContext(): GatewayRequestContext {
  const ctx = gatewayContext.getStore();
  if (!ctx) {
    throw new Error('Gateway request context is not available');
  }
  return ctx;
}
