import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DATABASE_URL: string;
  CACHE: KVNamespace;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: 'free' | 'premium' | 'pro';
  };
};

const health = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes
health.use('*', authMiddleware);

/**
 * Sync workout data from HealthKit
 */
health.post('/sync-workout', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const workoutData = await c.req.json() as {
      workoutActivityType: string;
      startDate: string;
      endDate: string;
      totalEnergyBurned?: number;
      totalDistance?: number;
      heartRateData?: Array<{
        value: number;
        date: string;
      }>;
      metadata?: Record<string, any>;
    };

    // Validate required fields
    if (!workoutData.workoutActivityType || !workoutData.startDate || !workoutData.endDate) {
      throw new HTTPException(400, { 
        message: 'Faltan campos requeridos: workoutActivityType, startDate, endDate' 
      });
    }

    // In production, this would save to database
    const healthWorkout = {
      id: `health_workout_${Date.now()}`,
      userId: user.id,
      type: workoutData.workoutActivityType,
      startTime: new Date(workoutData.startDate),
      endTime: new Date(workoutData.endDate),
      duration: Math.floor((new Date(workoutData.endDate).getTime() - new Date(workoutData.startDate).getTime()) / 1000),
      calories: workoutData.totalEnergyBurned || 0,
      distance: workoutData.totalDistance || 0,
      heartRateData: workoutData.heartRateData || [],
      metadata: workoutData.metadata || {},
      source: 'HealthKit',
      createdAt: new Date(),
    };

    console.log('Syncing workout from HealthKit:', healthWorkout);

    // Store in cache for quick access
    await c.env.CACHE.put(
      `user:${user.id}:latest_health_workout`,
      JSON.stringify(healthWorkout),
      { expirationTtl: 86400 } // 24 hours
    );

    return c.json({
      success: true,
      data: healthWorkout,
      message: 'Entrenamiento sincronizado exitosamente'
    });

  } catch (error) {
    console.error('Health sync error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error interno del servidor' });
  }
});

/**
 * Get health stats summary
 */
health.get('/stats', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    // In production, this would query database for actual user health data
    // For now, return mock data
    const healthStats = {
      today: {
        steps: 8742,
        activeCalories: 432,
        distance: 6.2, // km
        avgHeartRate: 78,
        workouts: 1,
        activeMinutes: 45,
      },
      thisWeek: {
        totalWorkouts: 4,
        totalCalories: 1850,
        totalDistance: 28.5,
        avgHeartRate: 82,
        totalActiveMinutes: 240,
        stepGoalAchieved: 5, // out of 7 days
      },
      thisMonth: {
        totalWorkouts: 16,
        totalCalories: 7200,
        avgWorkoutDuration: 42, // minutes
        strengthTrainingHours: 12.5,
        cardioHours: 8.2,
        restDays: 12,
      },
      trends: {
        heartRateVariability: {
          current: 45,
          change: +3.2, // +3.2ms improvement
          trend: 'improving'
        },
        restingHeartRate: {
          current: 62,
          change: -2, // -2 BPM improvement
          trend: 'improving'
        },
        sleepQuality: {
          avgHours: 7.5,
          deepSleepPercent: 18,
          trend: 'stable'
        }
      }
    };

    return c.json({
      success: true,
      data: healthStats,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health stats error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error obteniendo estadísticas de salud' });
  }
});

/**
 * Record heart rate data during workout
 */
