// Configuración de base de datos para Neon PostgreSQL
import { neon } from "@neondatabase/serverless";

export type DatabaseClient = ReturnType<typeof neon>;

export function createDatabaseClient(connectionString: string): DatabaseClient {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return neon(connectionString);
}

// Tipos de base de datos basados en el esquema
export interface User {
  id: string;
  email: string;
  name: string;
  clerk_user_id?: string;
  user_role: "user" | "admin";
  auth_provider: "clerk";
  subscription_plan: "free" | "premium" | "pro";
  profile_picture_url?: string;
  date_of_birth?: string;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  fitness_level?: "beginner" | "intermediate" | "advanced";
  goals?: string[];
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  is_active: boolean;
  deleted_at?: string;
  // Legacy fields for backwards compatibility
  password_hash?: string;
  plan?: "free" | "premium" | "pro";
}

export interface Exercise {
  id: string;
  name: string;
  name_es?: string;
  category?: string;
  category_id?: string;
  muscle_groups: string[];
  equipment: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  difficulty_level?: "beginner" | "intermediate" | "advanced";
  instructions?: string | string[];
  instructions_es?: string[];
  tips?: string[];
  tips_es?: string[];
  common_mistakes?: string[];
  common_mistakes_es?: string[];
  video_url?: string;
  image_urls?: string[];
  is_compound?: boolean;
  calories_per_minute?: number;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration_weeks?: number;
  days_per_week?: number;
  goals?: string[];
  equipment_needed?: string[];
  generated_by_ai: boolean;
  ai_prompt?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineDay {
  id: string;
  routine_id: string;
  day_of_week: number;
  name: string;
  description?: string;
  estimated_duration_minutes?: number;
  created_at: string;
}

export interface RoutineExercise {
  id: string;
  routine_day_id: string;
  exercise_id: string;
  order_in_day: number;
  target_sets?: number;
  target_reps_min?: number;
  target_reps_max?: number;
  target_weight_kg?: number;
  rest_time_seconds?: number;
  rpe_target?: number;
  notes?: string;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_id?: string;
  routine_day_id?: string;
  name: string;
  started_at: string;
  completed_at?: string;
  duration_minutes?: number;
  total_volume_kg?: number;
  average_rpe?: number;
  notes?: string;
  mood?: "terrible" | "bad" | "okay" | "good" | "amazing";
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_session_id: string;
  exercise_id: string;
  set_number: number;
  reps?: number;
  weight_kg?: number;
  rest_time_seconds?: number;
  rpe?: number;
  notes?: string;
  completed_at: string;
  created_at: string;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  record_type: "1rm" | "volume" | "reps" | "time";
  value: number;
  unit: string;
  workout_session_id?: string;
  achieved_at: string;
  created_at: string;
}

export interface AIUsage {
  id: string;
  user_id: string;
  feature: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
  model?: string;
  request_data?: any;
  response_data?: any;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  name_es: string;
  description?: string;
  description_es?: string;
  icon?: string;
  criteria?: any; // JSON object with achievement criteria
  points: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  created_at: string;
  // Joined achievement data
  achievement?: Achievement;
}

// Funciones auxiliares para queries comunes
export async function getUserByEmail(
  sql: DatabaseClient,
  email: string
): Promise<User | null> {
  try {
    const result = await sql`
      SELECT * FROM users 
      WHERE email = ${email} AND is_active = true AND deleted_at IS NULL
      LIMIT 1
    `;
    return result[0] || null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
}

export async function getUserByClerkId(
  sql: DatabaseClient,
  clerkUserId: string
): Promise<User | null> {
  try {
    const result = await sql`
      SELECT * FROM users 
      WHERE clerk_user_id = ${clerkUserId} AND is_active = true AND deleted_at IS NULL
      LIMIT 1
    `;
    return result[0] || null;
  } catch (error) {
    console.error("Error getting user by Clerk ID:", error);
    throw error;
  }
}

export async function getUserById(
  sql: DatabaseClient,
  userId: string
): Promise<User | null> {
  try {
    const result = await sql`
      SELECT * FROM users 
      WHERE id = ${userId} AND is_active = true AND deleted_at IS NULL
      LIMIT 1
    `;
    return result[0] || null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
}

export async function createUser(
  sql: DatabaseClient,
  userData: Omit<User, "id" | "created_at" | "updated_at" | "is_active">
): Promise<User> {
  try {
    const result = await sql`
      INSERT INTO users (
        email, 
        name, 
        clerk_user_id, 
        user_role, 
        auth_provider, 
        subscription_plan, 
        profile_picture_url, 
        date_of_birth, 
        gender, 
        height_cm, 
        weight_kg, 
        fitness_level, 
        goals
      )
      VALUES (
        ${userData.email}, 
        ${userData.name}, 
        ${userData.clerk_user_id || null}, 
        ${userData.user_role || "user"}, 
        ${userData.auth_provider || "clerk"}, 
        ${userData.subscription_plan || "free"}, 
        ${userData.profile_picture_url || null}, 
        ${userData.date_of_birth || null}, 
        ${userData.gender || null}, 
        ${userData.height_cm || null}, 
        ${userData.weight_kg || null}, 
        ${userData.fitness_level || null}, 
        ${userData.goals || null}
      )
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}


export async function getExercises(
  sql: DatabaseClient,
  filters?: {
    category?: string;
    muscle_group?: string;
    equipment?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Exercise[]> {
  try {
    // Optimized query with proper indexing hints
    let whereConditions: string[] = ['1=1'];
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    if (filters?.category) {
      whereConditions.push(`category_id = '${filters.category.replace(/'/g, "''")}'`);
    }

    if (filters?.muscle_group) {
      whereConditions.push(`'${filters.muscle_group.replace(/'/g, "''")}' = ANY(muscle_groups)`);
    }

    if (filters?.equipment) {
      whereConditions.push(`equipment = '${filters.equipment.replace(/'/g, "''")}'`);
    }

    if (filters?.difficulty) {
      whereConditions.push(`difficulty = '${filters.difficulty.replace(/'/g, "''")}'`);
    }

    const query = `
      SELECT * FROM exercises 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY name_es NULLS LAST
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const result = await sql.unsafe(query);
    return Array.isArray(result) ? result as Exercise[] : [];
  } catch (error) {
    console.error("Error getting exercises:", error);
    throw error;
  }
}

export async function getUserRoutines(
  sql: DatabaseClient,
  userId: string
): Promise<Routine[]> {
  try {
    const result = (await sql`
      SELECT * FROM routines 
      WHERE user_id = ${userId} AND is_active = true 
      ORDER BY created_at DESC
    `) as any;
    return result as Routine[];
  } catch (error) {
    console.error("Error getting user routines:", error);
    throw error;
  }
}

export async function createWorkoutSession(
  sql: DatabaseClient,
  sessionData: {
    user_id: string;
    routine_id?: string;
    routine_day_id?: string;
    name: string;
  }
): Promise<WorkoutSession> {
  try {
    const result = await sql`
      INSERT INTO workout_sessions (user_id, routine_id, routine_day_id, name, started_at)
      VALUES (${sessionData.user_id}, ${sessionData.routine_id || null}, 
              ${sessionData.routine_day_id || null}, ${sessionData.name}, NOW())
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error("Error creating workout session:", error);
    throw error;
  }
}

