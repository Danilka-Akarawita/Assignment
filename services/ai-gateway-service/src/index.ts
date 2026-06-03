import 'dotenv/config';
import app from './app.js';
import { startAgentJobConsumer } from './consumers/agent-job.consumer.js';
import { initRabbitMQ } from './lib/rabbitmq.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3004;

async function start() {
  try {
    await initRabbitMQ();
    await startAgentJobConsumer();

    app.listen(PORT, () => {
      logger.info(`AI Gateway service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start AI Gateway service');
    process.exit(1);
  }
}

start();
