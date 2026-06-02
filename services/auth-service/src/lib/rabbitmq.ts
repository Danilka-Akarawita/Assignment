import amqp from "amqplib";
import type { ChannelModel, Channel, ConsumeMessage } from "amqplib";
import { logger } from "../utils/logger.js";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

let reconnectAttempts = 0;
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000;

let isConnecting = false;
let reconnectTimer: NodeJS.Timeout | null = null;

async function createConnection(): Promise<void> {
  const url = process.env.RABBITMQ_URL;

  if (!url) {
    throw new Error("RABBITMQ_URL is not defined");
  }

  connection = await amqp.connect(url);
  channel = await connection.createChannel();

  logger.info(" RabbitMQ connected");

  // cleanup old listeners to avoid duplicates
  connection.removeAllListeners();

  connection.on("error", (err) => {
    logger.error({ err }, "RabbitMQ connection error");
    scheduleReconnect();
  });

  connection.on("close", () => {
    logger.warn("RabbitMQ connection closed");
    scheduleReconnect();
  });

  reconnectAttempts = 0;
}

async function connect(): Promise<void> {
  if (isConnecting) return;
  isConnecting = true;

  try {
    await createConnection();
  } catch (err) {
    logger.error(
      { err, attempts: reconnectAttempts },
      "RabbitMQ connect failed"
    );
    scheduleReconnect();
  } finally {
    isConnecting = false;
  }
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RETRIES) {
    logger.error("Max RabbitMQ reconnect attempts reached");
    return;
  }

  reconnectAttempts++;

  if (reconnectTimer) clearTimeout(reconnectTimer);

  reconnectTimer = setTimeout(() => {
    connect();
  }, RETRY_DELAY);
}

export async function initRabbitMQ() {
  await connect();
}

export async function getChannel(): Promise<Channel> {
  if (!channel) {
    throw new Error("RabbitMQ channel not ready");
  }
  return channel;
}

export async function closeRabbitMQ() {
  if (reconnectTimer) clearTimeout(reconnectTimer);

  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    logger.warn({ err }, "Error closing RabbitMQ");
  }

  channel = null;
  connection = null;

  logger.info("RabbitMQ closed");
}