export async function completeWorkoutSession(
  sql: DatabaseClient,
  sessionId: string,
  completionData: {
    duration_minutes?: number;
    total_volume_kg?: number;
    average_rpe?: number;
    notes?: string;
    mood?: string;
  }
): Promise<WorkoutSession> {
  try {
    const result = await sql`
      UPDATE workout_sessions 
      SET 
        completed_at = NOW(),
        duration_minutes = ${completionData.duration_minutes || null},
        total_volume_kg = ${completionData.total_volume_kg || null},
        average_rpe = ${completionData.average_rpe || null},
        notes = ${completionData.notes || null},
        mood = ${completionData.mood || null}
      WHERE id = ${sessionId}
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error("Error completing workout session:", error);
    throw error;
  }
}

export async function addWorkoutSet(
  sql: DatabaseClient,
  setData: {
    workout_session_id: string;
    exercise_id: string;
    set_number: number;
    reps?: number;
    weight_kg?: number;
    rest_time_seconds?: number;
    rpe?: number;
    notes?: string;
  }
): Promise<WorkoutSet> {
  try {
    const result = await sql`
      INSERT INTO workout_sets (
        workout_session_id, exercise_id, set_number, reps, weight_kg, 
        rest_time_seconds, rpe, notes, completed_at
      )
      VALUES (
        ${setData.workout_session_id}, ${setData.exercise_id}, ${setData.set_number},
        ${setData.reps || null}, ${setData.weight_kg || null}, 
        ${setData.rest_time_seconds || null}, ${setData.rpe || null}, 
        ${setData.notes || null}, NOW()
      )
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error("Error adding workout set:", error);
    throw error;
  }
}

