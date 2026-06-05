import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

/** Augments Express Request — do not extend Request (breaks Express module augmentation). */
export interface AuthRequest {
  user?: AuthUser;
  authToken?: string;
}

export function authenticate(
  req: Request & AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !parts[1]) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = parts[1];
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ error: 'Auth secret not configured' });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as {
      sub: string;
      email: string;
      role: string;
    };
    req.user = {
      id: Number(decoded.sub),
      email: decoded.email,
      role: decoded.role,
    };
    req.authToken = token;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request & AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
