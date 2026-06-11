import { prisma } from '../lib/prisma.js';
import { flushLangfuseTraces, traceAgentPipeline } from '../lib/langfuse.js';
import { logger } from '../utils/logger.js';
import { publishChatJob } from '../lib/rabbitmq.publisher.js';
import { notifyAgentRunChanged } from './agent-run-events.service.js';
import { AgentOrchestratorService } from './agent-orchestrator.service.js';
import { ConversationService } from './conversation.service.js';

export interface SendMessageInput {
  userId: number;
  authToken: string;
  conversationId: number;
  content: string;
  async?: boolean;
}

export interface SendMessageResult {
  conversationId: number;
  userMessageId: number;
  agentRunId: number;
  status: 'completed' | 'queued';
  assistantMessage?: { id: number; content: string };
  agentRun?: {
    id: number;
    status: string;
    plan?: unknown;
    todos?: unknown[];
  };
}

export class ChatService {
  private conversations = new ConversationService();
  private orchestrator = new AgentOrchestratorService();

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const conversation = await prisma.conversation.findFirst({
      where: { id: input.conversationId, userId: input.userId },
    });
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const agentRun = await prisma.agentRun.create({
      data: {
        conversationId: input.conversationId,
        userId: input.userId,
        userQuery: input.content,
        status: 'PENDING',
      },
    });

    const userMessage = await prisma.message.create({
      data: {
        conversationId: input.conversationId,
        role: 'USER',
        content: input.content,
        agentRunId: agentRun.id,
      },
    });

    await prisma.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    });

    if (input.async) {
      await publishChatJob({
        conversationId: input.conversationId,
        messageId: userMessage.id,
        agentRunId: agentRun.id,
        userId: input.userId,
        authToken: input.authToken,
        content: input.content,
        timestamp: new Date().toISOString(),
      });

      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: { status: 'PLANNING' },
      });

      await notifyAgentRunChanged(agentRun.id);

      return {
        conversationId: input.conversationId,
        userMessageId: userMessage.id,
        agentRunId: agentRun.id,
        status: 'queued',
      };
    }

    return this.runAgentPipeline({
      userId: input.userId,
      authToken: input.authToken,
      conversationId: input.conversationId,
      userMessageId: userMessage.id,
      agentRunId: agentRun.id,
      content: input.content,
    });
  }

  async runAgentPipeline(params: {
    userId: number;
    authToken: string;
    conversationId: number;
    userMessageId: number;
    agentRunId: number;
    content: string;
  }): Promise<SendMessageResult> {
    try {
      return await traceAgentPipeline(
        {
          name: 'chat.agent-pipeline',
          userId: params.userId,
          conversationId: params.conversationId,
          agentRunId: params.agentRunId,
          input: { userMessage: params.content },
        },
        () => this.runAgentPipelineInner(params)
      );
    } finally {
      await flushLangfuseTraces();
    }
  }

  private async runAgentPipelineInner(params: {
    userId: number;
    authToken: string;
    conversationId: number;
    userMessageId: number;
    agentRunId: number;
    content: string;
  }): Promise<SendMessageResult> {
    const sessionId = `conv-${params.conversationId}-run-${params.agentRunId}`;

    const { resolvedQuery, historySummary, priorHistory } =
      await this.orchestrator.resolveUserMessage({
        userId: params.userId,
        conversationId: params.conversationId,
        userMessageId: params.userMessageId,
        sessionId: `${sessionId}-rewrite`,
        userMessage: params.content,
      });

    try {
      const result = await this.orchestrator.run({
        userId: params.userId,
        authToken: params.authToken,
        conversationId: params.conversationId,
        agentRunId: params.agentRunId,
        userMessage: resolvedQuery,
        sessionId,
      });

      const assistantMessage = await prisma.message.create({
        data: {
          conversationId: params.conversationId,
          role: 'ASSISTANT',
          content: result.finalResponse,
          agentRunId: params.agentRunId,
          metadata: JSON.parse(
            JSON.stringify({
              plan: result.plan,
              executionResults: result.executionResults,
            })
          ),
        },
      });

      const updatedHistory = [
        ...priorHistory,
        { role: 'USER', content: params.content },
        { role: 'ASSISTANT', content: assistantMessage.content },
      ].slice(-10);

      await prisma.conversation.update({
        where: { id: params.conversationId },
        data: {
          historySummary,
          recentHistory: updatedHistory,
          updatedAt: new Date(),
        },
      });

      const run = await prisma.agentRun.findUnique({
        where: { id: params.agentRunId },
        include: { todos: { orderBy: { position: 'asc' } } },
      });

      const response: SendMessageResult = {
        conversationId: params.conversationId,
        userMessageId: params.userMessageId,
        agentRunId: params.agentRunId,
        status: 'completed',
        assistantMessage: {
          id: assistantMessage.id,
          content: assistantMessage.content,
        },
      };
      if (run) {
        response.agentRun = {
          id: run.id,
          status: run.status,
          plan: run.plan,
          todos: run.todos,
        };
      }
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent run failed';
      logger.error({ err, agentRunId: params.agentRunId }, 'Agent pipeline failed');

      await prisma.agentRun.update({
        where: { id: params.agentRunId },
        data: { status: 'FAILED', errorMessage: message },
      });

      await notifyAgentRunChanged(params.agentRunId, 'run.failed');

      await prisma.message.create({
        data: {
          conversationId: params.conversationId,
          role: 'ASSISTANT',
          content: `Sorry, something went wrong: ${message}`,
          agentRunId: params.agentRunId,
        },
      });

      throw err;
    }
  }

  async getAgentRun(agentRunId: number, userId: number) {
    return prisma.agentRun.findFirst({
      where: { id: agentRunId, userId },
      include: { todos: { orderBy: { position: 'asc' } } },
    });
  }

  createConversation(userId: number, title?: string) {
    return this.conversations.create(userId, title);
  }

  listConversations(userId: number) {
    return this.conversations.listByUser(userId);
  }

  getConversation(conversationId: number, userId: number) {
    return this.conversations.getById(conversationId, userId);
  }

  updateConversationTitle(conversationId: number, userId: number, title: string) {
    return this.conversations.updateTitle(conversationId, userId, title);
  }

  deleteConversation(conversationId: number, userId: number) {
    return this.conversations.delete(conversationId, userId);
  }
}
