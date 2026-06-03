import { startConsumer } from '../lib/rabbitmq.consumer.js';
import {
  CHAT_EXCHANGE,
  CHAT_REQUESTED_KEY,
  GATEWAY_AGENT_QUEUE,
  type ChatJobMessage,
} from '../lib/rabbitmq.publisher.js';
import { ChatService } from '../services/chat.service.js';
import { logger } from '../utils/logger.js';

const chatService = new ChatService();

function isChatJobMessage(value: unknown): value is ChatJobMessage {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.conversationId === 'number' &&
    typeof o.messageId === 'number' &&
    typeof o.agentRunId === 'number' &&
    typeof o.userId === 'number' &&
    typeof o.authToken === 'string' &&
    typeof o.content === 'string'
  );
}

export async function startAgentJobConsumer(): Promise<void> {
  await startConsumer(GATEWAY_AGENT_QUEUE, CHAT_REQUESTED_KEY, CHAT_EXCHANGE, async (raw) => {
    if (!isChatJobMessage(raw)) {
      logger.warn({ raw }, 'Invalid chat job message');
      return;
    }

    logger.info({ agentRunId: raw.agentRunId }, 'Processing async agent job');

    await chatService.runAgentPipeline({
      userId: raw.userId,
      authToken: raw.authToken,
      conversationId: raw.conversationId,
      userMessageId: raw.messageId,
      agentRunId: raw.agentRunId,
      content: raw.content,
    });
  });
}
