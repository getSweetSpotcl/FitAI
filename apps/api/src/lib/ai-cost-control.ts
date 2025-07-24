export interface AIAction {
  type: "routine_generation" | "exercise_advice" | "progress_analysis";
  complexity: "simple" | "medium" | "complex";
}

export interface UserProfile {
  id: string;
  plan: "free" | "premium" | "pro";
  experienceLevel: "beginner" | "intermediate" | "advanced";
  goals: string[];
  availableDays: number;
  availableEquipment: string[];
  injuries?: string[];
}

export interface CacheStrategy {
  routineTemplates: {
    ttl: number; // 7 días
    keyPrefix: string;
  };
  exerciseAdvice: {
    ttl: number; // 24 horas
    keyPrefix: string;
  };
  commonQuestions: {
    ttl: number; // 30 días
    keyPrefix: string;
  };
}

export const PLAN_LIMITS = {
  free: {
    routine_generation: 1,
    exercise_advice: 5,
    progress_analysis: 2,
    monthly_reset: true,
  },
  premium: {
    routine_generation: 10,
    exercise_advice: 50,
    progress_analysis: 20,
    monthly_reset: true,
  },
  pro: {
    routine_generation: -1, // unlimited
    exercise_advice: -1,
    progress_analysis: -1,
    monthly_reset: false,
  },
};

export const CACHE_STRATEGY: CacheStrategy = {
  routineTemplates: {
    ttl: 604800, // 7 días en segundos
    keyPrefix: "routine_template",
  },
  exerciseAdvice: {
    ttl: 86400, // 24 horas
    keyPrefix: "exercise_advice",
  },
  commonQuestions: {
    ttl: 2592000, // 30 días
    keyPrefix: "common_questions",
  },
};

export class AIResourceManager {
  private redis: KVNamespace;

  constructor(redis: KVNamespace) {
    this.redis = redis;
  }

  /**
   * Verifica y consume créditos de IA para un usuario
   */
  async checkAndConsume(
    userId: string,
    action: AIAction
  ): Promise<{
    allowed: boolean;
    remaining?: number;
    error?: string;
  }> {
    try {
      // Obtener información del usuario
      const userKey = `ai_usage:${userId}:${this.getCurrentMonth()}`;
      const currentUsage = await this.redis.get(userKey);

      const usage = currentUsage
        ? JSON.parse(currentUsage)
        : {
            routine_generation: 0,
            exercise_advice: 0,
            progress_analysis: 0,
          };

      // Obtener plan del usuario (por ahora mock, luego desde BD)
      const userPlan = await this.getUserPlan(userId);
      const limits = PLAN_LIMITS[userPlan];

      // Verificar límites
      const currentActionUsage = usage[action.type] || 0;
      const actionLimit = limits[action.type];

      if (actionLimit !== -1 && currentActionUsage >= actionLimit) {
        return {
          allowed: false,
          error: `Límite mensual alcanzado para ${action.type}. Plan actual: ${userPlan}`,
        };
      }

      // Consumir crédito
      usage[action.type] = currentActionUsage + 1;

      // Guardar con TTL hasta fin de mes
      const ttl = this.getSecondsUntilEndOfMonth();
      await this.redis.put(userKey, JSON.stringify(usage), {
        expirationTtl: ttl,
      });

      const remaining =
        actionLimit === -1 ? -1 : actionLimit - usage[action.type];

      return {
        allowed: true,
        remaining,
      };
    } catch (error) {
      console.error("Error checking AI credits:", error);
      return {
        allowed: false,
        error: "Error interno del servidor",
      };
    }
  }

  /**
   * Obtiene respuesta cacheada
   */
  async getCachedResponse(cacheKey: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("Error getting cached response:", error);
      return null;
    }
  }

  /**
   * Guarda respuesta en cache
   */
  async cacheResponse(cacheKey: string, data: any, ttl: number): Promise<void> {
    try {
      await this.redis.put(cacheKey, JSON.stringify(data), {
        expirationTtl: ttl,
      });
    } catch (error) {
      console.error("Error caching response:", error);
    }
  }

  /**
   * Genera clave de cache para rutinas
   */
  generateRoutineCacheKey(userProfile: UserProfile): string {
    const key = [
      userProfile.experienceLevel,
      userProfile.goals.sort().join("-"),
      userProfile.availableDays.toString(),
      userProfile.availableEquipment.sort().join("-"),
      userProfile.injuries?.sort().join("-") || "none",
    ].join(":");

    return `${CACHE_STRATEGY.routineTemplates.keyPrefix}:${this.hashString(key)}`;
  }

  /**
   * Genera clave de cache para consejos de ejercicios
   */
  generateExerciseCacheKey(exerciseName: string, question: string): string {
    const key = `${exerciseName}:${question}`;
    return `${CACHE_STRATEGY.exerciseAdvice.keyPrefix}:${this.hashString(key)}`;
  }

  /**
   * Obtiene el plan del usuario (mock por ahora)
   */
  private async getUserPlan(
    _userId: string
  ): Promise<"free" | "premium" | "pro"> {
    // TODO: Obtener desde base de datos
    return "free";
  }

  /**
   * Obtiene el mes actual en formato YYYY-MM
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  }

  /**
   * Calcula segundos hasta fin de mes
   */
  private getSecondsUntilEndOfMonth(): number {
    const now = new Date();
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );
    return Math.floor((endOfMonth.getTime() - now.getTime()) / 1000);
  }

  /**
   * Simple hash para generar claves consistentes
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Obtiene estadísticas de uso de IA para un usuario
   */
  async getUsageStats(userId: string): Promise<{
    currentUsage: Record<string, number>;
    limits: Record<string, number | boolean>;
    plan: string;
    resetDate: string;
  }> {
    const userKey = `ai_usage:${userId}:${this.getCurrentMonth()}`;
    const currentUsage = await this.redis.get(userKey);
    const usage = currentUsage
      ? JSON.parse(currentUsage)
      : {
          routine_generation: 0,
          exercise_advice: 0,
          progress_analysis: 0,
        };

    const userPlan = await this.getUserPlan(userId);
    const limits = PLAN_LIMITS[userPlan];

    // Calcular fecha de reset (fin de mes)
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      currentUsage: usage,
      limits,
      plan: userPlan,
      resetDate: resetDate.toISOString(),
    };
  }
}
