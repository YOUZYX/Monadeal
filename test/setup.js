// Jest setup file for API integration tests
// This file is run before each test suite

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/monadeal_test'

// Increase timeout for integration tests
jest.setTimeout(30000)

// Global test configuration
global.console = {
  ...console,
  // Uncomment to silence console during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}

// Mock WebSocket for server-side tests
global.WebSocket = class MockWebSocket {
  constructor() {
    this.readyState = 1
  }
  send() {}
  close() {}
}

// Set up test database if needed
beforeAll(async () => {
  // Any global setup can go here
  console.log('🧪 Setting up test environment...')
})

afterAll(async () => {
  // Any global cleanup can go here
  console.log('🧹 Cleaning up test environment...')
}) 