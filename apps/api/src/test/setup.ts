import { beforeAll, afterAll, beforeEach } from 'vitest';

// Setup test environment variables
beforeAll(() => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/fitai_test';
  process.env.CLERK_SECRET_KEY = 'test_clerk_secret_key';
  process.env.OPENAI_API_KEY = 'test_openai_api_key';
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'test_mp_token';
  process.env.UPSTASH_REDIS_URL = 'redis://localhost:6379';
  process.env.UPSTASH_REDIS_TOKEN = 'test_redis_token';
});

// Clean up after all tests
afterAll(() => {
  // Cleanup if needed
});

// Reset mocks before each test
beforeEach(() => {
  // Reset any mocks
});