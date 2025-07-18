import { Express } from 'express';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Redis from 'ioredis';
import { createTestDatabase, clearTestDatabase } from './database';
import { initializeApp } from '../../src/app';
import { WAFService } from '../../src/services/wafService';
import { SecurityMonitor } from '../../src/services/securityMonitor';

export interface TestServer {
  app: Express;
  server: Server;
  url: string;
  mongoServer: MongoMemoryServer;
  redis: Redis;
  wafService: WAFService;
  securityMonitor: SecurityMonitor;
}

export interface ServerConfig {
  enableWAF?: boolean;
  enableRateLimit?: boolean;
  enableGeographicRestrictions?: boolean;
  monitoringLevel?: 'basic' | 'detailed' | 'full';
}

export class TestServerManager {
  private testServer: TestServer | null = null;

  async startServer(config: ServerConfig = {}): Promise<TestServer> {
    // Start MongoDB Memory Server
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Initialize Redis
    const redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 1,
      lazyConnect: true
    });

    // Create test database
    await createTestDatabase(mongoUri);

    // Initialize WAF service if enabled
    const wafService = new WAFService({
      enabled: config.enableWAF ?? true,
      rateLimit: config.enableRateLimit ?? true,
      geoRestrictions: config.enableGeographicRestrictions ?? true
    });

    // Initialize security monitor
    const securityMonitor = new SecurityMonitor({
      level: config.monitoringLevel ?? 'detailed',
      redis
    });

    // Initialize Express app with services
    const app = await initializeApp({
      mongoUri,
      redisUrl: 'redis://localhost:6379/1',
      environment: 'test',
      wafService,
      securityMonitor
    });

    // Create HTTP server
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as AddressInfo;
    const url = `http://localhost:${address.port}`;

    this.testServer = {
      app,
      server,
      url,
      mongoServer,
      redis,
      wafService,
      securityMonitor
    };

    return this.testServer;
  }

  async stopServer(): Promise<void> {
    if (!this.testServer) {
      return;
    }

    const { server, mongoServer, redis } = this.testServer;

    // Close HTTP server
    await new Promise((resolve) => server.close(resolve));

    // Clear database
    await clearTestDatabase();

    // Stop MongoDB Memory Server
    await mongoServer.stop();

    // Close Redis connection
    await redis.quit();

    this.testServer = null;
  }

  async resetServer(): Promise<void> {
    if (!this.testServer) {
      throw new Error('Server not started');
    }

    // Clear all collections
    await clearTestDatabase();

    // Clear Redis
    await this.testServer.redis.flushdb();

    // Reset WAF rules
    await this.testServer.wafService.resetRules();

    // Reset security monitor
    await this.testServer.securityMonitor.reset();
  }

  async simulateLoad(options: {
    requests: number;
    concurrency: number;
    endpoint: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  }): Promise<{
    totalTime: number;
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  }> {
    if (!this.testServer) {
      throw new Error('Server not started');
    }

    const startTime = Date.now();
    const { requests, concurrency, endpoint, method = 'GET', headers = {}, body } = options;

    const batchSize = Math.min(concurrency, requests);
    const batches = Math.ceil(requests / batchSize);
    const results: Response[] = [];

    for (let i = 0; i < batches; i++) {
      const batchPromises = Array(Math.min(batchSize, requests - i * batchSize))
        .fill(0)
        .map(() => 
          fetch(`${this.testServer!.url}${endpoint}`, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: body ? JSON.stringify(body) : undefined
          })
        );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const successfulRequests = results.filter(r => r.ok).length;

    return {
      totalTime,
      averageResponseTime: totalTime / requests,
      successRate: successfulRequests / requests,
      errorRate: (requests - successfulRequests) / requests
    };
  }

  async getMetrics(): Promise<{
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    wafBlocks: number;
    geoBlocks: number;
  }> {
    if (!this.testServer) {
      throw new Error('Server not started');
    }

    return this.testServer.securityMonitor.getMetrics();
  }
}
