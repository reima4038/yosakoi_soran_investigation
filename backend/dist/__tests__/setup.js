"use strict";
// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
// Increase timeout for all tests
jest.setTimeout(30000);
// Add a dummy test to prevent Jest from complaining
test('setup file loaded', () => {
    expect(true).toBe(true);
});
//# sourceMappingURL=setup.js.map