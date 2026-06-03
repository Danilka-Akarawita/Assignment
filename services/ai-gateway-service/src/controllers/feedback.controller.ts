import type { Response } from 'express';
import { ZodError } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import {
  listFeedbackSchema,
  submitFeedbackSchema,
} from '../schemas/feedback.schema.js';
import { FeedbackService } from '../services/feedback.service.js';
import { logger } from '../utils/logger.js';

const feedbackService = new FeedbackService();

export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const body = submitFeedbackSchema.parse(req.body);
    const feedback = await feedbackService.submitFeedback({
      userId: req.user.id,
      conversationId: body.conversationId,
      assistantMessageId: body.assistantMessageId,
      rating: body.rating,
    });

    if (!feedback) {
      return res.status(404).json({ error: 'Message or conversation not found' });
    }

    res.status(201).json({
      feedback: {
        id: feedback.id,
        assistantMessageId: feedback.assistantMessageId,
        rating: feedback.rating,
        createdAt: feedback.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.issues });
    }
    logger.error({ err }, 'Submit feedback failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const query = listFeedbackSchema.parse(req.query);
    const { items, total } = await feedbackService.listAllFeedback({
      limit: query.limit,
      offset: query.offset,
    });

    res.json({
      feedback: items.map((f) => ({
        id: f.id,
        userId: f.userId,
        conversationId: f.conversationId,
        userMessageId: f.userMessageId,
        assistantMessageId: f.assistantMessageId,
        userQuery: f.userQuery,
        assistantAnswer: f.assistantAnswer,
        rating: f.rating,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.issues });
    }
    logger.error({ err }, 'List feedback failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};
