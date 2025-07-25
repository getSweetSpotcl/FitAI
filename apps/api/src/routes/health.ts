import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createDatabaseClient, getUserByClerkId } from "../db/database";
import { HealthDataService } from "../lib/health-data-service";
import { HealthKitService } from "../lib/healthkit-service";
import { clerkAuth } from "../middleware/clerk-auth";
import type {
  AddHealthMetricRequest,
  HealthDashboardQuery,
  HealthKitPermissionRequest,
  HealthMetricsQuery,
  HealthMetricsResponse,
  HeartRateAnalysisQuery,
  SyncHealthDataRequest,
  SyncHealthDataResponse,
  TrainingReadiness,
  UpdateHealthProfileRequest,
} from "../types/health";

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

const health = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes (except public health check)
health.use("*", clerkAuth());

// Public health check endpoint (no auth required)
health.get("/status", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

/**
 * Sync comprehensive health data from Apple Health
 * POST /api/v1/health/sync
 */
health.post("/sync", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const requestData: SyncHealthDataRequest = await c.req.json();

    if (!requestData.dataType || !requestData.data) {
      throw new HTTPException(400, {
        message: "dataType y data son requeridos",
      });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    const healthService = new HealthDataService(sql);

    let recordsProcessed = 0;
    let recordsAdded = 0;
    let errorMessage: string | undefined;

    try {
      switch (requestData.dataType) {
        case "metrics":
          if (requestData.data.metrics) {
            recordsAdded = await healthService.saveHealthMetrics(
              dbUser.id,
              requestData.data.metrics
            );
            recordsProcessed = requestData.data.metrics.length;
          }
          break;

        case "workouts":
          if (requestData.data.workouts) {
            recordsAdded = await healthService.saveHealthWorkouts(
              dbUser.id,
              requestData.data.workouts
            );
            recordsProcessed = requestData.data.workouts.length;
          }
          break;

        case "sleep":
          if (requestData.data.sleep) {
            recordsAdded = await healthService.saveSleepData(
              dbUser.id,
              requestData.data.sleep
            );
            recordsProcessed = requestData.data.sleep.length;
          }
          break;

        case "hrv":
          if (requestData.data.hrv) {
            recordsAdded = await healthService.saveHRVData(
              dbUser.id,
              requestData.data.hrv
            );
            recordsProcessed = requestData.data.hrv.length;
          }
          break;

        default:
          throw new HTTPException(400, {
            message: `Tipo de datos no soportado: ${requestData.dataType}`,
          });
      }

      // Update sync status
      await healthService.updateSyncStatus(
        dbUser.id,
        requestData.dataType,
        "success",
        recordsAdded,
        errorMessage
      );

      const response: SyncHealthDataResponse = {
        success: true,
        recordsProcessed,
        recordsAdded,
        recordsUpdated: 0,
        recordsSkipped: recordsProcessed - recordsAdded,
        syncStatus: "success",
        nextSyncRecommendedAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
      };

      return c.json({
        success: true,
        data: response,
        message: `Sincronizados ${recordsAdded} registros de ${requestData.dataType}`,
      });
    } catch (syncError) {
      errorMessage =
        syncError instanceof Error ? syncError.message : "Error desconocido";

      await healthService.updateSyncStatus(
        dbUser.id,
        requestData.dataType,
        "failed",
        0,
        errorMessage
      );

      throw new HTTPException(500, {
        message: `Error sincronizando datos: ${errorMessage}`,
      });
    }
  } catch (error) {
    console.error("Health sync error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error interno del servidor" });
  }
});

/**
 * Get recovery analysis and recommendations
 * GET /api/v1/health/recovery
 */
