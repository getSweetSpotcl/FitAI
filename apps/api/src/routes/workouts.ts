import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { 
  createDatabaseClient, 
  getUserWorkouts, 
  getWorkoutWithSets,
  createWorkoutSession,
  completeWorkoutSession,
  addWorkoutSet,
  getUserByClerkId 
} from '../db/database';

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
    role: 'user' | 'admin';
    plan: 'free' | 'premium' | 'pro';
  };
};

const workouts = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Get user's workouts
workouts.get('/', async (c) => {
  try {
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    const userWorkouts = await getUserWorkouts(sql, dbUser.id, limit, offset);

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total 
      FROM workout_sessions 
      WHERE user_id = ${dbUser.id}
    `;

    return c.json({
      success: true,
      data: userWorkouts,
      pagination: {
        limit,
        offset,
        total: Number(countResult[0]?.total || 0),
      },
    });

  } catch (error) {
    console.error('Get workouts error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to get workouts' });
  }
});

// Create new workout session
workouts.post('/', async (c) => {
  try {
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const workoutData = await c.req.json();
    
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    // Validate required data
    if (!workoutData.name) {
      throw new HTTPException(400, { message: 'Workout name is required' });
    }

    // Create workout session
    const newWorkout = await createWorkoutSession(sql, {
      user_id: dbUser.id,
      routine_id: workoutData.routineId,
      routine_day_id: workoutData.routineDayId,
      name: workoutData.name,
    });

    return c.json({
      success: true,
      data: newWorkout,
      message: 'Sesión de entrenamiento creada exitosamente',
    }, 201);

  } catch (error) {
    console.error('Create workout error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to create workout' });
  }
});

// Get specific workout with sets
workouts.get('/:id', async (c) => {
  try {
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const workoutId = c.req.param('id');
    
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    // Get workout with sets
    const workout = await getWorkoutWithSets(sql, workoutId, dbUser.id);
    if (!workout) {
      throw new HTTPException(404, { message: 'Workout not found' });
    }

    return c.json({
      success: true,
      data: workout,
    });

  } catch (error) {
    console.error('Get workout error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to get workout' });
  }
});

// Add exercise set to workout
workouts.post('/:id/sets', async (c) => {
  try {
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const workoutId = c.req.param('id');
    const setData = await c.req.json();
    
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    // Verify workout ownership
    const workoutCheck = await sql`
      SELECT id FROM workout_sessions 
      WHERE id = ${workoutId} AND user_id = ${dbUser.id}
      LIMIT 1
    `;
    
    if ((workoutCheck as any[]).length === 0) {
      throw new HTTPException(404, { message: 'Workout not found' });
    }

    // Validate required data
    if (!setData.exerciseId || typeof setData.setNumber !== 'number') {
      throw new HTTPException(400, { message: 'Exercise ID and set number are required' });
    }

    // Add workout set
    const newSet = await addWorkoutSet(sql, {
      workout_session_id: workoutId,
      exercise_id: setData.exerciseId,
      set_number: setData.setNumber,
      reps: setData.reps,
      weight_kg: setData.weightKg,
      rest_time_seconds: setData.restTimeSeconds,
      rpe: setData.rpe,
      notes: setData.notes,
    });

    return c.json({
      success: true,
      data: newSet,
      message: 'Serie agregada exitosamente',
    });

  } catch (error) {
    console.error('Add workout set error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to add workout set' });
  }
});

// Complete workout session
workouts.post('/:id/complete', async (c) => {
  try {
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const workoutId = c.req.param('id');
    const completionData = await c.req.json();
    
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    // Verify workout ownership and get start time
    const workoutCheck = await sql`
      SELECT id, started_at FROM workout_sessions 
      WHERE id = ${workoutId} AND user_id = ${dbUser.id} AND completed_at IS NULL
      LIMIT 1
    `;
    
    if ((workoutCheck as any[]).length === 0) {
      throw new HTTPException(404, { message: 'Active workout not found' });
    }

    // Calculate duration if not provided
    let duration = completionData.duration;
    if (!duration && workoutCheck[0].started_at) {
      const startTime = new Date(workoutCheck[0].started_at).getTime();
      const endTime = new Date().getTime();
      duration = Math.round((endTime - startTime) / (1000 * 60)); // minutes
    }

    // Calculate total volume if not provided
    let totalVolume = completionData.totalVolume;
    if (totalVolume === undefined) {
      const volumeResult = await sql`
        SELECT SUM(reps * weight_kg) as total_volume
        FROM workout_sets
        WHERE workout_session_id = ${workoutId}
      `;
      totalVolume = Number(volumeResult[0]?.total_volume || 0);
    }

    // Calculate average RPE
    const rpeResult = await sql`
      SELECT AVG(rpe) as avg_rpe
      FROM workout_sets
      WHERE workout_session_id = ${workoutId} AND rpe IS NOT NULL
    `;
    const avgRpe = Number(rpeResult[0]?.avg_rpe || 0);

    // Complete the workout
    const completedWorkout = await completeWorkoutSession(sql, workoutId, {
      duration_minutes: duration,
      total_volume_kg: totalVolume,
      average_rpe: avgRpe,
      notes: completionData.notes,
      mood: completionData.mood,
    });

    return c.json({
      success: true,
      data: completedWorkout,
      message: 'Entrenamiento completado exitosamente',
    });

  } catch (error) {
    console.error('Complete workout error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to complete workout' });
  }
});

// Get workout statistics
workouts.get('/stats/summary', async (c) => {
  try {
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const period = c.req.query('period') || 'month';
    
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    // Calculate date range
    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "started_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "started_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "started_at >= CURRENT_DATE - INTERVAL '1 year'";
        break;
      default:
        dateFilter = "started_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    // Get general stats
    const statsResult = await sql.unsafe(`
      SELECT 
        COUNT(*) as total_workouts,
        SUM(total_volume_kg) as total_volume,
        AVG(duration_minutes) as avg_duration,
        COUNT(DISTINCT DATE(started_at)) as unique_days
      FROM workout_sessions
      WHERE user_id = '${dbUser.id}' 
        AND completed_at IS NOT NULL
        AND ${dateFilter}
    `);

    // Get consistency (workouts per week average)
    const weeksInPeriod = period === 'week' ? 1 : period === 'month' ? 4 : 52;
    const consistency = Math.min(100, Math.round(
      (Number(statsResult[0]?.unique_days || 0) / (weeksInPeriod * 7)) * 100
    ));

    // Get top exercises
    const topExercisesResult = await sql.unsafe(`
      SELECT 
        e.name,
        e.name_es,
        COUNT(DISTINCT ws.workout_session_id) as sessions,
        MAX(ws.weight_kg) as max_weight,
        SUM(ws.reps * ws.weight_kg) as total_volume
      FROM workout_sets ws
      JOIN exercises e ON ws.exercise_id = e.id
      JOIN workout_sessions w ON ws.workout_session_id = w.id
      WHERE w.user_id = '${dbUser.id}' 
        AND w.completed_at IS NOT NULL
        AND ${dateFilter}
      GROUP BY e.id, e.name, e.name_es
      ORDER BY sessions DESC, total_volume DESC
      LIMIT 5
    `);

    const stats = statsResult[0];

    return c.json({
      success: true,
      data: {
        period,
        totalWorkouts: Number(stats?.total_workouts || 0),
        totalVolume: Math.round(Number(stats?.total_volume || 0)),
        avgDuration: Math.round(Number(stats?.avg_duration || 0)),
        consistency,
        topExercises: (topExercisesResult as unknown as any[]).map(ex => ({
          name: ex.name_es || ex.name,
          sessions: Number(ex.sessions),
          maxWeight: Number(ex.max_weight),
          totalVolume: Math.round(Number(ex.total_volume)),
        })),
      },
    });

  } catch (error) {
    console.error('Get workout stats error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to get workout stats' });
  }
});

export default workouts;