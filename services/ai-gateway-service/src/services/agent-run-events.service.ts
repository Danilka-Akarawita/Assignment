import { prisma } from '../lib/prisma.js';
import {
  agentRunHub,
  type AgentRunWsEvent,
  type AgentRunWsEventType,
} from '../ws/agent-run-hub.js';

function eventTypeForStatus(status: string): AgentRunWsEventType {
  if (status === 'COMPLETED') return 'run.completed';
  if (status === 'FAILED') return 'run.failed';
  return 'run.updated';
}

export async function notifyAgentRunChanged(
  agentRunId: number,
  type?: AgentRunWsEventType
): Promise<void> {
  const run = await prisma.agentRun.findUnique({
    where: { id: agentRunId },
    include: { todos: { orderBy: { position: 'asc' } } },
  });
  if (!run) return;

  const event: AgentRunWsEvent = {
    type: type ?? eventTypeForStatus(run.status),
    agentRun: run,
  };

  agentRunHub.publish(agentRunId, event);
}