health.get("/recovery", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    const healthService = new HealthDataService(sql);
    const recoveryAnalysis = await healthService.calculateRecoveryScore(
      dbUser.id
    );

    // Determine training readiness based on recovery score
    let trainingReadiness: TrainingReadiness;
    if (recoveryAnalysis.currentScore >= 80) trainingReadiness = "high";
    else if (recoveryAnalysis.currentScore >= 60)
      trainingReadiness = "moderate";
    else if (recoveryAnalysis.currentScore >= 40) trainingReadiness = "low";
    else trainingReadiness = "rest";

    // Save recommendation for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await healthService.saveRecoveryRecommendation(dbUser.id, {
      recommendationDate: today,
      recoveryScore: recoveryAnalysis.currentScore,
      trainingReadiness,
      recommendedIntensity:
        trainingReadiness === "rest"
          ? "active_recovery"
          : trainingReadiness === "low"
            ? "low"
            : trainingReadiness === "moderate"
              ? "moderate"
              : "high",
      recommendations: recoveryAnalysis.recommendations,
      factorsAnalyzed: Object.keys(recoveryAnalysis.factorsInfluencing),
      aiGenerated: false,
    });

    return c.json({
      success: true,
      data: {
        ...recoveryAnalysis,
        trainingReadiness,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Get recovery analysis error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo análisis de recuperación",
    });
  }
});

/**
 * Get health metrics with filtering options
 * GET /api/v1/health/metrics
 */
health.get("/metrics", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    // Parse query parameters
    const metricTypesParam = c.req.query("metricTypes");
    const startDateParam = c.req.query("startDate");
    const endDateParam = c.req.query("endDate");
    const limitParam = c.req.query("limit");
    const aggregationParam = c.req.query("aggregation") as
      | "raw"
      | "daily"
      | "weekly"
      | "monthly"
      | undefined;

    const query: HealthMetricsQuery = {
      metricTypes: metricTypesParam
        ? (metricTypesParam.split(",") as any[])
        : undefined,
      startDate: startDateParam ? new Date(startDateParam) : undefined,
      endDate: endDateParam ? new Date(endDateParam) : undefined,
      limit: limitParam ? parseInt(limitParam) : 1000,
      aggregation: aggregationParam || "raw",
    };

    const healthService = new HealthDataService(sql);
    const metrics = await healthService.getHealthMetrics(dbUser.id, query);

    // Default date range if not specified
    const startDate =
      query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = query.endDate || new Date();

    const response: HealthMetricsResponse = {
      success: true,
      data: {
        metrics,
      },
      period: {
        startDate,
        endDate,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error("Get health metrics error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo métricas de salud",
    });
  }
});

/**
 * Sync workout data from HealthKit (legacy endpoint - preserved for compatibility)
 */
health.post("/sync-workout", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const workoutData = (await c.req.json()) as {
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
    if (
      !workoutData.workoutActivityType ||
      !workoutData.startDate ||
      !workoutData.endDate
    ) {
      throw new HTTPException(400, {
        message:
          "Faltan campos requeridos: workoutActivityType, startDate, endDate",
      });
    }

    // In production, this would save to database
    const healthWorkout = {
      id: `health_workout_${Date.now()}`,
      userId: user.id,
      type: workoutData.workoutActivityType,
      startTime: new Date(workoutData.startDate),
      endTime: new Date(workoutData.endDate),
      duration: Math.floor(
        (new Date(workoutData.endDate).getTime() -
          new Date(workoutData.startDate).getTime()) /
          1000
      ),
      calories: workoutData.totalEnergyBurned || 0,
      distance: workoutData.totalDistance || 0,
      heartRateData: workoutData.heartRateData || [],
      metadata: workoutData.metadata || {},
      source: "HealthKit",
      createdAt: new Date(),
    };

    console.log("Syncing workout from HealthKit:", healthWorkout);

    // Store in cache for quick access
    await c.env.CACHE.put(
      `user:${user.id}:latest_health_workout`,
      JSON.stringify(healthWorkout),
      { expirationTtl: 86400 } // 24 hours
    );

    return c.json({
      success: true,
      data: healthWorkout,
      message: "Entrenamiento sincronizado exitosamente",
    });
  } catch (error) {
    console.error("Health sync error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error interno del servidor" });
  }
});

/**
 * Get health stats summary
 */
health.get("/stats", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    // TODO: Implementar consultas reales a la base de datos de salud
    // Esta funcionalidad requiere integración con HealthKit/Google Fit
    throw new HTTPException(501, { 
      message: "Estadísticas de salud no implementadas aún. La integración con HealthKit estará disponible próximamente." 
    });
  } catch (error) {
    console.error("Health stats error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo estadísticas de salud",
    });
  }
});

/**
 * Record heart rate data during workout
 */
