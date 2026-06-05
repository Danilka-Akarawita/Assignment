import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  createConversationSchema,
  sendMessageSchema,
  updateConversationSchema,
} from '../schemas/chat.schema.js';
import { ChatService } from '../services/chat.service.js';
import { FeedbackService } from '../services/feedback.service.js';
import { logger } from '../utils/logger.js';

const chatService = new ChatService();
const feedbackService = new FeedbackService();

export const createConversation = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const body = createConversationSchema.parse(req.body ?? {});
    const conversation = await chatService.createConversation(req.user.id, body.title);
    res.status(201).json({ conversation });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.issues });
    }
    logger.error({ err }, 'Create conversation failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listConversations = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const conversations = await chatService.listConversations(req.user.id);
  res.json({ conversations, total: conversations.length });
};

export const getConversation = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid conversation id' });

  const conversation = await chatService.getConversation(id, req.user.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const feedbackRows = await feedbackService.getFeedbackByConversation(req.user.id, id);
  const feedbackByMessageId = Object.fromEntries(
    feedbackRows.map((f) => [f.assistantMessageId, f.rating])
  );

  res.json({
    conversation: {
      ...conversation,
      messages: conversation.messages.map((m) => ({
        ...m,
        userFeedback:
          m.role === 'ASSISTANT' ? (feedbackByMessageId[m.id] ?? null) : undefined,
      })),
    },
  });
};

export const updateConversation = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid conversation id' });

    const body = updateConversationSchema.parse(req.body);
    const updated = await chatService.updateConversationTitle(id, req.user.id, body.title);
    if (!updated) return res.status(404).json({ error: 'Conversation not found' });
    res.json({ message: 'Conversation updated' });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteConversation = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid conversation id' });

  const deleted = await chatService.deleteConversation(id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ message: 'Conversation deleted' });
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.authToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversationId = parseInt(String(req.params.id), 10);
    if (Number.isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation id' });
    }

    const body = sendMessageSchema.parse(req.body);
    const result = await chatService.sendMessage({
      userId: req.user.id,
      authToken: req.authToken,
      conversationId,
      content: body.content,
      async: body.async,
    });

    if (result.status === 'queued') {
      return res.status(202).json({
        message: 'Agent job queued',
        ...result,
      });
    }

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.issues });
    }
    if (err instanceof Error && err.message === 'Conversation not found') {
      return res.status(404).json({ error: err.message });
    }
    logger.error({ err }, 'Send message failed');
    // In development, expose the real error so it's easier to diagnose
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Internal server error',
      ...(isDev && err instanceof Error ? { detail: err.message, stack: err.stack } : {}),
    });
  }
};

export const getAgentRun = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const agentRunId = parseInt(String(req.params.runId), 10);
  if (Number.isNaN(agentRunId)) {
    return res.status(400).json({ error: 'Invalid agent run id' });
  }

  const run = await chatService.getAgentRun(agentRunId, req.user.id);
  if (!run) return res.status(404).json({ error: 'Agent run not found' });
  res.json({ agentRun: run });
};
