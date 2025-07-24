import {
  type AIResourceManager,
  CACHE_STRATEGY,
  type UserProfile,
} from "./ai-cost-control";

export interface GeneratedExercise {
  name: string;
  sets: number;
  reps: string; // "8-12" or "10" or "AMRAP"
  rest: number; // segundos
  notes?: string;
  muscleGroups: string[];
  equipment?: string;
}

export interface GeneratedRoutine {
  name: string;
  description: string;
  frequency: number; // días por semana
  exercises: GeneratedExercise[];
  totalTime: number; // minutos estimados
  difficulty: "beginner" | "intermediate" | "advanced";
  goals: string[];
}

export interface RoutineGenerationRequest {
  userProfile: UserProfile;
  specificGoals?: string[];
  restrictions?: string[];
  preferredDuration?: number; // minutos
}

export class AIRoutineGenerator {
  private aiManager: AIResourceManager;
  private openaiApiKey: string;

  constructor(aiManager: AIResourceManager, openaiApiKey: string) {
    this.aiManager = aiManager;
    this.openaiApiKey = openaiApiKey;
  }

  /**
   * Genera una rutina personalizada usando IA
   */
  async generateRoutine(request: RoutineGenerationRequest): Promise<{
    success: boolean;
    data?: GeneratedRoutine;
    error?: string;
    cached?: boolean;
  }> {
    try {
      // 1. Verificar créditos disponibles
      const creditCheck = await this.aiManager.checkAndConsume(
        request.userProfile.id,
        { type: "routine_generation", complexity: "complex" }
      );

      if (!creditCheck.allowed) {
        return {
          success: false,
          error: creditCheck.error || "Sin créditos disponibles",
        };
      }

      // 2. Verificar cache
      const cacheKey = this.aiManager.generateRoutineCacheKey(
        request.userProfile
      );
      const cachedRoutine = await this.aiManager.getCachedResponse(cacheKey);

      if (cachedRoutine) {
        return {
          success: true,
          data: cachedRoutine,
          cached: true,
        };
      }

      // 3. Generar rutina con IA
      const generatedRoutine = await this.callOpenAI(request);

      // 4. Guardar en cache
      if (generatedRoutine) {
        await this.aiManager.cacheResponse(
          cacheKey,
          generatedRoutine,
          CACHE_STRATEGY.routineTemplates.ttl
        );

        return {
          success: true,
          data: generatedRoutine,
          cached: false,
        };
      }

      return {
        success: false,
        error: "No se pudo generar la rutina",
      };
    } catch (error) {
      console.error("Error generating routine:", error);
      return {
        success: false,
        error: "Error interno al generar rutina",
      };
    }
  }

  /**
   * Llama a OpenAI para generar la rutina
   */
  private async callOpenAI(
    request: RoutineGenerationRequest
  ): Promise<GeneratedRoutine | null> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini", // Modelo más eficiente
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
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

