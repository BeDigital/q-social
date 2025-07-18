import { Express } from 'express';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestDatabase, clearTestDatabase } from './database';
import { initializeApp } from '../../src/app';

export interface TestServer {
  app: Express;
  server: Server;
  url: string;
  mongoServer: MongoMemoryServer;
}

export async function startServer(): Promise<TestServer> {
  // Start MongoDB Memory Server
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Create test database
  await createTestDatabase(mongoUri);

  // Initialize Express app
  const app = await initializeApp({
    mongoUri,
    redisUrl: 'redis://localhost:6379/1',
    environment: 'test'
  });

  // Create HTTP server
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const url = `http://localhost:${address.port}`;

  return { app, server, url, mongoServer };
}

export async function stopServer(testServer: TestServer): Promise<void> {
  const { server, mongoServer } = testServer;

  // Close HTTP server
  await new Promise((resolve) => server.close(resolve));

  // Clear database
  await clearTestDatabase();

  // Stop MongoDB Memory Server
  await mongoServer.stop();
}

export async function resetServer(testServer: TestServer): Promise<void> {
  // Clear all collections
  await clearTestDatabase();

  // Reset any server state if needed
  // Add any additional reset logic here
}