health.post("/heart-rate", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const heartRateData = (await c.req.json()) as {
      workoutId?: string;
      heartRateReadings: Array<{
        value: number;
        timestamp: string;
        zone?: string;
      }>;
    };

    if (
      !heartRateData.heartRateReadings ||
      heartRateData.heartRateReadings.length === 0
    ) {
      throw new HTTPException(400, {
        message: "No se proporcionaron datos de frecuencia cardíaca",
      });
    }

    // Process heart rate data
    const processedData = {
      userId: user.id,
      workoutId: heartRateData.workoutId || `workout_${Date.now()}`,
      readings: heartRateData.heartRateReadings.map((reading) => ({
        ...reading,
        timestamp: new Date(reading.timestamp),
        zone: reading.zone || determineHeartRateZone(reading.value),
      })),
      summary: {
        avgHeartRate: Math.round(
          heartRateData.heartRateReadings.reduce(
            (sum, reading) => sum + reading.value,
            0
          ) / heartRateData.heartRateReadings.length
        ),
        maxHeartRate: Math.max(
          ...heartRateData.heartRateReadings.map((r) => r.value)
        ),
        minHeartRate: Math.min(
          ...heartRateData.heartRateReadings.map((r) => r.value)
        ),
        timeInZones: calculateTimeInZones(heartRateData.heartRateReadings),
      },
      recordedAt: new Date(),
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
      message: "Datos de frecuencia cardíaca registrados",
    });
  } catch (error) {
    console.error("Heart rate recording error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error registrando frecuencia cardíaca",
    });
  }
});

/**
 * Get current workout heart rate
 */
health.get("/current-heart-rate/:workoutId?", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    // Get current workout heart rate from cache
    const cachedData = await c.env.CACHE.get(
      `user:${user.id}:current_workout_hr`
    );

    if (!cachedData) {
      return c.json({
        success: true,
        data: null,
        message: "No hay datos de frecuencia cardíaca activos",
      });
    }

    const heartRateData = JSON.parse(cachedData);

    // Get latest reading
    const latestReading =
      heartRateData.readings[heartRateData.readings.length - 1];

    return c.json({
      success: true,
      data: {
        current: latestReading,
        summary: heartRateData.summary,
        isActive:
          Date.now() - new Date(latestReading.timestamp).getTime() < 300000, // 5 minutes
      },
    });
  } catch (error) {
    console.error("Current heart rate error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo frecuencia cardíaca actual",
    });
  }
});

/**
 * Update user health profile
 */
health.put("/profile", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const profileData = (await c.req.json()) as {
      age?: number;
      weight?: number; // kg
      height?: number; // cm
      gender?: "male" | "female" | "other";
      activityLevel?:
        | "sedentary"
        | "light"
        | "moderate"
        | "active"
        | "very_active";
      goals?: {
        dailySteps?: number;
        weeklyWorkouts?: number;
        targetWeight?: number;
      };
    };

    // Basic validation
    if (profileData.age && (profileData.age < 13 || profileData.age > 120)) {
      throw new HTTPException(400, {
        message: "Edad debe estar entre 13 y 120 años",
      });
    }

    if (
      profileData.weight &&
      (profileData.weight < 30 || profileData.weight > 300)
    ) {
      throw new HTTPException(400, {
        message: "Peso debe estar entre 30 y 300 kg",
      });
    }

    if (
      profileData.height &&
      (profileData.height < 100 || profileData.height > 250)
    ) {
      throw new HTTPException(400, {
        message: "Altura debe estar entre 100 y 250 cm",
      });
    }

    const healthProfile = {
      userId: user.id,
      ...profileData,
      updatedAt: new Date(),
    };

    console.log("Updating health profile:", healthProfile);

    return c.json({
      success: true,
      data: healthProfile,
      message: "Perfil de salud actualizado",
    });
  } catch (error) {
    console.error("Health profile update error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error actualizando perfil de salud",
    });
  }
});

// Helper functions
function determineHeartRateZone(heartRate: number): string {
  if (heartRate < 100) return "rest";
  if (heartRate < 120) return "warmup";
  if (heartRate < 140) return "fat_burn";
  if (heartRate < 160) return "aerobic";
  if (heartRate < 180) return "anaerobic";
  return "maximum";
}

