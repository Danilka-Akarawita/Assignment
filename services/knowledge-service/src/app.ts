import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger.js';
import documentRoutes from './routes/documents.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(pinoHttp({ logger }));

app.use('/documents', documentRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'knowledge-service' }));

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error({ err }, 'Unhandled error');
    if (err.message.includes('Unsupported file type')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message.includes('File too large')) {
      return res.status(413).json({ error: 'File too large' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
);

export default app;
