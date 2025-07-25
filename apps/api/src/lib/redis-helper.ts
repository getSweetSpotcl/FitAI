import { Redis } from "@upstash/redis";

export function createRedisClient(env: any): Redis | null {
  // Check if Redis is configured
  if (!env.REDIS_URL || !env.REDIS_TOKEN || 
      env.REDIS_URL === "" || env.REDIS_TOKEN === "" ||
      env.REDIS_URL === "disabled" || env.REDIS_TOKEN === "disabled") {
    console.warn("Redis not configured, some features will be disabled");
    return null;
  }

  try {
    return new Redis({
      url: env.REDIS_URL,
      token: env.REDIS_TOKEN,
    });
  } catch (error) {
    console.error("Failed to create Redis client:", error);
    return null;
  }
}

// Mock Redis client for development without Redis
export class MockRedis {
  private store: Map<string, any> = new Map();

  async get(key: string) {
    return this.store.get(key);
  }

  async set(key: string, value: any, options?: { ex?: number }) {
    this.store.set(key, value);
    if (options?.ex) {
      setTimeout(() => this.store.delete(key), options.ex * 1000);
    }
    return "OK";
  }

  async incr(key: string) {
    const current = this.store.get(key) || 0;
    const newValue = current + 1;
    this.store.set(key, newValue);
    return newValue;
  }

  async incrby(key: string, amount: number) {
    const current = this.store.get(key) || 0;
    const newValue = current + amount;
    this.store.set(key, newValue);
    return newValue;
  }

  async expire(key: string, seconds: number) {
    setTimeout(() => this.store.delete(key), seconds * 1000);
    return 1;
  }

  async ttl(key: string) {
    // Simple implementation - return -1 if key doesn't exist
    return this.store.has(key) ? 60 : -1;
  }

  async del(key: string) {
    return this.store.delete(key) ? 1 : 0;
  }
}