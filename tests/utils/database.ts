import mongoose from 'mongoose';

export async function createTestDatabase(mongoUri: string): Promise<void> {
  try {
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error('Error connecting to test database:', error);
    throw error;
  }
}

export async function clearTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
}

export async function closeTestDatabase(): Promise<void> {
  await mongoose.connection.close();
}
