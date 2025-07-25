import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { createDatabaseClient, getUserAchievements, getAvailableAchievements, checkWorkoutAchievements, grantAchievement, getAllAchievements } from "../db/database";
import { SocialService } from "../lib/social-service";
import { LeaderboardService } from "../lib/leaderboard-service";
import { DynamicAchievementsService } from "../lib/dynamic-achievements-service";
import { RealTimeFeedService } from "../lib/real-time-feed-service";
import { clerkAuth } from "../middleware/clerk-auth";
import type {
  ChallengesQuery,
  CreateChallengeRequest,
  CreateCommunityGroupRequest,
  CreateGroupPostRequest,
  CreateSharedRoutineRequest,
  CreateWorkoutPostRequest,
  SharedRoutinesQuery,
  SocialFeedQuery,
} from "../types/social";

type Bindings = {
  DATABASE_URL: string;
  CACHE: KVNamespace;
  CLERK_SECRET_KEY: string;
  OPENAI_API_KEY: string;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: "free" | "premium" | "pro";
    userId?: string;
    firstName?: string;
    lastName?: string;
    role?: "user" | "admin";
  };
};

const social = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Validation schemas
const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional(),
  fitnessLevel: z
    .enum(["beginner", "intermediate", "advanced", "expert"])
    .optional(),
  yearsTraining: z.number().min(0).max(50).optional(),
  preferredWorkoutTypes: z.array(z.string()).optional(),
  privacy: z
    .object({
      profilePublic: z.boolean().optional(),
      showWorkouts: z.boolean().optional(),
      showStats: z.boolean().optional(),
      showAchievements: z.boolean().optional(),
      allowFollowers: z.boolean().optional(),
      allowChallenges: z.boolean().optional(),
    })
    .optional(),
});

const CreateRoutineSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  difficulty: z.number().min(1).max(10),
  estimatedDuration: z.number().min(5).max(300).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  exercises: z.array(
    z.object({
      name: z.string(),
      sets: z.number().min(1),
      reps: z.string(),
      weight: z.number().optional(),
      rest: z.number().min(0),
      notes: z.string().optional(),
      muscleGroups: z.array(z.string()).default([]),
      equipment: z.string().optional(),
      instructions: z.string().optional(),
    })
  ),
  isPublic: z.boolean().default(true),
  allowModifications: z.boolean().default(true),
});

const CreatePostSchema = z.object({
  caption: z.string().max(500).optional(),
  workoutSessionId: z.string().optional(),
  workoutData: z.any().optional(),
  mediaUrls: z.array(z.string().url()).optional().default([]),
  postType: z.enum(["workout", "achievement", "progress", "milestone"]),
  visibility: z.enum(["public", "followers", "private"]).default("public"),
});

const CreateChallengeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  challengeType: z.enum(["individual", "team", "global"]),
  category: z.enum([
    "strength",
    "endurance",
    "consistency",
    "volume",
    "special",
  ]),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  registrationEndDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  rules: z
    .array(
      z.object({
        parameter: z.string(),
        condition: z.enum(["min", "max", "exact"]),
        target: z.number(),
        unit: z.string(),
        description: z.string().optional(),
      })
    )
    .default([]),
  entryRequirements: z.record(z.any()).optional().default({}),
  rewards: z
    .array(
      z.object({
        position: z.enum(["winner", "top3", "top10", "top50", "participant"]),
        type: z.enum([
          "achievement",
          "premium_time",
          "discount",
          "badge",
          "points",
        ]),
        value: z.string(),
        description: z.string().optional(),
      })
    )
    .default([]),
  maxParticipants: z.number().min(1).optional(),
  teamSize: z.number().min(1).optional(),
  isPublic: z.boolean().default(true),
});

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  groupType: z.enum(["public", "private", "premium_only"]).default("public"),
  category: z.string().max(50).optional(),
  requiresApproval: z.boolean().default(false),
  allowPosts: z.boolean().default(true),
  allowMedia: z.boolean().default(true),
  rules: z.string().optional(),
});

const CreateGroupPostSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(5000),
  postType: z
    .enum(["discussion", "question", "announcement", "workout"])
    .default("discussion"),
  mediaUrls: z.array(z.string().url()).optional().default([]),
  parentPostId: z.string().optional(),
});

