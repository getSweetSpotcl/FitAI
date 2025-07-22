import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middleware/auth';
import { AIResourceManager, UserProfile } from '../lib/ai-cost-control';
import { AIRoutineGenerator, RoutineGenerationRequest } from '../lib/ai-routine-generator';

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

const ai = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes
ai.use('*', authMiddleware);

// Generar rutina personalizada
ai.post('/generate-routine', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const requestData = await c.req.json() as {
      experienceLevel: 'beginner' | 'intermediate' | 'advanced';
      goals: string[];
      availableDays: number;
      availableEquipment: string[];
      injuries?: string[];
      specificGoals?: string[];
      restrictions?: string[];
      preferredDuration?: number;
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

    // Crear request para generación
    const generationRequest: RoutineGenerationRequest = {
      userProfile,
      specificGoals: requestData.specificGoals,
      restrictions: requestData.restrictions,
      preferredDuration: requestData.preferredDuration,
    };

    // Inicializar AI manager y generator
    const aiManager = new AIResourceManager(c.env.CACHE);
    const routineGenerator = new AIRoutineGenerator(aiManager, c.env.OPENAI_API_KEY);

    // Generar rutina
    const result = await routineGenerator.generateRoutine(generationRequest);

    if (!result.success) {
      throw new HTTPException(400, { message: result.error || 'Error generando rutina' });
    }

    return c.json({
      success: true,
      data: result.data,
      cached: result.cached,
      message: result.cached ? 'Rutina obtenida desde cache' : 'Rutina generada exitosamente',
    });

  } catch (error) {
    console.error('Generate routine error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error interno del servidor' });
  }
});

// Analyze progress
ai.post('/analyze-progress', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const { workoutHistory, timeframe } = await c.req.json();

    // TODO: Implement actual AI analysis
    // For now, return mock analysis
    const mockAnalysis = {
      id: `analysis_${Date.now()}`,
      timeframe: timeframe || 'last_30_days',
      insights: [
        {
          type: 'strength_gain',
          priority: 'high',
          title: 'Excellent Strength Progress',
          message: 'Your bench press has improved by 12% this month. You\'re responding well to your current program.',
          actionable: true,
          recommendation: 'Continue with current rep ranges but consider adding pause reps for additional challenge.',
        },
        {
          type: 'plateau_warning',
          priority: 'medium',
          title: 'Potential Squat Plateau',
          message: 'Your squat progress has slowed in the last 2 weeks. This could indicate fatigue or need for deload.',
          actionable: true,
          recommendation: 'Consider a deload week with 60-70% of normal intensity.',
        },
        {
          type: 'volume_optimization',
          priority: 'low',
          title: 'Volume Distribution',
          message: 'Your chest volume is optimal, but back volume could be increased by 15% for better balance.',
          actionable: true,
          recommendation: 'Add one extra set to your pulling exercises.',
        },
      ],
      metrics: {
        overallProgress: 85, // percentage
        strengthTrend: 'increasing',
        volumeTrend: 'stable',
        consistencyScore: 92,
        recoveryIndicator: 'good',
      },
      nextSteps: [
        'Continue current progression scheme',
        'Focus on form quality over load increases',
        'Consider adding mobility work',
      ],
      generatedAt: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: mockAnalysis,
      message: 'Progress analysis completed',
    });

  } catch (error) {
    console.error('Analyze progress error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to analyze progress' });
  }
});