function calculateTimeInZones(
  readings: Array<{ value: number; timestamp: string }>
): Record<string, number> {
  const zones = {
    rest: 0,
    warmup: 0,
    fat_burn: 0,
    aerobic: 0,
    anaerobic: 0,
    maximum: 0,
  };

  readings.forEach((reading) => {
    const zone = determineHeartRateZone(reading.value);
    zones[zone as keyof typeof zones] += 1;
  });

  // Convert counts to minutes (assuming readings every 5 seconds)
  Object.keys(zones).forEach((zone) => {
    zones[zone as keyof typeof zones] = Math.round(
      (zones[zone as keyof typeof zones] * 5) / 60
    );
  });

  return zones;
}

/**
 * Get health-based workout recommendations
 * GET /api/v1/health/workout-recommendations
 */
health.get("/workout-recommendations", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    const healthService = new HealthDataService(sql);

    // Import HealthAI service dynamically to avoid circular deps
    const { HealthAIService } = await import("../lib/health-ai-service");
    const { AIService } = await import("../lib/ai-service");

    const aiService = new AIService(c.env.OPENAI_API_KEY || "");
    const healthAIService = new HealthAIService(sql, aiService, healthService);

    // Check if user should skip workout
    const skipCheck = await healthAIService.shouldSkipWorkout(dbUser.id);

    if (skipCheck.shouldSkip) {
      return c.json({
        success: true,
        data: {
          recommendation: "rest",
          shouldSkip: true,
          reason: skipCheck.reason,
          alternatives: skipCheck.alternatives,
        },
      });
    }

    // Get comprehensive recommendations
    const recommendations =
      await healthAIService.generateHealthBasedRecommendations(dbUser.id);

    return c.json({
      success: true,
      data: {
        recommendation: "workout",
        shouldSkip: false,
        healthBasedAdjustments: recommendations,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Health workout recommendations error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo recomendaciones de entrenamiento",
    });
  }
});

/**
 * Personalize a specific workout based on health data
 * POST /api/v1/health/personalize-workout
 */
health.post("/personalize-workout", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const { workout } = await c.req.json();

    if (!workout) {
      throw new HTTPException(400, {
        message: "Datos de entrenamiento requeridos",
      });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    const healthService = new HealthDataService(sql);

    // Import HealthAI service dynamically
    const { HealthAIService } = await import("../lib/health-ai-service");
    const { AIService } = await import("../lib/ai-service");

    const aiService = new AIService(c.env.OPENAI_API_KEY || "");
    const healthAIService = new HealthAIService(sql, aiService, healthService);

    const personalizedWorkout = await healthAIService.personalizeWorkout(
      dbUser.id,
      workout
    );

    return c.json({
      success: true,
      data: {
        originalWorkout: workout,
        personalizedParameters: personalizedWorkout,
        adjustmentReason:
          "Based on your recent health metrics and recovery data",
      },
    });
  } catch (error) {
    console.error("Personalize workout error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error personalizando entrenamiento",
    });
  }
});

/**
 * Real-time workout monitoring
 * POST /api/v1/health/monitor-workout
 */
health.post("/monitor-workout", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const { heartRate, workoutDurationMinutes } = await c.req.json();

    if (
      typeof heartRate !== "number" ||
      typeof workoutDurationMinutes !== "number"
    ) {
      throw new HTTPException(400, {
        message: "heartRate y workoutDurationMinutes son requeridos",
      });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    const healthService = new HealthDataService(sql);

    // Import HealthAI service dynamically
    const { HealthAIService } = await import("../lib/health-ai-service");
    const { AIService } = await import("../lib/ai-service");

    const aiService = new AIService(c.env.OPENAI_API_KEY || "");
    const healthAIService = new HealthAIService(sql, aiService, healthService);

    const monitoring = await healthAIService.monitorWorkoutRealTime(
      dbUser.id,
      heartRate,
      workoutDurationMinutes
    );

    // Store current heart rate for tracking
    await c.env.CACHE.put(
      `workout_monitor:${dbUser.id}`,
      JSON.stringify({
        heartRate,
        workoutDurationMinutes,
        timestamp: new Date().toISOString(),
        status: monitoring.heartRateStatus,
      }),
      { expirationTtl: 7200 } // 2 hours
    );

    return c.json({
      success: true,
      data: monitoring,
    });
  } catch (error) {
    console.error("Workout monitoring error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error monitoreando entrenamiento",
    });
  }
});

/**
 * Get sleep data analysis
 * GET /api/v1/health/sleep
 */
