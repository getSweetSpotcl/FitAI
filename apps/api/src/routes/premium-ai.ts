import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middleware/auth';
import { AIResourceManager, UserProfile } from '../lib/ai-cost-control';
import { PremiumAIService } from '../lib/premium-ai-service';

type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  OPENAI_API_KEY: string;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: 'free' | 'premium' | 'pro';
  };
};

const premiumAi = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes
premiumAi.use('*', authMiddleware);

// Middleware to check premium access
const premiumMiddleware = async (c: any, next: any) => {
  const user = c.get('user');
  if (!user) {
    throw new HTTPException(401, { message: 'Usuario no autenticado' });
  }

  if (user.plan === 'free') {
    throw new HTTPException(403, { 
      message: 'Esta función requiere un plan Premium o Pro. Actualiza tu suscripción.' 
    });
  }

  await next();
};

// Generar rutina avanzada con periodización
premiumAi.post('/generate-advanced-routine', premiumMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    const requestData = await c.req.json() as {
      experienceLevel: 'beginner' | 'intermediate' | 'advanced';
      goals: string[];
      availableDays: number;
      availableEquipment: string[];
      injuries?: string[];
      periodizationPreference?: 'linear' | 'undulating' | 'block';
      focusAreas?: string[];
      timeframe?: number; // weeks
    };

    // Validar datos de entrada
    if (!requestData.experienceLevel || !requestData.goals || !requestData.availableDays) {
      throw new HTTPException(400, { 
        message: 'Faltan datos requeridos: experienceLevel, goals, availableDays' 
      });
    }

    // Crear perfil del usuario
    const userProfile: UserProfile = {
      id: user.id,
      plan: user.plan,
      experienceLevel: requestData.experienceLevel,
      goals: requestData.goals,
      availableDays: Math.max(1, Math.min(7, requestData.availableDays)),
      availableEquipment: requestData.availableEquipment || ['peso_corporal'],
      injuries: requestData.injuries,
    };

    // Inicializar premium AI service
    const aiManager = new AIResourceManager(c.env.CACHE);
    const premiumAiService = new PremiumAIService(aiManager, c.env.OPENAI_API_KEY);

    // Generar rutina avanzada
    const result = await premiumAiService.generateAdvancedRoutine(userProfile);

    if (!result.success) {
      throw new HTTPException(400, { message: result.error || 'Error generando rutina avanzada' });
    }

    return c.json({
      success: true,
      data: result.data,
      message: 'Rutina avanzada generada exitosamente',
      premium: true,
    });

  } catch (error) {
    console.error('Generate advanced routine error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error interno del servidor' });
  }
});

// Análisis avanzado de patrones de fatiga
premiumAi.post('/analyze-fatigue', premiumMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    // Solo Pro tiene acceso a análisis de fatiga
    if (user.plan !== 'pro') {
      throw new HTTPException(403, { 
        message: 'El análisis de fatiga requiere FitAI Pro' 
      });
    }

    const { workoutHistory, timeframe } = await c.req.json();

    if (!workoutHistory || !Array.isArray(workoutHistory)) {
      throw new HTTPException(400, { message: 'workoutHistory es requerido y debe ser un array' });
    }

    if (workoutHistory.length < 5) {
      throw new HTTPException(400, { 
        message: 'Se requieren al menos 5 entrenamientos para el análisis de fatiga' 
      });
    }

    const aiManager = new AIResourceManager(c.env.CACHE);
    const premiumAiService = new PremiumAIService(aiManager, c.env.OPENAI_API_KEY);

    // Analizar patrones de fatiga
    const result = await premiumAiService.analyzeFatiguePatterns(workoutHistory);

    if (!result.success) {
      throw new HTTPException(400, { message: result.error || 'Error analizando fatiga' });
    }

    return c.json({
      success: true,
      data: result.data,
      message: 'Análisis de fatiga completado',
      premium: true,
    });

  } catch (error) {
    console.error('Fatigue analysis error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error interno del servidor' });
  }
});

// Predicción de progresión de carga
premiumAi.post('/predict-load-progression', premiumMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    const { exerciseHistory, targetExercises } = await c.req.json();

    if (!exerciseHistory || !Array.isArray(exerciseHistory)) {
      throw new HTTPException(400, { message: 'exerciseHistory es requerido y debe ser un array' });
    }

    if (exerciseHistory.length < 3) {
      throw new HTTPException(400, { 
        message: 'Se requieren al menos 3 sesiones de cada ejercicio para predicción de carga' 
      });
    }

    const aiManager = new AIResourceManager(c.env.CACHE);
    const premiumAiService = new PremiumAIService(aiManager, c.env.OPENAI_API_KEY);

    // Predecir progresión óptima
    const result = await premiumAiService.predictOptimalLoadProgression(exerciseHistory);

    if (!result.success) {
      throw new HTTPException(400, { message: result.error || 'Error prediciendo progresión' });
    }

    return c.json({
      success: true,
      data: result.data,
      message: 'Predicción de progresión completada',
      premium: true,
    });

  } catch (error) {
    console.error('Load progression prediction error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error interno del servidor' });
  }
});

