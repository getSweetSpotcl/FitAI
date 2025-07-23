import { HealthDataService } from './health-data-service';
import { AIService } from './ai-service';
import { DatabaseClient } from '../db/database';
import { RecoveryAnalysis, TrainingReadiness } from '../types/health';

export interface HealthBasedRecommendation {
  workoutAdjustments: {
    intensityModifier: number; // 0.5 = 50% intensity, 1.0 = normal, 1.2 = 120% intensity
    durationModifier: number;
    restPeriodModifier: number;
    recommendedActivities: string[];
    avoidActivities: string[];
  };
  nutritionAdvice: string[];
  recoveryActions: string[];
  warningFlags: string[];
  confidenceScore: number; // 0-100
}

export interface WorkoutPersonalization {
  baseIntensity: number;
  suggestedDuration: number;
  heartRateZones: {
    warmup: { min: number; max: number };
    moderate: { min: number; max: number };
    vigorous: { min: number; max: number };
    maximum: { min: number; max: number };
  };
  recoveryTime: number; // minutes between sets
}

export class HealthAIService {
  constructor(
    private sql: DatabaseClient,
    private aiService: AIService,
    private healthService: HealthDataService
  ) {}

  /**
   * Generate health-based workout recommendations using AI and health data
   */
  async generateHealthBasedRecommendations(
    userId: string,
    currentWorkout?: any
  ): Promise<HealthBasedRecommendation> {
    try {
      // Get comprehensive health data
      const [recoveryAnalysis, recentSleep, recentHRV, recentMetrics] = await Promise.all([
        this.healthService.calculateRecoveryScore(userId),
        this.getRecentSleepData(userId),
        this.healthService.getLatestHRVData(userId, 3), // Last 3 days
        this.getRecentHealthMetrics(userId)
      ]);

      // Create health context for AI
      const healthContext = {
        recovery: recoveryAnalysis,
        sleep: recentSleep,
        hrv: recentHRV,
        metrics: recentMetrics,
        currentWorkout
      };

      // Generate AI-powered recommendations
      const aiPrompt = this.buildHealthRecommendationPrompt(healthContext);
      
      // For now, return rule-based recommendations
      // In production, you'd integrate with OpenAI here
      const recommendations = this.generateRuleBasedRecommendations(healthContext);

      return recommendations;

    } catch (error) {
      console.error('Health-based recommendation error:', error);
      
      // Fallback to basic recommendations
      return {
        workoutAdjustments: {
          intensityModifier: 1.0,
          durationModifier: 1.0,
          restPeriodModifier: 1.0,
          recommendedActivities: ['strength_training', 'cardio'],
          avoidActivities: []
        },
        nutritionAdvice: ['Mantente hidratado', 'Come una comida balanceada post-entrenamiento'],
        recoveryActions: ['Duerme 7-9 horas', 'Considera stretching'],
        warningFlags: [],
        confidenceScore: 50
      };
    }
  }

  /**
   * Personalize workout parameters based on health data
   */
  async personalizeWorkout(userId: string, baseWorkout: any): Promise<WorkoutPersonalization> {
    try {
      // Get user's health metrics
      const [restingHR, maxHR, recentHRV] = await Promise.all([
        this.getAverageRestingHeartRate(userId),
        this.getEstimatedMaxHeartRate(userId),
        this.healthService.getLatestHRVData(userId, 1) // Today's HRV
      ]);

      // Calculate heart rate zones
      const heartRateZones = this.calculateHeartRateZones(restingHR, maxHR);

      // Get recovery score
      const recoveryAnalysis = await this.healthService.calculateRecoveryScore(userId);

      // Adjust workout based on recovery
      let intensityModifier = 1.0;
      let durationModifier = 1.0;
      let recoveryTimeModifier = 1.0;

      if (recoveryAnalysis.currentScore < 40) {
        // Poor recovery - reduce intensity and duration
        intensityModifier = 0.6;
        durationModifier = 0.7;
        recoveryTimeModifier = 1.5;
      } else if (recoveryAnalysis.currentScore < 60) {
        // Moderate recovery - slight reduction
        intensityModifier = 0.8;
        durationModifier = 0.9;
        recoveryTimeModifier = 1.2;
      } else if (recoveryAnalysis.currentScore > 80) {
        // Great recovery - can push harder
        intensityModifier = 1.1;
        durationModifier = 1.1;
        recoveryTimeModifier = 0.9;
      }

      return {
        baseIntensity: intensityModifier,
        suggestedDuration: Math.round((baseWorkout.estimatedDuration || 45) * durationModifier),
        heartRateZones,
        recoveryTime: Math.round((baseWorkout.restPeriod || 60) * recoveryTimeModifier)
      };

    } catch (error) {
      console.error('Workout personalization error:', error);
      
      // Return default personalization
      return {
        baseIntensity: 1.0,
        suggestedDuration: 45,
        heartRateZones: {
          warmup: { min: 100, max: 120 },
          moderate: { min: 120, max: 140 },
          vigorous: { min: 140, max: 170 },
          maximum: { min: 170, max: 190 }
        },
        recoveryTime: 60
      };
    }
  }

