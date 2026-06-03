import { getChannel } from './rabbitmq.js';
import { logger } from '../utils/logger.js';

export const CHAT_EXCHANGE = 'chat.events';
export const CHAT_REQUESTED_KEY = 'chat.requested';
export const GATEWAY_AGENT_QUEUE = 'gateway.agent';

export interface ChatJobMessage {
  conversationId: number;
  messageId: number;
  agentRunId: number;
  userId: number;
  authToken: string;
  content: string;
  timestamp: string;
}

export async function publishChatJob(message: ChatJobMessage): Promise<void> {
  const channel = await getChannel();
  await channel.assertExchange(CHAT_EXCHANGE, 'topic', { durable: true });
  channel.publish(CHAT_EXCHANGE, CHAT_REQUESTED_KEY, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
  logger.info(
    { agentRunId: message.agentRunId, conversationId: message.conversationId },
    'Chat agent job published'
  );
}
