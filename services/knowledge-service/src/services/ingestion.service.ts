import { prisma } from '../lib/prisma.js';
import { setChunkEmbedding } from '../lib/vector.js';
import type { Prisma } from '../generated/prisma/client.js';
import { logger } from '../utils/logger.js';
import { ChunkingService } from './chunking.service.js';
import { EmbeddingService } from './embedding.service.js';
import { MetadataService } from './metadata.service.js';

export class IngestionService {
  private chunking = new ChunkingService();
  private embedding = new EmbeddingService();
  private metadata = new MetadataService();

  async processDocument(documentId: number): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      logger.warn({ documentId }, 'Document not found for ingestion');
      return;
    }

    if (!document.sourceText?.trim()) {
      await this.markFailed(documentId, 'No source text available for processing');
      return;
    }
    logger.info({ documentId, userId: document.userId }, 'Starting ingestion for document');
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    try {
      const text = document.sourceText;
      const chunks = this.chunking.chunk(text);

      if (chunks.length === 0) {
        await this.markFailed(documentId, 'Document produced no chunks');
        return;
      }

      const docMeta = await this.metadata.generateDocumentSummary(text, document.filename);
      const chunkMetaMap = await this.metadata.generateForChunks(
        chunks.map((c) => ({ index: c.index, text: c.text })),
        document.filename
      );

      await prisma.documentChunk.deleteMany({ where: { documentId } });

      const createdChunks = await Promise.all(
        chunks.map((chunk) =>
          prisma.documentChunk.create({
            data: {
              documentId,
              chunkIndex: chunk.index,
              chunkText: chunk.text,
              metadata: (chunkMetaMap.get(chunk.index) ?? {
                summary: chunk.text.slice(0, 120),
                topics: docMeta.tags,
                keywords: [],
              }) as unknown as Prisma.InputJsonValue,
            },
          })
        )
      );

      const embeddings = await this.embedding.embedTexts(chunks.map((c) => c.text));

      await Promise.all(
        createdChunks.map((chunk, i) => {
          const embedding = embeddings[i];
          if (!embedding) throw new Error(`Missing embedding for chunk ${chunk.id}`);
          return setChunkEmbedding(chunk.id, embedding);
        })
      );

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'COMPLETED',
          title: docMeta.title,
          summary: docMeta.summary,
          tags: docMeta.tags,
          chunkCount: chunks.length,
          sourceText: null,
          errorMessage: null,
        },
      });

      logger.info(
        { documentId, chunkCount: chunks.length, userId: document.userId },
        'Document ingestion completed'
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown ingestion error';
      logger.error({ err, documentId }, 'Document ingestion failed');
      await this.markFailed(documentId, message);
      throw err;
    }
  }

  private async markFailed(documentId: number, message: string): Promise<void> {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        errorMessage: message,
        sourceText: null,
      },
    });
  }
}
