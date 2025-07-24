import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  createDatabaseClient,
  getUserByClerkId,
  getUserById,
} from "../db/database";

type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
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

const users = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Get current user profile
users.get("/me", async (c) => {
  try {
    const authUser = c.get("user");
    if (!authUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    // Connect to database
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get user from database by Clerk ID
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: "User profile not found" });
    }

    // Get user profile data
    const profileResult = await sql`
      SELECT * FROM user_profiles 
      WHERE user_id = ${dbUser.id} 
      LIMIT 1
    `;

    // Get user stats
    const workoutStats = await sql`
      SELECT 
        COUNT(*) as workouts_completed,
        COUNT(DISTINCT DATE(started_at)) as unique_days
      FROM workout_sessions 
      WHERE user_id = ${dbUser.id} 
        AND completed_at IS NOT NULL
    `;

    // Get current streak
    const streakResult = await sql`
      WITH daily_workouts AS (
        SELECT DATE(started_at) as workout_date
        FROM workout_sessions
        WHERE user_id = ${dbUser.id} AND completed_at IS NOT NULL
        GROUP BY DATE(started_at)
        ORDER BY workout_date DESC
      ),
      streak_groups AS (
        SELECT 
          workout_date,
          workout_date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY workout_date DESC) as streak_group
        FROM daily_workouts
      )
      SELECT COUNT(*) as current_streak
      FROM streak_groups
      WHERE streak_group = (SELECT MAX(streak_group) FROM streak_groups)
    `;

    // Get personal records count
    const prsResult = await sql`
      SELECT COUNT(*) as prs_set
      FROM personal_records
      WHERE user_id = ${dbUser.id}
    `;

    const userProfile = {
      id: dbUser.id,
      clerkUserId: dbUser.clerk_user_id,
      email: dbUser.email,
      name: dbUser.name,
      plan: dbUser.subscription_plan,
      role: dbUser.user_role,
      profile: profileResult[0]
        ? {
            goals: profileResult[0].goals || [],
            experienceLevel: profileResult[0].experience_level,
            availableDays: profileResult[0].available_days,
            height: profileResult[0].height,
            weight: profileResult[0].weight,
            age: profileResult[0].age,
            equipment: profileResult[0].equipment_access || [],
            workoutLocation: profileResult[0].workout_location,
            injuries: profileResult[0].injuries || [],
          }
        : null,
      stats: {
        workoutsCompleted: Number(workoutStats[0]?.workouts_completed || 0),
        currentStreak: Number(streakResult[0]?.current_streak || 0),
        prsSet: Number(prsResult[0]?.prs_set || 0),
      },
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };

    return c.json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to get user profile" });
  }
});

// Update user profile
users.put("/me", async (c) => {
  try {
    const authUser = c.get("user");
    if (!authUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    const updateData = await c.req.json();

    // Connect to database
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get user from database
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: "User profile not found" });
    }

    // Update basic user info if provided
    if (updateData.name) {
      await sql`
        UPDATE users 
        SET name = ${updateData.name}, updated_at = NOW()
        WHERE id = ${dbUser.id}
      `;
    }

    // Update or create user profile
    const profileData = updateData.profile || {};
    const existingProfile = await sql`
      SELECT id FROM user_profiles WHERE user_id = ${dbUser.id} LIMIT 1
    `;

    if ((existingProfile as any[]).length > 0) {
      // Update existing profile
      await sql`
        UPDATE user_profiles
        SET
          goals = ${profileData.goals || null},
          experience_level = ${profileData.experienceLevel || null},
          available_days = ${profileData.availableDays || null},
          height = ${profileData.height || null},
          weight = ${profileData.weight || null},
          age = ${profileData.age || null},
          equipment_access = ${profileData.equipment || null},
          workout_location = ${profileData.workoutLocation || null},
          injuries = ${profileData.injuries || null},
          updated_at = NOW()
        WHERE user_id = ${dbUser.id}
      `;
    } else {
      // Create new profile
      await sql`
        INSERT INTO user_profiles (
          user_id, goals, experience_level, available_days,
          height, weight, age, equipment_access, workout_location, injuries
        ) VALUES (
          ${dbUser.id},
          ${profileData.goals || null},
          ${profileData.experienceLevel || null},
          ${profileData.availableDays || null},
          ${profileData.height || null},
          ${profileData.weight || null},
          ${profileData.age || null},
          ${profileData.equipment || null},
          ${profileData.workoutLocation || null},
          ${profileData.injuries || null}
        )
      `;
    }

    // Fetch updated data
    const updatedUser = await getUserById(sql, dbUser.id);
    const updatedProfile = await sql`
      SELECT * FROM user_profiles WHERE user_id = ${dbUser.id} LIMIT 1
    `;

    return c.json({
      success: true,
      data: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        name: updatedUser?.name,
        profile: updatedProfile[0] || null,
        updatedAt: updatedUser?.updated_at,
      },
      message: "Perfil actualizado exitosamente",
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to update user profile" });
  }
});

