import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { formatPrismaError, isPrismaError } from '../lib/prisma-errors.js';
import { ZodError } from 'zod';

const authService = new AuthService();

function handleError(res: Response, err: unknown, statusForAppError: number) {
  if (err instanceof ZodError) {
    res.status(400).json({ errors: err.issues });
    return;
  }
  if (isPrismaError(err)) {
    res.status(503).json({ error: formatPrismaError(err) });
    return;
  }
  if (err instanceof Error) {
    res.status(statusForAppError).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
}

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const tokens = await authService.register(data);
    res.status(201).json(tokens);
  } catch (err) {
    handleError(res, err, 400);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const tokens = await authService.login(data);
    res.json(tokens);
  } catch (err) {
    handleError(res, err, 401);
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const tokens = await authService.refresh(refreshToken);
    res.json(tokens);
  } catch (err) {
    handleError(res, err, 401);
  }
};
