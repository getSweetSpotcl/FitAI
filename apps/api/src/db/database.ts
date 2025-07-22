// Configuración de base de datos para Neon PostgreSQL
import { neon } from '@neondatabase/serverless';

export type DatabaseClient = ReturnType<typeof neon>;

export function createDatabaseClient(connectionString: string): DatabaseClient {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  
  return neon(connectionString);
}

// Tipos de base de datos basados en el esquema
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  plan: 'free' | 'premium' | 'pro';
  profile_picture_url?: string;
  date_of_birth?: string;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  fitness_level?: 'beginner' | 'intermediate' | 'advanced';
  goals?: string[];
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  is_active: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  name_es: string;
  category_id: string;
  muscle_groups: string[];
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  instructions_es: string[];
  tips: string[];
  tips_es: string[];
  common_mistakes: string[];
  common_mistakes_es: string[];
  video_url?: string;
  image_urls?: string[];
  is_compound: boolean;
  calories_per_minute?: number;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
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
  mood?: 'terrible' | 'bad' | 'okay' | 'good' | 'amazing';
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
  record_type: '1rm' | 'volume' | 'reps' | 'time';
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

// Funciones auxiliares para queries comunes
export async function getUserByEmail(sql: DatabaseClient, email: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT * FROM users 
      WHERE email = ${email} AND is_active = true 
      LIMIT 1
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

export async function createUser(sql: DatabaseClient, userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<User> {
  try {
    const result = await sql`
      INSERT INTO users (email, password_hash, name, plan, profile_picture_url, date_of_birth, gender, height_cm, weight_kg, fitness_level, goals)
      VALUES (${userData.email}, ${userData.password_hash}, ${userData.name}, ${userData.plan}, ${userData.profile_picture_url || null}, 
              ${userData.date_of_birth || null}, ${userData.gender || null}, ${userData.height_cm || null}, 
              ${userData.weight_kg || null}, ${userData.fitness_level || null}, ${userData.goals || null})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getExercises(sql: DatabaseClient, filters?: {
  category?: string;
  muscle_group?: string;
  equipment?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}): Promise<Exercise[]> {
  try {
    let query = `SELECT * FROM exercises WHERE 1=1`;
    const params: any[] = [];
    
    if (filters?.category) {
      query += ` AND category_id = $${params.length + 1}`;
      params.push(filters.category);
    }
    
    if (filters?.muscle_group) {
      query += ` AND $${params.length + 1} = ANY(muscle_groups)`;
      params.push(filters.muscle_group);
    }
    
    if (filters?.equipment) {
      query += ` AND equipment = $${params.length + 1}`;
      params.push(filters.equipment);
    }
    
    if (filters?.difficulty) {
      query += ` AND difficulty = $${params.length + 1}`;
      params.push(filters.difficulty);
    }
    
    query += ` ORDER BY name_es`;
    
    if (filters?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(filters.limit);
    }
    
    if (filters?.offset) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(filters.offset);
    }
    
    // Para queries dinámicas con Neon, necesitamos usar sql.unsafe
    const result = await sql.unsafe(query, params);
    return result;
  } catch (error) {
    console.error('Error getting exercises:', error);
    throw error;
  }
}

export async function getUserRoutines(sql: DatabaseClient, userId: string): Promise<Routine[]> {
  try {
    const result = await sql`
      SELECT * FROM routines 
      WHERE user_id = ${userId} AND is_active = true 
      ORDER BY created_at DESC
    `;
    return result;
  } catch (error) {
    console.error('Error getting user routines:', error);
    throw error;
  }
}

export async function createWorkoutSession(sql: DatabaseClient, sessionData: {
  user_id: string;
  routine_id?: string;
  routine_day_id?: string;
  name: string;
}): Promise<WorkoutSession> {
  try {
    const result = await sql`
      INSERT INTO workout_sessions (user_id, routine_id, routine_day_id, name, started_at)
      VALUES (${sessionData.user_id}, ${sessionData.routine_id || null}, 
              ${sessionData.routine_day_id || null}, ${sessionData.name}, NOW())
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Error creating workout session:', error);
    throw error;
  }
}

export async function completeWorkoutSession(sql: DatabaseClient, sessionId: string, completionData: {
  duration_minutes?: number;
  total_volume_kg?: number;
  average_rpe?: number;
  notes?: string;
  mood?: string;
}): Promise<WorkoutSession> {
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
    console.error('Error completing workout session:', error);
    throw error;
  }
}

export async function addWorkoutSet(sql: DatabaseClient, setData: {
  workout_session_id: string;
  exercise_id: string;
  set_number: number;
  reps?: number;
  weight_kg?: number;
  rest_time_seconds?: number;
  rpe?: number;
  notes?: string;
}): Promise<WorkoutSet> {
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
    console.error('Error adding workout set:', error);
    throw error;
  }
}

export async function getUserWorkouts(sql: DatabaseClient, userId: string, limit = 20, offset = 0): Promise<WorkoutSession[]> {
  try {
    const result = await sql`
      SELECT * FROM workout_sessions 
      WHERE user_id = ${userId}
      ORDER BY started_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    return result;
  } catch (error) {
    console.error('Error getting user workouts:', error);
    throw error;
  }
}

export async function getWorkoutWithSets(sql: DatabaseClient, sessionId: string, userId: string): Promise<WorkoutSession & { sets: WorkoutSet[] } | null> {
  try {
    // Get workout session
    const sessionResult = await sql`
      SELECT * FROM workout_sessions 
      WHERE id = ${sessionId} AND user_id = ${userId}
      LIMIT 1
    `;

    if (sessionResult.length === 0) {
      return null;
    }

    // Get workout sets with exercise info
    const setsResult = await sql`
      SELECT 
        ws.*,
        e.name as exercise_name,
        e.name_es as exercise_name_es
      FROM workout_sets ws
      JOIN exercises e ON ws.exercise_id = e.id
      WHERE ws.workout_session_id = ${sessionId}
      ORDER BY ws.set_number
    `;

    return {
      ...sessionResult[0],
      sets: setsResult,
    };
  } catch (error) {
    console.error('Error getting workout with sets:', error);
    throw error;
  }
}