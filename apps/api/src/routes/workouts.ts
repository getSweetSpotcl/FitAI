import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middleware/auth';
import { 
  createDatabaseClient, 
  getUserWorkouts, 
  getWorkoutWithSets,
  createWorkoutSession,
  completeWorkoutSession,
  addWorkoutSet 
} from '../db/database';

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

const workouts = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes
workouts.use('*', authMiddleware);

// Get user's workouts
workouts.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    const userWorkouts = await getUserWorkouts(sql, user.id, limit, offset);

    return c.json({
      success: true,
      data: userWorkouts,
      pagination: {
        limit,
        offset,
        total: userWorkouts.length, // TODO: Implement proper count
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

// Create new workout
workouts.post('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const workoutData = await c.req.json();

    // TODO: Validate and save to database
    const newWorkout = {
      id: `workout_${Date.now()}`,
      userId: user.id,
      name: workoutData.name || 'Unnamed Workout',
      startedAt: new Date().toISOString(),
      exercises: workoutData.exercises || [],
      createdAt: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: newWorkout,
      message: 'Workout created successfully',
    }, 201);

  } catch (error) {
    console.error('Create workout error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to create workout' });
  }
});

// Get specific workout
workouts.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const workoutId = c.req.param('id');

    // TODO: Fetch from database with user ownership check
    const mockWorkout = {
      id: workoutId,
      userId: user.id,
      name: 'Push Day',
      startedAt: '2024-12-30T09:00:00Z',
      completedAt: '2024-12-30T09:45:00Z',
      duration: 45,
      exercises: [
        {
          id: 'ex1',
          exerciseId: 'bench_press',
          exerciseName: 'Bench Press',
          sets: [
            { reps: 10, weight: 175, completed: true, rpe: 7 },
            { reps: 8, weight: 180, completed: true, rpe: 8 },
            { reps: 6, weight: 185, completed: true, rpe: 9 },
          ],
          restTime: 180,
        },
      ],
      totalVolume: 2450,
      notes: 'Good session, felt strong on bench',
    };

    return c.json({
      success: true,
      data: mockWorkout,
    });

  } catch (error) {
    console.error('Get workout error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to get workout' });
  }
});

// Update workout
workouts.put('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const workoutId = c.req.param('id');
    const updateData = await c.req.json();

    // TODO: Update in database with user ownership check
    const updatedWorkout = {
      id: workoutId,
      userId: user.id,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: updatedWorkout,
      message: 'Workout updated successfully',
    });

  } catch (error) {
    console.error('Update workout error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to update workout' });
  }
});

// Complete workout
workouts.post('/:id/complete', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const workoutId = c.req.param('id');
    const completionData = await c.req.json();

    // TODO: Mark as completed in database, calculate metrics
    const completedWorkout = {
      id: workoutId,
      userId: user.id,
      completedAt: new Date().toISOString(),
      duration: completionData.duration || 0,
      totalVolume: completionData.totalVolume || 0,
      notes: completionData.notes || '',
    };

    return c.json({
      success: true,
      data: completedWorkout,
      message: 'Workout completed successfully',
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
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const period = c.req.query('period') || 'month'; // week, month, year

    // TODO: Calculate from database
    const mockStats = {
      period,
      totalWorkouts: 12,
      totalVolume: 28450, // kg
      avgDuration: 48, // minutes
      consistency: 92, // percentage
      strengthGain: 12, // percentage
      topExercises: [
        { name: 'Bench Press', sessions: 8, maxWeight: 185 },
        { name: 'Deadlift', sessions: 6, maxWeight: 315 },
        { name: 'Squat', sessions: 7, maxWeight: 275 },
      ],
    };

    return c.json({
      success: true,
      data: mockStats,
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