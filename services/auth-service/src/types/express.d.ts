import { AuthRequest as CustomAuthRequest } from '../middleware/auth.js';

declare global {
  namespace Express {
    interface Request extends CustomAuthRequest {}
  }
}