import { getChannel } from './rabbitmq.js';
import { logger } from '../utils/logger.js';

export async function startConsumer(
  queue: string,
  routingKey: string,
  exchange: string,
  handler: (msg: unknown) => Promise<void>
): Promise<void> {
  const channel = await getChannel();
  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, routingKey);

  channel.prefetch(1);

  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const content = JSON.parse(msg.content.toString()) as unknown;
      await handler(content);
      channel.ack(msg);
    } catch (err) {
      logger.error({ err, content: msg.content.toString() }, 'Consumer error');
      channel.nack(msg, false, false);
    }
  });

  logger.info({ queue, exchange, routingKey }, 'Consumer started');
}
