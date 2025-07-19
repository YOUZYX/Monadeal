module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  testTimeout: 30000,
  verbose: true,
  collectCoverage: false,
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  testSequencer: '@jest/test-sequencer',
  maxWorkers: 1, // Run tests sequentially for integration testing
  forceExit: true,
  detectOpenHandles: true,
} 