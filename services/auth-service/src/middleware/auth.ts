import type {NextFunction, Request, Response } from 'express';

import { jwt } from '../lib/jwt.js';

export interface AuthRequest {
  user?: { id: number; email: string; role: string };
}

export const authenticate = (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || !tokenParts[1]) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = tokenParts[1];
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return res.status(500).json({ error: 'Auth secret not configured' });

  try {
    const decoded = jwt.verify(token, jwtSecret as string) as any;
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request & AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};