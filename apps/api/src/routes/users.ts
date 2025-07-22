import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  JWT_SECRET: string;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: 'free' | 'premium' | 'pro';
  };
};

const users = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes
users.use('*', authMiddleware);

// Get current user profile
users.get('/me', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    // TODO: Fetch from database
    // For now, return mock data
    const mockUserProfile = {
      id: user.id,
      email: user.email,
      name: 'Alex Rodriguez',
      plan: user.plan,
      profile: {
        goals: ['muscle_gain'],
        experienceLevel: 'intermediate',
        availableDays: 4,
        height: 175,
        weight: 80,
        age: 28,
      },
      stats: {
        workoutsCompleted: 89,
        currentStreak: 127,
        prsSet: 15,
      },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: mockUserProfile,
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to get user profile' });
  }
});

// Update user profile
users.put('/me', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const updateData = await c.req.json();

    // TODO: Validate and update in database
    // For now, return mock response
    const updatedProfile = {
      id: user.id,
      email: user.email,
      name: updateData.name || 'Alex Rodriguez',
      profile: {
        goals: updateData.goals || ['muscle_gain'],
        experienceLevel: updateData.experienceLevel || 'intermediate',
        availableDays: updateData.availableDays || 4,
        height: updateData.height || 175,
        weight: updateData.weight || 80,
        age: updateData.age || 28,
      },
      updatedAt: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully',
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to update user profile' });
  }
});

// Get user progress metrics
users.get('/me/progress', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    // TODO: Calculate from database
    // For now, return mock progress data
    const mockProgress = {
      period: 'last_30_days',
      metrics: {
        strengthGain: 12, // percentage
        volumeIncrease: 18,
        consistencyScore: 92,
        totalWorkouts: 12,
        avgWorkoutDuration: 48, // minutes
      },
      personalRecords: [
        {
          exerciseId: 'bench_press',
          exerciseName: 'Bench Press',
          weight: 180,
          reps: 1,
          achievedAt: '2024-12-28T10:00:00Z',
        },
        {
          exerciseId: 'deadlift',
          exerciseName: 'Deadlift',
          weight: 315,
          reps: 1,
          achievedAt: '2024-12-20T10:00:00Z',
        },
      ],
      weeklyFrequency: {
        target: 4,
        actual: 4.2,
        days: [true, true, false, true, true, true, false], // S M T W T F S
      },
    };

    return c.json({
      success: true,
      data: mockProgress,
    });

  } catch (error) {
    console.error('Get user progress error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to get user progress' });
  }
});

// Update user preferences
users.put('/me/preferences', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const preferences = await c.req.json();

    // TODO: Save to database
    // For now, return mock response
    return c.json({
      success: true,
      data: {
        userId: user.id,
        preferences,
        updatedAt: new Date().toISOString(),
      },
      message: 'Preferences updated successfully',
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to update preferences' });
  }
});

export default users;