health.get("/sleep", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    // Parse query parameters
    const daysParam = c.req.query("days");
    const days = daysParam ? parseInt(daysParam) : 14; // Default 2 weeks

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    const healthService = new HealthDataService(sql);
    const sleepData = await healthService.getSleepData(
      dbUser.id,
      startDate,
      endDate
    );

    // Calculate sleep statistics
    const totalNights = sleepData.length;
    const avgSleepHours =
      totalNights > 0
        ? sleepData.reduce((sum, s) => sum + s.totalSleepMinutes, 0) /
          totalNights /
          60
        : 0;

    const avgSleepEfficiency = sleepData
      .filter((s) => s.sleepEfficiency)
      .reduce(
        (sum, s, _, arr) => sum + (s.sleepEfficiency || 0) / arr.length,
        0
      );

    const avgDeepSleep = sleepData
      .filter((s) => s.deepSleepMinutes)
      .reduce(
        (sum, s, _, arr) => sum + (s.deepSleepMinutes || 0) / arr.length,
        0
      );

    // Sleep quality assessment
    let sleepQuality = "good";
    if (avgSleepEfficiency < 70 || avgSleepHours < 6) {
      sleepQuality = "poor";
    } else if (avgSleepEfficiency < 85 || avgSleepHours < 7) {
      sleepQuality = "fair";
    } else if (avgSleepEfficiency > 90 && avgSleepHours > 7.5) {
      sleepQuality = "excellent";
    }

    return c.json({
      success: true,
      data: {
        sleepData,
        statistics: {
          totalNights,
          avgSleepHours: Math.round(avgSleepHours * 10) / 10,
          avgSleepEfficiency: Math.round(avgSleepEfficiency * 10) / 10,
          avgDeepSleepMinutes: Math.round(avgDeepSleep),
          sleepQuality,
        },
        recommendations: generateSleepRecommendations(
          avgSleepHours,
          avgSleepEfficiency
        ),
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days,
        },
      },
    });
  } catch (error) {
    console.error("Get sleep data error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo datos de sueño",
    });
  }
});

/**
 * Get HRV (Heart Rate Variability) analysis
 * GET /api/v1/health/hrv
 */
health.get("/hrv", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    const daysParam = c.req.query("days");
    const days = daysParam ? parseInt(daysParam) : 14; // Default 2 weeks

    const healthService = new HealthDataService(sql);
    const hrvData = await healthService.getLatestHRVData(dbUser.id, days);

    // Calculate HRV statistics
    const avgRMSSD =
      hrvData.length > 0
        ? hrvData.reduce((sum, hrv) => sum + hrv.rmssdMs, 0) / hrvData.length
        : 0;

    const avgRecoveryScore =
      hrvData.length > 0
        ? hrvData.reduce((sum, hrv) => sum + hrv.recoveryScore, 0) /
          hrvData.length
        : 0;

    const avgStressScore =
      hrvData.length > 0
        ? hrvData.reduce((sum, hrv) => sum + hrv.stressScore, 0) /
          hrvData.length
        : 0;

    // HRV trend analysis
    let trend = "stable";
    if (hrvData.length >= 7) {
      const recent = hrvData.slice(0, 3);
      const older = hrvData.slice(-3);
      const recentAvg =
        recent.reduce((sum, h) => sum + h.recoveryScore, 0) / recent.length;
      const olderAvg =
        older.reduce((sum, h) => sum + h.recoveryScore, 0) / older.length;

      if (recentAvg > olderAvg + 5) trend = "improving";
      else if (recentAvg < olderAvg - 5) trend = "declining";
    }

    return c.json({
      success: true,
      data: {
        hrvData,
        statistics: {
          totalRecordings: hrvData.length,
          avgRMSSD: Math.round(avgRMSSD * 10) / 10,
          avgRecoveryScore: Math.round(avgRecoveryScore),
          avgStressScore: Math.round(avgStressScore),
          trend,
        },
        insights: generateHRVInsights(avgRecoveryScore, avgStressScore, trend),
        period: {
          days,
          startDate: new Date(
            Date.now() - days * 24 * 60 * 60 * 1000
          ).toISOString(),
          endDate: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Get HRV data error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error obteniendo datos de HRV" });
  }
});

/**
 * Enable or disable health sync for user
 * POST /api/v1/health/settings
 */
health.post("/settings", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const { healthSyncEnabled, permissions } = await c.req.json();

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    // Update user profile health settings
    await sql`
      UPDATE user_profiles 
      SET 
        health_sync_enabled = ${healthSyncEnabled || false},
        health_permissions = ${JSON.stringify(permissions || {})},
        last_health_sync = ${healthSyncEnabled ? new Date().toISOString() : null}
      WHERE user_id = ${dbUser.id}
    `;

    return c.json({
      success: true,
      message: healthSyncEnabled
        ? "Sincronización de salud activada"
        : "Sincronización de salud desactivada",
    });
  } catch (error) {
    console.error("Update health settings error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error actualizando configuración de salud",
    });
  }
});

