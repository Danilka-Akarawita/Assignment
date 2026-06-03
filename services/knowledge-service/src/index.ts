import app from './app.js';
import { startIngestionConsumer } from './consumers/ingestion.consumer.js';
import { initRabbitMQ } from './lib/rabbitmq.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3002;

async function start() {
  try {
    await initRabbitMQ();
    await startIngestionConsumer();

    app.listen(PORT, () => {
      logger.info(`Knowledge service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start knowledge service');
    process.exit(1);
  }
}

start();
