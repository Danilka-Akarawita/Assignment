import { AgentRunStatus, TodoStatus } from '../generated/prisma/enums.js';
import { getGatewayContext } from '../lib/request-context.js';
import { prisma } from '../lib/prisma.js';

const STATUS_MAP: Record<string, TodoStatus> = {
  in_progress: TodoStatus.IN_PROGRESS,
  completed: TodoStatus.COMPLETED,
  failed: TodoStatus.FAILED,
  skipped: TodoStatus.SKIPPED,
};

export class TodoTracker {
  async persistPlan(
    agentRunId: number,
    plan: { goal: string; todos: Array<{ title: string; description?: string; toolHint?: string }> }
  ): Promise<void> {
    await prisma.agentTodo.deleteMany({ where: { agentRunId } });

    await prisma.$transaction(
      plan.todos.map((todo, index) =>
        prisma.agentTodo.create({
          data: {
            agentRunId,
            position: index + 1,
            title: todo.title,
            description: todo.description ?? null,
            toolHint: todo.toolHint ?? null,
            status: TodoStatus.PENDING,
          },
        })
      )
    );

    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: { plan: plan as object, status: AgentRunStatus.EXECUTING },
    });
  }

  async updateTodo(
    agentRunId: number,
    position: number,
    status: string,
    resultSummary?: string
  ): Promise<void> {
    const mapped = STATUS_MAP[status];
    if (!mapped) throw new Error(`Invalid todo status: ${status}`);

    await prisma.agentTodo.updateMany({
      where: { agentRunId, position },
      data: {
        status: mapped,
        ...(resultSummary ? { result: { summary: resultSummary } } : {}),
      },
    });
  }

  async updateFromContext(
    position: number,
    status: string,
    resultSummary?: string
  ): Promise<{ ok: boolean; error?: string }> {
    const ctx = getGatewayContext();
    if (!ctx.agentRunId) {
      return { ok: false, error: 'No active agent run' };
    }
    await this.updateTodo(ctx.agentRunId, position, status, resultSummary);
    return { ok: true };
  }
}

export const todoTracker = new TodoTracker();