export async function getUserWorkouts(
  sql: DatabaseClient,
  userId: string,
  limit = 20,
  offset = 0
): Promise<WorkoutSession[]> {
  try {
    // Optimized query with index hint and selective fields
    const result = await sql`
      SELECT 
        id, user_id, routine_id, routine_day_id, name, started_at, completed_at,
        duration_minutes, total_volume_kg, average_rpe, notes, mood, created_at
      FROM workout_sessions 
      WHERE user_id = ${userId}
      ORDER BY started_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    return result as WorkoutSession[];
  } catch (error) {
    console.error("Error getting user workouts:", error);
    throw error;
  }
}

export async function getWorkoutWithSets(
  sql: DatabaseClient,
  sessionId: string,
  userId: string
): Promise<(WorkoutSession & { sets: WorkoutSet[] }) | null> {
  try {
    // Single optimized query with JOIN for better performance
    const result = await sql`
      WITH workout_data AS (
        SELECT * FROM workout_sessions 
        WHERE id = ${sessionId} AND user_id = ${userId}
        LIMIT 1
      ),
      sets_data AS (
        SELECT 
          ws.*,
          e.name as exercise_name,
          e.name_es as exercise_name_es
        FROM workout_sets ws
        JOIN exercises e ON ws.exercise_id = e.id
        WHERE ws.workout_session_id = ${sessionId}
        ORDER BY ws.set_number
      )
      SELECT 
        wd.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sd.id,
              'workout_session_id', sd.workout_session_id,
              'exercise_id', sd.exercise_id,
              'set_number', sd.set_number,
              'reps', sd.reps,
              'weight_kg', sd.weight_kg,
              'rest_time_seconds', sd.rest_time_seconds,
              'rpe', sd.rpe,
              'notes', sd.notes,
              'completed_at', sd.completed_at,
              'created_at', sd.created_at,
              'exercise_name', sd.exercise_name,
              'exercise_name_es', sd.exercise_name_es
            ) ORDER BY sd.set_number
          ) FILTER (WHERE sd.id IS NOT NULL),
          '[]'::json
        ) as sets_json
      FROM workout_data wd
      LEFT JOIN sets_data sd ON true
      GROUP BY wd.id, wd.user_id, wd.routine_id, wd.routine_day_id, wd.name, 
               wd.started_at, wd.completed_at, wd.duration_minutes, wd.total_volume_kg, 
               wd.average_rpe, wd.notes, wd.mood, wd.created_at
    `;

    const rows = result as any[];
    if (rows.length === 0) return null;

    const workout = rows[0];
    return {
      ...workout,
      sets: JSON.parse(workout.sets_json || '[]')
    };
  } catch (error) {
    console.error("Error getting workout with sets:", error);
    throw error;
  }
}

// Achievement functions
export async function getUserAchievements(
  sql: DatabaseClient,
  userId: string
): Promise<UserAchievement[]> {
  try {
    const result = await sql`
      SELECT 
        ua.*,
        a.name,
        a.name_es,
        a.description,
        a.description_es,
        a.icon,
        a.criteria,
        a.points,
        a.rarity
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ${userId}
      ORDER BY ua.earned_at DESC
    `;
    
    const rows = result as any[];
    return rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      achievement_id: row.achievement_id,
      earned_at: row.earned_at,
      created_at: row.created_at,
      achievement: {
        id: row.achievement_id,
        name: row.name,
        name_es: row.name_es,
        description: row.description,
        description_es: row.description_es,
        icon: row.icon,
        criteria: row.criteria,
        points: row.points,
        rarity: row.rarity,
        created_at: row.created_at,
      }
    })) as UserAchievement[];
  } catch (error) {
    console.error("Error getting user achievements:", error);
    throw error;
  }
}

export async function getAvailableAchievements(
  sql: DatabaseClient,
  userId: string
): Promise<Achievement[]> {
  try {
    const result = await sql`
      SELECT a.*
      FROM achievements a
      WHERE a.id NOT IN (
        SELECT achievement_id 
        FROM user_achievements 
        WHERE user_id = ${userId}
      )
      ORDER BY a.rarity, a.name_es
    `;
    
    return result as Achievement[];
  } catch (error) {
    console.error("Error getting available achievements:", error);
    throw error;
  }
}

export async function getAllAchievements(
  sql: DatabaseClient
): Promise<Achievement[]> {
  try {
    const result = await sql`
      SELECT * FROM achievements
      ORDER BY rarity, name_es
    `;
    
    return result as Achievement[];
  } catch (error) {
    console.error("Error getting all achievements:", error);
    throw error;
  }
}

export async function grantAchievement(
  sql: DatabaseClient,
  userId: string,
  achievementId: string
): Promise<UserAchievement | null> {
  try {
    // Check if user already has this achievement
    const existing = await sql`
      SELECT id FROM user_achievements 
      WHERE user_id = ${userId} AND achievement_id = ${achievementId}
    `;
    
    if ((existing as any[]).length > 0) {
      return null; // Already earned
    }
    
    // Grant the achievement
    const result = await sql`
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (${userId}, ${achievementId})
      RETURNING *
    `;
    
    return (result as any[])[0] as UserAchievement;
  } catch (error) {
    console.error("Error granting achievement:", error);
    throw error;
  }
}

export async function checkWorkoutAchievements(
  sql: DatabaseClient,
  userId: string
): Promise<string[]> {
  try {
    const newAchievements: string[] = [];
    
    // Get user's workout count
    const workoutCountResult = await sql`
      SELECT COUNT(*) as count 
      FROM workout_sessions 
      WHERE user_id = ${userId} AND completed_at IS NOT NULL
    `;
    
    const workoutCount = parseInt((workoutCountResult as any[])[0]?.count || '0');
    
    // Check "First Workout" achievement
    if (workoutCount >= 1) {
      const granted = await grantAchievement(sql, userId, '550e8400-e29b-41d4-a716-446655440021');
      if (granted) {
        newAchievements.push('550e8400-e29b-41d4-a716-446655440021');
      }
    }
    
    // Check weekly workout achievements (7 workouts in 7 days)
    const weeklyResult = await sql`
      SELECT COUNT(*) as count
      FROM workout_sessions 
      WHERE user_id = ${userId} 
        AND completed_at IS NOT NULL
        AND started_at >= NOW() - INTERVAL '7 days'
    `;
    
    const weeklyCount = parseInt((weeklyResult as any[])[0]?.count || '0');
    if (weeklyCount >= 7) {
      const granted = await grantAchievement(sql, userId, '550e8400-e29b-41d4-a716-446655440022');
      if (granted) {
        newAchievements.push('550e8400-e29b-41d4-a716-446655440022');
      }
    }
    
    // Check consecutive days (simplified - actual implementation would be more complex)
    // For now, we'll check if user has 30+ total workouts as a placeholder
    if (workoutCount >= 30) {
      const granted = await grantAchievement(sql, userId, '550e8400-e29b-41d4-a716-446655440023');
      if (granted) {
        newAchievements.push('550e8400-e29b-41d4-a716-446655440023');
      }
    }
    
    return newAchievements;
  } catch (error) {
    console.error("Error checking workout achievements:", error);
    throw error;
  }
}

// Health data functions
export async function getHealthMetricsSummary(
  sql: DatabaseClient,
  userId: string,
  days: number = 7
): Promise<any> {
  try {
    // Single optimized query combining health metrics and workout data
    const result = await sql`
      WITH health_metrics_agg AS (
        SELECT 
          metric_type,
          AVG(value) as avg_value,
          MAX(value) as max_value,
          MIN(value) as min_value,
          COUNT(*) as count,
          unit
        FROM health_metrics 
        WHERE user_id = ${userId} 
          AND recorded_at >= NOW() - INTERVAL '${days} days'
        GROUP BY metric_type, unit
      ),
      workout_stats AS (
        SELECT 
          COUNT(*) as total_workouts,
          AVG(duration_minutes) as avg_duration,
          AVG(total_volume_kg) as avg_volume,
          AVG(average_rpe) as avg_rpe
        FROM workout_sessions
        WHERE user_id = ${userId}
          AND completed_at IS NOT NULL
          AND started_at >= NOW() - INTERVAL '${days} days'
      )
      SELECT 
        json_agg(
          json_build_object(
            'metric_type', hma.metric_type,
            'avg_value', hma.avg_value,
            'max_value', hma.max_value,
            'min_value', hma.min_value,
            'count', hma.count,
            'unit', hma.unit
          )
        ) as metrics,
        json_build_object(
          'total_workouts', ws.total_workouts,
          'avg_duration', ws.avg_duration,
          'avg_volume', ws.avg_volume,
          'avg_rpe', ws.avg_rpe
        ) as workouts,
        ${days} as period_days
      FROM health_metrics_agg hma
      CROSS JOIN workout_stats ws
    `;

    const data = (result as any[])[0] || {};
    return {
      metrics: JSON.parse(data.metrics || '[]'),
      workouts: JSON.parse(data.workouts || '{}'),
      period_days: data.period_days || days
    };
  } catch (error) {
    console.error("Error getting health metrics summary:", error);
    throw error;
  }
}

export async function getHealthTrends(
  sql: DatabaseClient,
  userId: string,
  metricType: string,
  days: number = 30
): Promise<any[]> {
  try {
    const trends = await sql`
      SELECT 
        DATE(recorded_at) as date,
        AVG(value) as avg_value,
        COUNT(*) as count
      FROM health_metrics
      WHERE user_id = ${userId}
        AND metric_type = ${metricType}
        AND recorded_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(recorded_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    return trends as any[];
  } catch (error) {
    console.error("Error getting health trends:", error);
    throw error;
  }
}

