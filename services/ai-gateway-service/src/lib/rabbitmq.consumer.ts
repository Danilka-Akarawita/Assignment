import { getChannel } from './rabbitmq.js';
import { logger } from '../utils/logger.js';

export async function startConsumer(
  queueName: string,
  routingKey: string,
  exchange: string,
  handler: (message: unknown) => Promise<void>
): Promise<void> {
  const channel = await getChannel();
  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queueName, { durable: true });
  await channel.bindQueue(queueName, exchange, routingKey);
  await channel.prefetch(1);

  void channel.consume(queueName, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString()) as unknown;
      await handler(payload);
      channel.ack(msg);
    } catch (err) {
      logger.error({ err, queueName }, 'Consumer handler failed');
      channel.nack(msg, false, false);
    }
  });

  logger.info({ queueName, exchange, routingKey }, 'RabbitMQ consumer started');
}
