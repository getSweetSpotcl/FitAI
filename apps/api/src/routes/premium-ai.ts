import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AIResourceManager, type UserProfile } from "../lib/ai-cost-control";
import { PremiumAIService } from "../lib/premium-ai-service";
import { clerkAuth } from "../middleware/clerk-auth";
import { requirePremium, requirePro } from "../middleware/plan-access";

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
    const _user = c.get("user");

    const { exercise, videoUrl, userLevel } = await c.req.json();

    if (!exercise) {
      throw new HTTPException(400, { message: "exercise es requerido" });
    }

    // TODO: Implementar análisis real de técnica con IA
    // Esta funcionalidad requiere integración con análisis de video/imagen
    throw new HTTPException(501, { 
      message: "Análisis de técnica no implementado aún. Esta es una función premium que estará disponible próximamente." 
    });
  } catch (error) {
    console.error("Form analysis error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error interno del servidor" });
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
      workoutHistory,
      timeframe = "month",
      includeCharts = true,
      includeRecommendations = true,
    } = await c.req.json();

    if (!workoutHistory || !Array.isArray(workoutHistory)) {
      throw new HTTPException(400, { message: "workoutHistory es requerido" });
    }

    // TODO: Implementar análisis real de progreso basado en datos históricos
    // Esta funcionalidad requiere análisis complejo de datos de workout sessions
    throw new HTTPException(501, { 
      message: "Análisis avanzado de progreso no implementado aún. Esta es una función premium que estará disponible próximamente." 
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

export default premiumAi;
