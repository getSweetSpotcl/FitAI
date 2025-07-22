import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middleware/auth';
import { AdvancedAnalytics, WorkoutHistory, MovementPattern } from '../lib/advanced-analytics';

type Bindings = {
  DATABASE_URL: string;
  CACHE: KVNamespace;
  OPENAI_API_KEY: string;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: 'free' | 'premium' | 'pro';
  };
};

const analytics = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes
analytics.use('*', authMiddleware);

/**
 * Detect training plateaus for user
 */
analytics.post('/plateau-detection', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    // Premium feature check
    if (user.plan === 'free') {
      throw new HTTPException(403, { 
        message: 'La detección de plateau requiere FitAI Premium o Pro' 
      });
    }

    const requestData = await c.req.json() as {
      timeframe?: number; // weeks of data to analyze
      exerciseIds?: string[];
    };

    // Get workout history (mock data for demo)
    const mockWorkoutHistory: WorkoutHistory[] = generateMockWorkoutHistory(user.id, requestData.timeframe || 12);

    const analyticsEngine = new AdvancedAnalytics(mockWorkoutHistory);
    const plateauPredictions = await analyticsEngine.detectTrainingPlateaus(user.id);

    // Filter by specific exercises if requested
    const filteredPredictions = requestData.exerciseIds 
      ? plateauPredictions.filter(p => requestData.exerciseIds!.includes(p.exerciseId))
      : plateauPredictions;

    return c.json({
      success: true,
      data: {
        predictions: filteredPredictions,
        summary: {
          totalExercisesAnalyzed: plateauPredictions.length,
          highRiskPlateaus: plateauPredictions.filter(p => p.likelihood > 0.7).length,
          avgConfidence: plateauPredictions.reduce((sum, p) => sum + p.confidence, 0) / plateauPredictions.length,
        },
        recommendations: generatePlateauSummaryRecommendations(filteredPredictions)
      },
      message: 'Análisis de plateau completado'
    });

  } catch (error) {
    console.error('Plateau detection error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error en detección de plateau' });
  }
});

/**
 * Calculate optimal training volume
 */
analytics.post('/optimal-volume', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    // Premium feature check
    if (user.plan === 'free') {
      throw new HTTPException(403, { 
        message: 'El cálculo de volumen óptimo requiere FitAI Premium o Pro' 
      });
    }

    const requestData = await c.req.json() as {
      userProfile: {
        experienceLevel: 'beginner' | 'intermediate' | 'advanced';
        goals: string[];
        availableDays: number;
      };
      currentPhase?: 'strength' | 'hypertrophy' | 'power' | 'endurance';
    };

    // Get workout history
    const mockWorkoutHistory: WorkoutHistory[] = generateMockWorkoutHistory(user.id, 8);
    
    const analyticsEngine = new AdvancedAnalytics(mockWorkoutHistory);
    const volumeRecommendation = await analyticsEngine.calculateOptimalVolume(
      user.id, 
      requestData.userProfile
    );

    // Generate phase-specific recommendations
    const phaseRecommendations = generatePhaseRecommendations(
      requestData.currentPhase || 'hypertrophy',
      volumeRecommendation
    );

    return c.json({
      success: true,
      data: {
        ...volumeRecommendation,
        phaseRecommendations,
        weeklyProgression: generateWeeklyProgression(volumeRecommendation),
        deloadRecommendation: generateDeloadRecommendation(volumeRecommendation)
      },
      message: 'Cálculo de volumen óptimo completado'
    });

  } catch (error) {
    console.error('Optimal volume calculation error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error calculando volumen óptimo' });
  }
});

/**
 * Assess injury risk factors
 */
