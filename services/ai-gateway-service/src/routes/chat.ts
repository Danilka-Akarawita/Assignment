import { Router } from 'express';
import {
  createConversation,
  deleteConversation,
  getAgentRun,
  getConversation,
  listConversations,
  sendMessage,
  updateConversation,
} from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.js';
import { chatMessageLimiter, readLimiter, writeLimiter } from '../middleware/rate-limit.js';

const router = Router();
router.use(authenticate);

router.get('/agent-runs/:runId', readLimiter, getAgentRun);
router.post('/', writeLimiter, createConversation);
router.get('/', readLimiter, listConversations);
router.get('/:id', readLimiter, getConversation);
router.patch('/:id', writeLimiter, updateConversation);
router.delete('/:id', writeLimiter, deleteConversation);
router.post('/:id/messages', chatMessageLimiter, sendMessage);

export default router;