// Apply auth middleware to all routes
social.use("*", clerkAuth());

// ==================== PROFILE MANAGEMENT ====================

/**
 * GET /api/v1/social/profile/:userId?
 * Get user's social profile
 */
social.get("/profile/:userId?", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const targetUserId = c.req.param("userId") || user.id;
    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const profile = await socialService.getUserSocialProfile(targetUserId);
    if (!profile) {
      throw new HTTPException(404, { message: "Perfil no encontrado" });
    }

    // Check privacy if viewing another user's profile
    const isOwnProfile = targetUserId === user.id;
    if (!isOwnProfile && !profile.profilePublic) {
      throw new HTTPException(403, { message: "Perfil privado" });
    }

    return c.json({
      success: true,
      data: profile,
      isOwnProfile,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error obteniendo perfil" });
  }
});

/**
 * PUT /api/v1/social/profile
 * Update user's social profile
 */
social.put("/profile", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const profileData = UpdateProfileSchema.parse(await c.req.json());
    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const updatedProfile = await socialService.updateSocialProfile(
      user.id,
      profileData
    );

    return c.json({
      success: true,
      data: updatedProfile,
      message: "Perfil actualizado exitosamente",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: "Datos inválidos" });
    }
    throw new HTTPException(500, { message: "Error actualizando perfil" });
  }
});

// ==================== SOCIAL CONNECTIONS ====================

/**
 * POST /api/v1/social/follow/:userId
 * Follow a user
 */
social.post("/follow/:userId", async (c) => {
  try {
    const user = c.get("user");
    const targetUserId = c.req.param("userId");

    if (!user || !targetUserId) {
      throw new HTTPException(400, { message: "Parámetros inválidos" });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const connection = await socialService.followUser(user.id, targetUserId);

    return c.json({
      success: true,
      data: connection,
      message: "Usuario seguido exitosamente",
    });
  } catch (error) {
    console.error("Follow user error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error siguiendo usuario" });
  }
});

/**
 * DELETE /api/v1/social/follow/:userId
 * Unfollow a user
 */
social.delete("/follow/:userId", async (c) => {
  try {
    const user = c.get("user");
    const targetUserId = c.req.param("userId");

    if (!user || !targetUserId) {
      throw new HTTPException(400, { message: "Parámetros inválidos" });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    await socialService.unfollowUser(user.id, targetUserId);

    return c.json({
      success: true,
      message: "Usuario no seguido",
    });
  } catch (error) {
    console.error("Unfollow user error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error dejando de seguir usuario",
    });
  }
});

/**
 * GET /api/v1/social/followers/:userId?
 * Get user's followers
 */
social.get("/followers/:userId?", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const targetUserId = c.req.param("userId") || user.id;
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const result = await socialService.getUserFollowers(
      targetUserId,
      page,
      limit
    );

    return c.json({
      success: true,
      data: {
        followers: result.followers,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get followers error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error obteniendo seguidores" });
  }
});

/**
 * GET /api/v1/social/following/:userId?
 * Get users that a user is following
 */
social.get("/following/:userId?", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const targetUserId = c.req.param("userId") || user.id;
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const result = await socialService.getUserFollowing(
      targetUserId,
      page,
      limit
    );

    return c.json({
      success: true,
      data: {
        following: result.following,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get following error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error obteniendo seguidos" });
  }
});

// ==================== SHARED ROUTINES ====================

/**
 * GET /api/v1/social/routines
 * Get shared routines feed
 */
social.get("/routines", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const query: SharedRoutinesQuery = {
      page: parseInt(c.req.query("page") || "1"),
      limit: parseInt(c.req.query("limit") || "10"),
      category: c.req.query("category"),
      difficulty: c.req.query("difficulty")
        ? parseInt(c.req.query("difficulty")!)
        : undefined,
      tags: c.req.query("tags")?.split(","),
      sortBy: (c.req.query("sortBy") as any) || "recent",
      userId: c.req.query("userId"),
    };

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const result = await socialService.getSharedRoutines(query);

    return c.json({
      success: true,
      data: {
        routines: result.routines,
        pagination: {
          page: query.page!,
          limit: query.limit!,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit!),
          hasNext: query.page! * query.limit! < result.total,
          hasPrev: query.page! > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get routines error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo rutinas compartidas",
    });
  }
});

/**
 * POST /api/v1/social/routines
 * Share a routine
 */
social.post("/routines", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const routineData = CreateRoutineSchema.parse(
      await c.req.json()
    ) as CreateSharedRoutineRequest;
    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const sharedRoutine = await socialService.shareRoutine(
      user.id,
      routineData
    );

    return c.json({
      success: true,
      data: sharedRoutine,
      message: "Rutina compartida exitosamente",
    });
  } catch (error) {
    console.error("Share routine error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: "Datos de rutina inválidos" });
    }
    throw new HTTPException(500, { message: "Error compartiendo rutina" });
  }
});

