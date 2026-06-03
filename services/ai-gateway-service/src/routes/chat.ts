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

const router = Router();
router.use(authenticate);

router.get('/agent-runs/:runId', getAgentRun);
router.post('/', createConversation);
router.get('/', listConversations);
router.get('/:id', getConversation);
router.patch('/:id', updateConversation);
router.delete('/:id', deleteConversation);
router.post('/:id/messages', sendMessage);

export default router;
