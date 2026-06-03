import { startConsumer } from '../lib/rabbitmq.consumer.js';
import {
  DOCUMENT_EXCHANGE,
  DOCUMENT_UPLOADED_KEY,
  INGESTION_QUEUE,
} from '../lib/rabbitmq.publisher.js';
import type { IngestionMessage } from '../schemas/document.schema.js';
import { IngestionService } from '../services/ingestion.service.js';
import { logger } from '../utils/logger.js';

const ingestionService = new IngestionService();

function isIngestionMessage(value: unknown): value is IngestionMessage {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.documentId === 'number';
}

export async function startIngestionConsumer(): Promise<void> {
  await startConsumer(
    INGESTION_QUEUE,
    DOCUMENT_UPLOADED_KEY,
    DOCUMENT_EXCHANGE,
    async (message: unknown) => {
      if (!isIngestionMessage(message)) {
        logger.warn({ message }, 'Invalid ingestion message');
        return;
      }

      logger.info({ documentId: message.documentId }, 'Processing document ingestion');
      await ingestionService.processDocument(message.documentId);
    }
  );
}
