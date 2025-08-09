import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';

// Increase timeout for all tests
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

let mongoServer: MongoMemoryServer;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    try {
      // Disable buffering globally for tests
      mongoose.set('bufferCommands', false);
      
      // Close any existing connections first
      await mongoose.disconnect();
      
      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'test-db'
        }
      });
      const mongoUri = mongoServer.getUri();
      
      await mongoose.connect(mongoUri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 1,
      });
      
      console.log('Test MongoDB connected successfully');
    } catch (error) {
      console.error('Failed to connect to test MongoDB:', error);
      throw error;
    }
  }
};

export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('Test MongoDB disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting from test MongoDB:', error);
    // Don't throw error to avoid affecting test cleanup
  }
};

// Add a dummy test to prevent Jest from complaining
if (typeof test !== 'undefined') {
  test('setup file loaded', () => {
    expect(true).toBe(true);
  });
}