health.post('/heart-rate', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const heartRateData = await c.req.json() as {
      workoutId?: string;
      heartRateReadings: Array<{
        value: number;
        timestamp: string;
        zone?: string;
      }>;
    };

    if (!heartRateData.heartRateReadings || heartRateData.heartRateReadings.length === 0) {
      throw new HTTPException(400, { message: 'No se proporcionaron datos de frecuencia cardíaca' });
    }

    // Process heart rate data
    const processedData = {
      userId: user.id,
      workoutId: heartRateData.workoutId || `workout_${Date.now()}`,
      readings: heartRateData.heartRateReadings.map(reading => ({
        ...reading,
        timestamp: new Date(reading.timestamp),
        zone: reading.zone || determineHeartRateZone(reading.value)
      })),
      summary: {
        avgHeartRate: Math.round(
          heartRateData.heartRateReadings.reduce((sum, reading) => sum + reading.value, 0) / 
          heartRateData.heartRateReadings.length
        ),
        maxHeartRate: Math.max(...heartRateData.heartRateReadings.map(r => r.value)),
        minHeartRate: Math.min(...heartRateData.heartRateReadings.map(r => r.value)),
        timeInZones: calculateTimeInZones(heartRateData.heartRateReadings)
      },
      recordedAt: new Date()
    };

    // Store in cache for real-time access
    await c.env.CACHE.put(
      `user:${user.id}:current_workout_hr`,
      JSON.stringify(processedData),
      { expirationTtl: 7200 } // 2 hours
    );

    return c.json({
      success: true,
      data: processedData,
      message: 'Datos de frecuencia cardíaca registrados'
    });

  } catch (error) {
    console.error('Heart rate recording error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error registrando frecuencia cardíaca' });
  }
});

/**
 * Get current workout heart rate
 */
health.get('/current-heart-rate/:workoutId?', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    // Get current workout heart rate from cache
    const cachedData = await c.env.CACHE.get(`user:${user.id}:current_workout_hr`);
    
    if (!cachedData) {
      return c.json({
        success: true,
        data: null,
        message: 'No hay datos de frecuencia cardíaca activos'
      });
    }

    const heartRateData = JSON.parse(cachedData);
    
    // Get latest reading
    const latestReading = heartRateData.readings[heartRateData.readings.length - 1];
    
    return c.json({
      success: true,
      data: {
        current: latestReading,
        summary: heartRateData.summary,
        isActive: new Date().getTime() - new Date(latestReading.timestamp).getTime() < 300000 // 5 minutes
      }
    });

  } catch (error) {
    console.error('Current heart rate error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error obteniendo frecuencia cardíaca actual' });
  }
});

/**
 * Update user health profile
 */
health.put('/profile', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const profileData = await c.req.json() as {
      age?: number;
      weight?: number; // kg
      height?: number; // cm
      gender?: 'male' | 'female' | 'other';
      activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
      goals?: {
        dailySteps?: number;
        weeklyWorkouts?: number;
        targetWeight?: number;
      };
    };

    // Basic validation
    if (profileData.age && (profileData.age < 13 || profileData.age > 120)) {
      throw new HTTPException(400, { message: 'Edad debe estar entre 13 y 120 años' });
    }

    if (profileData.weight && (profileData.weight < 30 || profileData.weight > 300)) {
      throw new HTTPException(400, { message: 'Peso debe estar entre 30 y 300 kg' });
    }

    if (profileData.height && (profileData.height < 100 || profileData.height > 250)) {
      throw new HTTPException(400, { message: 'Altura debe estar entre 100 y 250 cm' });
    }

    const healthProfile = {
      userId: user.id,
      ...profileData,
      updatedAt: new Date()
    };

    console.log('Updating health profile:', healthProfile);

    return c.json({
      success: true,
      data: healthProfile,
      message: 'Perfil de salud actualizado'
    });

  } catch (error) {
    console.error('Health profile update error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error actualizando perfil de salud' });
  }
});

// Helper functions
function determineHeartRateZone(heartRate: number): string {
  if (heartRate < 100) return 'rest';
  if (heartRate < 120) return 'warmup';
  if (heartRate < 140) return 'fat_burn';
  if (heartRate < 160) return 'aerobic';
  if (heartRate < 180) return 'anaerobic';
  return 'maximum';
}

function calculateTimeInZones(readings: Array<{ value: number; timestamp: string }>): Record<string, number> {
  const zones = {
    rest: 0,
    warmup: 0,
    fat_burn: 0,
    aerobic: 0,
    anaerobic: 0,
    maximum: 0
  };

  readings.forEach(reading => {
    const zone = determineHeartRateZone(reading.value);
    zones[zone as keyof typeof zones] += 1;
  });

  // Convert counts to minutes (assuming readings every 5 seconds)
  Object.keys(zones).forEach(zone => {
    zones[zone as keyof typeof zones] = Math.round((zones[zone as keyof typeof zones] * 5) / 60);
  });

  return zones;
}

export default health;