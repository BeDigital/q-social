import { ErrorCorrelationService } from '../errorCorrelationService';
import { Request, Response } from 'express';
import { logger } from '../../config/monitoring';

jest.mock('../../config/monitoring');

describe('ErrorCorrelationService', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      path: '/test',
      method: 'GET',
      user: { id: 1 },
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('middleware', () => {
    it('should add correlation ID to response headers', () => {
      // Arrange
      const middleware = ErrorCorrelationService.middleware();

      // Act
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'x-correlation-id',
        expect.any(String)
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing correlation ID from headers', () => {
      // Arrange
      const existingCorrelationId = 'test-correlation-id';
      mockRequest.headers['x-correlation-id'] = existingCorrelationId;
      const middleware = ErrorCorrelationService.middleware();

      // Act
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'x-correlation-id',
        existingCorrelationId
      );
    });
  });

  describe('trackError', () => {
    it('should track error with context', () => {
      // Arrange
      const error = new Error('Test error');
      const correlationId = 'test-correlation-id';
      const context = {
        requestId: 'test-request',
        path: '/test',
        method: 'GET',
      };

      // Act
      ErrorCorrelationService.trackError(error, correlationId, context);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          error: expect.objectContaining({
            message: error.message,
            stack: error.stack,
          }),
          context: expect.objectContaining(context),
        })
      );
    });

    it('should handle missing context', () => {
      // Arrange
      const error = new Error('Test error');
      const correlationId = 'invalid-id';

      // Act
      ErrorCorrelationService.trackError(error, correlationId);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        'No context found for correlation ID',
        expect.any(Object)
      );
    });
  });

  describe('correlateErrors', () => {
    it('should create child error correlation', () => {
      // Arrange
      const parentId = 'parent-correlation-id';
      const parentContext = {
        tags: ['test-tag'],
        metadata: { key: 'value' },
      };

      // Act
      const childId = ErrorCorrelationService.correlateErrors(parentId);

      // Assert
      expect(childId).toBeTruthy();
      const context = ErrorCorrelationService['errorContexts'].get(childId);
      expect(context).toBeTruthy();
      expect(context?.parentErrorId).toBe(parentId);
    });
  });

  describe('addErrorMetadata', () => {
    it('should add metadata to error context', () => {
      // Arrange
      const correlationId = 'test-correlation-id';
      const metadata = { key: 'value' };

      // Act
      ErrorCorrelationService.addErrorMetadata(correlationId, metadata);

      // Assert
      const context = ErrorCorrelationService['errorContexts'].get(correlationId);
      expect(context?.metadata).toEqual(expect.objectContaining(metadata));
    });
  });

  describe('addErrorTags', () => {
    it('should add unique tags to error context', () => {
      // Arrange
      const correlationId = 'test-correlation-id';
      const tags = ['tag1', 'tag2'];

      // Act
      ErrorCorrelationService.addErrorTags(correlationId, tags);

      // Assert
      const context = ErrorCorrelationService['errorContexts'].get(correlationId);
      expect(context?.tags).toEqual(expect.arrayContaining(tags));
    });

    it('should not add duplicate tags', () => {
      // Arrange
      const correlationId = 'test-correlation-id';
      const initialTags = ['tag1'];
      const newTags = ['tag1', 'tag2'];

      // Act
      ErrorCorrelationService.addErrorTags(correlationId, initialTags);
      ErrorCorrelationService.addErrorTags(correlationId, newTags);

      // Assert
      const context = ErrorCorrelationService['errorContexts'].get(correlationId);
      expect(context?.tags).toHaveLength(2);
      expect(context?.tags).toEqual(expect.arrayContaining(['tag1', 'tag2']));
    });
  });

  describe('getErrorChain', () => {
    it('should return complete error chain', () => {
      // Arrange
      const rootId = 'root-correlation-id';
      const childId = ErrorCorrelationService.correlateErrors(rootId);
      const grandchildId = ErrorCorrelationService.correlateErrors(childId);

      // Act
      const chain = ErrorCorrelationService.getErrorChain(grandchildId);

      // Assert
      expect(chain).toHaveLength(3);
      expect(chain[0].correlationId).toBe(grandchildId);
      expect(chain[1].correlationId).toBe(childId);
      expect(chain[2].correlationId).toBe(rootId);
    });

    it('should handle broken chains', () => {
      // Arrange
      const correlationId = 'test-correlation-id';
      const context = {
        parentErrorId: 'non-existent-id',
        correlationId,
      };
      ErrorCorrelationService['errorContexts'].set(correlationId, context as any);

      // Act
      const chain = ErrorCorrelationService.getErrorChain(correlationId);

      // Assert
      expect(chain).toHaveLength(1);
      expect(chain[0].correlationId).toBe(correlationId);
    });
  });

  describe('error pattern detection', () => {
    it('should track error patterns', () => {
      // Arrange
      const error = new Error('Test error');
      const correlationId = 'test-correlation-id';
      const context = {
        path: '/test',
        method: 'GET',
      };

      // Act
      ErrorCorrelationService.trackError(error, correlationId, context);

      // Assert
      expect(metrics.counter).toHaveBeenCalledWith(
        'errors_total',
        1,
        expect.objectContaining({
          type: error.name,
          path: context.path,
          method: context.method,
        })
      );
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should clean up old error contexts', () => {
      // Arrange
      const oldContext = {
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours old
      };
      const newContext = {
        timestamp: new Date(),
      };
      ErrorCorrelationService['errorContexts'].set('old-id', oldContext as any);
      ErrorCorrelationService['errorContexts'].set('new-id', newContext as any);

      // Act
      ErrorCorrelationService['cleanupOldContexts']();

      // Assert
      expect(ErrorCorrelationService['errorContexts'].has('old-id')).toBe(false);
      expect(ErrorCorrelationService['errorContexts'].has('new-id')).toBe(true);
    });
  });
});
