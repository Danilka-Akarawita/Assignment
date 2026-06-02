import { getChannel } from './rabbitmq.js';
import { logger } from '../utils/logger.js';

export async function publishEvent(
  exchange: string,
  routingKey: string,
  message: object
): Promise<void> {
  try {
    const channel = await getChannel();
    await channel.assertExchange(exchange, 'topic', { durable: true });
    const buffer = Buffer.from(JSON.stringify(message));
    channel.publish(exchange, routingKey, buffer, { persistent: true });
    logger.debug({ exchange, routingKey, message }, 'Event published');
  } catch (err) {
    logger.error({ err, exchange, routingKey }, 'Failed to publish event');
    throw err;
  }
}