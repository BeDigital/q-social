import { randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/monitoring';

interface ErrorContext {
  requestId: string;
  timestamp: Date;
  userId?: number;
  path: string;
  method: string;
  correlationId: string;
  parentErrorId?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export class ErrorCorrelationService {
  private static readonly errorContexts = new Map<string, ErrorContext>();
  private static readonly ERROR_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Generate or use existing correlation ID
      const correlationId = req.headers['x-correlation-id'] as string || 
        this.generateCorrelationId();

      // Set correlation ID in response headers
      res.setHeader('x-correlation-id', correlationId);

      // Initialize error context
      const context: ErrorContext = {
        requestId: this.generateRequestId(),
        timestamp: new Date(),
        userId: req.user?.id,
        path: req.path,
        method: req.method,
        correlationId,
        tags: [],
        metadata: {}
      };

      // Store context
      this.errorContexts.set(correlationId, context);

      // Clean up old contexts periodically
      this.cleanupOldContexts();

      next();
    };
  }

  static trackError(error: Error, correlationId: string, additionalContext?: Partial<ErrorContext>) {
    const context = this.errorContexts.get(correlationId);
    
    if (!context) {
      logger.warn('No context found for correlation ID', { correlationId });
      return;
    }

    // Update context with additional information
    if (additionalContext) {
      Object.assign(context, additionalContext);
    }

    // Log error with context
    logger.error('Error occurred', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context
    });

    // Track in monitoring system
    this.trackInMonitoring(error, context);

    return context;
  }

  static correlateErrors(parentErrorId: string): string {
    const childCorrelationId = this.generateCorrelationId();
    const parentContext = this.errorContexts.get(parentErrorId);

    if (parentContext) {
      this.errorContexts.set(childCorrelationId, {
        ...this.createBaseContext(),
        parentErrorId,
        tags: [...parentContext.tags],
        metadata: { ...parentContext.metadata }
      });
    }

    return childCorrelationId;
  }

  static addErrorMetadata(correlationId: string, metadata: Record<string, any>) {
    const context = this.errorContexts.get(correlationId);
    if (context) {
      context.metadata = {
        ...context.metadata,
        ...metadata
      };
    }
  }

  static addErrorTags(correlationId: string, tags: string[]) {
    const context = this.errorContexts.get(correlationId);
    if (context) {
      context.tags = [...new Set([...context.tags, ...tags])];
    }
  }

  static getErrorChain(correlationId: string): ErrorContext[] {
    const chain: ErrorContext[] = [];
    let currentId = correlationId;

    while (currentId) {
      const context = this.errorContexts.get(currentId);
      if (!context) break;

      chain.push(context);
      currentId = context.parentErrorId;
    }

    return chain;
  }

  private static generateCorrelationId(): string {
    return randomBytes(16).toString('hex');
  }

  private static generateRequestId(): string {
    return `req_${randomBytes(8).toString('hex')}`;
  }

  private static createBaseContext(): ErrorContext {
    return {
      requestId: this.generateRequestId(),
      timestamp: new Date(),
      path: '',
      method: '',
      correlationId: this.generateCorrelationId(),
      tags: [],
      metadata: {}
    };
  }

  private static cleanupOldContexts() {
    const now = Date.now();
    for (const [id, context] of this.errorContexts.entries()) {
      if (now - context.timestamp.getTime() > this.ERROR_RETENTION_MS) {
        this.errorContexts.delete(id);
      }
    }
  }

  private static trackInMonitoring(error: Error, context: ErrorContext) {
    // Track error patterns
    this.updateErrorPatterns(error, context);

    // Update error metrics
    this.updateErrorMetrics(error, context);

    // Check for critical conditions
    this.checkCriticalConditions(error, context);
  }

  private static updateErrorPatterns(error: Error, context: ErrorContext) {
    // Implement error pattern recognition
    const pattern = {
      errorType: error.name,
      path: context.path,
      method: context.method,
      timestamp: context.timestamp
    };

    // Store pattern for analysis
    // This could be implemented with a time-series database or analytics service
  }

  private static updateErrorMetrics(error: Error, context: ErrorContext) {
    // Update error count metrics
    metrics.counter('errors_total', 1, {
      type: error.name,
      path: context.path,
      method: context.method
    });

    // Update error rate metrics
    metrics.gauge('error_rate', this.calculateErrorRate(context.path));
  }

  private static calculateErrorRate(path: string): number {
    // Implement error rate calculation
    // This could be based on recent error history and request volume
    return 0;
  }

  private static checkCriticalConditions(error: Error, context: ErrorContext) {
    // Check for critical error conditions that require immediate attention
    const isCritical = this.isCriticalError(error, context);

    if (isCritical) {
      this.triggerCriticalAlert(error, context);
    }
  }

  private static isCriticalError(error: Error, context: ErrorContext): boolean {
    // Implement critical error detection logic
    return false;
  }

  private static triggerCriticalAlert(error: Error, context: ErrorContext) {
    // Implement critical alert notification
    logger.error('Critical error detected', {
      error,
      context,
      severity: 'CRITICAL'
    });
  }
}
