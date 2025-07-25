import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';

// Increase timeout for all tests
jest.setTimeout(30000);

let mongoServer: MongoMemoryServer;

export const connectDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
};

export const disconnectDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
};

// Add a dummy test to prevent Jest from complaining
test('setup file loaded', () => {
  expect(true).toBe(true);
});