/**
 * POST /api/v1/social/routines/:routineId/like
 * Like/Unlike a routine
 */
social.post("/routines/:routineId/like", async (c) => {
  try {
    const user = c.get("user");
    const routineId = c.req.param("routineId");

    if (!user || !routineId) {
      throw new HTTPException(400, { message: "Parámetros inválidos" });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const result = await socialService.toggleRoutineLike(user.id, routineId);

    return c.json({
      success: true,
      data: result,
      message: result.liked ? "Rutina marcada como favorita" : "Like removido",
    });
  } catch (error) {
    console.error("Like routine error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error procesando like" });
  }
});

// ==================== WORKOUT POSTS ====================

/**
 * GET /api/v1/social/feed
 * Get personalized real-time social feed
 */
social.get("/feed", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    // Parse query parameters with new format
    const feedType = c.req.query("feedType") as 'following' | 'discover' | 'global' | 'trending' || "following";
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const timeframe = c.req.query("timeframe") as 'hour' | 'day' | 'week' | 'month' || "day";
    const activityTypes = c.req.query("activityTypes")?.split(",");
    const includeOwnActivities = c.req.query("includeOwnActivities") === "true";

    // Validate parameters
    const validFeedTypes = ['following', 'discover', 'global', 'trending'];
    const validTimeframes = ['hour', 'day', 'week', 'month'];
    
    if (!validFeedTypes.includes(feedType)) {
      throw new HTTPException(400, { 
        message: `Tipo de feed inválido. Valores permitidos: ${validFeedTypes.join(', ')}` 
      });
    }
    
    if (!validTimeframes.includes(timeframe)) {
      throw new HTTPException(400, { 
        message: `Marco temporal inválido. Valores permitidos: ${validTimeframes.join(', ')}` 
      });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const feedService = new RealTimeFeedService(database);

    const result = await feedService.getPersonalizedFeed({
      userId: user.id,
      feedType,
      limit,
      offset,
      timeframe,
      activityTypes,
      includeOwnActivities
    });

    return c.json({
      success: true,
      data: {
        activities: result.activities,
        pagination: {
          offset: offset,
          limit: limit,
          totalCount: result.totalCount,
          hasMore: result.hasMore,
          nextOffset: result.nextOffset,
        },
        metadata: {
          feedType,
          timeframe,
          lastUpdated: result.lastUpdated,
          availableFeedTypes: validFeedTypes,
          availableTimeframes: validTimeframes
        }
      },
      message: `Feed ${feedType} obtenido exitosamente`
    });
  } catch (error) {
    console.error("Get feed error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error obteniendo feed social" });
  }
});

/**
 * POST /api/v1/social/posts
 * Create a workout post
 */
social.post("/posts", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const postData = CreatePostSchema.parse(
      await c.req.json()
    ) as CreateWorkoutPostRequest;
    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const post = await socialService.createWorkoutPost(user.id, postData);

    return c.json({
      success: true,
      data: post,
      message: "Post creado exitosamente",
    });
  } catch (error) {
    console.error("Create post error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: "Datos de post inválidos" });
    }
    throw new HTTPException(500, { message: "Error creando post" });
  }
});

// ==================== CHALLENGES ====================

/**
 * GET /api/v1/social/challenges
 * Get challenges
 */
