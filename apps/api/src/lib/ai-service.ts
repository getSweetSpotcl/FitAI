import { OpenAI } from 'openai';

// Types for AI service
export interface UserProfile {
  goals: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  availableDays: number;
  equipment: string[];
  workoutLocation: 'home' | 'gym' | 'outdoor';
  injuries?: string[];
  height?: number;
  weight?: number;
  age?: number;
}

export interface RoutineRequest {
  userProfile: UserProfile;
  preferences?: {
    duration?: number; // minutes per session
    focusMuscles?: string[];
    avoidExercises?: string[];
  };
  plan: 'free' | 'premium' | 'pro';
}

export interface GeneratedRoutine {
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationWeeks: number;
  daysPerWeek: number;
  estimatedDuration: number;
  targetMuscleGroups: string[];
  equipmentNeeded: string[];
  days: Array<{
    dayOfWeek: number;
    name: string;
    description: string;
    exercises: Array<{
      exerciseId?: string;
      name: string;
      targetSets: number;
      targetRepsMin: number;
      targetRepsMax: number;
      restTimeSeconds: number;
      rpeTarget?: number;
      notes?: string;
    }>;
  }>;
}

export class AIService {
  private openai: OpenAI;
  private modelByPlan = {
    free: 'gpt-3.5-turbo',
    premium: 'gpt-4o-mini',
    pro: 'gpt-4o'
  };

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generate a personalized workout routine based on user profile
   */
  async generateRoutine(request: RoutineRequest): Promise<GeneratedRoutine> {
    const model = this.modelByPlan[request.plan];
    const prompt = this.buildRoutinePrompt(request);

    try {
      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `Eres un entrenador personal experto en crear rutinas de ejercicio personalizadas. 
            Debes crear rutinas seguras, efectivas y adaptadas al nivel del usuario.
            Responde siempre en español.
            Genera rutinas realistas que el usuario pueda seguir.
            Incluye variedad de ejercicios y progresión gradual.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const routineData = JSON.parse(completion.choices[0].message.content || '{}');
      return this.validateAndFormatRoutine(routineData);

    } catch (error) {
      console.error('AI routine generation error:', error);
      throw new Error('Failed to generate routine');
    }
  }

  /**
   * Generate coaching advice based on workout performance
   */
  async generateCoachingAdvice(workoutData: any, userPlan: 'free' | 'premium' | 'pro'): Promise<string> {
    const model = this.modelByPlan[userPlan];

    try {
      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `Eres un coach de fitness experto. Analiza el rendimiento del entrenamiento y 
            proporciona consejos personalizados, motivación y sugerencias de mejora.
            Sé específico, positivo y constructivo. Responde en español.`
          },
          {
            role: 'user',
            content: `Analiza este entrenamiento y dame consejos: ${JSON.stringify(workoutData)}`
          }
        ],
        temperature: 0.8,
        max_tokens: 500
      });

      return completion.choices[0].message.content || 'Sigue así, vas muy bien!';

    } catch (error) {
      console.error('AI coaching advice error:', error);
      return 'Excelente trabajo! Continúa con tu progreso.';
    }
  }

  /**
   * Analyze form from video (premium feature)
   */
  async analyzeExerciseForm(videoUrl: string, exerciseName: string): Promise<{
    feedback: string;
    corrections: string[];
    score: number;
  }> {
    // This is a placeholder for future video analysis
    // In production, this would integrate with a computer vision API
    return {
      feedback: 'Análisis de forma no disponible en esta versión',
      corrections: [],
      score: 0
    };
  }

  /**
   * Build the prompt for routine generation
   */
  private buildRoutinePrompt(request: RoutineRequest): string {
    const { userProfile, preferences } = request;
    
    return `Crea una rutina de entrenamiento personalizada con estas características:

PERFIL DEL USUARIO:
- Objetivos: ${userProfile.goals.join(', ')}
- Nivel: ${userProfile.experienceLevel}
- Días disponibles: ${userProfile.availableDays} por semana
- Equipamiento: ${userProfile.equipment.join(', ')}
- Lugar: ${userProfile.workoutLocation}
${userProfile.injuries ? `- Lesiones/limitaciones: ${userProfile.injuries.join(', ')}` : ''}
${userProfile.age ? `- Edad: ${userProfile.age} años` : ''}
${userProfile.weight && userProfile.height ? `- Peso: ${userProfile.weight}kg, Altura: ${userProfile.height}cm` : ''}

PREFERENCIAS:
${preferences?.duration ? `- Duración por sesión: ${preferences.duration} minutos` : ''}
${preferences?.focusMuscles ? `- Enfoque en: ${preferences.focusMuscles.join(', ')}` : ''}
${preferences?.avoidExercises ? `- Evitar: ${preferences.avoidExercises.join(', ')}` : ''}

Genera una rutina completa en formato JSON con esta estructura:
{
  "name": "Nombre descriptivo de la rutina",
  "description": "Descripción breve de la rutina y sus beneficios",
  "difficulty": "nivel apropiado",
  "durationWeeks": 4-12 semanas,
  "daysPerWeek": número de días,
  "estimatedDuration": minutos por sesión,
  "targetMuscleGroups": ["grupos musculares"],
  "equipmentNeeded": ["equipamiento necesario"],
  "days": [
    {
      "dayOfWeek": 1-7,
      "name": "Nombre del día",
      "description": "Enfoque del día",
      "exercises": [
        {
          "name": "Nombre del ejercicio",
          "targetSets": número,
          "targetRepsMin": número,
          "targetRepsMax": número,
          "restTimeSeconds": segundos,
          "rpeTarget": 6-10,
          "notes": "Técnica o consejos"
        }
      ]
    }
  ]
}`;
  }

  /**
   * Validate and format the AI-generated routine
   */
  private validateAndFormatRoutine(routineData: any): GeneratedRoutine {
    // Basic validation and formatting
    return {
      name: routineData.name || 'Rutina Personalizada',
      description: routineData.description || '',
      difficulty: routineData.difficulty || 'intermediate',
      durationWeeks: Math.min(12, Math.max(4, routineData.durationWeeks || 8)),
      daysPerWeek: Math.min(7, Math.max(1, routineData.daysPerWeek || 3)),
      estimatedDuration: routineData.estimatedDuration || 45,
      targetMuscleGroups: routineData.targetMuscleGroups || [],
      equipmentNeeded: routineData.equipmentNeeded || [],
      days: (routineData.days || []).map((day: any) => ({
        dayOfWeek: day.dayOfWeek || 1,
        name: day.name || `Día ${day.dayOfWeek}`,
        description: day.description || '',
        exercises: (day.exercises || []).map((ex: any) => ({
          name: ex.name,
          targetSets: ex.targetSets || 3,
          targetRepsMin: ex.targetRepsMin || 8,
          targetRepsMax: ex.targetRepsMax || 12,
          restTimeSeconds: ex.restTimeSeconds || 90,
          rpeTarget: ex.rpeTarget,
          notes: ex.notes
        }))
      }))
    };
  }

  /**
   * Calculate AI usage cost for tracking
   */
  calculateUsageCost(model: string, promptTokens: number, completionTokens: number): number {
    // Approximate costs per 1K tokens (in USD cents)
    const costs: Record<string, { prompt: number; completion: number }> = {
      'gpt-3.5-turbo': { prompt: 0.05, completion: 0.15 },
      'gpt-4o-mini': { prompt: 0.015, completion: 0.06 },
      'gpt-4o': { prompt: 0.5, completion: 1.5 }
    };

    const modelCost = costs[model] || costs['gpt-3.5-turbo'];
    const promptCost = (promptTokens / 1000) * modelCost.prompt;
    const completionCost = (completionTokens / 1000) * modelCost.completion;
    
    return promptCost + completionCost;
  }
}