import { afterAll, beforeAll, beforeEach, vi } from "vitest";

// Mock fetch globally for all tests
global.fetch = vi.fn();

// Setup test environment variables
beforeAll(() => {
  // Database
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    "postgresql://test:test@localhost:5432/fitai_test";

  // Authentication
  process.env.CLERK_SECRET_KEY = "test_clerk_secret_key";
  process.env.CLERK_PUBLISHABLE_KEY = "test_clerk_publishable_key";

  // External APIs
  process.env.OPENAI_API_KEY = "test_openai_api_key";
  process.env.MERCADOPAGO_ACCESS_TOKEN = "test_mp_token";

  // Redis
  process.env.UPSTASH_REDIS_URL = "redis://localhost:6379";
  process.env.UPSTASH_REDIS_TOKEN = "test_redis_token";

  // Test environment
  process.env.ENVIRONMENT = "test";
  process.env.NODE_ENV = "test";

  console.log("Test environment configured");
});

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks();
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();

  // Reset fetch mock
  (global.fetch as any).mockReset();
});
