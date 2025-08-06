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
jest.setTimeout(30000);
let mongoServer;
const connectDB = async () => {
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose_1.default.connect(mongoUri);
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    await mongoose_1.default.connection.dropDatabase();
    await mongoose_1.default.connection.close();
    if (mongoServer) {
        await mongoServer.stop();
    }
};
exports.disconnectDB = disconnectDB;
// Add a dummy test to prevent Jest from complaining
test('setup file loaded', () => {
    expect(true).toBe(true);
});
//# sourceMappingURL=setup.js.map