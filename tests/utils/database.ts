import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export async function createTestDatabase(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri);
  } catch (error) {
    console.error('Error connecting to test database:', error);
    throw error;
  }
}

export async function clearTestDatabase(): Promise<void> {
  if (!mongoose.connection) {
    return;
  }

  const collections = await mongoose.connection.db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

export async function createTestData(): Promise<void> {
  // Add test data creation logic here
  // This should create a standard set of test data for integration tests
}

export async function getTestData(): Promise<any> {
  // Add logic to retrieve test data
  // This should return the current state of test data
}

export async function compareTestData(before: any, after: any): Promise<boolean> {
  // Add logic to compare test data states
  // This helps verify that tests don't have unintended side effects
  return JSON.stringify(before) === JSON.stringify(after);
}

export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  private mongoServer?: MongoMemoryServer;

  private constructor() {}

  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  async start(): Promise<string> {
    this.mongoServer = await MongoMemoryServer.create();
    const uri = this.mongoServer.getUri();
    await createTestDatabase(uri);
    return uri;
  }

  async stop(): Promise<void> {
    if (this.mongoServer) {
      await mongoose.disconnect();
      await this.mongoServer.stop();
    }
  }

  async reset(): Promise<void> {
    await clearTestDatabase();
  }
}
