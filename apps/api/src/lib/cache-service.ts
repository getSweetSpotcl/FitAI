import { Redis } from "@upstash/redis/cloudflare";

export interface CacheConfig {
  redisUrl: string;
  redisToken: string;
}

export class CacheService {
  private redis: Redis;
  private defaultTTL = 3600; // 1 hour default

  constructor(config: CacheConfig) {
    this.redis = new Redis({
      url: config.redisUrl,
      token: config.redisToken,
    });
  }

  /**
   * Get cached AI routine
   */
  async getRoutine(key: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        console.log(`Cache hit for routine: ${key}`);
        return cached;
      }
      return null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Cache AI routine with TTL
   */
  async setRoutine(key: string, routine: any, ttl?: number): Promise<void> {
    try {
      await this.redis.set(key, routine, {
        ex: ttl || this.defaultTTL,
      });
      console.log(`Cached routine: ${key}`);
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  /**
   * Get cached exercise data
   */
  async getExercise(exerciseId: string): Promise<any | null> {
    try {
      const key = `exercise:${exerciseId}`;
      return await this.redis.get(key);
    } catch (error) {
      console.error("Cache get exercise error:", error);
      return null;
    }
  }

  /**
   * Cache exercise data
   */
  async setExercise(exerciseId: string, exerciseData: any): Promise<void> {
    try {
      const key = `exercise:${exerciseId}`;
      await this.redis.set(key, exerciseData, {
        ex: 86400, // 24 hours for exercise data
      });
    } catch (error) {
      console.error("Cache set exercise error:", error);
    }
  }

  /**
   * Get user's AI usage credits
   */
  async getUserCredits(userId: string): Promise<number> {
    try {
      const key = `credits:${userId}`;
      const credits = await this.redis.get(key);
      return (credits as number) || 0;
    } catch (error) {
      console.error("Get credits error:", error);
      return 0;
    }
  }

  /**
   * Update user's AI usage credits
   */
  async updateUserCredits(userId: string, credits: number): Promise<void> {
    try {
      const key = `credits:${userId}`;
      await this.redis.set(key, credits);
    } catch (error) {
      console.error("Update credits error:", error);
    }
  }

  /**
   * Increment user's AI usage credits
   */
  async incrementUserCredits(userId: string, amount: number): Promise<number> {
    try {
      const key = `credits:${userId}`;
      const newCredits = await this.redis.incrby(key, amount);
      return newCredits;
    } catch (error) {
      console.error("Increment credits error:", error);
      return 0;
    }
  }

  /**
   * Get rate limit info for user
   */
  async getRateLimit(
    userId: string,
    endpoint: string
  ): Promise<{
    count: number;
    resetAt: number;
  }> {
    try {
      const key = `ratelimit:${endpoint}:${userId}`;
      const count = ((await this.redis.get(key)) as number) || 0;
      const ttl = await this.redis.ttl(key);

      return {
        count,
        resetAt: Date.now() + ttl * 1000,
      };
    } catch (error) {
      console.error("Get rate limit error:", error);
      return { count: 0, resetAt: Date.now() };
    }
  }

  /**
   * Increment rate limit counter
   */
  async incrementRateLimit(
    userId: string,
    endpoint: string,
    window: number = 3600
  ): Promise<number> {
    try {
      const key = `ratelimit:${endpoint}:${userId}`;
      const count = await this.redis.incr(key);

      if (count === 1) {
        // Set expiry on first increment
        await this.redis.expire(key, window);
      }

      return count;
    } catch (error) {
      console.error("Increment rate limit error:", error);
      return 0;
    }
  }

  /**
   * Cache workout statistics
   */
  async cacheWorkoutStats(
    userId: string,
    period: string,
    stats: any
  ): Promise<void> {
    try {
      const key = `stats:${userId}:${period}`;
      await this.redis.set(key, stats, {
        ex: 300, // 5 minutes for stats
      });
    } catch (error) {
      console.error("Cache workout stats error:", error);
    }
  }

  /**
   * Get cached workout statistics
   */
  async getCachedWorkoutStats(
    userId: string,
    period: string
  ): Promise<any | null> {
    try {
      const key = `stats:${userId}:${period}`;
      return await this.redis.get(key);
    } catch (error) {
      console.error("Get cached stats error:", error);
      return null;
    }
  }

  /**
   * Create cache key for AI routines
   */
  createRoutineCacheKey(userProfile: any): string {
    // Create a deterministic cache key based on user profile
    const profileString = JSON.stringify({
      goals: userProfile.goals?.sort(),
      level: userProfile.experienceLevel,
      days: userProfile.availableDays,
      equipment: userProfile.equipment?.sort(),
      location: userProfile.workoutLocation,
    });

    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < profileString.length; i++) {
      const char = profileString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `routine:${Math.abs(hash).toString(36)}`;
  }

  /**
   * Clear user cache
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      // Clear various user-specific caches
      const _patterns = [
        `credits:${userId}`,
        `stats:${userId}:*`,
        `ratelimit:*:${userId}`,
      ];

      // Note: Upstash Redis doesn't support pattern deletion
      // In production, you might want to track keys or use a different approach
      console.log(`Would clear cache for user: ${userId}`);
    } catch (error) {
      console.error("Clear user cache error:", error);
    }
  }
}