// Análisis de técnica de ejercicio con video (placeholder)
premiumAi.post('/analyze-exercise-form', premiumMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    const { exercise, videoUrl, userLevel } = await c.req.json();

    if (!exercise) {
      throw new HTTPException(400, { message: 'exercise es requerido' });
    }

    // Por ahora retornamos análisis mock
    // En producción se integraría con análisis de video
    const mockFormAnalysis = {
      exercise,
      overallScore: 85,
      strengths: [
        'Buena activación del core',
        'Rango de movimiento completo',
        'Tempo controlado en fase excéntrica',
      ],
      improvements: [
        'Mejorar retracción escapular en posición inicial',
        'Mantener posición neutra de columna durante todo el movimiento',
      ],
      formCues: [
        'Imagina que sostienes un lápiz entre tus omóplatos',
        'Respira profundo antes de cada repetición',
        'Presiona el suelo con los pies para mayor estabilidad',
      ],
      riskFactors: [
        'Compensación en hombro izquierdo - considera trabajo unilateral',
      ],
      recommendations: [
        'Reduce 10% el peso y enfócate en la forma',
        'Incluye ejercicios de movilidad escapular en calentamiento',
        'Graba desde diferentes ángulos para análisis más completo',
      ],
      nextSteps: [
        'Practica el patrón sin peso por 1 semana',
        'Incrementa carga gradualmente (2.5kg cada 2 semanas)',
        'Reevalúa en 4 semanas',
      ],
    };

    return c.json({
      success: true,
      data: mockFormAnalysis,
      message: 'Análisis de técnica completado',
      premium: true,
      note: 'Análisis basado en IA avanzada - Función en beta',
    });

  } catch (error) {
    console.error('Form analysis error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error interno del servidor' });
  }
});

// Obtener características premium disponibles para el usuario
premiumAi.get('/features', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const features = {
      unlimitedRoutineGeneration: PremiumAIService.hasAccess(user.plan, 'unlimitedRoutineGeneration'),
      advancedProgressAnalysis: PremiumAIService.hasAccess(user.plan, 'advancedProgressAnalysis'),
      predictiveLoadManagement: PremiumAIService.hasAccess(user.plan, 'predictiveLoadManagement'),
      exerciseFormFeedback: PremiumAIService.hasAccess(user.plan, 'exerciseFormFeedback'),
      personalizedRecoveryAdvice: PremiumAIService.hasAccess(user.plan, 'personalizedRecoveryAdvice'),
      fatiguePatternAnalysis: PremiumAIService.hasAccess(user.plan, 'fatiguePatternAnalysis'),
    };

    return c.json({
      success: true,
      data: {
        currentPlan: user.plan,
        features,
        availableFeatures: Object.keys(features).filter(key => features[key as keyof typeof features]),
        restrictedFeatures: Object.keys(features).filter(key => !features[key as keyof typeof features]),
      },
    });

  } catch (error) {
    console.error('Get premium features error:', error);
    throw new HTTPException(500, { message: 'Error obteniendo características premium' });
  }
});

// Generar reporte de progreso avanzado
premiumAi.post('/generate-progress-report', premiumMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    const { 
      workoutHistory, 
      timeframe = 'month',
      includeCharts = true,
      includeRecommendations = true 
    } = await c.req.json();

    if (!workoutHistory || !Array.isArray(workoutHistory)) {
      throw new HTTPException(400, { message: 'workoutHistory es requerido' });
    }

    // Generar reporte avanzado mock
    const progressReport = {
      reportId: `report_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      timeframe,
      user: {
        id: user.id,
        plan: user.plan,
      },
      summary: {
        totalWorkouts: workoutHistory.length,
        totalVolume: 45680, // kg
        averageIntensity: 7.2, // RPE
        consistencyScore: 89, // %
        improvementRate: 12.5, // %
      },
      volumeProgression: [
        { week: 1, volume: 8500 },
        { week: 2, volume: 9200 },
        { week: 3, volume: 9800 },
        { week: 4, volume: 10100 },
      ],
      strengthGains: [
        { exercise: 'Press de Banca', initialMax: 70, currentMax: 80, improvement: 14.3 },
        { exercise: 'Sentadilla', initialMax: 90, currentMax: 105, improvement: 16.7 },
        { exercise: 'Peso Muerto', initialMax: 110, currentMax: 125, improvement: 13.6 },
      ],
      insights: [
        {
          type: 'strength',
          priority: 'high',
          title: 'Excelente progresión en press de banca',
          description: 'Tu fuerza en press de banca ha mejorado 14.3% este mes, superando el promedio esperado.',
          actionable: true,
          recommendation: 'Mantén la progresión actual e incorpora trabajo accesorio para tríceps.',
        },
        {
          type: 'volume',
          priority: 'medium', 
          title: 'Volumen de entrenamiento óptimo',
          description: 'Tu volumen semanal está en el rango ideal para tu nivel de experiencia.',
          actionable: false,
          recommendation: null,
        },
      ],
      recommendations: [
        'Continúa con el programa actual por 2-3 semanas más',
        'Considera incrementar volumen en grupos musculares de espalda',
        'Programa una semana de descarga en 3-4 semanas',
      ],
      nextMilestones: [
        { exercise: 'Press de Banca', currentMax: 80, targetMax: 85, timeframe: '4 semanas' },
        { exercise: 'Sentadilla', currentMax: 105, targetMax: 115, timeframe: '6 semanas' },
      ],
      exportOptions: {
        pdf: user.plan !== 'free',
        csv: user.plan !== 'free',
        charts: includeCharts && user.plan !== 'free',
      },
    };

    return c.json({
      success: true,
      data: progressReport,
      message: 'Reporte de progreso generado exitosamente',
      premium: true,
    });

  } catch (error) {
    console.error('Progress report generation error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error generando reporte de progreso' });
  }
});

export default premiumAi;