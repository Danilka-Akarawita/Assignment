import { Router } from 'express';
import { listFeedback, submitFeedback } from '../controllers/feedback.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/require-role.js';
import { readLimiter, writeLimiter } from '../middleware/rate-limit.js';

const router = Router();
router.use(authenticate);

router.post('/', writeLimiter, submitFeedback);
router.get('/', readLimiter, requireRole(['admin']), listFeedback);

export default router;
