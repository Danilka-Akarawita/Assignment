import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { searchSchema, updateMetadataSchema } from '../schemas/document.schema.js';
import { DocumentService } from '../services/document.service.js';
import { SearchService } from '../services/search.service.js';
import { logger } from '../utils/logger.js';

const documentService = new DocumentService();
const searchService = new SearchService();
type AuthedRequest = Request & AuthRequest;

export const uploadDocument = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const document = await documentService.upload({
      userId: req.user.id,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
    });

    res.status(202).json({
      message: 'Document uploaded and queued for processing',
      document,
    });
  } catch (err) {
    logger.error({ err }, 'Document upload failed');
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const listDocuments = async (req: AuthedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const documents = await documentService.listByUser(req.user.id);
  res.json({ documents, total: documents.length });
};

export const getDocument = async (req: AuthedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const documentId = parseInt(String(req.params.id), 10);
  if (Number.isNaN(documentId)) {
    return res.status(400).json({ error: 'Invalid document id' });
  }

  const document = await documentService.getById(documentId, req.user.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });

  res.json({ document });
};

export const deleteDocument = async (req: AuthedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const documentId = parseInt(String(req.params.id), 10);
  if (Number.isNaN(documentId)) {
    return res.status(400).json({ error: 'Invalid document id' });
  }

  const deleted = await documentService.delete(documentId, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'Document not found' });

  res.json({ message: 'Document deleted' });
};

export const updateDocumentMetadata = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const documentId = parseInt(String(req.params.id), 10);
    if (Number.isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document id' });
    }

    const parsed = updateMetadataSchema.parse(req.body);
    const updateData: { title?: string; tags?: string[] } = {};
    if (parsed.title !== undefined) updateData.title = parsed.title;
    if (parsed.tags !== undefined) updateData.tags = parsed.tags;

    const document = await documentService.updateMetadata(documentId, req.user.id, updateData);

    if (!document) return res.status(404).json({ error: 'Document not found' });

    res.json({ document });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ errors: err.issues });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const searchDocuments = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const input = searchSchema.parse(req.body);
    const searchInput: Parameters<SearchService['search']>[0] = {
      query: input.query,
      userId: req.user.id,
      limit: input.limit,
      minSimilarity: input.minSimilarity,
      useMetadataExtraction: input.useMetadataExtraction,
    };
    if (input.documentId !== undefined) searchInput.documentId = input.documentId;

    const results = await searchService.search(searchInput);

    res.json(results);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ errors: err.issues });
    } else if (err instanceof Error) {
      logger.error({ err }, 'Search failed');
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