      const parsedRoutine = JSON.parse(content);
      return this.validateAndFormatRoutine(parsedRoutine);
    } catch (error) {
      console.error("OpenAI API call failed:", error);

      // Fallback a rutina template
      return this.generateFallbackRoutine(request);
    }
  }

  /**
   * Construye el prompt del sistema
   */
  private buildSystemPrompt(): string {
    return `Eres un entrenador personal experto especializado en crear rutinas de entrenamiento personalizadas.

INSTRUCCIONES:
1. Genera rutinas en formato JSON válido
2. Usa nombres de ejercicios en español
3. Máximo 8 ejercicios por rutina
4. Incluye ejercicios compuestos y de aislamiento
5. Considera limitaciones de equipamiento e lesiones
6. Ajusta intensidad según nivel de experiencia

FORMATO DE RESPUESTA:
{
  "name": "Nombre descriptivo de la rutina",
  "description": "Breve descripción de la rutina",
  "frequency": número_días_por_semana,
  "exercises": [
    {
      "name": "Nombre del ejercicio",
      "sets": número_de_series,
      "reps": "rango_de_repeticiones", 
      "rest": segundos_de_descanso,
      "notes": "consejos_técnicos_opcionales",
      "muscleGroups": ["grupo_muscular_1", "grupo_muscular_2"],
      "equipment": "equipamiento_necesario"
    }
  ],
  "totalTime": tiempo_estimado_en_minutos,
  "difficulty": "beginner|intermediate|advanced",
  "goals": ["objetivo_1", "objetivo_2"]
}

GRUPOS MUSCULARES VÁLIDOS: pecho, espalda, hombros, bíceps, tríceps, cuádriceps, isquiotibiales, glúteos, pantorrillas, core, antebrazos

EQUIPAMIENTO: barra, mancuernas, máquinas, peso_corporal, bandas, kettlebells, poleas`;
  }

  /**
   * Construye el prompt del usuario
   */
  private buildUserPrompt(request: RoutineGenerationRequest): string {
    const { userProfile } = request;

    const prompt = `Crear una rutina personalizada con estas especificaciones:

PERFIL DEL USUARIO:
- Nivel de experiencia: ${userProfile.experienceLevel}
- Objetivos principales: ${userProfile.goals.join(", ")}
- Días disponibles por semana: ${userProfile.availableDays}
- Equipamiento disponible: ${userProfile.availableEquipment.join(", ")}
${userProfile.injuries && userProfile.injuries.length > 0 ? `- Lesiones/limitaciones: ${userProfile.injuries.join(", ")}` : ""}

REQUISITOS ADICIONALES:
${request.specificGoals ? `- Objetivos específicos: ${request.specificGoals.join(", ")}` : ""}
${request.restrictions ? `- Restricciones: ${request.restrictions.join(", ")}` : ""}
${request.preferredDuration ? `- Duración preferida: ${request.preferredDuration} minutos` : ""}

Genera una rutina completa que sea progresiva, segura y efectiva para este perfil.`;

    return prompt;
  }

  /**
   * Valida y formatea la rutina generada
   */
  private validateAndFormatRoutine(routine: any): GeneratedRoutine | null {
    try {
      // Validación básica
      if (
        !routine.name ||
        !routine.exercises ||
        !Array.isArray(routine.exercises)
      ) {
        throw new Error("Formato de rutina inválido");
      }

      // Formatear ejercicios
      const formattedExercises: GeneratedExercise[] = routine.exercises.map(
        (ex: any) => ({
          name: ex.name || "Ejercicio sin nombre",
          sets: Math.max(1, Math.min(6, ex.sets || 3)), // 1-6 series
          reps: ex.reps || "8-12",
          rest: Math.max(30, Math.min(300, ex.rest || 120)), // 30s-5min
          notes: ex.notes || "",
          muscleGroups: Array.isArray(ex.muscleGroups)
            ? ex.muscleGroups
            : ["general"],
          equipment: ex.equipment || "peso_corporal",
        })
      );

      return {
        name: routine.name,
        description: routine.description || "Rutina personalizada",
        frequency: Math.max(1, Math.min(7, routine.frequency || 3)),
        exercises: formattedExercises.slice(0, 8), // Máximo 8 ejercicios
        totalTime: Math.max(15, Math.min(120, routine.totalTime || 45)),
        difficulty: ["beginner", "intermediate", "advanced"].includes(
          routine.difficulty
        )
          ? routine.difficulty
          : "intermediate",
        goals: Array.isArray(routine.goals) ? routine.goals : ["general"],
      };
    } catch (error) {
      console.error("Error validating routine:", error);
      return null;
    }
  }

  /**
   * Genera rutina template como fallback
   */
  private generateFallbackRoutine(
    request: RoutineGenerationRequest
  ): GeneratedRoutine {
    const { userProfile } = request;

    // Template básico según nivel
    const templates = {
      beginner: {
        name: "Rutina de Iniciación",
        description: "Rutina perfecta para comenzar tu viaje fitness",
        exercises: [
          {
            name: "Sentadilla con peso corporal",
            sets: 3,
            reps: "10-15",
            rest: 90,
            muscleGroups: ["cuádriceps", "glúteos"],
            equipment: "peso_corporal",
          },
          {
            name: "Flexiones de brazos",
            sets: 3,
            reps: "8-12",
            rest: 90,
            muscleGroups: ["pecho", "tríceps"],
            equipment: "peso_corporal",
          },
          {
            name: "Plancha",
            sets: 3,
            reps: "30-60s",
            rest: 60,
            muscleGroups: ["core"],
            equipment: "peso_corporal",
          },
        ],
      },
      intermediate: {
        name: "Rutina Intermedia",
        description: "Rutina balanceada para progreso constante",
        exercises: [
          {
            name: "Press de banca",
            sets: 4,
            reps: "8-12",
            rest: 120,
            muscleGroups: ["pecho", "tríceps"],
            equipment: "barra",
          },
          {
            name: "Remo con barra",
            sets: 4,
            reps: "8-12",
            rest: 120,
            muscleGroups: ["espalda", "bíceps"],
            equipment: "barra",
          },
          {
            name: "Sentadilla con barra",
            sets: 4,
            reps: "10-15",
            rest: 150,
            muscleGroups: ["cuádriceps", "glúteos"],
            equipment: "barra",
          },
        ],
      },
      advanced: {
        name: "Rutina Avanzada",
        description: "Entrenamiento intensivo para atletas experimentados",
        exercises: [
          {
            name: "Peso muerto",
            sets: 5,
            reps: "5-8",
            rest: 180,
            muscleGroups: ["espalda", "glúteos", "isquiotibiales"],
            equipment: "barra",
          },
          {
            name: "Press militar",
            sets: 4,
            reps: "6-10",
            rest: 120,
            muscleGroups: ["hombros", "tríceps"],
            equipment: "barra",
          },
          {
            name: "Dominadas",
            sets: 4,
            reps: "AMRAP",
            rest: 120,
            muscleGroups: ["espalda", "bíceps"],
            equipment: "barra_dominadas",
          },
        ],
      },
    };

    const template = templates[userProfile.experienceLevel];

    return {
      ...template,
      frequency: userProfile.availableDays,
      totalTime: template.exercises.length * 12, // ~12 min por ejercicio
      difficulty: userProfile.experienceLevel,
      goals: userProfile.goals,
    };
  }
}
