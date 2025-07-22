import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middleware/auth';
import { createDatabaseClient, getUserRoutines } from '../db/database';

type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: 'free' | 'premium' | 'pro';
  };
};

const routines = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes
routines.use('*', authMiddleware);

// Get user's routines
routines.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const userRoutines = await getUserRoutines(sql, user.id);

    return c.json({
      success: true,
      data: userRoutines,
    });

  } catch (error) {
    console.error('Get routines error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to get routines' });
  }
});

// Get specific routine with exercises
routines.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const routineId = c.req.param('id');
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get routine with ownership check
    const routine = await sql`
      SELECT * FROM routines 
      WHERE id = ${routineId} AND user_id = ${user.id} AND is_active = true
      LIMIT 1
    `;

    if (routine.length === 0) {
      throw new HTTPException(404, { message: 'Routine not found' });
    }

    // Get routine days
    const routineDays = await sql`
      SELECT * FROM routine_days 
      WHERE routine_id = ${routineId}
      ORDER BY day_of_week
    `;

    // Get exercises for each day
    const routineWithDays = await Promise.all(
      routineDays.map(async (day) => {
        const exercises = await sql`
          SELECT 
            re.*,
            e.name,
            e.name_es,
            e.muscle_groups,
            e.equipment,
            e.difficulty,
            e.instructions_es,
            e.tips_es
          FROM routine_exercises re
          JOIN exercises e ON re.exercise_id = e.id
          WHERE re.routine_day_id = ${day.id}
          ORDER BY re.order_in_day
        `;

        return {
          ...day,
          exercises,
        };
      })
    );

    const fullRoutine = {
      ...routine[0],
      days: routineWithDays,
    };

    return c.json({
      success: true,
      data: fullRoutine,
    });

  } catch (error) {
    console.error('Get routine error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to get routine' });
  }
});

// Create new routine
routines.post('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const routineData = await c.req.json();
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Validate required fields
    if (!routineData.name) {
      throw new HTTPException(400, { message: 'Routine name is required' });
    }

    // Create routine
    const newRoutine = await sql`
      INSERT INTO routines (user_id, name, description, difficulty, duration_weeks, days_per_week, goals, equipment_needed, generated_by_ai)
      VALUES (
        ${user.id},
        ${routineData.name},
        ${routineData.description || null},
        ${routineData.difficulty || 'intermediate'},
        ${routineData.duration_weeks || null},
        ${routineData.days_per_week || null},
        ${routineData.goals || null},
        ${routineData.equipment_needed || null},
        ${routineData.generated_by_ai || false}
      )
      RETURNING *
    `;

    return c.json({
      success: true,
      data: newRoutine[0],
      message: 'Rutina creada exitosamente',
    }, 201);

  } catch (error) {
    console.error('Create routine error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to create routine' });
  }
});

// Update routine
routines.put('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const routineId = c.req.param('id');
    const updateData = await c.req.json();
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Check ownership
    const existingRoutine = await sql`
      SELECT id FROM routines 
      WHERE id = ${routineId} AND user_id = ${user.id}
      LIMIT 1
    `;

    if (existingRoutine.length === 0) {
      throw new HTTPException(404, { message: 'Routine not found' });
    }

    // Update routine
    const updatedRoutine = await sql`
      UPDATE routines 
      SET 
        name = COALESCE(${updateData.name}, name),
        description = COALESCE(${updateData.description}, description),
        difficulty = COALESCE(${updateData.difficulty}, difficulty),
        duration_weeks = COALESCE(${updateData.duration_weeks}, duration_weeks),
        days_per_week = COALESCE(${updateData.days_per_week}, days_per_week),
        goals = COALESCE(${updateData.goals}, goals),
        equipment_needed = COALESCE(${updateData.equipment_needed}, equipment_needed),
        updated_at = NOW()
      WHERE id = ${routineId} AND user_id = ${user.id}
      RETURNING *
    `;

    return c.json({
      success: true,
      data: updatedRoutine[0],
      message: 'Rutina actualizada exitosamente',
    });

  } catch (error) {
    console.error('Update routine error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to update routine' });
  }
});

// Delete routine (soft delete)
routines.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const routineId = c.req.param('id');
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Check ownership and soft delete
    const deletedRoutine = await sql`
      UPDATE routines 
      SET is_active = false, updated_at = NOW()
      WHERE id = ${routineId} AND user_id = ${user.id}
      RETURNING id, name
    `;

    if (deletedRoutine.length === 0) {
      throw new HTTPException(404, { message: 'Routine not found' });
    }

    return c.json({
      success: true,
      message: 'Rutina eliminada exitosamente',
    });

  } catch (error) {
    console.error('Delete routine error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to delete routine' });
  }
});

// Add exercise to routine day
routines.post('/:id/days/:dayId/exercises', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const routineId = c.req.param('id');
    const dayId = c.req.param('dayId');
    const exerciseData = await c.req.json();
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Validate ownership
    const routine = await sql`
      SELECT id FROM routines 
      WHERE id = ${routineId} AND user_id = ${user.id}
      LIMIT 1
    `;

    if (routine.length === 0) {
      throw new HTTPException(404, { message: 'Routine not found' });
    }

    // Add exercise to routine day
    const newExercise = await sql`
      INSERT INTO routine_exercises (
        routine_day_id, 
        exercise_id, 
        order_in_day, 
        target_sets, 
        target_reps_min, 
        target_reps_max, 
        target_weight_kg, 
        rest_time_seconds, 
        rpe_target, 
        notes
      )
      VALUES (
        ${dayId},
        ${exerciseData.exercise_id},
        ${exerciseData.order_in_day},
        ${exerciseData.target_sets || null},
        ${exerciseData.target_reps_min || null},
        ${exerciseData.target_reps_max || null},
        ${exerciseData.target_weight_kg || null},
        ${exerciseData.rest_time_seconds || null},
        ${exerciseData.rpe_target || null},
        ${exerciseData.notes || null}
      )
      RETURNING *
    `;

    return c.json({
      success: true,
      data: newExercise[0],
      message: 'Ejercicio añadido a la rutina',
    }, 201);

  } catch (error) {
    console.error('Add exercise to routine error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to add exercise to routine' });
  }
});

// Start workout from routine
routines.post('/:id/start-workout', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const routineId = c.req.param('id');
    const { dayId } = await c.req.json();
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get routine day with exercises
    const routineDay = await sql`
      SELECT 
        rd.*,
        r.name as routine_name
      FROM routine_days rd
      JOIN routines r ON rd.routine_id = r.id
      WHERE rd.id = ${dayId} AND r.user_id = ${user.id}
      LIMIT 1
    `;

    if (routineDay.length === 0) {
      throw new HTTPException(404, { message: 'Routine day not found' });
    }

    // Create workout session
    const workoutSession = await sql`
      INSERT INTO workout_sessions (user_id, routine_id, routine_day_id, name, started_at)
      VALUES (${user.id}, ${routineId}, ${dayId}, ${routineDay[0].routine_name + ' - ' + routineDay[0].name}, NOW())
      RETURNING *
    `;

    return c.json({
      success: true,
      data: workoutSession[0],
      message: 'Entrenamiento iniciado',
    }, 201);

  } catch (error) {
    console.error('Start workout error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to start workout' });
  }
});

export default routines;