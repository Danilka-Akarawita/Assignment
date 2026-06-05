import 'dotenv/config';
import { configureShared } from '@ai-assistant/shared';
import app from './app.js';
import { logger } from './utils/logger.js';

configureShared({ logger });

const PORT = Number(process.env.PORT) || 3003;

const server = app.listen(PORT, () => {
  logger.info(`Tool execution service running on port ${PORT}`);
  logger.info('Press Ctrl+C to stop');
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error({ port: PORT }, 'Port already in use — stop the other instance first');
  } else {
    logger.error({ err }, 'Server failed to start');
  }
  process.exit(1);
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down tool execution service');
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  process.exit(1);
});
