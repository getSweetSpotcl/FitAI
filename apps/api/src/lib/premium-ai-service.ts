import type { AIResourceManager, UserProfile } from "./ai-cost-control";

export interface PremiumAIFeatures {
  unlimitedRoutineGeneration: boolean;
  advancedProgressAnalysis: boolean;
  predictiveLoadManagement: boolean;
  exerciseFormFeedback: boolean;
  personalizedRecoveryAdvice: boolean;
  fatiguePatternAnalysis: boolean;
}

export interface AdvancedRoutine {
  id: string;
  name: string;
  description: string;
  exercises: AdvancedExercise[];
  periodization: PeriodizationPlan;
  recoveryProtocol: RecoveryProtocol;
  progressionScheme: ProgressionScheme;
  estimatedDuration: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  goals: string[];
}

export interface AdvancedExercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  rpe: string;
  tempo: string; // "3-1-2-1" format
  notes: string;
  muscleGroups: string[];
  equipment: string;
  alternatives: ExerciseAlternative[];
  formCues: string[];
  commonMistakes: string[];
}

export interface ExerciseAlternative {
  name: string;
  reason: string; // "Less equipment needed", "Lower difficulty", etc.
  modifications: string[];
}

export interface PeriodizationPlan {
  type: "linear" | "undulating" | "block";
  phases: PeriodizationPhase[];
  duration: number; // weeks
  deloadFrequency: number; // every N weeks
}

export interface PeriodizationPhase {
  name: string;
  weeks: number;
  intensity: number; // 1-10 scale
  volume: number; // 1-10 scale
  focus: string[];
}

export interface RecoveryProtocol {
  sleepRecommendation: number; // hours
  nutritionTiming: NutritionTiming[];
  supplementation: SupplementRecommendation[];
  activeRecovery: ActiveRecoveryActivity[];
}

export interface NutritionTiming {
  timing: "pre-workout" | "post-workout" | "daily";
  macros: {
    protein: number; // grams
    carbs: number;
    fats: number;
  };
  suggestions: string[];
}

export interface SupplementRecommendation {
  name: string;
  dosage: string;
  timing: string;
  purpose: string;
  evidence: "high" | "moderate" | "low";
}

export interface ActiveRecoveryActivity {
  activity: string;
  duration: number; // minutes
  intensity: "low" | "moderate";
  benefits: string[];
}

export interface ProgressionScheme {
  type: "linear" | "double_progression" | "wave_loading";
  parameters: ProgressionParameters;
  milestones: ProgressionMilestone[];
}

export interface ProgressionParameters {
  weightIncrement: number; // kg
  repIncrement: number;
  timeframe: number; // weeks
  criteria: string[];
}

export interface ProgressionMilestone {
  week: number;
  targets: Record<string, number>; // exercise -> target weight/reps
  assessments: string[];
}

export interface FatigueAnalysis {
  overallFatigueLevel: number; // 1-10 scale
  patterns: FatiguePattern[];
  recommendations: FatigueRecommendation[];
  riskFactors: string[];
  recoveryScore: number; // 1-100
}

export interface FatiguePattern {
  type: "volume" | "intensity" | "frequency";
  trend: "increasing" | "stable" | "decreasing";
  severity: "low" | "moderate" | "high";
  description: string;
}

export interface FatigueRecommendation {
  type: "deload" | "rest" | "modify_intensity" | "modify_volume";
  action: string;
  duration: number; // days
  reasoning: string;
}

export interface LoadRecommendation {
  exercise: string;
  currentLoad: number;
  recommendedLoad: number;
  progression: number; // percentage change
  confidence: number; // 0-1
  reasoning: string;
  alternatives: LoadAlternative[];
}

export interface LoadAlternative {
  type: "sets" | "reps" | "rest" | "tempo";
  currentValue: string;
  recommendedValue: string;
  reasoning: string;
}

export class PremiumAIService {
  private aiManager: AIResourceManager;
  private openaiApiKey: string;

  constructor(aiManager: AIResourceManager, openaiApiKey: string) {
    this.aiManager = aiManager;
    this.openaiApiKey = openaiApiKey;
  }

