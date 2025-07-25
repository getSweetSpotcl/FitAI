/**
 * Intelligent Cache System
 * Advanced caching with TTL, LRU eviction, and smart invalidation
 */

import type { DatabaseClient } from "../db/database";

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  entries: number;
  evictions: number;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries
  enableStats: boolean;
}

/**
 * Multi-layer intelligent cache with Redis and memory layers
 */
export class IntelligentCache {
  private memoryCache = new Map<string, CacheEntry>();
  private stats: CacheStats;
  private config: CacheConfig;
  private redis?: any; // Redis client when available

  constructor(
    config: Partial<CacheConfig> = {},
    private database?: DatabaseClient
  ) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxEntries: 1000,
      enableStats: true,
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entries: 0,
      evictions: 0
    };
  }

  /**
   * Set cache entry with intelligent TTL and tagging
   */
  async set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      tags?: string[];
      priority?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<void> {
    const {
      ttl = this.config.defaultTTL,
      tags = [],
      priority = 'normal'
    } = options;

    const serializedData = JSON.stringify(data);
    const size = this.calculateSize(serializedData);
    
    // Check size limits
    if (size > this.config.maxSize * 0.1) { // Single entry can't be > 10% of total cache
      console.warn(`Cache entry too large: ${key} (${size} bytes)`);
      return;
    }

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags,
      size
    };

    // Ensure cache size limits
    await this.evictIfNecessary(size);

    // Store in memory cache
    this.memoryCache.set(key, entry);
    this.updateStats();

    // Store in Redis if available (with longer TTL for persistence)
    if (this.redis && priority !== 'low') {
      try {
        await this.redis.setex(
          `cache:${key}`, 
          Math.ceil(ttl / 1000) * 2, // Double TTL for Redis
          serializedData
        );
      } catch (error) {
        console.warn('Redis cache write failed:', error);
      }
    }
  }

  /**
   * Get cache entry with access tracking
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      // Update access statistics
      memoryEntry.accessCount++;
      memoryEntry.lastAccessed = Date.now();
      
      this.stats.hits++;
      this.updateStats();
      
      return memoryEntry.data as T;
    }

    // Try Redis cache if memory miss
    if (this.redis) {
      try {
        const redisData = await this.redis.get(`cache:${key}`);
        if (redisData) {
          const data = JSON.parse(redisData) as T;
          
          // Restore to memory cache with default TTL
          await this.set(key, data, { ttl: this.config.defaultTTL });
          
          this.stats.hits++;
          this.updateStats();
          
          return data;
        }
      } catch (error) {
        console.warn('Redis cache read failed:', error);
      }
    }

    // Cache miss
    this.stats.misses++;
    this.updateStats();
    
    return null;
  }

  /**
   * Smart cache-or-fetch pattern
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const { forceRefresh = false } = options;

    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Fetch fresh data
    try {
      const data = await fetchFn();
      await this.set(key, data, options);
      return data;
    } catch (error) {
      // On error, try to return stale cache if available
      if (forceRefresh) {
        const stale = await this.get<T>(key);
        if (stale !== null) {
          console.warn(`Returning stale cache for ${key} due to fetch error:`, error);
          return stale;
        }
      }
      throw error;
    }
  }

  /**
   * Invalidate cache entries by key or tags
   */
  async invalidate(pattern: string | string[]): Promise<number> {
    let invalidatedCount = 0;

    if (typeof pattern === 'string') {
      // Direct key invalidation
      if (this.memoryCache.has(pattern)) {
        this.memoryCache.delete(pattern);
        invalidatedCount++;
      }

      // Redis invalidation
      if (this.redis) {
        try {
          await this.redis.del(`cache:${pattern}`);
        } catch (error) {
          console.warn('Redis cache invalidation failed:', error);
        }
      }
    } else {
      // Tag-based invalidation
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.tags.some(tag => pattern.includes(tag))) {
          this.memoryCache.delete(key);
          invalidatedCount++;

          // Redis invalidation
          if (this.redis) {
            try {
              await this.redis.del(`cache:${key}`);
            } catch (error) {
              console.warn('Redis cache invalidation failed:', error);
            }
          }
        }
      }
    }

    this.updateStats();
    return invalidatedCount;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.redis) {
      try {
        // Clear all cache keys with pattern
        const keys = await this.redis.keys('cache:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.warn('Redis cache clear failed:', error);
      }
    }

    this.updateStats();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(): Promise<void> {
    if (!this.database) return;

    try {
      console.log('Warming up cache...');

      // Cache popular exercises
      const popularExercises = await this.database`
        SELECT e.* FROM exercises e
        JOIN (
          SELECT exercise_id, COUNT(*) as usage_count
          FROM workout_sets 
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY exercise_id
          ORDER BY usage_count DESC
          LIMIT 50
        ) popular ON e.id = popular.exercise_id
      `;

      await this.set('exercises:popular', popularExercises, {
        ttl: 30 * 60 * 1000, // 30 minutes
        tags: ['exercises', 'popular']
      });

      // Cache exercise categories
      const categories = await this.database`
        SELECT DISTINCT category, category_id FROM exercises 
        WHERE category IS NOT NULL
        ORDER BY category
      `;

      await this.set('exercises:categories', categories, {
        ttl: 60 * 60 * 1000, // 1 hour
        tags: ['exercises', 'metadata']
      });

      // Cache muscle groups
      const muscleGroups = await this.database`
        SELECT DISTINCT unnest(muscle_groups) as muscle_group
        FROM exercises
        WHERE muscle_groups IS NOT NULL
        ORDER BY muscle_group
      `;

      await this.set('exercises:muscle_groups', muscleGroups, {
        ttl: 60 * 60 * 1000, // 1 hour
        tags: ['exercises', 'metadata']
      });

      console.log('✅ Cache warm-up completed');
    } catch (error) {
      console.error('Cache warm-up failed:', error);
    }
  }

  /**
   * Initialize Redis connection
   */
  async initRedis(redisClient: any): Promise<void> {
    this.redis = redisClient;
    console.log('✅ Redis cache layer initialized');
  }

  // Private helper methods

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private calculateSize(data: string): number {
    return new Blob([data]).size;
  }

  private async evictIfNecessary(newEntrySize: number): Promise<void> {
    // Check if we need to evict entries
    while (
      this.memoryCache.size >= this.config.maxEntries ||
      this.stats.totalSize + newEntrySize > this.config.maxSize
    ) {
      await this.evictLRU();
    }
  }

  private async evictLRU(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    // Find least recently used entry
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.stats.evictions++;
      
      // Also remove from Redis
      if (this.redis) {
        try {
          await this.redis.del(`cache:${oldestKey}`);
        } catch (error) {
          console.warn('Redis eviction failed:', error);
        }
      }
    }
  }

  private updateStats(): void {
    if (!this.config.enableStats) return;

    this.stats.entries = this.memoryCache.size;
    this.stats.totalSize = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);
    
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
  }
}

