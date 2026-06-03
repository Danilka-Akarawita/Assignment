import 'dotenv/config';
import app from './app.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  logger.info(`Tool execution service running on port ${PORT}`);
});