analytics.post('/injury-risk-assessment', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    // Pro feature check
    if (user.plan !== 'pro') {
      throw new HTTPException(403, { 
        message: 'La evaluación de riesgo de lesión requiere FitAI Pro' 
      });
    }

    const requestData = await c.req.json() as {
      movementPatterns?: MovementPattern[];
      recentInjuries?: string[];
      painPoints?: Array<{
        location: string;
        severity: number; // 1-10
        frequency: 'rare' | 'occasional' | 'frequent';
      }>;
    };

    // Get workout history
    const mockWorkoutHistory: WorkoutHistory[] = generateMockWorkoutHistory(user.id, 6);
    
    // Generate movement patterns if not provided
    const movementPatterns = requestData.movementPatterns || generateMockMovementPatterns();
    
    const analyticsEngine = new AdvancedAnalytics(mockWorkoutHistory);
    const riskAssessment = await analyticsEngine.assessInjuryRisk(user.id, movementPatterns);

    // Enhanced assessment with additional factors
    const enhancedAssessment = enhanceRiskAssessment(
      riskAssessment,
      requestData.recentInjuries || [],
      requestData.painPoints || []
    );

    return c.json({
      success: true,
      data: {
        ...enhancedAssessment,
        actionPlan: generateInjuryPreventionPlan(enhancedAssessment),
        followUpSchedule: generateFollowUpSchedule(enhancedAssessment.overallRisk)
      },
      message: 'Evaluación de riesgo de lesión completada'
    });

  } catch (error) {
    console.error('Injury risk assessment error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error en evaluación de riesgo' });
  }
});

/**
 * Calculate Training Stress Score (TSS) for workouts
 */
analytics.post('/training-stress', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const requestData = await c.req.json() as {
      workoutId?: string;
      timeframe?: number; // days
    };

    // Get workout history
    const mockWorkoutHistory: WorkoutHistory[] = generateMockWorkoutHistory(
      user.id, 
      Math.ceil((requestData.timeframe || 7) / 7)
    );

    const analyticsEngine = new AdvancedAnalytics(mockWorkoutHistory);

    const tssData = mockWorkoutHistory.map(workout => ({
      workoutId: workout.id,
      date: workout.date,
      tss: analyticsEngine.calculateTrainingStressScore(workout),
      duration: workout.duration,
      avgRPE: workout.avgRPE,
      totalVolume: workout.totalVolume
    }));

    // Calculate weekly TSS trends
    const weeklyTSS = calculateWeeklyTSS(tssData);
    const tssRecommendations = generateTSSRecommendations(weeklyTSS);

    return c.json({
      success: true,
      data: {
        workoutTSS: requestData.workoutId 
          ? tssData.find(t => t.workoutId === requestData.workoutId) 
          : tssData,
        weeklyTrends: weeklyTSS,
        recommendations: tssRecommendations,
        optimalRange: calculateOptimalTSSRange(user.plan, mockWorkoutHistory)
      },
      message: 'Análisis de estrés de entrenamiento completado'
    });

  } catch (error) {
    console.error('Training stress calculation error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error calculando estrés de entrenamiento' });
  }
});

/**
 * Estimate One Rep Max for exercises
 */
analytics.post('/one-rep-max', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const requestData = await c.req.json() as {
      exerciseId: string;
      recentSets: Array<{
        reps: number;
        weight: number;
        rpe?: number;
      }>;
    };

    if (!requestData.exerciseId || !requestData.recentSets.length) {
      throw new HTTPException(400, { 
        message: 'exerciseId y recentSets son requeridos' 
      });
    }

    const analyticsEngine = new AdvancedAnalytics([]);
    const oneRepMax = analyticsEngine.estimateOneRepMax(
      requestData.exerciseId, 
      requestData.recentSets
    );

    // Calculate strength standards and percentiles
    const strengthStandards = calculateStrengthStandards(oneRepMax, requestData.exerciseId);
    const progression = generateStrengthProgression(oneRepMax);

    return c.json({
      success: true,
      data: {
        exerciseId: requestData.exerciseId,
        estimatedOneRepMax: oneRepMax,
        strengthStandards,
        progression,
        confidence: calculateORMConfidence(requestData.recentSets),
        nextTargets: generateORMTargets(oneRepMax)
      },
      message: '1RM estimado calculado exitosamente'
    });

  } catch (error) {
    console.error('One rep max calculation error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error estimando 1RM' });
  }
});

