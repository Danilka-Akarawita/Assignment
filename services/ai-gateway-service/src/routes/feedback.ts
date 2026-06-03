import { Router } from 'express';
import { listFeedback, submitFeedback } from '../controllers/feedback.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/require-role.js';

const router = Router();
router.use(authenticate);

router.post('/', submitFeedback);
router.get('/', requireRole(['admin']), listFeedback);

export default router;
