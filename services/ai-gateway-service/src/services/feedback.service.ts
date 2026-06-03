import { prisma } from '../lib/prisma.js';
import type { FeedbackRating } from '../generated/prisma/enums.js';

function toDbRating(rating: 'up' | 'down'): FeedbackRating {
  return rating === 'up' ? 'UP' : 'DOWN';
}

export class FeedbackService {
  async submitFeedback(params: {
    userId: number;
    conversationId: number;
    assistantMessageId: number;
    rating: 'up' | 'down';
  }) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: params.conversationId, userId: params.userId },
    });
    if (!conversation) return null;

    const assistantMessage = await prisma.message.findFirst({
      where: {
        id: params.assistantMessageId,
        conversationId: params.conversationId,
        role: 'ASSISTANT',
      },
    });
    if (!assistantMessage) return null;

    let userMessage = assistantMessage.agentRunId
      ? await prisma.message.findFirst({
          where: {
            conversationId: params.conversationId,
            role: 'USER',
            agentRunId: assistantMessage.agentRunId,
          },
          orderBy: { id: 'asc' },
        })
      : null;

    if (!userMessage) {
      userMessage = await prisma.message.findFirst({
        where: {
          conversationId: params.conversationId,
          role: 'USER',
          id: { lt: assistantMessage.id },
        },
        orderBy: { id: 'desc' },
      });
    }

    if (!userMessage) return null;

    return prisma.messageFeedback.upsert({
      where: {
        userId_assistantMessageId: {
          userId: params.userId,
          assistantMessageId: params.assistantMessageId,
        },
      },
      create: {
        userId: params.userId,
        conversationId: params.conversationId,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        userQuery: userMessage.content,
        assistantAnswer: assistantMessage.content,
        rating: toDbRating(params.rating),
      },
      update: {
        userQuery: userMessage.content,
        assistantAnswer: assistantMessage.content,
        rating: toDbRating(params.rating),
      },
    });
  }

  async listAllFeedback(params: { limit: number; offset: number }) {
    const [items, total] = await Promise.all([
      prisma.messageFeedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      }),
      prisma.messageFeedback.count(),
    ]);
    return { items, total };
  }

  async getFeedbackByConversation(userId: number, conversationId: number) {
    return prisma.messageFeedback.findMany({
      where: { userId, conversationId },
      select: { assistantMessageId: true, rating: true },
    });
  }
}
