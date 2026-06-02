import { getChannel } from './rabbitmq.js';
import { logger } from '../utils/logger.js';

export async function startConsumer(
  queue: string,
  routingKey: string,
  exchange: string,
  handler: (msg: any) => Promise<void>
): Promise<void> {
  const channel = await getChannel();
  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, routingKey);

  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const content = JSON.parse(msg.content.toString());
      await handler(content);
      channel.ack(msg);
    } catch (err) {
      logger.error({ err, content: msg.content.toString() }, 'Consumer error');
      channel.nack(msg, false, false);
    }
  });

  logger.info(`Consumer started on queue ${queue}`);
}