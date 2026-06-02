import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Example protected route
router.get('/me', authenticate, (req, res) => {
  res.json({ user: (req as any).user });
});

// Admin only route
router.get('/admin', authenticate, requireRole(['admin']), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

export default router;