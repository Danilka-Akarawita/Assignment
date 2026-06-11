import { config } from '@/lib/config';
import type { AgentRun } from '@/lib/types';

const TERMINAL = new Set(['COMPLETED', 'FAILED']);

interface AgentRunWsPayload {
  type: string;
  agentRun?: AgentRun;
  error?: string;
}

export interface WatchAgentRunOptions {
  onUpdate: (agentRun: AgentRun) => void;
  onError: (message: string) => void;
}

export function watchAgentRun(
  accessToken: string,
  agentRunId: number,
  options: WatchAgentRunOptions
): Promise<AgentRun> {
  const { onUpdate, onError } = options;

  return new Promise((resolve, reject) => {
    const url = `${config.wsUrl}?token=${encodeURIComponent(accessToken)}`;
    const ws = new WebSocket(url);
    let settled = false;

    const finish = (run: AgentRun) => {
      if (settled) return;
      settled = true;
      ws.close();
      resolve(run);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      ws.close();
      onError(message);
      reject(new Error(message));
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', agentRunId }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as AgentRunWsPayload;

        if (payload.type === 'error') {
          fail(payload.error ?? 'WebSocket error');
          return;
        }

        if (!payload.agentRun) return;

        onUpdate(payload.agentRun);

        if (TERMINAL.has(payload.agentRun.status)) {
          finish(payload.agentRun);
        }
      } catch {
        fail('Invalid WebSocket message');
      }
    };

    ws.onerror = () => {
      fail('WebSocket connection failed');
    };

    ws.onclose = () => {
      if (!settled) {
        fail('WebSocket closed before agent run completed');
      }
    };
  });
}
