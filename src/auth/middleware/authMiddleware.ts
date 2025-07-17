import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/tokenService';
import { RateLimiter } from './rateLimiter';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        email: string;
      };
    }
  }
}

export class AuthMiddleware {
  private static readonly loginLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
  });

  static authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ message: 'No authorization header' });
      }

      const token = TokenService.extractTokenFromHeader(authHeader);
      const payload = TokenService.verifyToken(token);

      req.user = payload;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
  };

  static limitLoginAttempts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.loginLimiter.checkRateLimit(req, res);
      next();
    } catch (error) {
      res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
    }
  };

  static requireRole = (role: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Implement role checking logic here
      // For now, we'll just pass through
      next();
    };
  };
}
