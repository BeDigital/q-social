const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const { logger } = require('./monitoring');

// Initialize error tracking
const initErrorTracking = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Enable performance monitoring
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express(),
      new Sentry.Integrations.Postgres(),
    ],
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Configure error filtering
    beforeSend(event, hint) {
      // Don't send errors in development
      if (process.env.NODE_ENV === 'development') {
        return null;
      }

      // Filter out specific errors
      if (hint.originalException instanceof TypeError) {
        return null;
      }

      // Sanitize error data
      if (event.request && event.request.data) {
        // Remove sensitive data
        delete event.request.data.password;
        delete event.request.data.token;
        delete event.request.data.refreshToken;
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      return event;
    },

    // Configure breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Filter out specific breadcrumbs
      if (breadcrumb.category === 'http') {
        // Remove sensitive data from URLs
        breadcrumb.data.url = breadcrumb.data.url.replace(/token=[^&]+/, 'token=REDACTED');
      }

      return breadcrumb;
    },
  });
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  // Track error in Sentry
  Sentry.withScope(scope => {
    // Add additional context
    scope.setUser({
      id: req.user?.id,
      username: req.user?.username,
      ip_address: req.ip,
    });

    scope.setExtra('path', req.path);
    scope.setExtra('method', req.method);
    scope.setExtra('query', req.query);
    scope.setExtra('body', sanitizeRequestBody(req.body));

    // Set error level based on status code
    if (err.status >= 500) {
      scope.setLevel('error');
    } else if (err.status >= 400) {
      scope.setLevel('warning');
    }

    Sentry.captureException(err);
  });

  // Send error response
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal Server Error'
    : err.message;

  res.status(status).json({
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
};

// Sanitize request body for error tracking
const sanitizeRequestBody = (body) => {
  if (!body) return body;

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'token',
    'refreshToken',
    'authorization',
    'cookie',
    'sessionId',
    'credit_card',
    'ssn',
  ];

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      }
    }
    return obj;
  };

  return sanitizeObject(sanitized);
};

// Custom error classes
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Permission denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

module.exports = {
  initErrorTracking,
  errorHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
};