/**
 * Cache key generators for consistent naming
 */
export class CacheKeys {
  static user(userId: string): string {
    return `user:${userId}`;
  }

  static userWorkouts(userId: string, limit: number = 20, offset: number = 0): string {
    return `user:${userId}:workouts:${limit}:${offset}`;
  }

  static workoutSession(sessionId: string): string {
    return `workout:${sessionId}`;
  }

  static exercises(filters: any = {}): string {
    const filterKey = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    return `exercises:${filterKey || 'all'}`;
  }

  static leaderboard(category: string, period: string, limit: number = 50): string {
    return `leaderboard:${category}:${period}:${limit}`;
  }

  static healthStats(userId: string, days: number = 7): string {
    return `health:${userId}:${days}d`;
  }

  static achievements(userId: string): string {
    return `achievements:${userId}`;
  }

  static userProfile(userId: string): string {
    return `profile:${userId}`;
  }

  static socialFeed(userId: string, feedType: string, limit: number = 20): string {
    return `feed:${userId}:${feedType}:${limit}`;
  }
}

/**
 * Cache middleware for automatic caching of API responses
 */
export function cacheMiddleware(
  cache: IntelligentCache,
  options: {
    ttl?: number;
    keyGenerator?: (path: string, query: any) => string;
    tags?: string[];
    skipPaths?: string[];
  } = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    keyGenerator = (path, query) => `api:${path}:${JSON.stringify(query)}`,
    tags = ['api'],
    skipPaths = []
  } = options;

  return async (c: any, next: any) => {
    const path = c.req.path;
    const method = c.req.method;

    // Only cache GET requests
    if (method !== 'GET') {
      return next();
    }

    // Skip certain paths
    if (skipPaths.some(skipPath => path.includes(skipPath))) {
      return next();
    }

    const query = c.req.query();
    const cacheKey = keyGenerator(path, query);

    // Try to get from cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      return c.json(cached);
    }

    // Execute original handler
    await next();

    // Cache successful responses
    if (c.res.status === 200) {
      try {
        const responseData = await c.res.clone().json();
        await cache.set(cacheKey, responseData, { ttl, tags });
      } catch (error) {
        console.warn('Failed to cache response:', error);
      }
    }
  };
}