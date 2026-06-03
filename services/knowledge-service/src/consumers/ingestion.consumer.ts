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
  logger.info(
    {
      queue: INGESTION_QUEUE,
      exchange: DOCUMENT_EXCHANGE,
      routingKey: DOCUMENT_UPLOADED_KEY,
    },
    'Starting ingestion consumer'
  );

  await startConsumer(
    INGESTION_QUEUE,
    DOCUMENT_UPLOADED_KEY,
    DOCUMENT_EXCHANGE,
    async (message: unknown) => {
      logger.info(
        { rawMessage: message },
        'Ingestion consumer received message'
      );

      try {
        if (!isIngestionMessage(message)) {
          logger.warn({ message }, 'Invalid ingestion message format');
          return;
        }

        logger.info(
          { documentId: message.documentId },
          'Valid ingestion message received'
        );

        logger.info(
          { documentId: message.documentId },
          'Calling ingestionService.processDocument'
        );

        await ingestionService.processDocument(message.documentId);

        logger.info(
          { documentId: message.documentId },
          'Document ingestion completed successfully'
        );
      } catch (error) {
        logger.error(
          {
            error,
            message,
          },
          'Error during ingestion processing'
        );
        throw error;
      }
    }
  );

  logger.info('Ingestion consumer started successfully');
}