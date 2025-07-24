import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createDatabaseClient, getUserByClerkId } from "../db/database";
import { AIService } from "../lib/ai-service";
import { CacheService } from "../lib/cache-service";
import {
  checkDailyUsage,
  getUpgradeOptions,
  getUserPlanInfo,
} from "../middleware/plan-access";

type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  OPENAI_API_KEY: string;
  REDIS_URL: string;
  REDIS_TOKEN: string;
};

type Variables = {
  user?: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: "user" | "admin";
    plan: "free" | "premium" | "pro";
  };
};

const ai = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Rate limits by plan
const RATE_LIMITS = {
  free: { routines: 3, coaching: 10 }, // per day
  premium: { routines: 15, coaching: 50 }, // per day
  pro: { routines: 50, coaching: 200 }, // per day
};

// Credit costs by feature
const CREDIT_COSTS = {
  routine: { free: 10, premium: 5, pro: 2 },
  coaching: { free: 2, premium: 1, pro: 1 },
};

/**
 * Check if user has enough credits and hasn't exceeded rate limits
 */
async function checkUsageLimits(
  cacheService: CacheService,
  userId: string,
  userPlan: "free" | "premium" | "pro",
  feature: "routines" | "coaching"
): Promise<{ allowed: boolean; reason?: string; upgradeOptions?: any }> {
  try {
    // Get current rate limit
    const rateLimit = await cacheService.getRateLimit(userId, feature);

    // Check plan-based daily usage limits
    const usageCheck = checkDailyUsage(userPlan, feature, rateLimit.count);

    if (!usageCheck.allowed) {
      const upgradeOptions = getUpgradeOptions(userPlan);
      const resetHours = Math.ceil(
        (rateLimit.resetAt - Date.now()) / (1000 * 60 * 60)
      );

      return {
        allowed: false,
        reason:
          usageCheck.limit === -1
            ? "Límite ilimitado disponible"
            : `Límite diario alcanzado (${usageCheck.limit}). Reinicia en ${resetHours}h.`,
        upgradeOptions:
          upgradeOptions.available.length > 0 ? upgradeOptions : null,
      };
    }

    // Check credits (simplified - in production you'd have a proper credit system)
    const credits = await cacheService.getUserCredits(userId);
    const requiredCredits =
      CREDIT_COSTS[feature === "routines" ? "routine" : "coaching"][userPlan];

    if (credits < requiredCredits) {
      return {
        allowed: false,
        reason: `Créditos insuficientes. Necesitas ${requiredCredits}, tienes ${credits}.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("Check usage limits error:", error);
    return { allowed: true }; // Allow on error to prevent blocking
  }
}

/**
 * Log AI usage for cost tracking
 */
async function logAIUsage(
  sql: any,
  userId: string,
  endpoint: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  cost: number,
  requestData: any,
  responseData: any,
  cacheHit: boolean = false
) {
  try {
    await sql`
      INSERT INTO ai_usage_tracking (
        user_id, endpoint, tokens_used, cost_usd, model_used, 
        request_data, response_data, cache_hit
      ) VALUES (
        ${userId}, ${endpoint}, ${promptTokens + completionTokens}, ${cost},
        ${model}, ${JSON.stringify(requestData)}, ${JSON.stringify(responseData)}, ${cacheHit}
      )
    `;
  } catch (error) {
    console.error("Log AI usage error:", error);
  }
}

// Generate personalized workout routine
ai.post("/generate-routine", async (c) => {
  try {
    const authUser = c.get("user");
    if (!authUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    const requestData = await c.req.json();

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: "User profile not found" });
    }

    // Initialize services
    const aiService = new AIService(c.env.OPENAI_API_KEY);
    const cacheService = new CacheService({
      redisUrl: c.env.REDIS_URL,
      redisToken: c.env.REDIS_TOKEN,
    });

    // Check usage limits
    const usageCheck = await checkUsageLimits(
      cacheService,
      dbUser.id,
      authUser.plan,
      "routines"
    );
    if (!usageCheck.allowed) {
      throw new HTTPException(429, { message: usageCheck.reason });
    }

    // Get user profile from database
    const profileResult = await sql`
      SELECT * FROM user_profiles WHERE user_id = ${dbUser.id} LIMIT 1
    `;

    if ((profileResult as any[]).length === 0) {
      throw new HTTPException(400, {
        message: "Por favor completa tu perfil antes de generar rutinas",
      });
    }

    const profile = profileResult[0];
    const userProfile = {
      goals: profile.goals || [],
      experienceLevel: profile.experience_level || "intermediate",
      availableDays: profile.available_days || 3,
      equipment: profile.equipment_access || [],
      workoutLocation: profile.workout_location || "gym",
      injuries: profile.injuries || [],
      height: profile.height,
      weight: profile.weight,
      age: profile.age,
    };

    // Create cache key
    const cacheKey = cacheService.createRoutineCacheKey({
      ...userProfile,
      ...requestData.preferences,
    });

    // Check cache first
    let routine = await cacheService.getRoutine(cacheKey);
    let cacheHit = false;

    if (routine) {
      cacheHit = true;
      console.log("Routine cache hit for user:", dbUser.id);
    } else {
      // Generate new routine
      console.log("Generating new routine for user:", dbUser.id);
      routine = await aiService.generateRoutine({
        userProfile,
        preferences: requestData.preferences,
        plan: authUser.plan,
      });

      // Cache the routine
      await cacheService.setRoutine(cacheKey, routine, 86400); // 24 hours
    }

    // Save routine to database
    const savedRoutine = await sql`
      INSERT INTO routines (
        user_id, name, description, routine_data, is_ai_generated, 
        ai_prompt, difficulty_level, estimated_duration, target_muscle_groups, 
        equipment_needed
      ) VALUES (
        ${dbUser.id}, ${routine.name}, ${routine.description}, 
        ${JSON.stringify(routine)}, true, ${JSON.stringify(requestData)},
        ${routine.difficulty}, ${routine.estimatedDuration}, ${routine.targetMuscleGroups},
        ${routine.equipmentNeeded}
      ) RETURNING *
    `;

    // Update rate limits and credits
    await cacheService.incrementRateLimit(dbUser.id, "routines");
    const creditCost = CREDIT_COSTS.routine[authUser.plan];
    if (!cacheHit) {
      await cacheService.incrementUserCredits(dbUser.id, -creditCost);
    }

    // Log usage for cost tracking (simplified)
    await logAIUsage(
      sql,
      dbUser.id,
      "generate_routine",
      "gpt-3.5-turbo",
      0,
      0,
      0,
      requestData,
      routine,
      cacheHit
    );

    return c.json({
      success: true,
      data: {
        routine: savedRoutine[0],
        details: routine,
        cacheHit,
        creditsUsed: cacheHit ? 0 : creditCost,
      },
      message: "Rutina generada exitosamente",
    });
  } catch (error) {
    console.error("Generate routine error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to generate routine" });
  }
});

// Get coaching advice based on workout performance
ai.post("/coaching-advice", async (c) => {
  try {
    const authUser = c.get("user");
    if (!authUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    const workoutData = await c.req.json();

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: "User profile not found" });
    }

    // Initialize services
    const aiService = new AIService(c.env.OPENAI_API_KEY);
    const cacheService = new CacheService({
      redisUrl: c.env.REDIS_URL,
      redisToken: c.env.REDIS_TOKEN,
    });

    // Check usage limits
    const usageCheck = await checkUsageLimits(
      cacheService,
      dbUser.id,
      authUser.plan,
      "coaching"
    );
    if (!usageCheck.allowed) {
      throw new HTTPException(429, { message: usageCheck.reason });
    }

    // Generate coaching advice
    const advice = await aiService.generateCoachingAdvice(
      workoutData,
      authUser.plan
    );

    // Update rate limits and credits
    await cacheService.incrementRateLimit(dbUser.id, "coaching");
    const creditCost = CREDIT_COSTS.coaching[authUser.plan];
    await cacheService.incrementUserCredits(dbUser.id, -creditCost);

    // Log usage
    await logAIUsage(
      sql,
      dbUser.id,
      "coaching_advice",
      "gpt-3.5-turbo",
      0,
      0,
      0,
      workoutData,
      { advice },
      false
    );

    return c.json({
      success: true,
      data: {
        advice,
        creditsUsed: creditCost,
      },
    });
  } catch (error) {
    console.error("Coaching advice error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Failed to generate coaching advice",
    });
  }
});

// Get user's AI usage stats
ai.get("/usage-stats", async (c) => {
  try {
    const authUser = c.get("user");
    if (!authUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: "User profile not found" });
    }

    const cacheService = new CacheService({
      redisUrl: c.env.REDIS_URL,
      redisToken: c.env.REDIS_TOKEN,
    });

    // Get current usage
    const routineLimit = await cacheService.getRateLimit(dbUser.id, "routines");
    const coachingLimit = await cacheService.getRateLimit(
      dbUser.id,
      "coaching"
    );
    const credits = await cacheService.getUserCredits(dbUser.id);

    // Get usage history from database
    const usageHistory = await sql`
      SELECT 
        endpoint,
        COUNT(*) as usage_count,
        SUM(cost_usd) as total_cost,
        SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits
      FROM ai_usage_tracking
      WHERE user_id = ${dbUser.id}
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY endpoint
    `;

    const planLimits = RATE_LIMITS[authUser.plan];

    return c.json({
      success: true,
      data: {
        plan: authUser.plan,
        credits,
        dailyUsage: {
          routines: {
            used: routineLimit.count,
            limit: planLimits.routines,
            resetAt: new Date(routineLimit.resetAt).toISOString(),
          },
          coaching: {
            used: coachingLimit.count,
            limit: planLimits.coaching,
            resetAt: new Date(coachingLimit.resetAt).toISOString(),
          },
        },
        monthlyHistory: usageHistory,
        creditCosts: CREDIT_COSTS,
      },
    });
  } catch (error) {
    console.error("Usage stats error:", error);
    throw new HTTPException(500, { message: "Failed to get usage stats" });
  }
});

// Get user's plan info and usage limits
ai.get("/plan-info", async (c) => {
  try {
    const authUser = c.get("user");
    if (!authUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: "User profile not found" });
    }

    const cacheService = new CacheService({
      redisUrl: c.env.REDIS_URL,
      redisToken: c.env.REDIS_TOKEN,
    });

    // Get current usage
    const routineLimit = await cacheService.getRateLimit(dbUser.id, "routines");
    const coachingLimit = await cacheService.getRateLimit(
      dbUser.id,
      "coaching"
    );
    const credits = await cacheService.getUserCredits(dbUser.id);

    // Get plan information
    const planInfo = getUserPlanInfo(authUser.plan);
    const upgradeOptions = getUpgradeOptions(authUser.plan);

    // Check current usage against limits
    const routineUsage = checkDailyUsage(
      authUser.plan,
      "routines",
      routineLimit.count
    );
    const coachingUsage = checkDailyUsage(
      authUser.plan,
      "coaching",
      coachingLimit.count
    );

    return c.json({
      success: true,
      data: {
        currentPlan: authUser.plan,
        planFeatures: planInfo,
        usage: {
          routines: {
            used: routineLimit.count,
            limit: routineUsage.limit,
            remaining: routineUsage.remaining,
            resetAt: new Date(routineLimit.resetAt).toISOString(),
          },
          coaching: {
            used: coachingLimit.count,
            limit: coachingUsage.limit,
            remaining: coachingUsage.remaining,
            resetAt: new Date(coachingLimit.resetAt).toISOString(),
          },
        },
        credits: {
          available: credits,
          monthly: planInfo.monthlyCredits,
        },
        upgradeOptions:
          upgradeOptions.available.length > 0 ? upgradeOptions : null,
      },
    });
  } catch (error) {
    console.error("Get plan info error:", error);
    throw new HTTPException(500, { message: "Failed to get plan information" });
  }
});

export default ai;