/**
 * Get comprehensive analytics dashboard data
 */
analytics.get('/dashboard', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    // Premium feature check
    if (user.plan === 'free') {
      throw new HTTPException(403, { 
        message: 'El dashboard avanzado requiere FitAI Premium o Pro' 
      });
    }

    // Get cached data or calculate fresh
    const cacheKey = `analytics:dashboard:${user.id}`;
    const cached = await c.env.CACHE.get(cacheKey);

    if (cached) {
      return c.json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
        message: 'Dashboard analytics cargado'
      });
    }

    // Generate comprehensive analytics
    const mockWorkoutHistory = generateMockWorkoutHistory(user.id, 12);
    const analyticsEngine = new AdvancedAnalytics(mockWorkoutHistory);

    const dashboardData = {
      summary: {
        totalWorkouts: mockWorkoutHistory.length,
        avgTSS: 245,
        adaptationRate: 0.23,
        injuryRisk: 'low' as const,
        plateauRisk: 0.35
      },
      trends: {
        volumeProgression: generateVolumeTrend(mockWorkoutHistory),
        strengthGains: generateStrengthTrends(),
        recoveryPatterns: generateRecoveryPatterns()
      },
      insights: await generateAIInsights(user.id, mockWorkoutHistory),
      recommendations: generateDashboardRecommendations(user.plan)
    };

    // Cache for 30 minutes
    await c.env.CACHE.put(cacheKey, JSON.stringify(dashboardData), { expirationTtl: 1800 });

    return c.json({
      success: true,
      data: dashboardData,
      cached: false,
      message: 'Dashboard analytics generado'
    });

  } catch (error) {
    console.error('Analytics dashboard error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error generando dashboard de análisis' });
  }
});