  /**
   * Verificar si el usuario tiene acceso a funciones premium
   */
  static hasAccess(
    userPlan: "free" | "premium" | "pro",
    feature: keyof PremiumAIFeatures
  ): boolean {
    const premiumFeatures: Record<
      "free" | "premium" | "pro",
      PremiumAIFeatures
    > = {
      free: {
        unlimitedRoutineGeneration: false,
        advancedProgressAnalysis: false,
        predictiveLoadManagement: false,
        exerciseFormFeedback: false,
        personalizedRecoveryAdvice: false,
        fatiguePatternAnalysis: false,
      },
      premium: {
        unlimitedRoutineGeneration: false, // Still limited but higher
        advancedProgressAnalysis: true,
        predictiveLoadManagement: true,
        exerciseFormFeedback: true,
        personalizedRecoveryAdvice: true,
        fatiguePatternAnalysis: false, // Pro only
      },
      pro: {
        unlimitedRoutineGeneration: true,
        advancedProgressAnalysis: true,
        predictiveLoadManagement: true,
        exerciseFormFeedback: true,
        personalizedRecoveryAdvice: true,
        fatiguePatternAnalysis: true,
      },
    };

    return premiumFeatures[userPlan][feature];
  }

  /**
   * Generar rutina avanzada con periodización
   */
  async generateAdvancedRoutine(userProfile: UserProfile): Promise<{
    success: boolean;
    data?: AdvancedRoutine;
    error?: string;
  }> {
    if (
      !PremiumAIService.hasAccess(
        userProfile.plan,
        "unlimitedRoutineGeneration"
      ) &&
      userProfile.plan !== "pro"
    ) {
      // Check credits for premium users
      const creditCheck = await this.aiManager.checkAndConsume(userProfile.id, {
        type: "routine_generation",
        complexity: "complex",
      });

      if (!creditCheck.allowed) {
        return {
          success: false,
          error: creditCheck.error || "Sin créditos disponibles",
        };
      }
    }

    try {
      const systemPrompt = this.buildAdvancedRoutinePrompt();
      const userPrompt = this.buildAdvancedUserPrompt(userProfile);

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o", // Use more powerful model for premium
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 3000,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = (data as any).choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const advancedRoutine = JSON.parse(content) as AdvancedRoutine;

      return {
        success: true,
        data: this.validateAndFormatAdvancedRoutine(
          advancedRoutine,
          userProfile
        ),
      };
    } catch (error) {
      console.error("Error generating advanced routine:", error);
      return {
        success: false,
        error: "Error al generar rutina avanzada",
      };
    }
  }

  /**
   * Analizar patrones de fatiga
   */
  async analyzeFatiguePatterns(workoutHistory: any[]): Promise<{
    success: boolean;
    data?: FatigueAnalysis;
    error?: string;
  }> {
    try {
      const systemPrompt = `Eres un experto en ciencias del ejercicio especializado en análisis de fatiga y recuperación.

INSTRUCCIONES:
1. Analiza el historial de entrenamientos para detectar patrones de fatiga
2. Evalúa volumen, intensidad y frecuencia de entrenamiento
3. Identifica señales de sobreentrenamiento o subestrenamiento
4. Proporciona recomendaciones específicas para optimizar la recuperación
5. Responde en español y formato JSON

FORMATO:
{
  "overallFatigueLevel": número_del_1_al_10,
  "patterns": [
    {
      "type": "volume|intensity|frequency",
      "trend": "increasing|stable|decreasing", 
      "severity": "low|moderate|high",
      "description": "descripción_del_patrón"
    }
  ],
  "recommendations": [
    {
      "type": "deload|rest|modify_intensity|modify_volume",
      "action": "acción_específica",
      "duration": días_recomendados,
      "reasoning": "justificación_científica"
    }
  ],
  "riskFactors": ["factor_1", "factor_2"],
  "recoveryScore": número_del_1_al_100
}`;

      const userPrompt = `Analiza este historial de entrenamientos:
${JSON.stringify(workoutHistory, null, 2)}

Proporciona un análisis completo de fatiga y recomendaciones de recuperación.`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 2000,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = (data as any).choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const fatigueAnalysis = JSON.parse(content) as FatigueAnalysis;

      return {
        success: true,
        data: fatigueAnalysis,
      };
    } catch (error) {
      console.error("Error analyzing fatigue patterns:", error);
      return {
        success: false,
        error: "Error al analizar patrones de fatiga",
      };
    }
  }

