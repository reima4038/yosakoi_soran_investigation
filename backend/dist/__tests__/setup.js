"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
// Increase timeout for all tests
if (typeof jest !== 'undefined') {
    jest.setTimeout(30000);
}
let mongoServer;
const connectDB = async () => {
    if (mongoose_1.default.connection.readyState === 0) {
        try {
            // Disable buffering globally for tests
            mongoose_1.default.set('bufferCommands', false);
            // Close any existing connections first
            await mongoose_1.default.disconnect();
            mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create({
                instance: {
                    dbName: 'test-db'
                }
            });
            const mongoUri = mongoServer.getUri();
            await mongoose_1.default.connect(mongoUri, {
                bufferCommands: false,
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 10000,
                maxPoolSize: 10,
                minPoolSize: 1,
            });
            console.log('Test MongoDB connected successfully');
        }
        catch (error) {
            console.error('Failed to connect to test MongoDB:', error);
            throw error;
        }
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    try {
        if (mongoose_1.default.connection.readyState !== 0) {
            await mongoose_1.default.connection.dropDatabase();
            await mongoose_1.default.connection.close();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
        console.log('Test MongoDB disconnected successfully');
    }
    catch (error) {
        console.error('Error disconnecting from test MongoDB:', error);
        // Don't throw error to avoid affecting test cleanup
    }
};
exports.disconnectDB = disconnectDB;
// Add a dummy test to prevent Jest from complaining
if (typeof test !== 'undefined') {
    test('setup file loaded', () => {
        expect(true).toBe(true);
    });
}
//# sourceMappingURL=setup.js.map