social.get("/challenges", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const query: ChallengesQuery = {
      page: parseInt(c.req.query("page") || "1"),
      limit: parseInt(c.req.query("limit") || "10"),
      status: c.req.query("status") as any,
      category: c.req.query("category"),
      challengeType: c.req.query("challengeType") as any,
      participating: c.req.query("participating") === "true",
    };

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const result = await socialService.getChallenges(query);

    return c.json({
      success: true,
      data: {
        challenges: result.challenges,
        pagination: {
          page: query.page!,
          limit: query.limit!,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit!),
          hasNext: query.page! * query.limit! < result.total,
          hasPrev: query.page! > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get challenges error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error obteniendo desafíos" });
  }
});

/**
 * POST /api/v1/social/challenges
 * Create a challenge (Premium/Pro only)
 */
social.post("/challenges", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    // Check if user has premium/pro plan for creating challenges
    if (user.plan === "free") {
      throw new HTTPException(402, {
        message: "Plan Premium o Pro requerido para crear desafíos",
      });
    }

    const challengeData = CreateChallengeSchema.parse(
      await c.req.json()
    ) as CreateChallengeRequest;
    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const challenge = await socialService.createChallenge(
      user.id,
      challengeData
    );

    return c.json({
      success: true,
      data: challenge,
      message: "Desafío creado exitosamente",
    });
  } catch (error) {
    console.error("Create challenge error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: "Datos de desafío inválidos" });
    }
    throw new HTTPException(500, { message: "Error creando desafío" });
  }
});

/**
 * POST /api/v1/social/challenges/:challengeId/join
 * Join a challenge
 */
social.post("/challenges/:challengeId/join", async (c) => {
  try {
    const user = c.get("user");
    const challengeId = c.req.param("challengeId");

    if (!user || !challengeId) {
      throw new HTTPException(400, { message: "Parámetros inválidos" });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const participation = await socialService.joinChallenge(
      user.id,
      challengeId
    );

    return c.json({
      success: true,
      data: participation,
      message: "¡Te has unido al desafío exitosamente!",
    });
  } catch (error) {
    console.error("Join challenge error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error uniéndose al desafío" });
  }
});

// ==================== NOTIFICATIONS ====================

/**
 * GET /api/v1/social/notifications
 * Get user notifications
 */
social.get("/notifications", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const unreadOnly = c.req.query("unread") === "true";

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const result = await socialService.getUserNotifications(
      user.id,
      page,
      limit,
      unreadOnly
    );

    return c.json({
      success: true,
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo notificaciones",
    });
  }
});

/**
 * PUT /api/v1/social/notifications/:notificationId/read
 * Mark notification as read
 */
social.put("/notifications/:notificationId/read", async (c) => {
  try {
    const user = c.get("user");
    const notificationId = c.req.param("notificationId");

    if (!user || !notificationId) {
      throw new HTTPException(400, { message: "Parámetros inválidos" });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);

    await database`
      UPDATE social_notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE id = ${notificationId} AND user_id = ${user.id}
    `;

    return c.json({
      success: true,
      message: "Notificación marcada como leída",
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error marcando notificación como leída",
    });
  }
});

// ==================== LEGACY ENDPOINTS (for backward compatibility) ====================

/**
 * GET /api/v1/social/achievements
 * Get user achievements (legacy endpoint)
 */
social.get("/achievements", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    // Get achievements from database
    if (!c.env?.DATABASE_URL) {
      throw new HTTPException(500, { message: "Database not configured" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get user achievements (earned)
    const earnedAchievements = await getUserAchievements(sql, user.userId!);
    
    // Get available achievements (not yet earned)
    const availableAchievements = await getAvailableAchievements(sql, user.userId!);

    // Calculate stats
    const totalEarned = earnedAchievements.length;
    const totalAvailable = totalEarned + availableAchievements.length;
    const rareCount = earnedAchievements.filter(ua => ua.achievement?.rarity === "rare").length;
    const epicCount = earnedAchievements.filter(ua => ua.achievement?.rarity === "epic").length;
    const legendaryCount = earnedAchievements.filter(ua => ua.achievement?.rarity === "legendary").length;
    
    // Calculate total points earned
    const totalPoints = earnedAchievements.reduce((sum, ua) => sum + (ua.achievement?.points || 0), 0);

    return c.json({
      success: true,
      data: {
        earned: earnedAchievements,
        available: availableAchievements,
        stats: {
          totalEarned,
          totalAvailable,
          totalPoints,
          rareCount,
          epicCount,
          legendaryCount,
          completionRate: totalAvailable > 0 ? Math.round((totalEarned / totalAvailable) * 100) : 0
        },
      },
      message: "Logros obtenidos exitosamente"
    });
  } catch (error) {
    console.error("Get achievements error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error obteniendo logros" });
  }
});

