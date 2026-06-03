import multer from 'multer';

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '10', 10);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_MB };
