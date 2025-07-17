import autocannon from 'autocannon';
import { SecretRotationService } from '../../src/services/secretRotationService';
import { BackupVerificationService } from '../../src/services/backupVerificationService';
import { ErrorCorrelationService } from '../../src/services/errorCorrelationService';
import { startServer, stopServer } from '../utils/server';
import { createTestData, cleanupTestData } from '../utils/testData';

describe('Security and Reliability Performance Tests', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = await startServer();
    baseUrl = `http://localhost:${server.port}`;
    await createTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await stopServer(server);
  });

  describe('Secret Rotation Performance', () => {
    it('should handle concurrent token validations during rotation', async () => {
      // Setup test tokens
      const tokens = await Promise.all(
        Array(1000).fill(0).map(() => SecretRotationService.generateToken())
      );

      // Start token validation
      const validationPromise = autocannon({
        url: `${baseUrl}/api/verify-token`,
        connections: 100,
        duration: 10,
        headers: {
          'content-type': 'application/json',
        },
        requests: [
          {
            method: 'POST',
            body: JSON.stringify({ token: tokens[0] }),
          },
        ],
      });

      // Trigger secret rotation during validation
      setTimeout(async () => {
        await SecretRotationService.rotateSecret('JWT_SECRET');
      }, 2000);

      const results = await validationPromise;

      expect(results.errors).toBe(0);
      expect(results.timeouts).toBe(0);
      expect(results.non2xx).toBe(0);
      expect(results.latency.p99).toBeLessThan(100); // 100ms
    });

    it('should maintain performance during multiple rotations', async () => {
      const results = await autocannon({
        url: `${baseUrl}/api/protected`,
        connections: 50,
        duration: 30,
        headers: {
          'content-type': 'application/json',
        },
      });

      // Trigger multiple rotations during test
      for (let i = 0; i < 5; i++) {
        await SecretRotationService.rotateSecret('JWT_SECRET');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      expect(results.latency.p95).toBeLessThan(100);
      expect(results.errors).toBe(0);
      expect(results.timeouts).toBe(0);
    });
  });

  describe('Backup System Performance', () => {
    it('should handle large backup operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create large test dataset
      await createTestData({ posts: 10000, users: 1000 });

      // Measure backup time
      const backupStart = Date.now();
      await BackupVerificationService.createBackup();
      const backupDuration = Date.now() - backupStart;

      expect(backupDuration).toBeLessThan(30000); // 30 seconds max

      // Measure verification time
      const verifyStart = Date.now();
      const verificationResult = await BackupVerificationService.verifyBackup(
        '/tmp/test-backup.sqlite'
      );
      const verifyDuration = Date.now() - verifyStart;

      expect(verifyDuration).toBeLessThan(15000); // 15 seconds max
      expect(verificationResult).toBe(true);
    });

    it('should maintain system performance during backup', async () => {
      // Start system monitoring
      const baselineMetrics = await collectPerformanceMetrics();

      // Start backup process
      const backupPromise = BackupVerificationService.createBackup();

      // Measure system performance during backup
      const results = await autocannon({
        url: `${baseUrl}/api/posts`,
        connections: 20,
        duration: 30,
      });

      await backupPromise;

      // Get metrics after backup
      const backupMetrics = await collectPerformanceMetrics();

      expect(results.latency.p95).toBeLessThan(200); // 200ms max
      expect(backupMetrics.memory - baselineMetrics.memory).toBeLessThan(100 * 1024 * 1024); // 100MB max increase
      expect(backupMetrics.cpu - baselineMetrics.cpu).toBeLessThan(50); // 50% max CPU increase
    });
  });

  describe('Error Correlation Performance', () => {
    it('should handle high error rates efficiently', async () => {
      // Generate high volume of errors
      const errorPromises = Array(1000).fill(0).map((_, i) => {
        return ErrorCorrelationService.trackError(
          new Error(`Test error ${i}`),
          `correlation-${i}`,
          { path: '/test', method: 'GET' }
        );
      });

      const startTime = Date.now();
      await Promise.all(errorPromises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // 1 second max
    });

    it('should maintain performance with deep error chains', async () => {
      // Create deep error chain
      let currentId = 'root-error';
      for (let i = 0; i < 100; i++) {
        currentId = ErrorCorrelationService.correlateErrors(currentId);
        await ErrorCorrelationService.trackError(
          new Error(`Chain error ${i}`),
          currentId,
          { path: '/test', method: 'GET' }
        );
      }

      // Measure chain retrieval performance
      const startTime = Date.now();
      const chain = await ErrorCorrelationService.getErrorChain(currentId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // 100ms max
      expect(chain.length).toBe(101); // Root + 100 correlated errors
    });
  });

  describe('System Load Tests', () => {
    it('should handle concurrent operations', async () => {
      const operations = [
        // Secret rotation
        () => SecretRotationService.rotateSecret('TEST_SECRET'),
        
        // Backup verification
        () => BackupVerificationService.verifyBackup('/tmp/test-backup.sqlite'),
        
        // Error tracking
        () => ErrorCorrelationService.trackError(
          new Error('Test error'),
          'test-correlation',
          { path: '/test', method: 'GET' }
        ),
      ];

      // Run operations concurrently
      const startTime = Date.now();
      await Promise.all(
        Array(100).fill(0).map(() => {
          const operation = operations[Math.floor(Math.random() * operations.length)];
          return operation();
        })
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    it('should maintain performance under sustained load', async () => {
      const duration = 60; // 1 minute test
      const results = await autocannon({
        url: baseUrl,
        connections: 100,
        duration,
        workers: 8,
        requests: [
          {
            method: 'GET',
            path: '/api/posts',
          },
          {
            method: 'POST',
            path: '/api/posts',
            body: JSON.stringify({ content: 'Test post' }),
            headers: { 'content-type': 'application/json' },
          },
          {
            method: 'GET',
            path: '/api/users',
          },
        ],
      });

      expect(results.errors).toBe(0);
      expect(results.timeouts).toBe(0);
      expect(results.latency.p99).toBeLessThan(500); // 500ms max
      expect(results.requests.average).toBeGreaterThan(1000); // At least 1000 req/sec
    });
  });
});

// Helper function to collect performance metrics
async function collectPerformanceMetrics() {
  const usage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    memory: usage.heapUsed,
    cpu: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
    timestamp: Date.now(),
  };
}
