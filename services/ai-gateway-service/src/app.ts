import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger.js';
import chatRoutes from './routes/chat.js';
import feedbackRoutes from './routes/feedback.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(pinoHttp({ logger }));

app.use('/conversations', chatRoutes);
app.use('/feedback', feedbackRoutes);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'ai-gateway-service' })
);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  }
);

export default app;
