import { TestServer, startServer, stopServer } from '../utils/server';
import { BackupVerificationService } from '../../src/services/backupVerificationService';
import { ErrorCorrelationService } from '../../src/services/errorCorrelationService';

describe('Security and Reliability Performance Tests', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = await startServer();
  });

  afterAll(async () => {
    await stopServer(testServer);
  });

  describe('WAF Performance', () => {
    it('should handle high rate of requests efficiently', async () => {
      const startTime = Date.now();
      const requests = 1000;
      const concurrentRequests = 100;
      
      // Create array of promises for concurrent requests
      const promises = Array(concurrentRequests).fill(0).map(() => 
        fetch(`${testServer.url}/api/test`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );

      // Execute concurrent requests
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Calculate metrics
      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / requests;

      // Assertions
      expect(averageResponseTime).toBeLessThan(100); // Less than 100ms average
      expect(responses.every(r => r.status === 200)).toBe(true);
    }, 30000);

    it('should maintain performance with geographic restrictions', async () => {
      const startTime = Date.now();
      const requests = 100;

      // Test requests with different geographic origins
      const origins = ['US', 'GB', 'EU', 'CN'];
      const promises = origins.flatMap(origin => 
        Array(requests).fill(0).map(() => 
          fetch(`${testServer.url}/api/test`, {
            method: 'GET',
            headers: {
              'X-Origin-Country': origin,
              'Content-Type': 'application/json'
            }
          })
        )
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Calculate metrics
      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / (requests * origins.length);

      // Assertions
      expect(averageResponseTime).toBeLessThan(50); // Less than 50ms average
      expect(responses.filter(r => r.status === 403).length).toBeGreaterThan(0); // Some requests should be blocked
    }, 30000);
  });

  describe('Authentication Performance', () => {
    it('should handle concurrent login attempts efficiently', async () => {
      const startTime = Date.now();
      const loginAttempts = 100;

      const promises = Array(loginAttempts).fill(0).map((_, index) => 
        fetch(`${testServer.url}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: `test${index}@example.com`,
            password: 'testPassword123!'
          })
        })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Calculate metrics
      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / loginAttempts;

      // Assertions
      expect(averageResponseTime).toBeLessThan(200); // Less than 200ms average
      expect(responses.every(r => r.status === 401 || r.status === 200)).toBe(true);
    }, 30000);
  });

  describe('Error Handling Performance', () => {
    it('should handle errors efficiently under load', async () => {
      const errorService = new ErrorCorrelationService();
      const startTime = Date.now();
      const errorRequests = 100;

      // Generate errors concurrently
      const promises = Array(errorRequests).fill(0).map((_, index) => 
        errorService.processError({
          type: 'SecurityError',
          message: `Test error ${index}`,
          timestamp: new Date(),
          severity: 'high'
        })
      );

      await Promise.all(promises);
      const endTime = Date.now();

      // Calculate metrics
      const processingTime = endTime - startTime;
      const averageProcessingTime = processingTime / errorRequests;

      // Assertions
      expect(averageProcessingTime).toBeLessThan(10); // Less than 10ms per error
    });
  });

  describe('Backup Verification Performance', () => {
    it('should verify backups efficiently', async () => {
      const backupService = new BackupVerificationService();
      const startTime = Date.now();
      const backupSize = 1000000; // 1MB

      const verificationResult = await backupService.verifyBackup({
        id: 'test-backup',
        size: backupSize,
        timestamp: new Date(),
        checksum: 'test-checksum'
      });

      const endTime = Date.now();
      const verificationTime = endTime - startTime;

      // Assertions
      expect(verificationResult.verified).toBe(true);
      expect(verificationTime).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limiting efficiently', async () => {
      const startTime = Date.now();
      const requests = 200; // Exceed rate limit
      const rateLimitWindow = 15000; // 15 seconds

      const promises = Array(requests).fill(0).map(() => 
        fetch(`${testServer.url}/api/test`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Calculate metrics
      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / requests;
      const rateLimitedResponses = responses.filter(r => r.status === 429).length;

      // Assertions
      expect(averageResponseTime).toBeLessThan(50); // Less than 50ms average
      expect(rateLimitedResponses).toBeGreaterThan(0); // Some requests should be rate limited
      expect(totalTime).toBeLessThan(rateLimitWindow); // Should complete within rate limit window
    }, 30000);
  });
});