export async function getRecentSleepData(
  sql: DatabaseClient,
  userId: string,
  days: number = 7
): Promise<any> {
  try {
    const sleepData = await sql`
      SELECT 
        AVG(total_sleep_minutes) as avg_sleep_minutes,
        AVG(sleep_efficiency) as avg_sleep_efficiency,
        AVG(sleep_quality_score) as avg_quality_score,
        COUNT(*) as nights_tracked
      FROM health_sleep_data
      WHERE user_id = ${userId}
        AND sleep_start >= NOW() - INTERVAL '${days} days'
    `;

    return (sleepData as any[])[0] || {};
  } catch (error) {
    console.error("Error getting sleep data:", error);
    throw error;
  }
}

export async function getLatestHRVData(
  sql: DatabaseClient,
  userId: string
): Promise<any> {
  try {
    const hrvData = await sql`
      SELECT *
      FROM health_hrv_data
      WHERE user_id = ${userId}
      ORDER BY recorded_at DESC
      LIMIT 1
    `;

    return (hrvData as any[])[0] || null;
  } catch (error) {
    console.error("Error getting HRV data:", error);
    throw error;
  }
}

// Advanced progress analysis functions
export async function getWorkoutProgressAnalysis(
  sql: DatabaseClient,
  userId: string,
  timeframe: string = "month"
): Promise<any> {
  try {
    let daysBack = 30; // default month
    switch (timeframe) {
      case "week": daysBack = 7; break;
      case "month": daysBack = 30; break;
      case "quarter": daysBack = 90; break;
      case "year": daysBack = 365; break;
    }

    // Get workout sessions with detailed stats
    const workoutSessions = await sql`
      SELECT 
        ws.*,
        COUNT(wst.id) as total_sets,
        AVG(wst.reps) as avg_reps,
        AVG(wst.weight_kg) as avg_weight,
        SUM(wst.reps * wst.weight_kg) as session_volume
      FROM workout_sessions ws
      LEFT JOIN workout_sets wst ON ws.id = wst.workout_session_id
      WHERE ws.user_id = ${userId}
        AND ws.completed_at IS NOT NULL
        AND ws.started_at >= NOW() - INTERVAL '${daysBack} days'
      GROUP BY ws.id
      ORDER BY ws.started_at ASC
    `;

    // Get exercise-specific progress
    const exerciseProgress = await sql`
      SELECT 
        e.id as exercise_id,
        e.name,
        e.name_es,
        COUNT(DISTINCT ws.id) as sessions_count,
        MIN(wst.weight_kg) as starting_weight,
        MAX(wst.weight_kg) as peak_weight,
        AVG(wst.weight_kg) as avg_weight,
        MIN(ws.started_at) as first_session,
        MAX(ws.started_at) as last_session,
        SUM(wst.reps * wst.weight_kg) as total_volume
      FROM workout_sets wst
      JOIN workout_sessions ws ON wst.workout_session_id = ws.id
      JOIN exercises e ON wst.exercise_id = e.id
      WHERE ws.user_id = ${userId}
        AND ws.completed_at IS NOT NULL
        AND ws.started_at >= NOW() - INTERVAL '${daysBack} days'
      GROUP BY e.id, e.name, e.name_es
      HAVING COUNT(DISTINCT ws.id) >= 2
      ORDER BY total_volume DESC
      LIMIT 20
    `;

    return {
      timeframe,
      daysAnalyzed: daysBack,
      workoutSessions: workoutSessions as any[],
      exerciseProgress: exerciseProgress as any[],
      totalSessions: (workoutSessions as any[]).length
    };
  } catch (error) {
    console.error("Error getting workout progress analysis:", error);
    throw error;
  }
}