/**
 * GET /api/v1/social/leaderboards
 * Get dynamic leaderboards with real user data
 */
social.get("/leaderboards", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    // Parse query parameters with validation
    const period = c.req.query("period") as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time' || "weekly";
    const category = c.req.query("category") as 'volume' | 'workouts' | 'streak' | 'achievements' | 'consistency' || "volume";
    const limit = parseInt(c.req.query("limit") || "50");

    // Validate parameters
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly', 'all_time'];
    const validCategories = ['volume', 'workouts', 'streak', 'achievements', 'consistency'];
    
    if (!validPeriods.includes(period)) {
      throw new HTTPException(400, { 
        message: `Período inválido. Valores permitidos: ${validPeriods.join(', ')}` 
      });
    }
    
    if (!validCategories.includes(category)) {
      throw new HTTPException(400, { 
        message: `Categoría inválida. Valores permitidas: ${validCategories.join(', ')}` 
      });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const leaderboardService = new LeaderboardService(database);

    // Get leaderboard data
    const result = await leaderboardService.getLeaderboard({
      period,
      category,
      limit,
      userId: user.id
    });

    // Transform data to match legacy format for backward compatibility
    const transformedLeaderboard = result.leaderboard.map(entry => ({
      rank: entry.rank,
      user: {
        id: entry.userId,
        displayName: entry.displayName,
        avatar: entry.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userId}`,
      },
      value: entry.value,
      unit: entry.unit,
      change: entry.change,
      badge: entry.badge,
      streak: entry.streak,
      lastActivity: entry.lastActivity
    }));

    const transformedUserPosition = result.userPosition ? {
      rank: result.userPosition.rank,
      user: {
        id: result.userPosition.userId,
        displayName: result.userPosition.displayName,
        avatar: result.userPosition.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.userPosition.userId}`,
      },
      value: result.userPosition.value,
      unit: result.userPosition.unit,
      change: result.userPosition.change,
      badge: result.userPosition.badge
    } : undefined;

    return c.json({
      success: true,
      data: {
        leaderboard: transformedLeaderboard,
        userPosition: transformedUserPosition,
        metadata: {
          period: result.metadata.period,
          category: result.metadata.category,
          totalParticipants: result.metadata.totalParticipants,
          lastUpdated: result.metadata.lastUpdated,
          cutoffDate: result.metadata.cutoffDate,
          availablePeriods: validPeriods,
          availableCategories: validCategories
        },
      },
      message: `Clasificación de ${category} (${period}) obtenida exitosamente`
    });
  } catch (error) {
    console.error("Get leaderboards error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo clasificaciones",
    });
  }
});

// ==================== COMMUNITY GROUPS ====================

/**
 * GET /api/v1/social/groups
 * Get community groups
 */
social.get("/groups", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const category = c.req.query("category");
    const groupType = c.req.query("groupType");

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const result = await socialService.getCommunityGroups(
      page,
      limit,
      category,
      groupType
    );

    return c.json({
      success: true,
      data: {
        groups: result.groups,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get community groups error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo grupos de la comunidad",
    });
  }
});

/**
 * POST /api/v1/social/groups
 * Create a community group
 */
social.post("/groups", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    // Check for premium plan for creating groups
    if (user.plan === "free") {
      throw new HTTPException(402, {
        message: "Plan Premium requerido para crear grupos",
      });
    }

    const groupData = CreateGroupSchema.parse(
      await c.req.json()
    ) as CreateCommunityGroupRequest;
    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const group = await socialService.createCommunityGroup(user.id, groupData);

    return c.json({
      success: true,
      data: group,
      message: "Grupo creado exitosamente",
    });
  } catch (error) {
    console.error("Create community group error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: "Datos de grupo inválidos" });
    }
    throw new HTTPException(500, { message: "Error creando grupo" });
  }
});

/**
 * POST /api/v1/social/groups/:groupId/join
 * Join a community group
 */
