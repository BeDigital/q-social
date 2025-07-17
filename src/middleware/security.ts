import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { expressCspHeader, INLINE, SELF } from 'express-csp-header';
import { securityConfig } from '../config/security';

export class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  private tokens: Map<string, number>;

  private constructor() {
    this.tokens = new Map<string, number>();
  }

  static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  // TLS Enforcement
  static requireTLS(req: Request, res: Response, next: NextFunction) {
    if (!req.secure && process.env.NODE_ENV === 'production') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  }

  // Security Headers (Helmet)
  static securityHeaders() {
    return helmet(securityConfig.helmet);
  }

  // CORS
  static cors() {
    return cors(securityConfig.cors);
  }

  // Rate Limiting
  static rateLimit() {
    return rateLimit({
      windowMs: 15 * 1000, // 15 seconds for testing
      max: process.env.NODE_ENV === 'test' ? 10 : 100, // Lower limit for tests
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many requests, please try again later.',
          retryAfter: Math.ceil(15) // 15 seconds
        });
      },
      skip: (request: Request) => {
        return request.path === '/health' || 
               (process.env.NODE_ENV === 'test' && request.path === '/api/test');
      }
    });
  }

  // CSRF Protection
  static csrf() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip CSRF for GET requests and test endpoints in test mode
      if (req.method === 'GET') {
        return next();
      }

      const token = req.headers['x-csrf-token'] || 
                   req.headers['x-xsrf-token'] || 
                   req.body._csrf;

      if (!token) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      const instance = SecurityMiddleware.getInstance();
      const timestamp = instance.tokens.get(token as string);
      const now = Date.now();

      // Check if token exists and hasn't expired
      if (!timestamp || (now - timestamp > (process.env.NODE_ENV === 'test' ? 1000 : 3600000))) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      next();
    };
  }

  // CSRF Token Helper
  static csrfToken(req: Request, res: Response, next: NextFunction) {
    const instance = SecurityMiddleware.getInstance();
    const token = Math.random().toString(36).substring(2);
    instance.tokens.set(token, Date.now());

    // Clean up expired tokens
    const now = Date.now();
    const expiryTime = process.env.NODE_ENV === 'test' ? 1000 : 3600000;
    for (const [key, timestamp] of instance.tokens.entries()) {
      if (now - timestamp > expiryTime) {
        instance.tokens.delete(key);
      }
    }

    res.cookie('XSRF-TOKEN', token, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      httpOnly: false,
      maxAge: expiryTime
    });

    next();
  }

  // Content Security Policy
  static csp() {
    return expressCspHeader({
      directives: {
        'default-src': [SELF],
        'script-src': [SELF, INLINE],
        'style-src': [SELF, INLINE],
        'img-src': [SELF, 'data:', 'https:'],
        'connect-src': [SELF, 'wss:', 'https:'],
        'font-src': [SELF],
        'object-src': ['none'],
        'media-src': [SELF],
        'frame-src': ['none'],
      },
    });
  }

  // Input Validation & Sanitization
  static validateInput(req: Request, res: Response, next: NextFunction) {
    if (req.body) {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          // Sanitize string inputs
          req.body[key] = SecurityMiddleware.sanitizeInput(req.body[key]);
        }
      }
    }
    next();
  }

  private static sanitizeInput(input: string): string {
    if (securityConfig.validation.stripTags) {
      input = input.replace(/<[^>]*>/g, '');
    }
    if (securityConfig.validation.escape) {
      input = input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    return input;
  }

  // File Upload Validation
  static validateFileUpload(req: Request & { files?: any[] }, res: Response, next: NextFunction) {
    if (!req.files) return next();

    const files = Array.isArray(req.files) ? req.files : [req.files];

    for (const file of files) {
      // Check file size
      if (file.size > securityConfig.upload.maxSize) {
        return res.status(400).json({
          error: 'File too large',
          maxSize: securityConfig.upload.maxSize,
        });
      }

      // Check file type
      if (!securityConfig.upload.allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Invalid file type',
          allowedTypes: securityConfig.upload.allowedMimes,
        });
      }

      // Validate content type matches extension
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
      const expectedMimeType = SecurityMiddleware.getMimeTypeForExtension(fileExtension);
      if (expectedMimeType && file.mimetype !== expectedMimeType) {
        return res.status(400).json({
          error: 'File type does not match extension',
        });
      }
    }

    next();
  }

  private static getMimeTypeForExtension(extension?: string): string | null {
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
    };
    return extension ? mimeTypes[extension] || null : null;
  }

  // Error Handler
  static errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    if (err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({
        error: 'Invalid CSRF token',
      });
    }

    console.error('Security Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    });
  }

  // Session Management
  static clearSession(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['x-csrf-token'] as string;
    if (token) {
      const instance = SecurityMiddleware.getInstance();
      instance.tokens.delete(token);
    }
    res.clearCookie('XSRF-TOKEN');
    next();
  }

  // Apply all security middleware
  static applyAll(app: any) {
    // Initialize singleton instance
    SecurityMiddleware.getInstance();

    // Basic security headers first
    app.use(this.requireTLS);
    app.use(this.securityHeaders());
    
    // CORS must be before CSRF
    app.use(this.cors());
    
    // Body parsing middleware must be before CSRF
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Test endpoint for getting CSRF token
    if (process.env.NODE_ENV === 'test') {
      app.get('/api/test', this.csrfToken, (req, res) => {
        res.json({ message: 'GET request successful' });
      });
    }
    
    // CSRF protection
    app.use(this.csrfToken);
    app.use(this.csrf());
    
    // Additional security measures
    app.use(this.rateLimit());
    app.use(this.csp());
    app.use(this.validateInput);
    app.use('/api/upload', this.validateFileUpload);
    
    // Session cleanup for logout
    app.post('/api/auth/logout', this.clearSession);
    
    // Error handling last
    app.use(this.errorHandler);
  }
}
