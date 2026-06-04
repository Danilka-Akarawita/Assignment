import amqp from 'amqplib';
import type { ChannelModel, Channel } from 'amqplib';
import { logger } from '../utils/logger.js';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let reconnectAttempts = 0;
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000;
let isConnecting = false;
let reconnectTimer: NodeJS.Timeout | null = null;

let consumerRestartHandler: (() => Promise<void>) | null = null;

/** Called after a new channel is created (initial connect + reconnect). */
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
  logger.info('RabbitMQ connected');

  ch.on('close', () => {
    logger.warn('RabbitMQ channel closed');
    channel = null;
    scheduleReconnect();
  });

  ch.on('error', (err) => {
    logger.error({ err }, 'RabbitMQ channel error');
  });

  conn.removeAllListeners();
  conn.on('error', (err) => {
    logger.error({ err }, 'RabbitMQ connection error');
    resetConnectionState();
    scheduleReconnect();
  });
  conn.on('close', () => {
    logger.warn('RabbitMQ connection closed');
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
    logger.error({ err, attempts: reconnectAttempts }, 'RabbitMQ connect failed');
    resetConnectionState();
    scheduleReconnect();
  } finally {
    isConnecting = false;
  }
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RETRIES) {
    logger.error('Max RabbitMQ reconnect attempts reached');
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

/**
 * Returns a live channel, reconnecting if the previous one was closed.
 */
export async function getChannel(): Promise<Channel> {
  if (!channel) {
    await connect();
  }
  if (!channel) {
    throw new Error(
      'RabbitMQ is not available. Start RabbitMQ (docker compose up -d rabbitmq) and restart ai-gateway-service.',
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
    logger.warn({ err }, 'Error closing RabbitMQ');
  }
  resetConnectionState();
}
