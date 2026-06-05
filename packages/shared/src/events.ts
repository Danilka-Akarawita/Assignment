export const DOCUMENT_EXCHANGE = 'document.events';
export const DOCUMENT_UPLOADED_KEY = 'document.uploaded';
export const INGESTION_QUEUE = 'knowledge.ingestion';

export const CHAT_EXCHANGE = 'chat.events';
export const CHAT_REQUESTED_KEY = 'chat.requested';
export const GATEWAY_AGENT_QUEUE = 'gateway.agent';

export const USER_EXCHANGE = 'user.events';
export const USER_REGISTERED_KEY = 'user.registered';

export interface ChatJobMessage {
  conversationId: number;
  messageId: number;
  agentRunId: number;
  userId: number;
  authToken: string;
  content: string;
  timestamp: string;
}
