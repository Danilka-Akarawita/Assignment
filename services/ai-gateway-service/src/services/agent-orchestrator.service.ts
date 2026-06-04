import { InMemoryRunner, isFinalResponse } from '@google/adk';
import { createUserContent } from '@google/genai';
import { agentWorkflow } from '../agents/workflow.agent.js';
import { planAgent } from '../agents/plan.agent.js';
import { queryRewriterAgent } from '../agents/query-rewriter.agent.js';
import { synthesisAgent } from '../agents/synthesis.agent.js';
import { ADK_APP_NAME } from '../agents/config.js';
import { buildQueryRewriteUserPrompt } from '../prompts/index.js';
import {
  parseAgentJson,
  parseAgentPlan,
  type AgentPlan,
  type ExecutionResults,
  type QueryRewrite,
  type SynthesisOutput,
} from '../types/agent-plan.js';
import { recordAgentStepOutput, traceAgentStep } from '../lib/langfuse.js';
import { gatewayContext } from '../lib/request-context.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { buildKnowledgeCatalogForAgent } from '../lib/knowledge-catalog.js';
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
  plan: AgentPlan | unknown;
  executionResults: ExecutionResults | unknown;
}

export interface ResolveUserMessageInput {
  userId: number;
  sessionId: string;
  userMessage: string;
  previousSummary: string;
  history: Array<{ role: string; content: string }>;
}

export interface ResolveUserMessageResult {
  resolvedQuery: string;
  historySummary: string;
}

export class AgentOrchestratorService {
  private runner = new InMemoryRunner({
    agent: agentWorkflow,
    appName: ADK_APP_NAME,
  });

  private queryRewriterRunner = new InMemoryRunner({
    agent: queryRewriterAgent,
    appName: ADK_APP_NAME,
  });

  async resolveUserMessage(input: ResolveUserMessageInput): Promise<ResolveUserMessageResult> {
    return traceAgentStep(
      'agent.query-rewrite',
      { userMessage: input.userMessage, historyLength: input.history.length },
      { userId: input.userId, sessionId: input.sessionId },
      () => this.resolveUserMessageInner(input)
    );
  }

  private async resolveUserMessageInner(
    input: ResolveUserMessageInput
  ): Promise<ResolveUserMessageResult> {
    const { userId, sessionId, userMessage, previousSummary, history } = input;

    await this.queryRewriterRunner.sessionService.createSession({
      appName: ADK_APP_NAME,
      userId: String(userId),
      sessionId,
      state: {
        user_id: userId,
        step: 'resolve_query',
      },
    });

    const historyText = history
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');

    const prompt = buildQueryRewriteUserPrompt({
      previousSummary,
      historyText,
      userMessage,
    });

    const content = createUserContent(prompt);
    let rewrittenText = '';

    for await (const event of this.queryRewriterRunner.runAsync({
      userId: String(userId),
      sessionId,
      newMessage: content,
    })) {
      if (event.errorMessage) {
        logger.warn({ error: event.errorMessage }, 'Query rewriting step error');
      }

      if (isFinalResponse(event) && event.content?.parts?.length) {
        rewrittenText = event.content.parts
          .map((part) => ('text' in part && part.text ? part.text : ''))
          .join('')
          .trim();
      }
    }

    const parsed = rewrittenText ? parseAgentJson<QueryRewrite>(rewrittenText) : null;
    const result = {
      resolvedQuery:
        typeof parsed?.resolvedQuery === 'string' && parsed.resolvedQuery.trim()
          ? parsed.resolvedQuery.trim()
          : userMessage,
      historySummary:
        typeof parsed?.historySummary === 'string' && parsed.historySummary.trim()
          ? parsed.historySummary.trim()
          : previousSummary,
    };

    recordAgentStepOutput(
      'agent.query-rewrite.result',
      { userMessage },
      result,
      { userId, sessionId }
    );
    return result;
  }

  async run(input: RunAgentInput): Promise<RunAgentResult> {
    return traceAgentStep(
      'agent.workflow',
      { userMessage: input.userMessage },
      {
        userId: input.userId,
        conversationId: input.conversationId,
        agentRunId: input.agentRunId,
        sessionId: input.sessionId,
      },
      () => this.runInner(input)
    );
  }

  private async runInner(input: RunAgentInput): Promise<RunAgentResult> {
    const { userId, authToken, agentRunId, userMessage, sessionId } = input;

    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: { status: 'PLANNING' },
    });

    return gatewayContext.run(
      { userId, authToken, agentRunId },
      async () => {
        const userKnowledgeCatalog = await buildKnowledgeCatalogForAgent(authToken);

        const emptyPlan = JSON.stringify({
          goal: 'Pending',
          todos: [
            {
              position: 1,
              title: 'Search knowledge base',
              description: userMessage,
              toolHint: 'knowledge_retrieval',
            },
          ],
        });
        const emptyExecution = JSON.stringify({
          completedTodos: 0,
          failedTodos: 0,
          findings: [],
          structuredData: {},
        });

        await this.runner.sessionService.createSession({
          appName: ADK_APP_NAME,
          userId: String(userId),
          sessionId,
          state: {
            user_id: userId,
            agent_run_id: agentRunId,
            user_query: userMessage,
            user_knowledge_catalog: userKnowledgeCatalog,
            agent_plan: emptyPlan,
            execution_results: emptyExecution,
          },
        });

        let plan: AgentPlan | null = null;
        let executionResults: ExecutionResults | unknown = null;
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
              recordAgentStepOutput(
                'agent.step.plan',
                { userMessage },
                { textPreview: text.slice(0, 500) },
                { agentRunId, author }
              );
              plan = parseAgentPlan(text);
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
              executionResults = parseAgentJson<ExecutionResults>(text) ?? text;
              recordAgentStepOutput(
                'agent.step.executor',
                { userMessage },
                { textPreview: text.slice(0, 500) },
                { agentRunId, author }
              );
            } else if (author === synthesisAgent.name) {
              const synthesis = parseAgentJson<SynthesisOutput>(text);
              finalResponse =
                typeof synthesis?.answer === 'string' && synthesis.answer.trim()
                  ? synthesis.answer.trim()
                  : text;
              recordAgentStepOutput(
                'agent.step.synthesis',
                { userMessage },
                { textPreview: finalResponse.slice(0, 500) },
                { agentRunId, author }
              );
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
          const stateFinal = state?.final_response;
          if (typeof stateFinal === 'string') {
            const synthesis = parseAgentJson<SynthesisOutput>(stateFinal);
            finalResponse = synthesis?.answer?.trim() || stateFinal;
          } else {
            finalResponse =
              executionRaw ||
              planRaw ||
              'I could not generate a response. Please try again.';
          }
        }

        await prisma.agentRun.update({
          where: { id: agentRunId },
          data: {
            status: 'COMPLETED',
            finalResponse,
            ...(planRaw ? { plan: plan ? (plan as object) : { raw: planRaw } } : {}),
            ...(executionRaw
              ? {
                  executionLog:
                    executionResults && typeof executionResults === 'object'
                      ? (executionResults as object)
                      : { raw: executionRaw },
                }
              : {}),
          },
        });

        return {
          finalResponse,
          plan: plan ?? planRaw,
          executionResults: executionResults ?? executionRaw,
        };
      }
    );
  }
}