  /**
   * Check if user should skip workout based on health data
   */
  async shouldSkipWorkout(userId: string): Promise<{
    shouldSkip: boolean;
    reason?: string;
    alternatives?: string[];
  }> {
    try {
      const recoveryAnalysis = await this.healthService.calculateRecoveryScore(userId);
      const recentSleep = await this.getRecentSleepData(userId);

      // Critical recovery score
      if (recoveryAnalysis.currentScore < 30) {
        return {
          shouldSkip: true,
          reason: 'Puntuación de recuperación muy baja. Tu cuerpo necesita descanso.',
          alternatives: [
            'Caminar ligero 10-15 minutos',
            'Stretching suave',
            'Meditación o ejercicios de respiración',
            'Dormir una siesta de 20 minutos'
          ]
        };
      }

      // Poor sleep
      if (recentSleep && recentSleep.totalSleepMinutes < 300) { // Less than 5 hours
        return {
          shouldSkip: true,
          reason: 'Sueño insuficiente la noche anterior. El descanso es crucial para el rendimiento.',
          alternatives: [
            'Yoga restaurativo',
            'Caminar al aire libre',
            'Ejercicios de movilidad'
          ]
        };
      }

      // Check for concerning trends
      if (recoveryAnalysis.trend === 'declining' && recoveryAnalysis.currentScore < 50) {
        return {
          shouldSkip: false,
          reason: 'Tu recuperación está en declive. Considera entrenar con menor intensidad hoy.',
          alternatives: [
            'Reducir intensidad en 30%',
            'Acortar duración del entrenamiento',
            'Enfocar en técnica sobre peso/velocidad'
          ]
        };
      }

      return { shouldSkip: false };

    } catch (error) {
      console.error('Skip workout check error:', error);
      return { shouldSkip: false };
    }
  }

  /**
   * Monitor workout in real-time and provide alerts
   */
  async monitorWorkoutRealTime(
    userId: string, 
    currentHeartRate: number, 
    workoutDuration: number
  ): Promise<{
    alerts: string[];
    suggestions: string[];
    heartRateStatus: 'low' | 'optimal' | 'high' | 'danger';
  }> {
    try {
      const [maxHR, personalizedWorkout] = await Promise.all([
        this.getEstimatedMaxHeartRate(userId),
        this.personalizeWorkout(userId, {})
      ]);

      const alerts: string[] = [];
      const suggestions: string[] = [];
      let heartRateStatus: 'low' | 'optimal' | 'high' | 'danger' = 'optimal';

      // Heart rate analysis
      const hrPercentage = (currentHeartRate / maxHR) * 100;

      if (hrPercentage > 95) {
        heartRateStatus = 'danger';
        alerts.push('⚠️ Frecuencia cardíaca muy alta - considera descansar');
      } else if (hrPercentage > 85) {
        heartRateStatus = 'high';
        suggestions.push('💪 Estás en zona anaeróbica - perfecto para intervalos cortos');
      } else if (hrPercentage < 50) {
        heartRateStatus = 'low';
        suggestions.push('🔥 Puedes aumentar la intensidad para mejor beneficio cardiovascular');
      }

      // Duration alerts
      if (workoutDuration > personalizedWorkout.suggestedDuration + 15) {
        alerts.push('⏰ Has superado tu duración recomendada - considera finalizar pronto');
      }

      return {
        alerts,
        suggestions,
        heartRateStatus
      };

    } catch (error) {
      console.error('Real-time monitoring error:', error);
      return {
        alerts: [],
        suggestions: [],
        heartRateStatus: 'optimal'
      };
    }
  }

  // Private helper methods

  private async getRecentSleepData(userId: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const sleepData = await this.healthService.getSleepData(userId, yesterday, today);
    return sleepData.length > 0 ? sleepData[0] : null;
  }

  private async getRecentHealthMetrics(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await this.healthService.getHealthMetrics(userId, {
      startDate: sevenDaysAgo,
      endDate: new Date(),
      limit: 100
    });
  }

  private async getAverageRestingHeartRate(userId: string): Promise<number> {
    const metrics = await this.healthService.getHealthMetrics(userId, {
      metricTypes: ['resting_heart_rate'],
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks
      limit: 14
    });

    if (metrics.length === 0) return 60; // Default
    
    const average = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    return Math.round(average);
  }