/**
 * Get HealthKit status and permissions
 * GET /api/v1/health/healthkit/status
 */
health.get("/healthkit/status", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    const healthKitService = new HealthKitService(sql);
    const healthProfile = await healthKitService.getUserHealthProfile(
      dbUser.id
    );

    return c.json({
      success: true,
      data: {
        healthkitEnabled: healthProfile?.healthkitEnabled || false,
        appleWatchConnected: healthProfile?.appleWatchConnected || false,
        permissions: healthProfile?.healthkitPermissions || {
          read: [],
          write: [],
          share: [],
        },
        lastSyncAt: healthProfile?.lastSyncAt,
        syncFrequency: healthProfile?.syncFrequency || "real_time",
      },
    });
  } catch (error) {
    console.error("HealthKit status error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error obteniendo estado de HealthKit",
    });
  }
});

/**
 * Update HealthKit permissions
 * POST /api/v1/health/healthkit/permissions
 */
health.post("/healthkit/permissions", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const permissionRequest: HealthKitPermissionRequest = await c.req.json();

    if (!permissionRequest.permissions) {
      throw new HTTPException(400, { message: "Permisos requeridos" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    const healthKitService = new HealthKitService(sql);
    const updatedProfile = await healthKitService.updateHealthKitPermissions(
      dbUser.id,
      permissionRequest
    );

    return c.json({
      success: true,
      data: updatedProfile,
      message: "Permisos de HealthKit actualizados",
    });
  } catch (error) {
    console.error("Update HealthKit permissions error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error actualizando permisos de HealthKit",
    });
  }
});

/**
 * Sync Apple Watch workout
 * POST /api/v1/health/apple-watch/sync-workout
 */
health.post("/apple-watch/sync-workout", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const workoutData = await c.req.json();

    if (
      !workoutData.healthkitUuid ||
      !workoutData.workoutType ||
      !workoutData.startTime ||
      !workoutData.endTime
    ) {
      throw new HTTPException(400, {
        message:
          "healthkitUuid, workoutType, startTime y endTime son requeridos",
      });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    const healthKitService = new HealthKitService(sql);

    // Convert string dates to Date objects
    const syncData = {
      ...workoutData,
      startTime: new Date(workoutData.startTime),
      endTime: new Date(workoutData.endTime),
    };

    const syncedWorkout = await healthKitService.syncAppleWatchWorkout(
      dbUser.id,
      syncData
    );

    return c.json({
      success: true,
      data: syncedWorkout,
      message: "Entrenamiento de Apple Watch sincronizado",
    });
  } catch (error) {
    console.error("Apple Watch workout sync error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error sincronizando entrenamiento de Apple Watch",
    });
  }
});

/**
 * Add health metric data point
 * POST /api/v1/health/metrics/add
 */
health.post("/metrics/add", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const metricRequest: AddHealthMetricRequest = await c.req.json();

    if (
      !metricRequest.metricType ||
      !metricRequest.metricValue ||
      !metricRequest.metricUnit
    ) {
      throw new HTTPException(400, {
        message: "metricType, metricValue y metricUnit son requeridos",
      });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    const healthKitService = new HealthKitService(sql);
    const healthMetric = await healthKitService.addHealthMetric(
      dbUser.id,
      metricRequest
    );

    return c.json({
      success: true,
      data: healthMetric,
      message: "Métrica de salud agregada",
    });
  } catch (error) {
    console.error("Add health metric error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error agregando métrica de salud",
    });
  }
});

/**
 * Get comprehensive health dashboard
 * GET /api/v1/health/dashboard/comprehensive
 */
