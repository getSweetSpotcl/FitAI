import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AIResourceManager, type UserProfile } from "../lib/ai-cost-control";
import { PremiumAIService } from "../lib/premium-ai-service";
import { clerkAuth } from "../middleware/clerk-auth";
import { requirePremium, requirePro } from "../middleware/plan-access";
import { createDatabaseClient, getWorkoutProgressAnalysis, calculateStrengthGains, getVolumeProgression } from "../db/database";
import { FormAnalysisService } from "../lib/form-analysis-service";

type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  OPENAI_API_KEY: string;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: "free" | "premium" | "pro";
  };
};

const premiumAi = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes
premiumAi.use("*", clerkAuth());

// Generar rutina avanzada con periodización - Requires Premium or Pro
premiumAi.post("/generate-advanced-routine", requirePremium(), async (c) => {
  try {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const requestData = (await c.req.json()) as {
      experienceLevel: "beginner" | "intermediate" | "advanced";
      goals: string[];
      availableDays: number;
      availableEquipment: string[];
      injuries?: string[];
      periodizationPreference?: "linear" | "undulating" | "block";
      focusAreas?: string[];
      timeframe?: number; // weeks
    };

    // Validar datos de entrada
    if (
      !requestData.experienceLevel ||
      !requestData.goals ||
      !requestData.availableDays
    ) {
      throw new HTTPException(400, {
        message:
          "Faltan datos requeridos: experienceLevel, goals, availableDays",
      });
    }

    // Crear perfil del usuario
    const userProfile: UserProfile = {
      id: user.id,
      plan: user.plan,
      experienceLevel: requestData.experienceLevel,
      goals: requestData.goals,
      availableDays: Math.max(1, Math.min(7, requestData.availableDays)),
      availableEquipment: requestData.availableEquipment || ["peso_corporal"],
      injuries: requestData.injuries,
    };

    // Inicializar premium AI service
    const aiManager = new AIResourceManager(c.env.CACHE);
    const premiumAiService = new PremiumAIService(
      aiManager,
      c.env.OPENAI_API_KEY
    );

    // Generar rutina avanzada
    const result = await premiumAiService.generateAdvancedRoutine(userProfile);

    if (!result.success) {
      throw new HTTPException(400, {
        message: result.error || "Error generando rutina avanzada",
      });
    }

    return c.json({
      success: true,
      data: result.data,
      message: "Rutina avanzada generada exitosamente",
      premium: true,
    });
  } catch (error) {
    console.error("Generate advanced routine error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error interno del servidor" });
  }
});

// Análisis avanzado de patrones de fatiga - Requires Pro
premiumAi.post("/analyze-fatigue", requirePro(), async (c) => {
  try {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const { workoutHistory, timeframe } = await c.req.json();

    if (!workoutHistory || !Array.isArray(workoutHistory)) {
      throw new HTTPException(400, {
        message: "workoutHistory es requerido y debe ser un array",
      });
    }

    if (workoutHistory.length < 5) {
      throw new HTTPException(400, {
        message:
          "Se requieren al menos 5 entrenamientos para el análisis de fatiga",
      });
    }

    const aiManager = new AIResourceManager(c.env.CACHE);
    const premiumAiService = new PremiumAIService(
      aiManager,
      c.env.OPENAI_API_KEY
    );

    // Analizar patrones de fatiga
    const result =
      await premiumAiService.analyzeFatiguePatterns(workoutHistory);

    if (!result.success) {
      throw new HTTPException(400, {
        message: result.error || "Error analizando fatiga",
      });
    }

    return c.json({
      success: true,
      data: result.data,
      message: "Análisis de fatiga completado",
      premium: true,
    });
  } catch (error) {
    console.error("Fatigue analysis error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error interno del servidor" });
  }
});

// Predicción de progresión de carga - Requires Premium or Pro
premiumAi.post("/predict-load-progression", requirePremium(), async (c) => {
  try {
    const _user = c.get("user");

    const { exerciseHistory, targetExercises } = await c.req.json();

    if (!exerciseHistory || !Array.isArray(exerciseHistory)) {
      throw new HTTPException(400, {
        message: "exerciseHistory es requerido y debe ser un array",
      });
    }

    if (exerciseHistory.length < 3) {
      throw new HTTPException(400, {
        message:
          "Se requieren al menos 3 sesiones de cada ejercicio para predicción de carga",
      });
    }

    const aiManager = new AIResourceManager(c.env.CACHE);
    const premiumAiService = new PremiumAIService(
      aiManager,
      c.env.OPENAI_API_KEY
    );

    // Predecir progresión óptima
    const result =
      await premiumAiService.predictOptimalLoadProgression(exerciseHistory);

    if (!result.success) {
      throw new HTTPException(400, {
        message: result.error || "Error prediciendo progresión",
      });
    }

    return c.json({
      success: true,
      data: result.data,
      message: "Predicción de progresión completada",
      premium: true,
    });
  } catch (error) {
    console.error("Load progression prediction error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error interno del servidor" });
  }
});