  private async getEstimatedMaxHeartRate(userId: string): Promise<number> {
    // Get user age from profile
    const userProfile = await this.sql`
      SELECT age FROM user_profiles WHERE user_id = ${userId} LIMIT 1
    `;

    const age = (userProfile as any[]).length > 0 ? (userProfile as any[])[0].age : 30; // Default age
    
    // Use Tanaka formula: 208 - (0.7 × age)
    return Math.round(208 - (0.7 * age));
  }

  private calculateHeartRateZones(restingHR: number, maxHR: number) {
    const hrReserve = maxHR - restingHR;
    
    return {
      warmup: {
        min: Math.round(restingHR + (hrReserve * 0.3)),
        max: Math.round(restingHR + (hrReserve * 0.4))
      },
      moderate: {
        min: Math.round(restingHR + (hrReserve * 0.5)),
        max: Math.round(restingHR + (hrReserve * 0.6))
      },
      vigorous: {
        min: Math.round(restingHR + (hrReserve * 0.7)),
        max: Math.round(restingHR + (hrReserve * 0.8))
      },
      maximum: {
        min: Math.round(restingHR + (hrReserve * 0.9)),
        max: maxHR
      }
    };
  }

  private buildHealthRecommendationPrompt(healthContext: any): string {
    return `
      Based on the following health data, provide personalized workout recommendations:
      
      Recovery Score: ${healthContext.recovery.currentScore}/100
      Trend: ${healthContext.recovery.trend}
      Sleep Quality: ${healthContext.sleep?.sleepEfficiency || 'N/A'}%
      HRV Status: ${healthContext.hrv.length > 0 ? healthContext.hrv[0].recoveryScore : 'N/A'}
      
      Please provide:
      1. Intensity adjustments (0.5-1.5 multiplier)
      2. Duration recommendations
      3. Activity suggestions
      4. Recovery advice
      5. Any warning flags
    `;
  }

  private generateRuleBasedRecommendations(healthContext: any): HealthBasedRecommendation {
    const recovery = healthContext.recovery;
    const sleep = healthContext.sleep;
    const hrv = healthContext.hrv;

    let intensityModifier = 1.0;
    let durationModifier = 1.0;
    let restModifier = 1.0;
    const nutritionAdvice: string[] = [];
    const recoveryActions: string[] = [];
    const warningFlags: string[] = [];
    const recommendedActivities: string[] = [];
    const avoidActivities: string[] = [];

    // Recovery score adjustments
    if (recovery.currentScore < 40) {
      intensityModifier = 0.6;
      durationModifier = 0.7;
      restModifier = 1.5;
      recommendedActivities.push('walking', 'gentle_yoga', 'stretching');
      avoidActivities.push('high_intensity', 'heavy_lifting');
      warningFlags.push('Recuperación muy baja - considera descanso activo');
    } else if (recovery.currentScore < 60) {
      intensityModifier = 0.8;
      durationModifier = 0.9;
      restModifier = 1.2;
      recommendedActivities.push('moderate_cardio', 'light_strength');
    } else if (recovery.currentScore > 80) {
      intensityModifier = 1.1;
      durationModifier = 1.1;
      restModifier = 0.9;
      recommendedActivities.push('high_intensity', 'strength_training', 'intervals');
    }

    // Sleep analysis
    if (sleep && sleep.sleepEfficiency && sleep.sleepEfficiency < 70) {
      intensityModifier *= 0.8;
      warningFlags.push('Calidad de sueño baja - ajusta intensidad');
      recoveryActions.push('Prioriza mejor higiene del sueño');
    }

    if (sleep && sleep.totalSleepMinutes < 360) { // Less than 6 hours
      intensityModifier *= 0.7;
      warningFlags.push('Sueño insuficiente - considera entrenamiento ligero');
    }

    // HRV analysis
    if (hrv.length > 0 && hrv[0].stressScore > 70) {
      intensityModifier *= 0.8;
      recoveryActions.push('Incluye técnicas de manejo de estrés');
      warningFlags.push('Niveles de estrés elevados detectados');
    }

    // General advice
    nutritionAdvice.push(
      'Mantente hidratado durante el entrenamiento',
      'Come proteína dentro de 30 minutos post-entrenamiento'
    );

    recoveryActions.push(
      'Realiza 10 minutos de stretching post-entrenamiento',
      'Considera un baño frío o caliente según preferencia'
    );

    // Calculate confidence based on available data
    let confidenceScore = 70;
    if (sleep) confidenceScore += 10;
    if (hrv.length > 0) confidenceScore += 10;
    if (recovery.factorsInfluencing) confidenceScore += 10;

    return {
      workoutAdjustments: {
        intensityModifier,
        durationModifier,
        restPeriodModifier: restModifier,
        recommendedActivities,
        avoidActivities
      },
      nutritionAdvice,
      recoveryActions,
      warningFlags,
      confidenceScore: Math.min(100, confidenceScore)
    };
  }
}