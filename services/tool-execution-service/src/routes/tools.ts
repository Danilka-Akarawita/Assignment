import { Router } from 'express';
import {
  executeTool,
  getSqlSchema,
  listTools,
} from '../controllers/tool.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listTools);
router.get('/sql/schema', getSqlSchema);
router.post('/execute', executeTool);

export default router;
