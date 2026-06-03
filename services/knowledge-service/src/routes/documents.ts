import { Router } from 'express';
import {
  deleteDocument,
  getDocument,
  listDocuments,
  searchDocuments,
  updateDocumentMetadata,
  uploadDocument,
} from '../controllers/document.controller.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticate);

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', listDocuments);
router.post('/search', searchDocuments);
router.get('/:id', getDocument);
router.patch('/:id/metadata', updateDocumentMetadata);
router.delete('/:id', deleteDocument);

export default router;
