import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { ZodError } from 'zod';

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const tokens = await authService.register(data);
    res.status(201).json(tokens);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ errors: err.issues });
    } else if (err instanceof Error) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const tokens = await authService.login(data);
    res.json(tokens);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ errors: err.issues });
    } else if (err instanceof Error) {
      res.status(401).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const tokens = await authService.refresh(refreshToken);
    res.json(tokens);
  } catch (err) {
    const error = err as Error;
    res.status(401).json({ error: error.message });
  }
};