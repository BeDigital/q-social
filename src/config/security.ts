import { CorsOptions } from 'cors';
import { HelmetOptions } from 'helmet';
import { CookieOptions } from 'express';
import { Request } from 'express';

export const securityConfig = {
  // TLS Configuration
  tls: {
    minVersion: 'TLSv1.3',
    cipherPreferences: [
      'TLS_AES_128_GCM_SHA256',
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256'
    ],
    certPath: process.env.TLS_CERT_PATH,
    keyPath: process.env.TLS_KEY_PATH,
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400, // 24 hours
  } as CorsOptions,

  // Helmet Security Headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  } as HelmetOptions,

  // Cookie Security
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? '.example.com' : undefined,
    path: '/',
  } as CookieOptions,

  // CSRF Protection
  csrf: {
    cookie: {
      key: '_csrf',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      httpOnly: true,
      path: '/',
      maxAge: 3600 // 1 hour
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    value: (req: Request) => (
      req.headers['x-csrf-token'] as string || 
      req.headers['x-xsrf-token'] as string || 
      req.body?._csrf as string
    ),
  },

  // Input Validation
  validation: {
    sanitize: true,
    stripTags: true,
    escape: true,
    normalizeEmail: true,
  },

  // File Upload Security
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
    ],
    scanForMalware: true,
    validateContentType: true,
  },

  // Authentication Security
  auth: {
    passwordMinLength: 12,
    passwordRequirements: {
      minLength: 12,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    jwtExpiry: '15m',
    refreshTokenExpiry: '7d',
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },
};
