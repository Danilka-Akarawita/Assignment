import { prisma } from '../lib/prisma.js';

export class ConversationService {
  async create(userId: number, title?: string) {
    return prisma.conversation.create({
      data: {
        userId,
        title: title ?? 'New conversation',
      },
    });
  }

  async listByUser(userId: number) {
    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async getById(conversationId: number, userId: number) {
    return prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        agentRuns: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { todos: { orderBy: { position: 'asc' } } },
        },
      },
    });
  }

  async updateTitle(conversationId: number, userId: number, title: string) {
    const result = await prisma.conversation.updateMany({
      where: { id: conversationId, userId },
      data: { title },
    });
    return result.count > 0;
  }

  async delete(conversationId: number, userId: number) {
    const result = await prisma.conversation.deleteMany({
      where: { id: conversationId, userId },
    });
    return result.count > 0;
  }
}
