import { InMemoryRunner, isFinalResponse } from '@google/adk';
import { createUserContent } from '@google/genai';
import { agentWorkflow } from '../agents/workflow.agent.js';
import { planAgent } from '../agents/plan.agent.js';
import { synthesisAgent } from '../agents/synthesis.agent.js';
import { ADK_APP_NAME } from '../agents/config.js';
import { gatewayContext } from '../lib/request-context.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { parseAgentPlan } from '../types/agent-plan.js';
import { todoTracker } from './todo-tracker.service.js';

export interface RunAgentInput {
  userId: number;
  authToken: string;
  conversationId: number;
  agentRunId: number;
  userMessage: string;
  sessionId: string;
}

export interface RunAgentResult {
  finalResponse: string;
  plan: unknown;
  executionResults: unknown;
}

export class AgentOrchestratorService {
  private runner = new InMemoryRunner({
    agent: agentWorkflow,
    appName: ADK_APP_NAME,
  });

  async run(input: RunAgentInput): Promise<RunAgentResult> {
    const { userId, authToken, agentRunId, userMessage, sessionId } = input;

    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: { status: 'PLANNING' },
    });

    return gatewayContext.run(
      { userId, authToken, agentRunId },
      async () => {
        await this.runner.sessionService.createSession({
          appName: ADK_APP_NAME,
          userId: String(userId),
          sessionId,
          state: {
            user_id: userId,
            agent_run_id: agentRunId,
          },
        });

        let planRaw = '';
        let executionRaw = '';
        let finalResponse = '';

        const content = createUserContent(userMessage);

        for await (const event of this.runner.runAsync({
          userId: String(userId),
          sessionId,
          newMessage: content,
        })) {
          const author = event.author ?? 'unknown';

          if (event.errorMessage) {
            logger.warn({ author, error: event.errorMessage }, 'ADK agent step error');
          }

          if (isFinalResponse(event) && event.content?.parts?.length) {
            const text =
              event.content.parts
                .map((p) => ('text' in p && p.text ? p.text : ''))
                .join('')
                .trim() || '';

            if (author === planAgent.name) {
              planRaw = text;
              const plan = parseAgentPlan(text);
              if (plan) {
                await todoTracker.persistPlan(agentRunId, {
                  goal: plan.goal,
                  todos: plan.todos.map((todo) => ({
                    title: todo.title,
                    ...(todo.description !== undefined
                      ? { description: todo.description }
                      : {}),
                    ...(todo.toolHint !== undefined ? { toolHint: todo.toolHint } : {}),
                  })),
                });
              } else {
                logger.warn({ text: text.slice(0, 200) }, 'Failed to parse agent plan JSON');
              }
            } else if (author === 'TodoExecutorAgent') {
              executionRaw = text;
            } else if (author === synthesisAgent.name) {
              finalResponse = text;
            }
          }
        }

        if (!finalResponse) {
          const session = await this.runner.sessionService.getSession({
            appName: ADK_APP_NAME,
            userId: String(userId),
            sessionId,
          });
          const state = session?.state as Record<string, unknown> | undefined;
          finalResponse =
            (typeof state?.final_response === 'string' && state.final_response) ||
            executionRaw ||
            planRaw ||
            'I could not generate a response. Please try again.';
        }

        await prisma.agentRun.update({
          where: { id: agentRunId },
          data: {
            status: 'COMPLETED',
            finalResponse,
            ...(planRaw ? { plan: { raw: planRaw } } : {}),
            ...(executionRaw ? { executionLog: { raw: executionRaw } } : {}),
          },
        });

        return {
          finalResponse,
          plan: parseAgentPlan(planRaw) ?? planRaw,
          executionResults: executionRaw,
        };
      }
    );
  }
}
