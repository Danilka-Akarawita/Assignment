export { configureShared, getSharedLogger, type SharedLogger } from './logger.js';
export { authenticate, requireRole, type AuthRequest, type AuthUser } from './auth.js';
export {
  initRabbitMQ,
  getChannel,
  closeRabbitMQ,
  setConsumerRestartHandler,
  publishEvent,
  publishChatJob,
  startConsumer,
} from './rabbitmq.js';
export {
  DOCUMENT_EXCHANGE,
  DOCUMENT_UPLOADED_KEY,
  INGESTION_QUEUE,
  CHAT_EXCHANGE,
  CHAT_REQUESTED_KEY,
  GATEWAY_AGENT_QUEUE,
  USER_EXCHANGE,
  USER_REGISTERED_KEY,
  type ChatJobMessage,
} from './events.js';
