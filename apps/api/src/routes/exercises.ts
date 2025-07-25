import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createDatabaseClient, getExercises } from "../db/database";
import { IntelligentCache, CacheKeys } from "../lib/intelligent-cache";
import { createRedisCache } from "../lib/redis-cache";

type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  UPSTASH_REDIS_URL: string;
  UPSTASH_REDIS_TOKEN: string;
  ENVIRONMENT: string;
};

const exercises = new Hono<{ Bindings: Bindings }>();

// Initialize cache (shared across requests)
let cache: IntelligentCache | null = null;

// Get all exercises (public endpoint, no auth required)
exercises.get("/", async (c) => {
  try {
    // Initialize cache if not already done
    if (!cache) {
      cache = new IntelligentCache({
        maxSize: 20 * 1024 * 1024, // 20MB for exercises
        defaultTTL: 15 * 60 * 1000, // 15 minutes
        maxEntries: 500
      });
      
      // Initialize Redis if available
      const redis = createRedisCache(c.env.UPSTASH_REDIS_URL, c.env.UPSTASH_REDIS_TOKEN);
      if (redis) {
        await cache.initRedis(redis);
      }
    }

    const category = c.req.query("category");
    const muscleGroup = c.req.query("muscle_group");
    const equipment = c.req.query("equipment");
    const difficulty = c.req.query("difficulty");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    // Generate cache key
    const filters = { category, muscle_group: muscleGroup, equipment, difficulty, limit, offset };
    const cacheKey = CacheKeys.exercises(filters);

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Use cache-or-fetch pattern
    const exercisesData = await cache.getOrFetch(
      cacheKey,
      async () => {
        return await getExercises(sql, {
          category,
          muscle_group: muscleGroup,
          equipment,
          difficulty,
          limit,
          offset,
        });
      },
      {
        ttl: 30 * 60 * 1000, // 30 minutes for exercises
        tags: ['exercises', 'public']
      }
    );

    return c.json({
      success: true,
      data: exercisesData,
      pagination: {
        limit,
        offset,
        total: exercisesData.length, // TODO: Implement proper count query
      },
      filters: {
        category,
        muscleGroup,
        equipment,
        difficulty,
      },
      cache: {
        cached: true,
        key: cacheKey
      }
    });
  } catch (error) {
    console.error("Get exercises error:", error);
    throw new HTTPException(500, { message: "Failed to get exercises" });
  }
});

// Get specific exercise
exercises.get("/:id", async (c) => {
  try {
    const exerciseId = c.req.param("id");
    
    if (!c.env?.DATABASE_URL) {
      throw new HTTPException(500, { message: "Database not configured" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get exercise from database
    const result = (await sql`
      SELECT * FROM exercises 
      WHERE id = ${exerciseId}
      LIMIT 1
    `) as any;

    if ((result as any[]).length === 0) {
      throw new HTTPException(404, { message: "Exercise not found" });
    }

    const exercise = result[0];

    return c.json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    console.error("Get exercise error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to get exercise" });
  }
});

// Search exercises
exercises.get("/search/:query", async (c) => {
  try {
    const query = c.req.param("query");
    const limit = parseInt(c.req.query("limit") || "20");
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Search exercises by name (both English and Spanish)
    const searchResults = (await sql`
      SELECT id, name, name_es, muscle_groups, equipment, difficulty
      FROM exercises 
      WHERE LOWER(name) LIKE ${`%${query.toLowerCase()}%`}
         OR LOWER(name_es) LIKE ${`%${query.toLowerCase()}%`}
      ORDER BY 
        CASE 
          WHEN LOWER(name) = ${query.toLowerCase()} THEN 1
          WHEN LOWER(name_es) = ${query.toLowerCase()} THEN 1
          WHEN LOWER(name) LIKE ${`${query.toLowerCase()}%`} THEN 2
          WHEN LOWER(name_es) LIKE ${`${query.toLowerCase()}%`} THEN 2
          ELSE 3
        END,
        name_es
      LIMIT ${limit}
    `) as any;

    return c.json({
      success: true,
      data: searchResults,
      query,
      count: (searchResults as any[]).length,
    });
  } catch (error) {
    console.error("Search exercises error:", error);
    throw new HTTPException(500, { message: "Failed to search exercises" });
  }
});

// Get exercise categories
exercises.get("/meta/categories", async (c) => {
  try {
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    const categories = await sql`
      SELECT * FROM exercise_categories 
      ORDER BY name_es
    `;

    return c.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    throw new HTTPException(500, { message: "Failed to get categories" });
  }
});

// Get muscle groups
exercises.get("/meta/muscle-groups", async (c) => {
  try {
    const muscleGroups = [
      { id: "chest", name: "Chest" },
      { id: "back", name: "Back" },
      { id: "shoulders", name: "Shoulders" },
      { id: "biceps", name: "Biceps" },
      { id: "triceps", name: "Triceps" },
      { id: "legs", name: "Legs" },
      { id: "glutes", name: "Glutes" },
      { id: "core", name: "Core" },
      { id: "hamstrings", name: "Hamstrings" },
      { id: "calves", name: "Calves" },
    ];

    return c.json({
      success: true,
      data: muscleGroups,
    });
  } catch (error) {
    console.error("Get muscle groups error:", error);
    throw new HTTPException(500, { message: "Failed to get muscle groups" });
  }
});

// Get equipment types
exercises.get("/meta/equipment", async (c) => {
  try {
    const equipment = [
      { id: "barbell", name: "Barbell" },
      { id: "dumbbell", name: "Dumbbell" },
      { id: "kettlebell", name: "Kettlebell" },
      { id: "pullup_bar", name: "Pull-up Bar" },
      { id: "resistance_bands", name: "Resistance Bands" },
      { id: "bodyweight", name: "Bodyweight" },
      { id: "machine", name: "Machine" },
      { id: "cable", name: "Cable" },
    ];

    return c.json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    console.error("Get equipment error:", error);
    throw new HTTPException(500, { message: "Failed to get equipment" });
  }
});

// Cache management endpoints
exercises.get("/admin/cache/stats", async (c) => {
  try {
    if (!cache) {
      return c.json({
        success: true,
        data: {
          message: "Cache not initialized"
        }
      });
    }

    const stats = cache.getStats();
    return c.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Get cache stats error:", error);
    throw new HTTPException(500, { message: "Failed to get cache stats" });
  }
});

exercises.post("/admin/cache/clear", async (c) => {
  try {
    if (!cache) {
      return c.json({
        success: true,
        message: "Cache not initialized"
      });
    }

    await cache.clear();
    return c.json({
      success: true,
      message: "Cache cleared successfully"
    });
  } catch (error) {
    console.error("Clear cache error:", error);
    throw new HTTPException(500, { message: "Failed to clear cache" });
  }
});

exercises.post("/admin/cache/warmup", async (c) => {
  try {
    if (!cache) {
      return c.json({
        success: false,
        message: "Cache not initialized"
      });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    await cache.warmUp();
    
    return c.json({
      success: true,
      message: "Cache warmed up successfully"
    });
  } catch (error) {
    console.error("Cache warmup error:", error);
    throw new HTTPException(500, { message: "Failed to warm up cache" });
  }
});

export default exercises;
