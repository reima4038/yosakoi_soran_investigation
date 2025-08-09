module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testEnvironmentOptions: {
    node: {
      options: ['--experimental-vm-modules']
    }
  },
  // Force tests to run sequentially to avoid MongoDB connection conflicts
  maxWorkers: 1,
  // Ensure proper cleanup between test suites
  forceExit: true,
  // Clear mocks between tests
  clearMocks: true
};