import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false';

function rateLimitHandler(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ error: message });
  };
}

/** Polling + reads — allow frequent GETs while a chat run is in progress */
export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_READ_MAX ?? '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !rateLimitEnabled,
  handler: rateLimitHandler('Too many requests. Please wait a moment and try again.'),
});

/** Sending messages — stricter cap */
export const chatMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_CHAT_MAX ?? '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !rateLimitEnabled,
  handler: rateLimitHandler('Too many messages sent. Please wait a minute before trying again.'),
});

/** Other writes (create conversation, feedback) */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_WRITE_MAX ?? '60', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !rateLimitEnabled,
  handler: rateLimitHandler('Too many requests. Please wait a moment and try again.'),
});
