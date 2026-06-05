import amqp from 'amqplib';
import type { Channel, ChannelModel } from 'amqplib';
import { CHAT_EXCHANGE, CHAT_REQUESTED_KEY, type ChatJobMessage } from './events.js';
import { getSharedLogger } from './logger.js';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let reconnectAttempts = 0;
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000;
let isConnecting = false;
let reconnectTimer: NodeJS.Timeout | null = null;
let consumerRestartHandler: (() => Promise<void>) | null = null;

export function setConsumerRestartHandler(handler: () => Promise<void>): void {
  consumerRestartHandler = handler;
}

function resetConnectionState(): void {
  channel = null;
  connection = null;
}

async function createConnection(): Promise<void> {
  const url = process.env.RABBITMQ_URL;
  if (!url) throw new Error('RABBITMQ_URL is not defined');

  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();

  connection = conn;
  channel = ch;
  reconnectAttempts = 0;
  getSharedLogger().info('RabbitMQ connected');

  ch.on('close', () => {
    getSharedLogger().warn('RabbitMQ channel closed');
    channel = null;
    scheduleReconnect();
  });

  ch.on('error', (err) => {
    getSharedLogger().error({ err }, 'RabbitMQ channel error');
  });

  conn.removeAllListeners();
  conn.on('error', (err) => {
    getSharedLogger().error({ err }, 'RabbitMQ connection error');
    resetConnectionState();
    scheduleReconnect();
  });
  conn.on('close', () => {
    getSharedLogger().warn('RabbitMQ connection closed');
    resetConnectionState();
    scheduleReconnect();
  });

  if (consumerRestartHandler) {
    await consumerRestartHandler();
  }
}

async function connect(): Promise<void> {
  if (isConnecting) return;
  if (channel) return;

  isConnecting = true;
  try {
    await createConnection();
  } catch (err) {
    getSharedLogger().error({ err, attempts: reconnectAttempts }, 'RabbitMQ connect failed');
    resetConnectionState();
    scheduleReconnect();
  } finally {
    isConnecting = false;
  }
}

function scheduleReconnect(): void {
  if (reconnectAttempts >= MAX_RETRIES) {
    getSharedLogger().error('Max RabbitMQ reconnect attempts reached');
    return;
  }
  reconnectAttempts++;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    void connect();
  }, RETRY_DELAY);
}

export async function initRabbitMQ(): Promise<void> {
  await connect();
}

export async function getChannel(): Promise<Channel> {
  if (!channel) {
    await connect();
  }
  if (!channel) {
    throw new Error(
      'RabbitMQ is not available. Start RabbitMQ (docker compose up -d rabbitmq) and restart the service.',
    );
  }
  return channel;
}

export async function closeRabbitMQ(): Promise<void> {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    getSharedLogger().warn({ err }, 'Error closing RabbitMQ');
  }
  resetConnectionState();
}

export async function publishEvent(
  exchange: string,
  routingKey: string,
  message: object,
): Promise<void> {
  try {
    const ch = await getChannel();
    await ch.assertExchange(exchange, 'topic', { durable: true });
    ch.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
    getSharedLogger().debug({ exchange, routingKey, message }, 'Event published');
  } catch (err) {
    getSharedLogger().error({ err, exchange, routingKey }, 'Failed to publish event');
    throw err;
  }
}

export async function publishChatJob(message: ChatJobMessage): Promise<void> {
  await publishEvent(CHAT_EXCHANGE, CHAT_REQUESTED_KEY, message);
  getSharedLogger().info(
    { agentRunId: message.agentRunId, conversationId: message.conversationId },
    'Chat agent job published',
  );
}

export async function startConsumer(
  queueName: string,
  routingKey: string,
  exchange: string,
  handler: (message: unknown) => Promise<void>,
): Promise<void> {
  const ch = await getChannel();
  await ch.assertExchange(exchange, 'topic', { durable: true });
  await ch.assertQueue(queueName, { durable: true });
  await ch.bindQueue(queueName, exchange, routingKey);
  await ch.prefetch(1);

  void ch.consume(queueName, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString()) as unknown;
      await handler(payload);
      ch.ack(msg);
    } catch (err) {
      getSharedLogger().error({ err, queueName }, 'Consumer handler failed');
      ch.nack(msg, false, false);
    }
  });

  getSharedLogger().info({ queueName, exchange, routingKey }, 'RabbitMQ consumer started');
}