export async function calculateStrengthGains(
  sql: DatabaseClient,
  userId: string,
  timeframe: string = "month"
): Promise<any[]> {
  try {
    let daysBack = 30;
    switch (timeframe) {
      case "week": daysBack = 7; break;
      case "month": daysBack = 30; break;
      case "quarter": daysBack = 90; break;
      case "year": daysBack = 365; break;
    }

    const strengthGains = await sql`
      WITH exercise_progression AS (
        SELECT 
          e.id,
          e.name,
          e.name_es,
          ws.started_at,
          wst.weight_kg,
          ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY ws.started_at ASC) as session_rank,
          ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY ws.started_at DESC) as reverse_rank
        FROM workout_sets wst
        JOIN workout_sessions ws ON wst.workout_session_id = ws.id
        JOIN exercises e ON wst.exercise_id = e.id
        WHERE ws.user_id = ${userId}
          AND ws.completed_at IS NOT NULL
          AND ws.started_at >= NOW() - INTERVAL '${daysBack} days'
          AND wst.weight_kg IS NOT NULL
      ),
      first_last_weights AS (
        SELECT 
          id,
          name,
          name_es,
          MAX(CASE WHEN session_rank = 1 THEN weight_kg END) as initial_weight,
          MAX(CASE WHEN reverse_rank = 1 THEN weight_kg END) as current_weight
        FROM exercise_progression
        GROUP BY id, name, name_es
      )
      SELECT 
        *,
        CASE 
          WHEN initial_weight > 0 THEN 
            ROUND(((current_weight - initial_weight) / initial_weight * 100)::numeric, 1)
          ELSE 0 
        END as improvement_percentage,
        (current_weight - initial_weight) as absolute_gain
      FROM first_last_weights
      WHERE initial_weight IS NOT NULL 
        AND current_weight IS NOT NULL
        AND initial_weight > 0
      ORDER BY improvement_percentage DESC
      LIMIT 15
    `;

    return strengthGains as any[];
  } catch (error) {
    console.error("Error calculating strength gains:", error);
    throw error;
  }
}

