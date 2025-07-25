import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { createDatabaseClient } from "../db/database";
import { SocialService } from "../lib/social-service";
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
 * Get social feed
 */
social.get("/feed", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const query: SocialFeedQuery = {
      page: parseInt(c.req.query("page") || "1"),
      limit: parseInt(c.req.query("limit") || "10"),
      feedType: (c.req.query("feedType") as any) || "all",
      contentTypes: c.req.query("contentTypes")?.split(","),
    };

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const socialService = new SocialService(database);

    const result = await socialService.getSocialFeed(user.id, query);

    return c.json({
      success: true,
      data: {
        posts: result.posts,
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

    // TODO: Implementar sistema de logros real con base de datos
    // Esta funcionalidad requiere tablas de achievements y user_achievements
    throw new HTTPException(501, { 
      message: "Sistema de logros no implementado aún. Esta funcionalidad estará disponible próximamente." 
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
 * Get leaderboards
 */
social.get("/leaderboards", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const { period = "weekly", category = "volume" } = c.req.query();

    // Mock leaderboard data
    const leaderboard = [
      {
        rank: 1,
        user: {
          id: "user_1",
          displayName: "Ana PowerLifter",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ana1",
        },
        value: 25680,
        unit: "kg",
        change: "+2",
      },
      {
        rank: 2,
        user: {
          id: "user_2",
          displayName: "Carlos Beast",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos",
        },
        value: 24150,
        unit: "kg",
        change: "-1",
      },
      {
        rank: 47,
        user: {
          id: user.id,
          displayName: "Tú",
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        },
        value: 12450,
        unit: "kg",
        change: "+3",
      },
    ];

    return c.json({
      success: true,
      data: {
        leaderboard,
        userPosition: leaderboard.find((entry) => entry.user.id === user.id),
        metadata: {
          period,
          category,
          totalParticipants: 2847,
          lastUpdated: new Date(),
        },
      },
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

export default social;
