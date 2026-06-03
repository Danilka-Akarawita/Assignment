import { prisma } from '../lib/prisma.js';
import {
  DOCUMENT_EXCHANGE,
  DOCUMENT_UPLOADED_KEY,
  publishEvent,
} from '../lib/rabbitmq.publisher.js';
import { logger } from '../utils/logger.js';
import { TextExtractionService } from './text-extraction.service.js';

export class DocumentService {
  private textExtraction = new TextExtractionService();

  async upload(params: {
    userId: number;
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }) {
    const { userId, filename, mimeType, buffer } = params;

    const text = await this.textExtraction.extract(buffer, mimeType);

    const document = await prisma.document.create({
      data: {
        userId,
        filename,
        mimeType,
        fileSizeBytes: buffer.length,
        sourceText: text,
        status: 'PENDING',
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        fileSizeBytes: true,
        status: true,
        createdAt: true,
      },
    });

    await publishEvent(DOCUMENT_EXCHANGE, DOCUMENT_UPLOADED_KEY, {
      documentId: document.id,
      userId,
      filename,
      timestamp: new Date().toISOString(),
    });

    logger.info({ documentId: document.id, userId, filename }, 'Document uploaded');

    return document;
  }

  async listByUser(userId: number) {
    return prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        title: true,
        summary: true,
        tags: true,
        mimeType: true,
        fileSizeBytes: true,
        status: true,
        chunkCount: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getById(documentId: number, userId: number) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: {
            id: true,
            chunkIndex: true,
            chunkText: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });

    if (!document) return null;
    return document;
  }

  async delete(documentId: number, userId: number): Promise<boolean> {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true },
    });

    if (!existing) return false;

    await prisma.document.delete({ where: { id: documentId } });

    logger.info({ documentId, userId }, 'Document deleted');
    return true;
  }

  async updateMetadata(
    documentId: number,
    userId: number,
    data: { title?: string; tags?: string[] }
  ) {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true },
    });

    if (!existing) return null;

    return prisma.document.update({
      where: { id: documentId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.tags !== undefined && { tags: data.tags }),
      },
      select: {
        id: true,
        filename: true,
        title: true,
        tags: true,
        updatedAt: true,
      },
    });
  }
}