export async function getVolumeProgression(
  sql: DatabaseClient,
  userId: string,
  timeframe: string = "month"
): Promise<any[]> {
  try {
    let daysBack = 30;
    let dateInterval = "1 day";
    
    switch (timeframe) {
      case "week": 
        daysBack = 7; 
        dateInterval = "1 day";
        break;
      case "month": 
        daysBack = 30; 
        dateInterval = "3 days";
        break;
      case "quarter": 
        daysBack = 90; 
        dateInterval = "1 week";
        break;
      case "year": 
        daysBack = 365; 
        dateInterval = "1 month";
        break;
    }

    const volumeProgression = await sql`
      SELECT 
        DATE_TRUNC('day', ws.started_at) as date,
        SUM(wst.reps * wst.weight_kg) as daily_volume,
        COUNT(DISTINCT ws.id) as sessions_count,
        AVG(ws.duration_minutes) as avg_duration
      FROM workout_sessions ws
      JOIN workout_sets wst ON ws.id = wst.workout_session_id
      WHERE ws.user_id = ${userId}
        AND ws.completed_at IS NOT NULL
        AND ws.started_at >= NOW() - INTERVAL '${daysBack} days'
      GROUP BY DATE_TRUNC('day', ws.started_at)
      ORDER BY date ASC
    `;

    return volumeProgression as any[];
  } catch (error) {
    console.error("Error getting volume progression:", error);
    throw error;
  }
}
