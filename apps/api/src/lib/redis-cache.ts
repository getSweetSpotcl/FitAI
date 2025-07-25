/**
 * Redis Cache Helper
 * Manages Redis connection and cache operations for Cloudflare Workers
 */

/**
 * Simple Redis-compatible cache implementation using Upstash
 */
export class RedisCache {
  private baseUrl: string;
  private token: string;

  constructor(redisUrl: string, token: string) {
    // Extract base URL from Redis URL if needed
    this.baseUrl = redisUrl.startsWith('redis://') 
      ? redisUrl.replace('redis://', 'https://').replace(':6379', '')
      : redisUrl;
    this.token = token;
  }

  /**
   * Set a key with expiration
   */
  async setex(key: string, seconds: number, value: string): Promise<void> {
    try {
      await this.executeCommand(['SETEX', key, seconds.toString(), value]);
    } catch (error) {
      console.warn(`Redis SETEX failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a key value
   */
  async get(key: string): Promise<string | null> {
    try {
      const result = await this.executeCommand(['GET', key]);
      return result;
    } catch (error) {
      console.warn(`Redis GET failed for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete one or more keys
   */
  async del(...keys: string[]): Promise<number> {
    try {
      const result = await this.executeCommand(['DEL', ...keys]);
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.warn(`Redis DEL failed for keys ${keys.join(', ')}:`, error);
      return 0;
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const result = await this.executeCommand(['KEYS', pattern]);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn(`Redis KEYS failed for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValues: Record<string, string>): Promise<void> {
    const args = Object.entries(keyValues).flat();
    try {
      await this.executeCommand(['MSET', ...args]);
    } catch (error) {
      console.warn('Redis MSET failed:', error);
      throw error;
    }
  }

  /**
   * Get multiple values
   */
  async mget(...keys: string[]): Promise<(string | null)[]> {
    try {
      const result = await this.executeCommand(['MGET', ...keys]);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn(`Redis MGET failed for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Increment a key
   */
  async incr(key: string): Promise<number> {
    try {
      const result = await this.executeCommand(['INCR', key]);
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.warn(`Redis INCR failed for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set if not exists
   */
  async setnx(key: string, value: string): Promise<boolean> {
    try {
      const result = await this.executeCommand(['SETNX', key, value]);
      return result === 1;
    } catch (error) {
      console.warn(`Redis SETNX failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Execute Redis command via HTTP API
   */
  private async executeCommand(command: string[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`Redis command failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return (data as any).result;
  }

  /**
   * Test Redis connection
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.executeCommand(['PING']);
      return result === 'PONG';
    } catch (error) {
      console.warn('Redis PING failed:', error);
      return false;
    }
  }

  /**
   * Get Redis info
   */
  async info(): Promise<string> {
    try {
      const result = await this.executeCommand(['INFO']);
      return typeof result === 'string' ? result : '';
    } catch (error) {
      console.warn('Redis INFO failed:', error);
      return '';
    }
  }
}

/**
 * Initialize Redis cache for Cloudflare Workers environment
 */
export function createRedisCache(redisUrl?: string, token?: string): RedisCache | null {
  if (!redisUrl || !token) {
    console.warn('Redis credentials not provided - cache will use memory only');
    return null;
  }

  try {
    return new RedisCache(redisUrl, token);
  } catch (error) {
    console.error('Failed to create Redis cache:', error);
    return null;
  }
}

/**
 * Cache invalidation patterns for different operations
 */
export class CacheInvalidation {
  static async invalidateUserData(cache: any, userId: string): Promise<void> {
    const patterns = [
      `cache:user:${userId}`,
      `cache:user:${userId}:*`,
      `cache:profile:${userId}`,
      `cache:achievements:${userId}`,
      `cache:health:${userId}:*`,
      `cache:feed:${userId}:*`
    ];

    for (const pattern of patterns) {
      try {
        if (pattern.includes('*')) {
          const keys = await cache.keys(pattern);
          if (keys.length > 0) {
            await cache.del(...keys);
          }
        } else {
          await cache.del(pattern);
        }
      } catch (error) {
        console.warn(`Cache invalidation failed for pattern ${pattern}:`, error);
      }
    }
  }

  static async invalidateWorkoutData(cache: any, userId: string, sessionId?: string): Promise<void> {
    const patterns = [
      `cache:user:${userId}:workouts:*`,
      `cache:leaderboard:*`,
      `cache:health:${userId}:*`,
      `cache:analytics:*`
    ];

    if (sessionId) {
      patterns.push(`cache:workout:${sessionId}`);
    }

    for (const pattern of patterns) {
      try {
        if (pattern.includes('*')) {
          const keys = await cache.keys(pattern);
          if (keys.length > 0) {
            await cache.del(...keys);
          }
        } else {
          await cache.del(pattern);
        }
      } catch (error) {
        console.warn(`Cache invalidation failed for pattern ${pattern}:`, error);
      }
    }
  }

  static async invalidateExerciseData(cache: any): Promise<void> {
    const patterns = [
      'cache:exercises:*',
      'cache:exercises:popular',
      'cache:exercises:categories',
      'cache:exercises:muscle_groups'
    ];

    for (const pattern of patterns) {
      try {
        if (pattern.includes('*')) {
          const keys = await cache.keys(pattern);
          if (keys.length > 0) {
            await cache.del(...keys);
          }
        } else {
          await cache.del(pattern);
        }
      } catch (error) {
        console.warn(`Cache invalidation failed for pattern ${pattern}:`, error);
      }
    }
  }

  static async invalidateSocialData(cache: any, userId: string): Promise<void> {
    const patterns = [
      `cache:feed:*`,
      `cache:leaderboard:*`,
      `cache:social:*`,
      `cache:achievements:${userId}`
    ];

    for (const pattern of patterns) {
      try {
        const keys = await cache.keys(pattern);
        if (keys.length > 0) {
          await cache.del(...keys);
        }
      } catch (error) {
        console.warn(`Cache invalidation failed for pattern ${pattern}:`, error);
      }
    }
  }
}

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  static async warmUpCommonData(cache: any, database: any): Promise<void> {
    try {
      console.log('Starting cache warm-up...');

      // Warm up popular exercises
      const popularExercises = await database`
        SELECT e.* FROM exercises e
        WHERE e.id IN (
          SELECT exercise_id 
          FROM workout_sets 
          WHERE created_at >= NOW() - INTERVAL '7 days'
          GROUP BY exercise_id
          ORDER BY COUNT(*) DESC
          LIMIT 20
        )
      `;

      await cache.setex(
        'cache:exercises:popular', 
        30 * 60, // 30 minutes
        JSON.stringify(popularExercises)
      );

      // Warm up exercise metadata
      const categories = await database`
        SELECT DISTINCT category, category_id 
        FROM exercises 
        WHERE category IS NOT NULL
        ORDER BY category
      `;

      await cache.setex(
        'cache:exercises:categories',
        60 * 60, // 1 hour
        JSON.stringify(categories)
      );

      console.log('✅ Cache warm-up completed');
    } catch (error) {
      console.error('Cache warm-up failed:', error);
    }
  }

  static async warmUpUserData(cache: any, database: any, userId: string): Promise<void> {
    try {
      // Warm up user profile
      const profile = await database`
        SELECT * FROM user_profiles 
        WHERE user_id = ${userId}
        LIMIT 1
      `;

      if (profile.length > 0) {
        await cache.setex(
          `cache:profile:${userId}`,
          15 * 60, // 15 minutes
          JSON.stringify(profile[0])
        );
      }

      // Warm up recent workouts
      const recentWorkouts = await database`
        SELECT * FROM workout_sessions
        WHERE user_id = ${userId} AND completed_at IS NOT NULL
        ORDER BY started_at DESC
        LIMIT 10
      `;

      await cache.setex(
        `cache:user:${userId}:workouts:10:0`,
        10 * 60, // 10 minutes
        JSON.stringify(recentWorkouts)
      );

      console.log(`✅ User cache warmed up for ${userId}`);
    } catch (error) {
      console.error('User cache warm-up failed:', error);
    }
  }
}