// Get user progress metrics
users.get("/me/progress", async (c) => {
  try {
    const authUser = c.get("user");
    if (!authUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    const period = c.req.query("period") || "last_30_days";

    // Connect to database
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get user from database
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: "User profile not found" });
    }

    // Calculate date range based on period
    let dateFilter = "";
    switch (period) {
      case "last_7_days":
        dateFilter = "started_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case "last_30_days":
        dateFilter = "started_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case "last_90_days":
        dateFilter = "started_at >= CURRENT_DATE - INTERVAL '90 days'";
        break;
      default:
        dateFilter = "started_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    // Get workout metrics
    const metricsResult = await sql.unsafe(`
      SELECT 
        COUNT(*) as total_workouts,
        AVG(duration_minutes) as avg_duration,
        SUM(total_volume_kg) as total_volume,
        AVG(average_rpe) as avg_rpe
      FROM workout_sessions
      WHERE user_id = '${dbUser.id}' 
        AND completed_at IS NOT NULL
        AND ${dateFilter}
    `);

    // Get consistency score (workouts per week)
    const consistencyResult = await sql.unsafe(`
      WITH weekly_workouts AS (
        SELECT 
          DATE_TRUNC('week', started_at) as week,
          COUNT(*) as workout_count
        FROM workout_sessions
        WHERE user_id = '${dbUser.id}' 
          AND completed_at IS NOT NULL
          AND ${dateFilter}
        GROUP BY DATE_TRUNC('week', started_at)
      )
      SELECT 
        AVG(workout_count) as avg_weekly_workouts,
        COUNT(DISTINCT week) as weeks_active
      FROM weekly_workouts
    `);

    // Get recent personal records
    const prsResult = await sql`
      SELECT 
        pr.*, 
        e.name as exercise_name,
        e.category
      FROM personal_records pr
      JOIN exercises e ON pr.exercise_id = e.id
      WHERE pr.user_id = ${dbUser.id}
      ORDER BY pr.achieved_at DESC
      LIMIT 5
    `;

    // Get weekly frequency pattern
    const weeklyPattern = await sql.unsafe(`
      WITH daily_workouts AS (
        SELECT 
          EXTRACT(DOW FROM started_at) as day_of_week,
          COUNT(*) as workout_count
        FROM workout_sessions
        WHERE user_id = '${dbUser.id}' 
          AND completed_at IS NOT NULL
          AND ${dateFilter}
        GROUP BY EXTRACT(DOW FROM started_at)
      )
      SELECT day_of_week, workout_count
      FROM daily_workouts
      ORDER BY day_of_week
    `);

    // Build weekly frequency array (S M T W T F S)
    const days = [false, false, false, false, false, false, false];
    (weeklyPattern as unknown as any[]).forEach((day: any) => {
      days[Number(day.day_of_week)] = Number(day.workout_count) > 0;
    });

    // Get profile for target days
    const profileResult = await sql`
      SELECT available_days FROM user_profiles WHERE user_id = ${dbUser.id} LIMIT 1
    `;
    const targetDays = profileResult[0]?.available_days || 4;

    const metrics = metricsResult[0];
    const consistency = consistencyResult[0];

    return c.json({
      success: true,
      data: {
        period,
        metrics: {
          totalWorkouts: Number(metrics?.total_workouts || 0),
          avgWorkoutDuration: Math.round(Number(metrics?.avg_duration || 0)),
          totalVolume: Math.round(Number(metrics?.total_volume || 0)),
          avgRPE: Number(metrics?.avg_rpe || 0).toFixed(1),
          consistencyScore: Math.min(
            100,
            Math.round(
              (Number(consistency?.avg_weekly_workouts || 0) / targetDays) * 100
            )
          ),
        },
        personalRecords: (prsResult as any[]).map((pr) => ({
          exerciseId: pr.exercise_id,
          exerciseName: pr.exercise_name,
          category: pr.category,
          recordType: pr.record_type,
          value: pr.value,
          unit: pr.unit,
          achievedAt: pr.achieved_at,
        })),
        weeklyFrequency: {
          target: targetDays,
          actual: Number(consistency?.avg_weekly_workouts || 0).toFixed(1),
          days,
        },
      },
    });
  } catch (error) {
    console.error("Get user progress error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to get user progress" });
  }
});

// Update user preferences
users.put("/me/preferences", async (c) => {
  try {
    const authUser = c.get("user");
    if (!authUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    const preferences = await c.req.json();

    // Connect to database
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get user from database
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: "User profile not found" });
    }

    // Store preferences in user_profiles table as JSONB
    const result = await sql`
      UPDATE user_profiles
      SET 
        preferences = ${JSON.stringify(preferences)},
        updated_at = NOW()
      WHERE user_id = ${dbUser.id}
      RETURNING preferences, updated_at
    `;

    if ((result as any[]).length === 0) {
      // If no profile exists, create one
      await sql`
        INSERT INTO user_profiles (user_id, preferences)
        VALUES (${dbUser.id}, ${JSON.stringify(preferences)})
      `;
    }

    return c.json({
      success: true,
      data: {
        userId: dbUser.id,
        preferences,
        updatedAt: result[0]?.updated_at || new Date().toISOString(),
      },
      message: "Preferencias actualizadas exitosamente",
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to update preferences" });
  }
});

// Delete user account (soft delete)
users.delete("/me", async (c) => {
  try {
    const authUser = c.get("user");
    if (!authUser) {
      throw new HTTPException(401, { message: "User not authenticated" });
    }

    // Connect to database
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get user from database
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: "User profile not found" });
    }

    // Soft delete user
    await sql`
      UPDATE users 
      SET 
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE id = ${dbUser.id}
    `;

    return c.json({
      success: true,
      message: "Cuenta eliminada exitosamente",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to delete user account" });
  }
});

export default users;
