import 'dotenv/config';
import { createServer } from 'http';
import { configureShared } from '@ai-assistant/shared';
import app from './app.js';
import {
  agentRunWsHttpFallback,
  attachAgentRunWebSocketProxy,
} from './middleware/ws-gateway-proxy.js';
import { logger } from './utils/logger.js';
import { initRabbitMQ } from './lib/rabbitmq.js';

configureShared({ logger });

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initRabbitMQ();

    app.get('/conversations/ws', agentRunWsHttpFallback());

    const server = createServer(app);
    attachAgentRunWebSocketProxy(server);

    server.listen(PORT, () => {
      logger.info(`Auth service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start auth service');
    process.exit(1);
  }
}

start();