social.post("/groups/:groupId/join", async (c) => {
  try {
    const user = c.get("user");
    const groupId = c.req.param("groupId");

    if (!user || !groupId) {
      throw new HTTPException(400, { message: "Parámetros inválidos" });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const membership = await socialService.joinCommunityGroup(user.id, groupId);

    return c.json({
      success: true,
      data: membership,
      message:
        membership.status === "pending"
          ? "Solicitud de unión enviada"
          : "¡Te has unido al grupo exitosamente!",
    });
  } catch (error) {
    console.error("Join community group error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error uniéndose al grupo" });
  }
});

/**
 * GET /api/v1/social/groups/:groupId/posts
 * Get posts from a community group
 */
social.get("/groups/:groupId/posts", async (c) => {
  try {
    const user = c.get("user");
    const groupId = c.req.param("groupId");

    if (!user || !groupId) {
      throw new HTTPException(400, { message: "Parámetros inválidos" });
    }

    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const result = await socialService.getGroupPosts(groupId, page, limit);

    return c.json({
      success: true,
      data: {
        posts: result.posts,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get group posts error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo posts del grupo",
    });
  }
});

/**
 * POST /api/v1/social/groups/:groupId/posts
 * Create a post in a community group
 */
social.post("/groups/:groupId/posts", async (c) => {
  try {
    const user = c.get("user");
    const groupId = c.req.param("groupId");

    if (!user || !groupId) {
      throw new HTTPException(400, { message: "Parámetros inválidos" });
    }

    const postData = CreateGroupPostSchema.parse(
      await c.req.json()
    ) as CreateGroupPostRequest;
    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const post = await socialService.createGroupPost(
      user.id,
      groupId,
      postData
    );

    return c.json({
      success: true,
      data: post,
      message: "Post creado exitosamente",
    });
  } catch (error) {
    console.error("Create group post error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: "Datos de post inválidos" });
    }
    throw new HTTPException(500, { message: "Error creando post en el grupo" });
  }
});

// Check for new achievements based on user activity
social.post("/achievements/check", clerkAuth, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    if (!c.env?.DATABASE_URL) {
      throw new HTTPException(500, { message: "Database not configured" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Check for new achievements
    const newAchievements = await checkWorkoutAchievements(sql, user.userId!);

    return c.json({
      success: true,
      data: {
        newAchievements,
        count: newAchievements.length
      },
      message: newAchievements.length > 0 
        ? `¡Felicidades! Has obtenido ${newAchievements.length} nuevo(s) logro(s)`
        : "No hay nuevos logros disponibles"
    });
  } catch (error) {
    console.error("Check achievements error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error verificando logros" });
  }
});

// Get all achievements (for admin or development purposes)
social.get("/achievements/all", clerkAuth, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    if (!c.env?.DATABASE_URL) {
      throw new HTTPException(500, { message: "Database not configured" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const allAchievements = await getAllAchievements(sql);

    return c.json({
      success: true,
      data: allAchievements,
      message: "Todos los logros obtenidos exitosamente"
    });
  } catch (error) {
    console.error("Get all achievements error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error obteniendo todos los logros" });
  }
});

// Grant achievement manually (for testing/admin purposes)
social.post("/achievements/:achievementId/grant", clerkAuth, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const achievementId = c.req.param("achievementId");
    if (!achievementId) {
      throw new HTTPException(400, { message: "ID de logro requerido" });
    }

    if (!c.env?.DATABASE_URL) {
      throw new HTTPException(500, { message: "Database not configured" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const granted = await grantAchievement(sql, user.userId!, achievementId);

    if (!granted) {
      return c.json({
        success: false,
        message: "El usuario ya tiene este logro"
      });
    }

    return c.json({
      success: true,
      data: granted,
      message: "Logro otorgado exitosamente"
    });
  } catch (error) {
    console.error("Grant achievement error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error otorgando logro" });
  }
});

// ==================== REAL-TIME FEED SYSTEM ====================

/**
 * React to feed activity
 * POST /api/v1/social/feed/:activityId/react
 */
social.post("/feed/:activityId/react", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const activityId = c.req.param("activityId");
    const { reactionType } = await c.req.json();

    if (!activityId) {
      throw new HTTPException(400, { message: "ID de actividad requerido" });
    }

    if (!reactionType || !['like', 'love', 'fire', 'strong'].includes(reactionType)) {
      throw new HTTPException(400, { 
        message: "Tipo de reacción inválido. Valores permitidos: like, love, fire, strong" 
      });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const feedService = new RealTimeFeedService(database);

    const result = await feedService.reactToActivity(user.id, activityId, reactionType);

    return c.json({
      success: true,
      data: {
        reactionType,
        newCount: result.newCount
      },
      message: "Reacción registrada exitosamente"
    });
  } catch (error) {
    console.error("React to activity error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error procesando reacción" });
  }
});

