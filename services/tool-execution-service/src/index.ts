import 'dotenv/config';
import { configureShared } from '@ai-assistant/shared';
import app from './app.js';
import { logger } from './utils/logger.js';

configureShared({ logger });

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  logger.info(`Tool execution service running on port ${PORT}`);
});