// Análisis de técnica de ejercicio con video - Requires Pro
premiumAi.post("/analyze-exercise-form", requirePro(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const { exerciseId, videoUrl, userLevel = 'intermediate' } = await c.req.json();

    // Validar datos de entrada
    if (!exerciseId || !videoUrl) {
      throw new HTTPException(400, { 
        message: "exerciseId y videoUrl son requeridos" 
      });
    }

    if (!['beginner', 'intermediate', 'advanced'].includes(userLevel)) {
      throw new HTTPException(400, { 
        message: "userLevel debe ser: beginner, intermediate, o advanced" 
      });
    }

    // Validar URL del video
    if (!isValidVideoUrl(videoUrl)) {
      throw new HTTPException(400, { 
        message: "URL de video no válida. Soportamos formatos: mp4, mov, avi" 
      });
    }

    // Inicializar servicio de análisis de técnica
    const formAnalysisService = new FormAnalysisService(c.env.OPENAI_API_KEY);

    // Verificar si el ejercicio es soportado
    if (!formAnalysisService.isExerciseSupported(exerciseId)) {
      const availableExercises = formAnalysisService.getAvailableExercises();
      throw new HTTPException(400, {
        message: `Ejercicio ${exerciseId} no soportado. Ejercicios disponibles: ${availableExercises.map(e => e.id).join(', ')}`
      });
    }

    // Realizar análisis de técnica
    const analysis = await formAnalysisService.analyzeExerciseForm(
      videoUrl,
      exerciseId,
      userLevel
    );

    // Guardar resultado en base de datos
    const database = createDatabaseClient(c.env.DATABASE_URL);
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    await database`
      INSERT INTO form_analyses (
        id, user_id, exercise_id, video_url, user_level,
        overall_score, analysis_data, confidence, processed_frames,
        created_at
      ) VALUES (
        ${analysisId}, ${user.id}, ${exerciseId}, ${videoUrl}, ${userLevel},
        ${analysis.overallScore}, ${JSON.stringify(analysis)}, 
        ${analysis.confidence}, ${analysis.processedFrames}, NOW()
      )
    `;

    // Registrar uso de IA
    await database`
      INSERT INTO ai_usage (
        id, user_id, feature, model, request_data, response_data, created_at
      ) VALUES (
        ${`ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`},
        ${user.id}, 'form_analysis', 'gpt-4-vision', 
        ${JSON.stringify({ exerciseId, videoUrl, userLevel })},
        ${JSON.stringify({ analysisId, score: analysis.overallScore })}, NOW()
      )
    `;

    return c.json({
      success: true,
      data: {
        analysisId,
        exerciseId: analysis.exerciseId,
        exerciseName: analysis.exerciseName,
        overallScore: analysis.overallScore,
        analysis: analysis.analysis,
        keyFindings: analysis.keyFindings,
        recommendations: analysis.recommendations,
        safetyFlags: analysis.safetyFlags,
        confidence: analysis.confidence,
        processedFrames: analysis.processedFrames,
        createdAt: new Date().toISOString()
      },
      message: "Análisis de técnica completado exitosamente",
      premium: true,
    });

  } catch (error) {
    console.error("Form analysis error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { 
      message: "Error interno del servidor durante el análisis de técnica" 
    });
  }
});

// Obtener ejercicios disponibles para análisis de técnica
premiumAi.get("/analyze-exercise-form/exercises", requirePro(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const formAnalysisService = new FormAnalysisService(c.env.OPENAI_API_KEY);
    const availableExercises = formAnalysisService.getAvailableExercises();

    return c.json({
      success: true,
      data: {
        exercises: availableExercises.map(exercise => ({
          id: exercise.id,
          name: exercise.name,
          nameEs: exercise.nameEs,
          category: exercise.category,
          muscleGroups: exercise.muscleGroups,
          commonMistakes: exercise.commonMistakes.map(m => m.descriptionEs),
          safetyPoints: exercise.safetyPoints
        })),
        totalCount: availableExercises.length
      },
      message: "Ejercicios disponibles para análisis de técnica"
    });

  } catch (error) {
    console.error("Get available exercises error:", error);
    throw new HTTPException(500, { 
      message: "Error obteniendo ejercicios disponibles" 
    });
  }
});