health.get("/dashboard/comprehensive", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    // Parse query parameters
    const period =
      (c.req.query("period") as "week" | "month" | "quarter" | "year") ||
      "month";
    const includeInsights = c.req.query("includeInsights") === "true";
    const includeGoals = c.req.query("includeGoals") === "true";

    const query: HealthDashboardQuery = {
      period,
      includeInsights,
      includeGoals,
    };

    const healthKitService = new HealthKitService(sql);
    const dashboard = await healthKitService.generateHealthDashboard(
      dbUser.id,
      query
    );

    return c.json({
      success: true,
      data: dashboard,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health dashboard error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error generando dashboard de salud",
    });
  }
});

/**
 * Get heart rate analysis
 * GET /api/v1/health/heart-rate/analysis
 */
health.get("/heart-rate/analysis", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    // Parse query parameters
    const startDateParam = c.req.query("startDate");
    const endDateParam = c.req.query("endDate");
    const context = c.req.query("context") as
      | "resting"
      | "active"
      | "workout"
      | "recovery"
      | undefined;

    if (!startDateParam || !endDateParam) {
      throw new HTTPException(400, {
        message: "startDate y endDate son requeridos",
      });
    }

    const query: HeartRateAnalysisQuery = {
      startDate: new Date(startDateParam),
      endDate: new Date(endDateParam),
      context,
      includeWorkouts: c.req.query("includeWorkouts") === "true",
    };

    const healthKitService = new HealthKitService(sql);
    const analysis = await healthKitService.getHeartRateAnalysis(
      dbUser.id,
      query
    );

    return c.json({
      success: true,
      data: analysis,
      period: {
        startDate: query.startDate.toISOString(),
        endDate: query.endDate.toISOString(),
        context: query.context || "all",
      },
    });
  } catch (error) {
    console.error("Heart rate analysis error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error analizando frecuencia cardíaca",
    });
  }
});

/**
 * Update health profile
 * PUT /api/v1/health/profile/healthkit
 */
health.put("/profile/healthkit", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const updateRequest: UpdateHealthProfileRequest = await c.req.json();

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const dbUser = await getUserByClerkId(sql, user.userId || user.id);
    if (!dbUser) {
      throw new HTTPException(404, { message: "Usuario no encontrado" });
    }

    const healthKitService = new HealthKitService(sql);
    const updatedProfile = await healthKitService.updateHealthProfile(
      dbUser.id,
      updateRequest
    );

    return c.json({
      success: true,
      data: updatedProfile,
      message: "Perfil de salud actualizado",
    });
  } catch (error) {
    console.error("Update health profile error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error actualizando perfil de salud",
    });
  }
});

// Helper method to generate sleep recommendations
function generateSleepRecommendations(
  avgHours: number,
  avgEfficiency: number
): string[] {
  const recommendations: string[] = [];

  if (avgHours < 7) {
    recommendations.push("Intenta dormir al menos 7-9 horas por noche");
    recommendations.push("Establece una rutina de sueño consistente");
  }

  if (avgEfficiency < 80) {
    recommendations.push(
      "Mejora tu higiene del sueño - evita pantallas 1 hora antes de dormir"
    );
    recommendations.push("Considera un ambiente más fresco y oscuro");
    recommendations.push("Evita cafeína después de las 2 PM");
  }

  if (avgHours < 6) {
    recommendations.push(
      "⚠️ Sueño críticamente bajo - consulta con un profesional de la salud"
    );
  }

  return recommendations;
}

// Helper method to generate HRV insights
function generateHRVInsights(
  avgRecovery: number,
  avgStress: number,
  trend: string
): string[] {
  const insights: string[] = [];

  if (avgRecovery > 70) {
    insights.push("✅ Excelente capacidad de recuperación");
  } else if (avgRecovery < 40) {
    insights.push("⚠️ Capacidad de recuperación baja - prioriza el descanso");
  }

  if (avgStress > 70) {
    insights.push("🔴 Niveles de estrés elevados detectados");
    insights.push("Considera técnicas de relajación y manejo del estrés");
  }

  if (trend === "improving") {
    insights.push("📈 Tu HRV está mejorando - mantén tus hábitos actuales");
  } else if (trend === "declining") {
    insights.push(
      "📉 Tu HRV está declinando - revisa tu entrenamiento y recuperación"
    );
  }

  return insights;
}

export default health;