  /**
   * Predecir progresión de carga óptima
   */
  async predictOptimalLoadProgression(exerciseHistory: any[]): Promise<{
    success: boolean;
    data?: LoadRecommendation[];
    error?: string;
  }> {
    try {
      const systemPrompt = `Eres un experto en programación de entrenamiento y periodización.

INSTRUCCIONES:
1. Analiza el historial de ejercicios para identificar patrones de progreso
2. Predice la progresión óptima de carga para cada ejercicio
3. Considera fatiga, adaptación y principios de sobrecarga progresiva
4. Proporciona alternativas si la progresión de peso no es viable
5. Responde en español y formato JSON

FORMATO:
{
  "recommendations": [
    {
      "exercise": "nombre_ejercicio",
      "currentLoad": peso_actual_kg,
      "recommendedLoad": peso_recomendado_kg,
      "progression": porcentaje_cambio,
      "confidence": número_0_a_1,
      "reasoning": "justificación_científica",
      "alternatives": [
        {
          "type": "sets|reps|rest|tempo",
          "currentValue": "valor_actual",
          "recommendedValue": "valor_recomendado", 
          "reasoning": "justificación"
        }
      ]
    }
  ]
}`;

      const userPrompt = `Analiza este historial de ejercicios y predice la progresión óptima:
${JSON.stringify(exerciseHistory, null, 2)}

Proporciona recomendaciones de carga específicas para cada ejercicio.`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 2500,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = (data as any).choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const loadAnalysis = JSON.parse(content);

      return {
        success: true,
        data: loadAnalysis.recommendations as LoadRecommendation[],
      };
    } catch (error) {
      console.error("Error predicting load progression:", error);
      return {
        success: false,
        error: "Error al predecir progresión de carga",
      };
    }
  }

  private buildAdvancedRoutinePrompt(): string {
    return `Eres un entrenador personal elite especializado en periodización y programación avanzada de entrenamiento.

INSTRUCCIONES:
1. Genera rutinas avanzadas con periodización científica
2. Incluye tempo, RPE específicos y protocolos de recuperación
3. Proporciona alternativas de ejercicios y correcciones de forma
4. Diseña esquemas de progresión detallados
5. Considera fatiga, adaptación y prevención de lesiones
6. Responde en español y formato JSON válido

FORMATO JSON REQUERIDO:
{
  "id": "rutina_id",
  "name": "Nombre descriptivo",
  "description": "Descripción detallada",
  "exercises": [
    {
      "name": "Nombre ejercicio",
      "sets": número_series,
      "reps": "rango_repeticiones",
      "rest": segundos_descanso,
      "rpe": "rango_rpe",
      "tempo": "formato_3-1-2-1",
      "notes": "notas_técnicas",
      "muscleGroups": ["grupo_1", "grupo_2"],
      "equipment": "equipamiento",
      "alternatives": [
        {
          "name": "ejercicio_alternativo",
          "reason": "razón_alternativa",
          "modifications": ["modificación_1", "modificación_2"]
        }
      ],
      "formCues": ["cue_1", "cue_2", "cue_3"],
      "commonMistakes": ["error_1", "error_2"]
    }
  ],
  "periodization": {
    "type": "linear|undulating|block",
    "phases": [
      {
        "name": "nombre_fase",
        "weeks": número_semanas,
        "intensity": escala_1_a_10,
        "volume": escala_1_a_10,
        "focus": ["objetivo_1", "objetivo_2"]
      }
    ],
    "duration": semanas_totales,
    "deloadFrequency": cada_n_semanas
  },
  "recoveryProtocol": {
    "sleepRecommendation": horas_sueño,
    "nutritionTiming": [
      {
        "timing": "pre-workout|post-workout|daily",
        "macros": {"protein": gramos, "carbs": gramos, "fats": gramos},
        "suggestions": ["sugerencia_1", "sugerencia_2"]
      }
    ],
    "supplementation": [
      {
        "name": "nombre_suplemento",
        "dosage": "dosificación",
        "timing": "momento_toma",
        "purpose": "propósito",
        "evidence": "high|moderate|low"
      }
    ],
    "activeRecovery": [
      {
        "activity": "actividad",
        "duration": minutos,
        "intensity": "low|moderate",
        "benefits": ["beneficio_1", "beneficio_2"]
      }
    ]
  },
  "progressionScheme": {
    "type": "linear|double_progression|wave_loading",
    "parameters": {
      "weightIncrement": kg_incremento,
      "repIncrement": reps_incremento,
      "timeframe": semanas_progresión,
      "criteria": ["criterio_1", "criterio_2"]
    },
    "milestones": [
      {
        "week": número_semana,
        "targets": {"ejercicio": peso_objetivo},
        "assessments": ["evaluación_1", "evaluación_2"]
      }
    ]
  },
  "estimatedDuration": minutos_totales,
  "difficulty": "beginner|intermediate|advanced",
  "goals": ["objetivo_1", "objetivo_2"]
}`;
  }