// Obtener historial de análisis de técnica del usuario
premiumAi.get("/analyze-exercise-form/history", requirePro(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const limit = parseInt(c.req.query("limit") || "10");
    const offset = parseInt(c.req.query("offset") || "0");

    const database = createDatabaseClient(c.env.DATABASE_URL);
    
    const analyses = await database`
      SELECT 
        fa.*,
        e.name as exercise_name,
        e.name_es as exercise_name_es
      FROM form_analyses fa
      LEFT JOIN exercises e ON fa.exercise_id = e.id
      WHERE fa.user_id = ${user.id}
      ORDER BY fa.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const totalCount = await database`
      SELECT COUNT(*) as count 
      FROM form_analyses 
      WHERE user_id = ${user.id}
    `;

    return c.json({
      success: true,
      data: {
        analyses: (analyses as any[]).map(analysis => ({
          id: analysis.id,
          exerciseId: analysis.exercise_id,
          exerciseName: analysis.exercise_name_es || analysis.exercise_name,
          overallScore: analysis.overall_score,
          confidence: analysis.confidence,
          processedFrames: analysis.processed_frames,
          userLevel: analysis.user_level,
          createdAt: analysis.created_at,
          // Don't return full analysis_data for performance, only summary
          summary: {
            setupScore: JSON.parse(analysis.analysis_data || '{}').analysis?.setup?.score || 0,
            executionScore: JSON.parse(analysis.analysis_data || '{}').analysis?.execution?.score || 0,
            completionScore: JSON.parse(analysis.analysis_data || '{}').analysis?.completion?.score || 0
          }
        })),
        pagination: {
          total: parseInt((totalCount as any[])[0]?.count || '0'),
          limit,
          offset,
          hasMore: (analyses as any[]).length === limit
        }
      },
      message: "Historial de análisis de técnica"
    });

  } catch (error) {
    console.error("Get form analysis history error:", error);
    throw new HTTPException(500, { 
      message: "Error obteniendo historial de análisis" 
    });
  }
});

// Obtener análisis de técnica específico
premiumAi.get("/analyze-exercise-form/:analysisId", requirePro(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const analysisId = c.req.param("analysisId");
    const database = createDatabaseClient(c.env.DATABASE_URL);
    
    const analysis = await database`
      SELECT 
        fa.*,
        e.name as exercise_name,
        e.name_es as exercise_name_es
      FROM form_analyses fa
      LEFT JOIN exercises e ON fa.exercise_id = e.id
      WHERE fa.id = ${analysisId} AND fa.user_id = ${user.id}
      LIMIT 1
    `;

    if ((analysis as any[]).length === 0) {
      throw new HTTPException(404, { 
        message: "Análisis no encontrado" 
      });
    }

    const analysisData = (analysis as any[])[0];
    const fullAnalysis = JSON.parse(analysisData.analysis_data || '{}');

    return c.json({
      success: true,
      data: {
        id: analysisData.id,
        exerciseId: analysisData.exercise_id,
        exerciseName: analysisData.exercise_name_es || analysisData.exercise_name,
        overallScore: analysisData.overall_score,
        confidence: analysisData.confidence,
        processedFrames: analysisData.processed_frames,
        userLevel: analysisData.user_level,
        createdAt: analysisData.created_at,
        // Return full analysis data for detailed view
        ...fullAnalysis
      },
      message: "Análisis de técnica detallado"
    });

  } catch (error) {
    console.error("Get form analysis detail error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { 
      message: "Error obteniendo detalle del análisis" 
    });
  }
});

// Obtener características premium disponibles para el usuario
premiumAi.get("/features", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const features = {
      unlimitedRoutineGeneration: PremiumAIService.hasAccess(
        user.plan,
        "unlimitedRoutineGeneration"
      ),
      advancedProgressAnalysis: PremiumAIService.hasAccess(
        user.plan,
        "advancedProgressAnalysis"
      ),
      predictiveLoadManagement: PremiumAIService.hasAccess(
        user.plan,
        "predictiveLoadManagement"
      ),
      exerciseFormFeedback: PremiumAIService.hasAccess(
        user.plan,
        "exerciseFormFeedback"
      ),
      personalizedRecoveryAdvice: PremiumAIService.hasAccess(
        user.plan,
        "personalizedRecoveryAdvice"
      ),
      fatiguePatternAnalysis: PremiumAIService.hasAccess(
        user.plan,
        "fatiguePatternAnalysis"
      ),
    };

    return c.json({
      success: true,
      data: {
        currentPlan: user.plan,
        features,
        availableFeatures: Object.keys(features).filter(
          (key) => features[key as keyof typeof features]
        ),
        restrictedFeatures: Object.keys(features).filter(
          (key) => !features[key as keyof typeof features]
        ),
      },
    });
  } catch (error) {
    console.error("Get premium features error:", error);
    throw new HTTPException(500, {
      message: "Error obteniendo características premium",
    });
  }
});

// Generar reporte de progreso avanzado - Requires Premium or Pro
premiumAi.post("/generate-progress-report", requirePremium(), async (c) => {
  try {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const {
      timeframe = "month",
      includeCharts = true,
      includeRecommendations = true,
    } = await c.req.json();

    // Validar timeframe
    const validTimeframes = ["week", "month", "quarter", "year"];
    if (!validTimeframes.includes(timeframe)) {
      throw new HTTPException(400, { 
        message: "Timeframe inválido. Valores permitidos: week, month, quarter, year" 
      });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);

    // Obtener análisis completo de progreso del usuario
    const [progressAnalysis, strengthGains, volumeProgression] = await Promise.all([
      getWorkoutProgressAnalysis(database, user.id, timeframe),
      calculateStrengthGains(database, user.id, timeframe),
      getVolumeProgression(database, user.id, timeframe)
    ]);

    // Verificar que hay suficientes datos
    if (progressAnalysis.totalSessions === 0) {
      throw new HTTPException(400, { 
        message: "No hay suficientes datos de entrenamientos para generar el reporte de progreso" 
      });
    }

    // Calcular métricas avanzadas
    const totalVolumeLifted = progressAnalysis.workoutSessions.reduce(
      (sum: number, session: any) => sum + (parseFloat(session.session_volume) || 0), 0
    );

    const averageSessionDuration = progressAnalysis.workoutSessions.reduce(
      (sum: number, session: any) => sum + (parseFloat(session.duration_minutes) || 0), 0
    ) / progressAnalysis.totalSessions;

    const averageRPE = progressAnalysis.workoutSessions.reduce(
      (sum: number, session: any) => sum + (parseFloat(session.average_rpe) || 0), 0
    ) / progressAnalysis.totalSessions;

    // Generar insights personalizados
    const insights = generateProgressInsights(
      progressAnalysis,
      strengthGains,
      volumeProgression,
      timeframe
    );

    // Generar recomendaciones si están habilitadas
    const recommendations = includeRecommendations ? 
      generateProgressRecommendations(strengthGains, volumeProgression, progressAnalysis) : [];

    // Preparar datos para gráficos si están habilitados
    const chartData = includeCharts ? {
      volumeProgression: volumeProgression.map((entry: any) => ({
        date: entry.date,
        volume: parseFloat(entry.daily_volume) || 0,
        sessions: parseInt(entry.sessions_count) || 0
      })),
      strengthProgression: strengthGains.slice(0, 10).map((exercise: any) => ({
        exerciseName: exercise.name_es || exercise.name,
        initialWeight: parseFloat(exercise.initial_weight) || 0,
        currentWeight: parseFloat(exercise.current_weight) || 0,
        improvementPercentage: parseFloat(exercise.improvement_percentage) || 0
      }))
    } : null;

    const reportData = {
      reportId: crypto.randomUUID(),
      userId: user.id,
      timeframe,
      generatedAt: new Date().toISOString(),
      period: {
        daysAnalyzed: progressAnalysis.daysAnalyzed,
        totalSessions: progressAnalysis.totalSessions,
        startDate: new Date(Date.now() - progressAnalysis.daysAnalyzed * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      summary: {
        totalVolumeLifted: Math.round(totalVolumeLifted),
        averageSessionDuration: Math.round(averageSessionDuration),
        averageRPE: Math.round(averageRPE * 10) / 10,
        exercisesTracked: progressAnalysis.exerciseProgress.length,
        strongestGains: strengthGains.slice(0, 5).map((ex: any) => ({
          exercise: ex.name_es || ex.name,
          improvement: `${Math.round(parseFloat(ex.improvement_percentage) || 0)}%`
        }))
      },
      detailedAnalysis: {
        workoutFrequency: {
          sessionsPerWeek: Math.round((progressAnalysis.totalSessions / progressAnalysis.daysAnalyzed) * 7 * 10) / 10,
          consistency: calculateConsistencyScore(progressAnalysis.workoutSessions)
        },
        strengthProgress: {
          topGains: strengthGains.slice(0, 5),
          averageImprovement: calculateAverageImprovement(strengthGains),
          exercisesImproved: strengthGains.filter((ex: any) => parseFloat(ex.improvement_percentage) > 0).length
        },
        volumeAnalysis: {
          progression: volumeProgression,
          trend: analyzeVolumeTrend(volumeProgression),
          peakVolume: Math.max(...volumeProgression.map((entry: any) => parseFloat(entry.daily_volume) || 0))
        }
      },
      insights,
      recommendations,
      chartData
    };

    return c.json({
      success: true,
      data: reportData,
      message: "Reporte de progreso avanzado generado exitosamente",
      premium: true,
    });
  } catch (error) {
    console.error("Progress report generation error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error generando reporte de progreso",
    });
  }
});

// Helper functions for progress report generation

function generateProgressInsights(
  progressAnalysis: any,
  strengthGains: any[],
  volumeProgression: any[],
  timeframe: string
): string[] {
  const insights: string[] = [];

  // Analyze workout frequency
  const sessionsPerWeek = (progressAnalysis.totalSessions / progressAnalysis.daysAnalyzed) * 7;
  if (sessionsPerWeek >= 4) {
    insights.push(`Excelente consistencia con ${Math.round(sessionsPerWeek * 10) / 10} entrenamientos por semana en promedio`);
  } else if (sessionsPerWeek >= 2) {
    insights.push(`Buena frecuencia de entrenamiento con ${Math.round(sessionsPerWeek * 10) / 10} sesiones por semana`);
  } else {
    insights.push(`Frecuencia de entrenamiento baja: ${Math.round(sessionsPerWeek * 10) / 10} sesiones por semana. Considera aumentar la frecuencia`);
  }

  // Analyze strength progress
  const improvingExercises = strengthGains.filter(ex => parseFloat(ex.improvement_percentage) > 0);
  if (improvingExercises.length > 0) {
    const avgImprovement = improvingExercises.reduce((sum, ex) => 
      sum + parseFloat(ex.improvement_percentage), 0) / improvingExercises.length;
    insights.push(`Progreso de fuerza sólido: ${improvingExercises.length} ejercicios mejoraron con un promedio de ${Math.round(avgImprovement)}%`);
  }

  // Analyze volume trends
  if (volumeProgression.length >= 3) {
    const recentVolume = volumeProgression.slice(-3).reduce((sum, entry) => 
      sum + parseFloat(entry.daily_volume || 0), 0) / 3;
    const earlierVolume = volumeProgression.slice(0, 3).reduce((sum, entry) => 
      sum + parseFloat(entry.daily_volume || 0), 0) / 3;
    
    if (recentVolume > earlierVolume * 1.1) {
      insights.push(`Volumen de entrenamiento en aumento: incremento del ${Math.round(((recentVolume - earlierVolume) / earlierVolume) * 100)}%`);
    } else if (recentVolume < earlierVolume * 0.9) {
      insights.push(`Volumen de entrenamiento en descenso: considera evaluar tu programa de entrenamiento`);
    }
  }

  // Timeframe-specific insights
  if (timeframe === "month" && progressAnalysis.totalSessions >= 8) {
    insights.push("Has mantenido una buena consistencia mensual. Perfecto para evaluar progreso a mediano plazo");
  } else if (timeframe === "quarter" && progressAnalysis.totalSessions >= 24) {
    insights.push("Excelente base de datos trimestral para análisis de tendencias a largo plazo");
  }

  return insights.length > 0 ? insights : ["Continúa entrenando consistentemente para generar más insights personalizados"];
}

function generateProgressRecommendations(
  strengthGains: any[],
  volumeProgression: any[],
  progressAnalysis: any
): string[] {
  const recommendations: string[] = [];

  // Strength-based recommendations
  const plateauedExercises = strengthGains.filter(ex => 
    parseFloat(ex.improvement_percentage) < 2 && parseFloat(ex.improvement_percentage) >= 0
  );
  
  if (plateauedExercises.length > 0) {
    recommendations.push(`${plateauedExercises.length} ejercicios muestran poco progreso. Considera variar repeticiones, peso o técnica`);
  }

  const strongProgressExercises = strengthGains.filter(ex => parseFloat(ex.improvement_percentage) > 15);
  if (strongProgressExercises.length > 0) {
    recommendations.push(`¡Excelente progreso en ${strongProgressExercises.length} ejercicios! Mantén la consistencia en estos movimientos`);
  }

  // Volume-based recommendations
  if (volumeProgression.length >= 4) {
    const avgVolume = volumeProgression.reduce((sum, entry) => 
      sum + parseFloat(entry.daily_volume || 0), 0) / volumeProgression.length;
    const recentAvg = volumeProgression.slice(-2).reduce((sum, entry) => 
      sum + parseFloat(entry.daily_volume || 0), 0) / 2;

    if (recentAvg > avgVolume * 1.3) {
      recommendations.push("Volumen muy alto recientemente. Considera programar una semana de descarga para optimizar recuperación");
    } else if (recentAvg < avgVolume * 0.7) {
      recommendations.push("Volumen bajo reciente. Evalúa si puedes incrementar gradualmente la carga de entrenamiento");
    }
  }

  // Frequency recommendations
  const sessionsPerWeek = (progressAnalysis.totalSessions / progressAnalysis.daysAnalyzed) * 7;
  if (sessionsPerWeek < 3) {
    recommendations.push("Aumenta la frecuencia de entrenamiento a 3-4 sesiones por semana para mejores resultados");
  } else if (sessionsPerWeek > 6) {
    recommendations.push("Frecuencia muy alta. Asegúrate de incluir días de descanso para una recuperación óptima");
  }

  return recommendations.length > 0 ? 
    recommendations : 
    ["Mantén tu rutina actual y continúa monitoreando tu progreso"];
}

function calculateConsistencyScore(workoutSessions: any[]): number {
  if (workoutSessions.length === 0) return 0;

  // Calculate consistency based on workout frequency over time
  const dates = workoutSessions.map(session => new Date(session.started_at));
  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
  
  if (sortedDates.length < 2) return 100;

  const totalPeriod = sortedDates[sortedDates.length - 1].getTime() - sortedDates[0].getTime();
  const days = totalPeriod / (1000 * 60 * 60 * 24);
  const expectedSessions = Math.max(1, days / 7) * 3; // Expect ~3 sessions per week
  
  const consistencyScore = Math.min(100, (workoutSessions.length / expectedSessions) * 100);
  return Math.round(consistencyScore);
}

function calculateAverageImprovement(strengthGains: any[]): number {
  if (strengthGains.length === 0) return 0;
  
  const improvements = strengthGains
    .map(ex => parseFloat(ex.improvement_percentage))
    .filter(improvement => improvement > 0);
  
  if (improvements.length === 0) return 0;
  
  return Math.round((improvements.reduce((sum, improvement) => sum + improvement, 0) / improvements.length) * 10) / 10;
}

function analyzeVolumeTrend(volumeProgression: any[]): string {
  if (volumeProgression.length < 3) return "insufficient_data";

  const volumes = volumeProgression.map(entry => parseFloat(entry.daily_volume) || 0);
  const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
  const secondHalf = volumes.slice(Math.floor(volumes.length / 2));

  const firstAvg = firstHalf.reduce((sum, vol) => sum + vol, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, vol) => sum + vol, 0) / secondHalf.length;

  const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (percentChange > 10) return "increasing";
  if (percentChange < -10) return "decreasing";
  return "stable";
}

// Helper function to validate video URLs
function isValidVideoUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Check if it's a valid HTTP/HTTPS URL
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Check for supported video file extensions
    const supportedFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const pathname = parsedUrl.pathname.toLowerCase();
    
    // Check if URL ends with supported format or contains video hosting domains
    const hasValidExtension = supportedFormats.some(format => pathname.endsWith(format));
    const isVideoHosting = ['youtube.com', 'youtu.be', 'vimeo.com', 'drive.google.com'].some(
      domain => parsedUrl.hostname.includes(domain)
    );
    
    return hasValidExtension || isVideoHosting;
  } catch {
    return false;
  }
}

export default premiumAi;
