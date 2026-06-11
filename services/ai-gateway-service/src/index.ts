import 'dotenv/config';
import { createServer } from 'http';
import { configureShared } from '@ai-assistant/shared';
import './instrumentation.js';
import app from './app.js';
import { startAgentJobConsumer } from './consumers/agent-job.consumer.js';
import { initRabbitMQ } from './lib/rabbitmq.js';
import { logger } from './utils/logger.js';
import { attachAgentRunWebSocket } from './ws/agent-run-ws.js';

configureShared({ logger });

const PORT = process.env.PORT || 3004;

async function start() {
  try {
    await initRabbitMQ();
    await startAgentJobConsumer();

    const server = createServer(app);
    attachAgentRunWebSocket(server);

    server.listen(PORT, () => {
      logger.info(`AI Gateway service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start AI Gateway service');
    process.exit(1);
  }
}

start();
