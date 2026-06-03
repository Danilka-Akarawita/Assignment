import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
  authToken?: string;
}

export const authenticate = (
  req: Request & AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !parts[1]) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return res.status(500).json({ error: 'Auth secret not configured' });

  try {
    const decoded = jwt.verify(parts[1], jwtSecret) as {
      sub: string;
      email: string;
      role: string;
    };
    req.user = {
      id: Number(decoded.sub),
      email: decoded.email,
      role: decoded.role,
    };
    req.authToken = parts[1];
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