// Helper functions
function generateMockWorkoutHistory(userId: string, weeks: number): WorkoutHistory[] {
  const workouts: WorkoutHistory[] = [];
  const now = new Date();

  for (let i = weeks * 3; i > 0; i--) { // ~3 workouts per week
    const workoutDate = new Date(now.getTime() - (i * 2.5 * 24 * 60 * 60 * 1000));
    
    workouts.push({
      id: `workout_${userId}_${i}`,
      userId,
      date: workoutDate,
      exercises: [
        {
          exerciseId: 'bench_press',
          name: 'Press de Banca',
          sets: [
            { reps: 8, weight: 80, rpe: 7 },
            { reps: 8, weight: 82.5, rpe: 8 },
            { reps: 6, weight: 85, rpe: 9 }
          ],
          totalVolume: 1980,
          oneRepMax: 95,
          avgRPE: 8
        },
        {
          exerciseId: 'squat',
          name: 'Sentadilla',
          sets: [
            { reps: 10, weight: 100, rpe: 7 },
            { reps: 8, weight: 105, rpe: 8 },
            { reps: 6, weight: 110, rpe: 9 }
          ],
          totalVolume: 2490,
          oneRepMax: 125,
          avgRPE: 8
        }
      ],
      duration: 65 + Math.random() * 20,
      totalVolume: 4470 + Math.random() * 1000,
      avgRPE: 7.5 + Math.random(),
      recoveryScore: 0.6 + Math.random() * 0.3
    });
  }

  return workouts.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function generateMockMovementPatterns(): MovementPattern[] {
  return [
    {
      exerciseId: 'bench_press',
      consistency: 0.85,
      technique_score: 82,
      asymmetries: [],
      improvement_trend: 0.1
    },
    {
      exerciseId: 'squat',
      consistency: 0.72,
      technique_score: 78,
      asymmetries: ['slight_knee_valgus'],
      improvement_trend: 0.05
    }
  ];
}

function generatePlateauSummaryRecommendations(predictions: any[]): string[] {
  const recommendations: string[] = [];
  
  if (predictions.some(p => p.likelihood > 0.7)) {
    recommendations.push('Considera cambiar el programa de entrenamiento');
    recommendations.push('Incorpora nuevas técnicas de intensidad');
  }
  
  if (predictions.length > 2) {
    recommendations.push('Programa una semana de descarga');
  }

  return recommendations.length > 0 ? recommendations : ['Continúa con el programa actual'];
}

function generatePhaseRecommendations(phase: string, volumeRec: any): any {
  const recommendations = {
    strength: {
      repRanges: '1-5 reps',
      restPeriods: '3-5 minutos',
      frequency: '3-4x por semana'
    },
    hypertrophy: {
      repRanges: '6-12 reps',
      restPeriods: '1-3 minutos',
      frequency: '4-6x por semana'
    },
    power: {
      repRanges: '1-3 reps explosivas',
      restPeriods: '3-5 minutos',
      frequency: '3-4x por semana'
    }
  };

  return recommendations[phase as keyof typeof recommendations] || recommendations.hypertrophy;
}

function generateWeeklyProgression(volumeRec: any): any[] {
  const baseVolume = volumeRec.recommendedVolume;
  return [
    { week: 1, volume: Math.round(baseVolume * 0.9), intensity: 'moderada' },
    { week: 2, volume: baseVolume, intensity: 'moderada-alta' },
    { week: 3, volume: Math.round(baseVolume * 1.1), intensity: 'alta' },
    { week: 4, volume: Math.round(baseVolume * 0.7), intensity: 'descarga' }
  ];
}

function generateDeloadRecommendation(volumeRec: any): any {
  return {
    frequency: 'cada 4 semanas',
    volumeReduction: '30-50%',
    intensityReduction: '20-30%',
    duration: '5-7 días'
  };
}

function enhanceRiskAssessment(assessment: any, injuries: string[], painPoints: any[]): any {
  const enhancedRiskFactors = [...assessment.riskFactors];
  
  if (injuries.length > 0) {
    enhancedRiskFactors.push({
      type: 'recovery',
      severity: 'high',
      description: `Historial reciente de lesiones: ${injuries.join(', ')}`,
      likelihood: 0.8,
      timeframe: '2-8 semanas'
    });
  }

  painPoints.forEach(point => {
    if (point.severity >= 6) {
      enhancedRiskFactors.push({
        type: 'biomechanical',
        severity: 'moderate',
        description: `Dolor en ${point.location} (${point.severity}/10)`,
        likelihood: 0.6,
        timeframe: '1-4 semanas'
      });
    }
  });

  return {
    ...assessment,
    riskFactors: enhancedRiskFactors
  };
}

function generateInjuryPreventionPlan(assessment: any): any {
  return {
    immediate: [
      'Evaluación con profesional de salud si hay dolor',
      'Técnicas de recuperación activa diarias'
    ],
    shortTerm: [
      'Incorporar ejercicios de movilidad específicos',
      'Monitoreo semanal de factores de riesgo'
    ],
    longTerm: [
      'Programa de fortalecimiento preventivo',
      'Evaluación biomecánica trimestral'
    ]
  };
}

function generateFollowUpSchedule(risk: 'low' | 'moderate' | 'high'): any {
  const schedules = {
    low: { frequency: 'monthly', focus: 'maintenance' },
    moderate: { frequency: 'bi-weekly', focus: 'monitoring' },
    high: { frequency: 'weekly', focus: 'intervention' }
  };

  return schedules[risk];
}

function calculateWeeklyTSS(tssData: any[]): any[] {
  // Group by week and calculate averages
  return [
    { week: 1, avgTSS: 180, trend: 'stable' },
    { week: 2, avgTSS: 195, trend: 'increasing' },
    { week: 3, avgTSS: 210, trend: 'increasing' },
    { week: 4, avgTSS: 145, trend: 'decreasing' }
  ];
}

function generateTSSRecommendations(weeklyTSS: any[]): string[] {
  return [
    'TSS actual está en rango óptimo',
    'Considera programar descarga próxima semana',
    'Mantén consistencia en frecuencia de entrenamientos'
  ];
}

function calculateOptimalTSSRange(plan: string, history: WorkoutHistory[]): any {
  const ranges = {
    free: { min: 100, max: 200 },
    premium: { min: 150, max: 300 },
    pro: { min: 200, max: 400 }
  };

  return ranges[plan as keyof typeof ranges] || ranges.free;
}

function calculateStrengthStandards(oneRepMax: number, exerciseId: string): any {
  // Mock strength standards (would be based on actual data)
  return {
    beginner: Math.round(oneRepMax * 0.6),
    intermediate: Math.round(oneRepMax * 0.8),
    advanced: Math.round(oneRepMax * 1.2),
    elite: Math.round(oneRepMax * 1.5),
    currentPercentile: 68
  };
}

function generateStrengthProgression(oneRepMax: number): any {
  return {
    shortTerm: { target: oneRepMax + 2.5, timeframe: '4-6 semanas' },
    mediumTerm: { target: oneRepMax + 7.5, timeframe: '12-16 semanas' },
    longTerm: { target: oneRepMax + 15, timeframe: '6-12 meses' }
  };
}

function calculateORMConfidence(sets: any[]): number {
  if (sets.length >= 3 && sets.every(s => s.reps <= 8)) return 0.9;
  if (sets.length >= 2 && sets.every(s => s.reps <= 12)) return 0.75;
  return 0.6;
}

function generateORMTargets(oneRepMax: number): any[] {
  return [
    { percentage: 70, weight: Math.round(oneRepMax * 0.7), reps: '6-8' },
    { percentage: 80, weight: Math.round(oneRepMax * 0.8), reps: '3-5' },
    { percentage: 90, weight: Math.round(oneRepMax * 0.9), reps: '1-2' }
  ];
}

function generateVolumeTrend(workouts: WorkoutHistory[]): any[] {
  return workouts.slice(-8).map((w, i) => ({
    week: i + 1,
    volume: w.totalVolume,
    change: i > 0 ? ((w.totalVolume - workouts[workouts.length - 8 + i - 1].totalVolume) / workouts[workouts.length - 8 + i - 1].totalVolume * 100) : 0
  }));
}

function generateStrengthTrends(): any[] {
  return [
    { exercise: 'Press de Banca', current: 85, change: 5.2, trend: 'increasing' },
    { exercise: 'Sentadilla', current: 110, change: 8.1, trend: 'increasing' },
    { exercise: 'Peso Muerto', current: 130, change: 3.8, trend: 'stable' }
  ];
}

function generateRecoveryPatterns(): any {
  return {
    avgScore: 0.72,
    trend: 'improving',
    patterns: [
      'Mejor recuperación los martes y jueves',
      'Recuperación más lenta después de entrenamientos de piernas',
      'Mejora constante en las últimas 4 semanas'
    ]
  };
}

async function generateAIInsights(userId: string, workouts: WorkoutHistory[]): Promise<string[]> {
  // In production, this would use AI to generate personalized insights
  return [
    'Tu progresión en press de banca está acelerándose - excelente trabajo',
    'Considera aumentar ligeramente el volumen de espalda para balance muscular',
    'Tus patrones de recuperación muestran una mejora consistente'
  ];
}

function generateDashboardRecommendations(plan: string): any {
  const recommendations = {
    free: [
      'Mantén consistencia en tus entrenamientos',
      'Enfócate en la progresión gradual'
    ],
    premium: [
      'Utiliza las funciones de análisis para optimizar tu entrenamiento',
      'Considera programar una descarga basada en tus métricas de fatiga'
    ],
    pro: [
      'Aprovecha los análisis predictivos para prevenir plateaus',
      'Usa los reportes avanzados para ajustar tu periodización'
    ]
  };

  return recommendations[plan as keyof typeof recommendations] || recommendations.free;
}

export default analytics;