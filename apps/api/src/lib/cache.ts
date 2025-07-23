import { Redis } from '@upstash/redis';
import { Context } from 'hono';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  prefix?: string;
  compress?: boolean;
}

export class CacheService {
  private redis: Redis;
  private defaultTTL: number;
  private prefix: string;

  constructor(redis: Redis, defaultTTL: number = 3600, prefix: string = 'fitai') {
    this.redis = redis;
    this.defaultTTL = defaultTTL;
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getKey(key);
      const value = await this.redis.get(fullKey);
      
      if (!value) return null;

      // Parse JSON if it's a string
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      }

      return value as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (ttl || this.defaultTTL) {
        await this.redis.setex(fullKey, ttl || this.defaultTTL, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      await this.redis.del(fullKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.prefix}:${pattern}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  }

  // Cache with automatic generation
  async getOrSet<T>(
    key: string,
    generator: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await generator();
    await this.set(key, value, ttl);
    return value;
  }

  // Cache invalidation helpers
  async invalidateUser(userId: string): Promise<void> {
    await this.invalidatePattern(`user:${userId}:*`);
  }

  async invalidateRoutine(routineId: string): Promise<void> {
    await this.invalidatePattern(`routine:${routineId}:*`);
  }

  async invalidateWorkout(workoutId: string): Promise<void> {
    await this.invalidatePattern(`workout:${workoutId}:*`);
  }
}

// Cache key generators
export const cacheKeys = {
  // User cache keys
  userProfile: (userId: string) => `user:${userId}:profile`,
  userProgress: (userId: string, period: string) => `user:${userId}:progress:${period}`,
  userRoutines: (userId: string) => `user:${userId}:routines`,
  userWorkouts: (userId: string, status?: string) => `user:${userId}:workouts:${status || 'all'}`,
  
  // Exercise cache keys
  exercises: (filters: string) => `exercises:${filters}`,
  exercise: (exerciseId: string) => `exercise:${exerciseId}`,
  exerciseCategories: () => 'exercises:categories',
  
  // Routine cache keys
  routine: (routineId: string) => `routine:${routineId}`,
  
  // Workout cache keys
  workout: (workoutId: string) => `workout:${workoutId}`,
  workoutStats: (userId: string, period: string) => `user:${userId}:workout-stats:${period}`,
  
  // Health cache keys
  healthMetrics: (userId: string, types: string) => `user:${userId}:health:metrics:${types}`,
  healthDashboard: (userId: string, period: string) => `user:${userId}:health:dashboard:${period}`,
  
  // Social cache keys
  socialFeed: (page: number) => `social:feed:${page}`,
  leaderboard: (metric: string, period: string) => `social:leaderboard:${metric}:${period}`,
  
  // AI cache keys
  aiRoutine: (params: string) => `ai:routine:${params}`,
  aiAdvice: (workoutId: string) => `ai:advice:${workoutId}`,
};

// Cache TTL configurations (in seconds)
export const cacheTTL = {
  // Short cache (5 minutes)
  short: 300,
  
  // Medium cache (1 hour)
  medium: 3600,
  
  // Long cache (24 hours)
  long: 86400,
  
  // Specific TTLs
  userProfile: 1800, // 30 minutes
  exercises: 3600, // 1 hour
  routine: 1800, // 30 minutes
  workout: 300, // 5 minutes (active workouts)
  healthMetrics: 600, // 10 minutes
  socialFeed: 60, // 1 minute
  leaderboard: 300, // 5 minutes
  aiRoutine: 86400, // 24 hours
};

// Cache middleware
export function cacheMiddleware(
  keyGenerator: (c: Context) => string,
  ttl: number = cacheTTL.medium,
  condition?: (c: Context) => boolean
) {
  return async (c: Context, next: () => Promise<void>) => {
    // Skip cache if condition is false
    if (condition && !condition(c)) {
      return next();
    }

    // Skip cache for non-GET requests
    if (c.req.method !== 'GET') {
      return next();
    }

    const redis = Redis.fromEnv({
      UPSTASH_REDIS_REST_URL: c.env?.UPSTASH_REDIS_URL,
      UPSTASH_REDIS_REST_TOKEN: c.env?.UPSTASH_REDIS_TOKEN,
    });

    const cache = new CacheService(redis);
    const cacheKey = keyGenerator(c);

    // Try to get from cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      const logger = c.get('logger');
      logger?.logCache('hit', cacheKey);
      
      return c.json(cached);
    }

    // Store original json method
    const originalJson = c.json.bind(c);
    
    // Override json method to cache the response
    c.json = (object: any, status?: number) => {
      // Only cache successful responses
      if (!status || (status >= 200 && status < 300)) {
        cache.set(cacheKey, object, ttl).catch(err => {
          console.error('Failed to cache response:', err);
        });
        
        const logger = c.get('logger');
        logger?.logCache('set', cacheKey);
      }
      
      return originalJson(object, status);
    };

    const logger = c.get('logger');
    logger?.logCache('miss', cacheKey);

    await next();
  };
}

// Cache invalidation middleware
export function cacheInvalidationMiddleware(
  invalidator: (c: Context, cache: CacheService) => Promise<void>
) {
  return async (c: Context, next: () => Promise<void>) => {
    await next();

    // Only invalidate on successful mutations
    if (c.res.status >= 200 && c.res.status < 300) {
      const redis = Redis.fromEnv({
        UPSTASH_REDIS_REST_URL: c.env?.UPSTASH_REDIS_URL,
        UPSTASH_REDIS_REST_TOKEN: c.env?.UPSTASH_REDIS_TOKEN,
      });

      const cache = new CacheService(redis);
      
      try {
        await invalidator(c, cache);
      } catch (error) {
        console.error('Cache invalidation error:', error);
      }
    }
  };
}