// Obtener consejo sobre ejercicio específico
ai.post('/exercise-advice', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const { exerciseName, question, userLevel } = await c.req.json();

    if (!exerciseName || !question) {
      throw new HTTPException(400, { message: 'exerciseName y question son requeridos' });
    }

    const aiManager = new AIResourceManager(c.env.CACHE);

    // Verificar créditos
    const creditCheck = await aiManager.checkAndConsume(user.id, {
      type: 'exercise_advice',
      complexity: 'simple',
    });

    if (!creditCheck.allowed) {
      throw new HTTPException(429, { message: creditCheck.error });
    }

    // Verificar cache
    const cacheKey = aiManager.generateExerciseCacheKey(exerciseName, question);
    const cachedAdvice = await aiManager.getCachedResponse(cacheKey);

    if (cachedAdvice) {
      return c.json({
        success: true,
        data: cachedAdvice,
        cached: true,
        remaining: creditCheck.remaining,
      });
    }

    // Generar consejo con IA
    const advice = await generateExerciseAdvice(exerciseName, question, userLevel, c.env.OPENAI_API_KEY);

    // Guardar en cache
    if (advice) {
      await aiManager.cacheResponse(cacheKey, advice, 86400); // 24 horas
    }

    return c.json({
      success: true,
      data: advice,
      cached: false,
      remaining: creditCheck.remaining,
    });

  } catch (error) {
    console.error('Exercise advice error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error interno del servidor' });
  }
});

// Get quick coaching tip
ai.post('/quick-tip', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const { context } = await c.req.json();

    // TODO: Generate personalized tips based on user data
    const motivationalTips = [
      'Great job staying consistent! Your strength gains show your dedication is paying off.',
      'Remember, progressive overload is key - small increases add up to big gains over time.',
      'Your form is improving! Quality reps build both strength and confidence.',
      'Recovery is just as important as training. Make sure you\'re getting enough sleep.',
      'You\'re in the top 10% for consistency this month - keep up the momentum!',
    ];

    const randomTip = motivationalTips[Math.floor(Math.random() * motivationalTips.length)];

    const quickTip = {
      id: `tip_${Date.now()}`,
      message: randomTip,
      type: 'motivational',
      context: context || 'general',
      generatedAt: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: quickTip,
    });

  } catch (error) {
    console.error('Quick tip error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Failed to generate quick tip' });
  }
});

// Obtener estadísticas de uso de IA
ai.get('/usage-stats', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    const aiManager = new AIResourceManager(c.env.CACHE);
    const stats = await aiManager.getUsageStats(user.id);

    return c.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('Usage stats error:', error);
    throw new HTTPException(500, { message: 'Error obteniendo estadísticas' });
  }
});

// Helper: Generar consejo de ejercicio
async function generateExerciseAdvice(
  exerciseName: string,
  question: string,
  userLevel: string = 'intermediate',
  apiKey: string
): Promise<any> {
  const systemPrompt = `Eres un entrenador personal experto. Proporciona consejos técnicos precisos y seguros sobre ejercicios.

INSTRUCCIONES:
1. Responde en español
2. Sé conciso pero informativo
3. Enfócate en técnica correcta y seguridad
4. Adapta el consejo al nivel del usuario
5. Responde en formato JSON

FORMATO:
{
  "advice": "consejo_principal",
  "keyPoints": ["punto_1", "punto_2", "punto_3"],
  "commonMistakes": ["error_1", "error_2"],
  "safety": "recomendación_de_seguridad"
}`;

  const userPrompt = `Ejercicio: ${exerciseName}
Pregunta: ${question}
Nivel del usuario: ${userLevel}

Proporciona un consejo detallado y útil.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = (data as any).choices?.[0]?.message?.content;
    
    return content ? JSON.parse(content) : null;

  } catch (error) {
    console.error('Error generating exercise advice:', error);
    
    // Fallback con consejo genérico
    return {
      advice: `Para ${exerciseName}, enfócate en mantener una técnica correcta y progresión gradual.`,
      keyPoints: [
        'Realiza un calentamiento adecuado',
        'Mantén la forma correcta en todo momento',
        'Progresa gradualmente en peso/repeticiones'
      ],
      commonMistakes: ['Usar demasiado peso', 'Realizar el movimiento muy rápido'],
      safety: 'Si sientes dolor, detente inmediatamente y consulta un profesional.',
    };
  }
}

export default ai;