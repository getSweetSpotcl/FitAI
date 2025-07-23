import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createDatabaseClient, getUserRoutines, getUserByClerkId } from '../db/database';

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

const routines = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Get user's routines
routines.get('/', async (c) => {
  try {
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    const userRoutines = await getUserRoutines(sql, dbUser.id);

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
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const routineId = c.req.param('id');
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    // Get routine with ownership check
    const routine = await sql`
      SELECT * FROM routines 
      WHERE id = ${routineId} AND user_id = ${dbUser.id} AND is_active = true
      LIMIT 1
    `;

    if ((routine as any[]).length === 0) {
      throw new HTTPException(404, { message: 'Routine not found' });
    }

    // Get routine data if it's AI-generated
    const routineDetails = routine[0];
    let fullRoutine = routineDetails;

    if (routineDetails.is_ai_generated && routineDetails.routine_data) {
      // Parse the AI-generated routine data
      const aiRoutineData = JSON.parse(routineDetails.routine_data);
      fullRoutine = {
        ...routineDetails,
        aiGenerated: aiRoutineData
      };
    }

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
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const routineData = await c.req.json();
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    // Validate required fields
    if (!routineData.name) {
      throw new HTTPException(400, { message: 'Routine name is required' });
    }

    // Create routine
    const newRoutine = await sql`
      INSERT INTO routines (
        user_id, name, description, difficulty_level, 
        estimated_duration, target_muscle_groups, equipment_needed, 
        is_ai_generated, routine_data
      )
      VALUES (
        ${dbUser.id},
        ${routineData.name},
        ${routineData.description || null},
        ${routineData.difficulty || 'intermediate'},
        ${routineData.estimatedDuration || null},
        ${routineData.targetMuscleGroups || null},
        ${routineData.equipmentNeeded || null},
        ${routineData.isAiGenerated || false},
        ${routineData.routineData ? JSON.stringify(routineData.routineData) : null}
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
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const routineId = c.req.param('id');
    const updateData = await c.req.json();
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    // Check ownership
    const existingRoutine = await sql`
      SELECT id FROM routines 
      WHERE id = ${routineId} AND user_id = ${dbUser.id}
      LIMIT 1
    `;

    if ((existingRoutine as any[]).length === 0) {
      throw new HTTPException(404, { message: 'Routine not found' });
    }

    // Update routine
    const updatedRoutine = await sql`
      UPDATE routines 
      SET 
        name = COALESCE(${updateData.name}, name),
        description = COALESCE(${updateData.description}, description),
        difficulty_level = COALESCE(${updateData.difficulty}, difficulty_level),
        estimated_duration = COALESCE(${updateData.estimatedDuration}, estimated_duration),
        target_muscle_groups = COALESCE(${updateData.targetMuscleGroups}, target_muscle_groups),
        equipment_needed = COALESCE(${updateData.equipmentNeeded}, equipment_needed),
        updated_at = NOW()
      WHERE id = ${routineId} AND user_id = ${dbUser.id}
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
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const routineId = c.req.param('id');
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    // Check ownership and soft delete
    const deletedRoutine = await sql`
      UPDATE routines 
      SET is_active = false, updated_at = NOW()
      WHERE id = ${routineId} AND user_id = ${dbUser.id}
      RETURNING id, name
    `;

    if ((deletedRoutine as any[]).length === 0) {
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

// Start workout from routine
routines.post('/:id/start-workout', async (c) => {
  try {
    const authUser = c.get('user');
    if (!authUser) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const routineId = c.req.param('id');
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, authUser.userId);
    if (!dbUser) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    // Get routine with ownership check
    const routine = await sql`
      SELECT * FROM routines 
      WHERE id = ${routineId} AND user_id = ${dbUser.id} AND is_active = true
      LIMIT 1
    `;

    if ((routine as any[]).length === 0) {
      throw new HTTPException(404, { message: 'Routine not found' });
    }

    // Create workout session
    const workoutSession = await sql`
      INSERT INTO workout_sessions (user_id, routine_id, name, started_at)
      VALUES (${dbUser.id}, ${routineId}, ${routine[0].name}, NOW())
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