  private buildAdvancedUserPrompt(userProfile: UserProfile): string {
    return `Crea una rutina avanzada con periodización para:

PERFIL DEL USUARIO:
- Nivel: ${userProfile.experienceLevel}
- Objetivos: ${userProfile.goals.join(", ")}
- Días disponibles: ${userProfile.availableDays}
- Equipamiento: ${userProfile.availableEquipment.join(", ")}
${userProfile.injuries ? `- Limitaciones: ${userProfile.injuries.join(", ")}` : ""}

REQUISITOS AVANZADOS:
- Incluir periodización científica (4-12 semanas)
- Tempo específicos para cada ejercicio
- RPE targets precisos
- Protocolo de recuperación completo
- Esquema de progresión detallado
- Alternativas para cada ejercicio
- Correcciones técnicas (form cues)
- Prevención de errores comunes

Genera una rutina premium completa y detallada.`;
  }

  private validateAndFormatAdvancedRoutine(
    routine: any,
    userProfile: UserProfile
  ): AdvancedRoutine {
    // Validación y formateo similar al básico pero más complejo
    return {
      id: `advanced_${Date.now()}`,
      name: routine.name || "Rutina Avanzada Personalizada",
      description:
        routine.description || "Rutina premium con periodización científica",
      exercises:
        routine.exercises?.map((ex: any) => ({
          name: ex.name || "Ejercicio",
          sets: Math.max(1, Math.min(6, ex.sets || 3)),
          reps: ex.reps || "6-8",
          rest: Math.max(30, Math.min(300, ex.rest || 120)),
          rpe: ex.rpe || "7-8",
          tempo: ex.tempo || "3-1-2-1",
          notes: ex.notes || "",
          muscleGroups: Array.isArray(ex.muscleGroups)
            ? ex.muscleGroups
            : ["general"],
          equipment: ex.equipment || "peso_corporal",
          alternatives: ex.alternatives || [],
          formCues: ex.formCues || [],
          commonMistakes: ex.commonMistakes || [],
        })) || [],
      periodization: routine.periodization || {
        type: "linear",
        phases: [],
        duration: 8,
        deloadFrequency: 4,
      },
      recoveryProtocol: routine.recoveryProtocol || {
        sleepRecommendation: 8,
        nutritionTiming: [],
        supplementation: [],
        activeRecovery: [],
      },
      progressionScheme: routine.progressionScheme || {
        type: "linear",
        parameters: {
          weightIncrement: 2.5,
          repIncrement: 1,
          timeframe: 2,
          criteria: ["Complete all reps", "RPE below 9"],
        },
        milestones: [],
      },
      estimatedDuration: Math.max(
        30,
        Math.min(120, routine.estimatedDuration || 60)
      ),
      difficulty: userProfile.experienceLevel,
      goals: userProfile.goals,
    };
  }
}