/**
 * Get trending activities
 * GET /api/v1/social/feed/trending
 */
social.get("/feed/trending", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const limit = parseInt(c.req.query("limit") || "20");
    const timeframe = c.req.query("timeframe") as 'hour' | 'day' | 'week' | 'month' || "day";

    if (!['hour', 'day', 'week', 'month'].includes(timeframe)) {
      throw new HTTPException(400, { 
        message: "Marco temporal inválido. Valores permitidos: hour, day, week, month" 
      });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const feedService = new RealTimeFeedService(database);

    const trendingActivities = await feedService.getTrendingActivities(limit, timeframe);

    return c.json({
      success: true,
      data: {
        activities: trendingActivities,
        metadata: {
          timeframe,
          limit,
          lastUpdated: new Date()
        }
      },
      message: "Actividades en tendencia obtenidas exitosamente"
    });
  } catch (error) {
    console.error("Get trending activities error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error obteniendo actividades en tendencia" });
  }
});

/**
 * Create workout activity (called from workout completion)
 * POST /api/v1/social/feed/workout-activity
 */
social.post("/feed/workout-activity", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const workoutData = await c.req.json();

    if (!workoutData.routineName && !workoutData.duration) {
      throw new HTTPException(400, { 
        message: "Datos de entrenamiento requeridos: routineName o duration" 
      });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const feedService = new RealTimeFeedService(database);

    // Get user profile data
    const userProfile = await database`
      SELECT display_name, avatar_url
      FROM user_profiles
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    const profile = (userProfile as any[])[0];

    const activities = await feedService.createWorkoutActivities(user.id, {
      ...workoutData,
      userName: profile?.display_name || user.firstName || 'Usuario',
      userAvatar: profile?.avatar_url
    });

    // Trigger achievement check
    const achievementsService = new DynamicAchievementsService(database);
    const newAchievements = await achievementsService.processTriggerEvent({
      userId: user.id,
      eventType: 'workout_completed',
      eventData: workoutData,
      timestamp: new Date()
    });

    // Create achievement activities if any were earned
    for (const achievement of newAchievements) {
      await feedService.createActivity({
        userId: user.id,
        userName: profile?.display_name || user.firstName || 'Usuario',
        userAvatar: profile?.avatar_url,
        activityType: 'achievement_earned',
        title: `¡Nuevo logro desbloqueado: ${achievement.nameEs}!`,
        description: achievement.descriptionEs,
        metadata: {
          achievementId: achievement.id,
          achievementRarity: achievement.rarity,
          achievementPoints: achievement.points,
          achievementIcon: achievement.icon
        },
        isHighlighted: achievement.rarity !== 'common',
        mediaUrls: []
      });
    }

    return c.json({
      success: true,
      data: {
        activitiesCreated: activities.length,
        newAchievements: newAchievements.length,
        activities: activities
      },
      message: `${activities.length} actividades creadas exitosamente`
    });
  } catch (error) {
    console.error("Create workout activity error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error creando actividad de entrenamiento" });
  }
});

// ==================== DYNAMIC ACHIEVEMENTS SYSTEM ====================

/**
 * Initialize dynamic achievements system
 * POST /api/v1/social/achievements/initialize
 */
social.post("/achievements/initialize", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    // Only allow admin users to initialize achievements
    if (user.role !== "admin") {
      throw new HTTPException(403, { message: "Acceso denegado. Solo administradores." });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const achievementsService = new DynamicAchievementsService(database);

    await achievementsService.initializeDefaultAchievements();

    return c.json({
      success: true,
      message: "Sistema de logros dinámicos inizalizado exitosamente"
    });
  } catch (error) {
    console.error("Initialize achievements error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error inicializando sistema de logros" });
  }
});

/**
 * Get user's dynamic achievement progress
 * GET /api/v1/social/achievements/progress
 */
social.get("/achievements/progress", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const achievementsService = new DynamicAchievementsService(database);

    const [progress, earned] = await Promise.all([
      achievementsService.getUserAchievementProgress(user.id),
      achievementsService.getUserEarnedAchievements(user.id)
    ]);

    // Calculate statistics
    const totalPoints = earned.reduce((sum, achievement) => sum + achievement.points, 0);
    const rarityCount = {
      common: earned.filter(a => a.rarity === 'common').length,
      rare: earned.filter(a => a.rarity === 'rare').length,
      epic: earned.filter(a => a.rarity === 'epic').length,
      legendary: earned.filter(a => a.rarity === 'legendary').length
    };

    const categoryCount = {
      strength: earned.filter(a => a.category === 'strength').length,
      endurance: earned.filter(a => a.category === 'endurance').length,
      consistency: earned.filter(a => a.category === 'consistency').length,
      social: earned.filter(a => a.category === 'social').length,
      milestone: earned.filter(a => a.category === 'milestone').length,
      special: earned.filter(a => a.category === 'special').length
    };

    return c.json({
      success: true,
      data: {
        earnedAchievements: earned,
        progressTracker: progress,
        statistics: {
          totalEarned: earned.length,
          totalPoints,
          rarityBreakdown: rarityCount,
          categoryBreakdown: categoryCount,
          recentlyEarned: earned.slice(0, 5), // Most recent 5
          closestToEarning: progress
            .filter(p => !p.isCompleted && p.progress > 50)
            .sort((a, b) => b.progress - a.progress)
            .slice(0, 3)
        }
      },
      message: "Progreso de logros obtenido exitosamente"
    });
  } catch (error) {
    console.error("Get achievement progress error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error obteniendo progreso de logros" });
  }
});

/**
 * Trigger achievement check manually
 * POST /api/v1/social/achievements/trigger
 */
social.post("/achievements/trigger", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const { eventType, eventData } = await c.req.json();

    if (!eventType) {
      throw new HTTPException(400, { message: "eventType es requerido" });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const achievementsService = new DynamicAchievementsService(database);

    const newAchievements = await achievementsService.processTriggerEvent({
      userId: user.id,
      eventType,
      eventData: eventData || {},
      timestamp: new Date()
    });

    return c.json({
      success: true,
      data: {
        newAchievements,
        count: newAchievements.length
      },
      message: newAchievements.length > 0 
        ? `¡Felicidades! Has obtenido ${newAchievements.length} nuevo(s) logro(s)`
        : "No hay nuevos logros disponibles en este momento"
    });
  } catch (error) {
    console.error("Trigger achievements error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error procesando logros" });
  }
});

/**
 * Create custom achievement (Premium/Pro feature)
 * POST /api/v1/social/achievements/custom
 */
social.post("/achievements/custom", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    // Check if user has premium/pro plan for creating custom achievements
    if (user.plan === "free") {
      throw new HTTPException(402, {
        message: "Plan Premium o Pro requerido para crear logros personalizados",
      });
    }

    const achievementData = await c.req.json();

    // Validate required fields
    if (!achievementData.name || !achievementData.nameEs || !achievementData.conditions) {
      throw new HTTPException(400, {
        message: "Campos requeridos: name, nameEs, conditions"
      });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const achievementsService = new DynamicAchievementsService(database);

    const customAchievement = await achievementsService.createCustomAchievement(
      user.id,
      {
        name: achievementData.name,
        nameEs: achievementData.nameEs,
        description: achievementData.description || '',
        descriptionEs: achievementData.descriptionEs || '',
        category: achievementData.category || 'special',
        rarity: achievementData.rarity || 'common',
        points: Math.min(achievementData.points || 10, 100), // Cap at 100 points
        icon: achievementData.icon || '🏆',
        conditions: achievementData.conditions,
        isSecret: achievementData.isSecret || false,
        isRepeatable: achievementData.isRepeatable || false,
        cooldownDays: achievementData.cooldownDays,
        prerequisites: achievementData.prerequisites || []
      }
    );

    return c.json({
      success: true,
      data: customAchievement,
      message: "Logro personalizado creado exitosamente"
    });
  } catch (error) {
    console.error("Create custom achievement error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error creando logro personalizado" });
  }
});

export default social;
