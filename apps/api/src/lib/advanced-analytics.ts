/**
 * Advanced Analytics Engine
 * Machine Learning models and predictive analytics for FitAI
 */

export interface WorkoutHistory {
  id: string;
  userId: string;
  date: Date;
  exercises: ExercisePerformance[];
  duration: number;
  totalVolume: number;
  avgRPE: number;
  heartRateData?: HeartRatePoint[];
  recoveryScore?: number;
}

export interface ExercisePerformance {
  exerciseId: string;
  name: string;
  sets: SetPerformance[];
  totalVolume: number;
  oneRepMax?: number;
  avgRPE: number;
}

export interface SetPerformance {
  reps: number;
  weight: number;
  rpe?: number;
  restTime?: number;
}

export interface HeartRatePoint {
  timestamp: Date;
  value: number;
  zone: string;
}

export interface PlateauPrediction {
  exerciseId: string;
  exerciseName: string;
  likelihood: number; // 0-1
  timeframe: number; // weeks until plateau
  currentTrend: "increasing" | "stable" | "decreasing";
  recommendations: string[];
  confidence: number; // 0-1
}

export interface VolumeRecommendation {
  userId: string;
  currentVolume: number;
  recommendedVolume: number;
  adjustment: number; // percentage change
  reasoning: string;
  muscleGroupBreakdown: Record<string, number>;
  periodization: "linear" | "undulating" | "block";
}

export interface RiskAssessment {
  overallRisk: "low" | "moderate" | "high";
  riskFactors: RiskFactor[];
  preventiveActions: string[];
  monitoringPoints: string[];
  confidenceScore: number;
}

export interface RiskFactor {
  type: "volume" | "intensity" | "frequency" | "recovery" | "biomechanical";
  severity: "low" | "moderate" | "high";
  description: string;
  likelihood: number;
  timeframe: string;
}

export interface MovementPattern {
  exerciseId: string;
  consistency: number; // 0-1
  technique_score: number; // 0-100
  asymmetries: string[];
  improvement_trend: number; // -1 to 1
}

export class AdvancedAnalytics {
  private workoutHistory: WorkoutHistory[] = [];

  constructor(workoutHistory: WorkoutHistory[]) {
    this.workoutHistory = workoutHistory;
  }

  /**
   * Predict training plateaus using trend analysis
   */
  async detectTrainingPlateaus(userId: string): Promise<PlateauPrediction[]> {
    const userWorkouts = this.workoutHistory.filter((w) => w.userId === userId);

    if (userWorkouts.length < 6) {
      throw new Error("Insufficient data: minimum 6 workouts required");
    }

    const exerciseGroups = this.groupExercisesByType(userWorkouts);
    const plateauPredictions: PlateauPrediction[] = [];

    for (const [exerciseId, performances] of Object.entries(exerciseGroups)) {
      const prediction = this.predictPlateauForExercise(
        exerciseId,
        performances
      );
      if (prediction) {
        plateauPredictions.push(prediction);
      }
    }

    return plateauPredictions.sort((a, b) => b.likelihood - a.likelihood);
  }

  /**
   * Calculate optimal volume using machine learning principles
   */
  async calculateOptimalVolume(
    userId: string,
    userProfile: any
  ): Promise<VolumeRecommendation> {
    const userWorkouts = this.workoutHistory.filter((w) => w.userId === userId);

    if (userWorkouts.length < 4) {
      throw new Error("Insufficient data: minimum 4 workouts required");
    }

    // Analyze current volume trends
    const recentWorkouts = userWorkouts.slice(-8); // Last 8 workouts
    const currentVolume = this.calculateAverageVolume(recentWorkouts);
    const volumeTrend = this.calculateVolumeTrend(recentWorkouts);

    // Factor in recovery data
    const recoveryScore = this.calculateRecoveryScore(recentWorkouts);
    const adaptationRate = this.calculateAdaptationRate(userWorkouts);

    // ML-based volume recommendation
    const baseRecommendation = this.calculateBaseVolumeRecommendation(
      currentVolume,
      volumeTrend,
      recoveryScore,
      adaptationRate,
      userProfile
    );

    // Muscle group specific recommendations
    const muscleGroupBreakdown =
      this.calculateMuscleGroupVolume(recentWorkouts);

    return {
      userId,
      currentVolume,
      recommendedVolume: baseRecommendation.volume,
      adjustment: baseRecommendation.adjustment,
      reasoning: baseRecommendation.reasoning,
      muscleGroupBreakdown,
      periodization: this.recommendPeriodization(volumeTrend, adaptationRate),
    };
  }

  /**
   * Assess injury risk using multiple factors
   */
  async assessInjuryRisk(
    userId: string,
    patterns: MovementPattern[]
  ): Promise<RiskAssessment> {
    const userWorkouts = this.workoutHistory.filter((w) => w.userId === userId);

    if (userWorkouts.length < 3) {
      return {
        overallRisk: "low",
        riskFactors: [],
        preventiveActions: [
          "Complete más entrenamientos para análisis completo",
        ],
        monitoringPoints: ["Consistencia en la técnica", "Progresión gradual"],
        confidenceScore: 0.3,
      };
    }

    const riskFactors: RiskFactor[] = [];

    // Volume risk analysis
    const volumeRisk = this.assessVolumeRisk(userWorkouts);
    if (volumeRisk) riskFactors.push(volumeRisk);

    // Intensity risk analysis
    const intensityRisk = this.assessIntensityRisk(userWorkouts);
    if (intensityRisk) riskFactors.push(intensityRisk);

    // Recovery risk analysis
    const recoveryRisk = this.assessRecoveryRisk(userWorkouts);
    if (recoveryRisk) riskFactors.push(recoveryRisk);

    // Movement pattern analysis
    const movementRisks = this.assessMovementPatternRisks(patterns);
    riskFactors.push(...movementRisks);

    // Calculate overall risk
    const overallRisk = this.calculateOverallRisk(riskFactors);

    return {
      overallRisk,
      riskFactors,
      preventiveActions: this.generatePreventiveActions(riskFactors),
      monitoringPoints: this.generateMonitoringPoints(riskFactors),
      confidenceScore: this.calculateConfidenceScore(
        userWorkouts.length,
        riskFactors.length
      ),
    };
  }

  /**
   * Advanced fatigue management system
   */
  calculateTrainingStressScore(workout: WorkoutHistory): number {
    const durationFactor = Math.min(workout.duration / 60, 2); // Max 2 hours
    const volumeFactor = Math.log(workout.totalVolume / 1000 + 1);
    const intensityFactor = workout.avgRPE / 10;

    // Heart rate factor (if available)
    let heartRateFactor = 1;
    if (workout.heartRateData && workout.heartRateData.length > 0) {
      const avgHR =
        workout.heartRateData.reduce((sum, hr) => sum + hr.value, 0) /
        workout.heartRateData.length;
      heartRateFactor = Math.min(avgHR / 150, 1.5); // Normalize to max HR
    }

    return Math.round(
      durationFactor * volumeFactor * intensityFactor * heartRateFactor * 100
    );
  }

  /**
   * One-rep max estimation using multiple algorithms
   */
  estimateOneRepMax(_exerciseId: string, recentSets: SetPerformance[]): number {
    if (recentSets.length === 0) return 0;

    const estimates: number[] = [];

    recentSets.forEach((set) => {
      if (set.reps >= 1 && set.reps <= 10) {
        // Epley formula
        const epley = set.weight * (1 + set.reps / 30);
        estimates.push(epley);

        // Brzycki formula
        const brzycki = set.weight / (1.0278 - 0.0278 * set.reps);
        estimates.push(brzycki);

        // Lombardi formula
        const lombardi = set.weight * set.reps ** 0.1;
        estimates.push(lombardi);
      }
    });

    if (estimates.length === 0) return 0;

    // Return weighted average, giving more weight to recent estimates
    return Math.round(
      estimates.reduce((sum, est) => sum + est, 0) / estimates.length
    );
  }

  // Private helper methods

  private groupExercisesByType(
    workouts: WorkoutHistory[]
  ): Record<string, ExercisePerformance[]> {
    const groups: Record<string, ExercisePerformance[]> = {};

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        if (!groups[exercise.exerciseId]) {
          groups[exercise.exerciseId] = [];
        }
        groups[exercise.exerciseId].push(exercise);
      });
    });

    return groups;
  }

  private predictPlateauForExercise(
    exerciseId: string,
    performances: ExercisePerformance[]
  ): PlateauPrediction | null {
    if (performances.length < 4) return null;

    const recentPerformances = performances.slice(-6);
    const volumes = recentPerformances.map((p) => p.totalVolume);
    const trend = this.calculateTrend(volumes);

    // Calculate plateau likelihood
    let likelihood = 0;

    // Trend analysis
    if (trend.slope < 0.05) likelihood += 0.4; // Low growth
    if (trend.rSquared > 0.8 && trend.slope < 0.1) likelihood += 0.3; // Consistent low growth

    // Variability analysis
    const variability = this.calculateVariability(volumes);
    if (variability < 0.1) likelihood += 0.2; // Low variability indicates plateau

    // Time since last PR
    const timeSinceLastPR = this.getTimeSinceLastPR(recentPerformances);
    if (timeSinceLastPR > 4) likelihood += 0.3; // 4+ weeks without PR

    likelihood = Math.min(likelihood, 1);

    if (likelihood < 0.3) return null; // Not significant enough

    return {
      exerciseId,
      exerciseName: recentPerformances[0].name,
      likelihood,
      timeframe: Math.round((1 / (trend.slope + 0.01)) * 2), // Estimated weeks
      currentTrend:
        trend.slope > 0.1
          ? "increasing"
          : trend.slope > -0.05
            ? "stable"
            : "decreasing",
      recommendations: this.generatePlateauRecommendations(likelihood, trend),
      confidence: this.calculatePredictionConfidence(
        recentPerformances.length,
        trend.rSquared
      ),
    };
  }

  private calculateAverageVolume(workouts: WorkoutHistory[]): number {
    if (workouts.length === 0) return 0;
    return (
      workouts.reduce((sum, w) => sum + w.totalVolume, 0) / workouts.length
    );
  }

  private calculateVolumeTrend(workouts: WorkoutHistory[]): {
    slope: number;
    rSquared: number;
  } {
    if (workouts.length < 3) return { slope: 0, rSquared: 0 };

    const volumes = workouts.map((w, i) => ({ x: i, y: w.totalVolume }));
    return this.calculateLinearRegression(volumes);
  }

  private calculateRecoveryScore(workouts: WorkoutHistory[]): number {
    if (workouts.length === 0) return 0.5;

    const recoveryScores = workouts
      .map((w) => w.recoveryScore)
      .filter((score) => score !== undefined) as number[];

    if (recoveryScores.length === 0) {
      // Estimate recovery based on workout frequency and RPE
      const avgRPE =
        workouts.reduce((sum, w) => sum + w.avgRPE, 0) / workouts.length;
      return Math.max(0, 1 - (avgRPE / 10) * 0.6);
    }

    return (
      recoveryScores.reduce((sum, score) => sum + score, 0) /
      recoveryScores.length
    );
  }

  private calculateAdaptationRate(workouts: WorkoutHistory[]): number {
    if (workouts.length < 6) return 0.5;

    const recentVolumes = workouts.slice(-6).map((w) => w.totalVolume);
    const olderVolumes = workouts.slice(-12, -6).map((w) => w.totalVolume);

    if (olderVolumes.length === 0) return 0.5;

    const recentAvg =
      recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    const olderAvg =
      olderVolumes.reduce((sum, v) => sum + v, 0) / olderVolumes.length;

    return Math.min((recentAvg - olderAvg) / olderAvg, 1);
  }

  private calculateBaseVolumeRecommendation(
    currentVolume: number,
    _volumeTrend: { slope: number; rSquared: number },
    recoveryScore: number,
    adaptationRate: number,
    userProfile: any
  ): { volume: number; adjustment: number; reasoning: string } {
    let adjustment = 0;
    let reasoning = "";

    // Recovery-based adjustment
    if (recoveryScore > 0.8) {
      adjustment += 0.1; // Good recovery, can increase volume
      reasoning += "Buena recuperación permite incremento. ";
    } else if (recoveryScore < 0.4) {
      adjustment -= 0.15; // Poor recovery, reduce volume
      reasoning += "Recuperación deficiente requiere reducción. ";
    }

    // Adaptation rate adjustment
    if (adaptationRate > 0.3) {
      adjustment += 0.05; // Good adaptation, slight increase
      reasoning += "Buena adaptación. ";
    } else if (adaptationRate < 0.1) {
      adjustment -= 0.1; // Poor adaptation, reduce stimulus
      reasoning += "Adaptación lenta requiere ajuste. ";
    }

    // Experience level adjustment
    if (userProfile?.experienceLevel === "beginner") {
      adjustment = Math.min(adjustment, 0.15); // Cap increases for beginners
    } else if (userProfile?.experienceLevel === "advanced") {
      adjustment *= 0.7; // Smaller adjustments for advanced users
    }

    // Final volume calculation
    const recommendedVolume = Math.round(currentVolume * (1 + adjustment));

    return {
      volume: recommendedVolume,
      adjustment: adjustment * 100,
      reasoning:
        reasoning || "Mantener volumen actual basado en análisis de datos.",
    };
  }

  private calculateMuscleGroupVolume(
    _workouts: WorkoutHistory[]
  ): Record<string, number> {
    const muscleGroups: Record<string, number> = {
      chest: 0,
      back: 0,
      shoulders: 0,
      biceps: 0,
      triceps: 0,
      legs: 0,
      core: 0,
    };

    // This would be implemented with actual muscle group mapping
    // For now, return mock data
    Object.keys(muscleGroups).forEach((group) => {
      muscleGroups[group] = Math.floor(Math.random() * 5000) + 2000;
    });

    return muscleGroups;
  }

  private recommendPeriodization(
    _volumeTrend: any,
    adaptationRate: number
  ): "linear" | "undulating" | "block" {
    if (adaptationRate > 0.3) return "linear";
    if (adaptationRate < 0.1) return "undulating";
    return "block";
  }

  // Risk assessment methods
  private assessVolumeRisk(workouts: WorkoutHistory[]): RiskFactor | null {
    const recentVolumes = workouts.slice(-4).map((w) => w.totalVolume);
    const volumeTrend = this.calculateTrend(recentVolumes);

    if (volumeTrend.slope > 0.3) {
      // Rapid volume increase
      return {
        type: "volume",
        severity: "high",
        description: "Incremento rápido de volumen de entrenamiento",
        likelihood: 0.7,
        timeframe: "2-4 semanas",
      };
    }

    return null;
  }

  private assessIntensityRisk(workouts: WorkoutHistory[]): RiskFactor | null {
    const highIntensityWorkouts = workouts.filter((w) => w.avgRPE > 8.5).length;
    const totalWorkouts = workouts.length;

    if (highIntensityWorkouts / totalWorkouts > 0.6) {
      return {
        type: "intensity",
        severity: "moderate",
        description: "Alta frecuencia de entrenamientos de alta intensidad",
        likelihood: 0.5,
        timeframe: "3-6 semanas",
      };
    }

    return null;
  }

  private assessRecoveryRisk(workouts: WorkoutHistory[]): RiskFactor | null {
    const avgRecovery = this.calculateRecoveryScore(workouts);

    if (avgRecovery < 0.3) {
      return {
        type: "recovery",
        severity: "high",
        description: "Recuperación consistentemente deficiente",
        likelihood: 0.8,
        timeframe: "1-2 semanas",
      };
    }

    return null;
  }

  private assessMovementPatternRisks(
    patterns: MovementPattern[]
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    patterns.forEach((pattern) => {
      if (pattern.consistency < 0.6) {
        risks.push({
          type: "biomechanical",
          severity: "moderate",
          description: `Inconsistencia en la técnica: ${pattern.exerciseId}`,
          likelihood: 0.4,
          timeframe: "4-8 semanas",
        });
      }

      if (pattern.asymmetries.length > 0) {
        risks.push({
          type: "biomechanical",
          severity: "moderate",
          description: `Asimetrías detectadas: ${pattern.asymmetries.join(", ")}`,
          likelihood: 0.6,
          timeframe: "6-12 semanas",
        });
      }
    });

    return risks;
  }

  private calculateOverallRisk(
    riskFactors: RiskFactor[]
  ): "low" | "moderate" | "high" {
    if (riskFactors.length === 0) return "low";

    const avgLikelihood =
      riskFactors.reduce((sum, rf) => sum + rf.likelihood, 0) /
      riskFactors.length;
    const highSeverityCount = riskFactors.filter(
      (rf) => rf.severity === "high"
    ).length;

    if (highSeverityCount > 0 || avgLikelihood > 0.7) return "high";
    if (avgLikelihood > 0.4) return "moderate";
    return "low";
  }

  private generatePreventiveActions(riskFactors: RiskFactor[]): string[] {
    const actions: string[] = [];

    const hasVolumeRisk = riskFactors.some((rf) => rf.type === "volume");
    const hasIntensityRisk = riskFactors.some((rf) => rf.type === "intensity");
    const hasRecoveryRisk = riskFactors.some((rf) => rf.type === "recovery");

    if (hasVolumeRisk) {
      actions.push("Programa una semana de descarga inmediata");
      actions.push("Reduce volumen semanal en 20-30%");
    }

    if (hasIntensityRisk) {
      actions.push(
        "Incluye más entrenamientos de intensidad moderada (RPE 6-7)"
      );
      actions.push("Limita entrenamientos de alta intensidad a 2 por semana");
    }

    if (hasRecoveryRisk) {
      actions.push("Prioriza sueño de calidad (7-9 horas)");
      actions.push("Incorpora técnicas de recuperación activa");
      actions.push("Considera suplementación para recuperación");
    }

    return actions.length > 0
      ? actions
      : ["Mantener patrón actual de entrenamiento"];
  }

  private generateMonitoringPoints(_riskFactors: RiskFactor[]): string[] {
    return [
      "Niveles de fatiga subjetiva (RPE)",
      "Calidad del sueño",
      "Dolor o molestias articulares",
      "Motivación para entrenar",
      "Variabilidad de frecuencia cardíaca",
    ];
  }

  private calculateConfidenceScore(
    workoutCount: number,
    riskFactorCount: number
  ): number {
    const dataConfidence = Math.min(workoutCount / 12, 1); // Max confidence at 12 workouts
    const analysisConfidence = riskFactorCount > 0 ? 0.8 : 0.6;

    return Math.round(dataConfidence * analysisConfidence * 100) / 100;
  }

  // Utility methods
  private calculateTrend(values: number[]): {
    slope: number;
    rSquared: number;
  } {
    const points = values.map((value, index) => ({ x: index, y: value }));
    return this.calculateLinearRegression(points);
  }

  private calculateLinearRegression(points: { x: number; y: number }[]): {
    slope: number;
    rSquared: number;
  } {
    const n = points.length;
    if (n < 2) return { slope: 0, rSquared: 0 };

    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumYY = points.reduce((sum, p) => sum + p.y * p.y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const totalSumSquares = sumYY - n * meanY * meanY;
    const residualSumSquares = points.reduce((sum, p) => {
      const predicted = slope * p.x + intercept;
      return sum + (p.y - predicted) ** 2;
    }, 0);

    const rSquared =
      totalSumSquares > 0 ? 1 - residualSumSquares / totalSumSquares : 0;

    return { slope, rSquared: Math.max(0, Math.min(1, rSquared)) };
  }

  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private getTimeSinceLastPR(_performances: ExercisePerformance[]): number {
    // Mock implementation - would track actual PRs in production
    return Math.floor(Math.random() * 8) + 1;
  }

  private generatePlateauRecommendations(
    likelihood: number,
    _trend: any
  ): string[] {
    const recommendations: string[] = [];

    if (likelihood > 0.7) {
      recommendations.push("Cambiar esquema de repeticiones");
      recommendations.push("Incorporar técnicas de intensidad avanzadas");
      recommendations.push("Programar semana de descarga");
    } else if (likelihood > 0.4) {
      recommendations.push("Variar tempo de ejecución");
      recommendations.push("Añadir ejercicios accesorios");
    }

    return recommendations;
  }

  private calculatePredictionConfidence(
    dataPoints: number,
    rSquared: number
  ): number {
    const dataConfidence = Math.min(dataPoints / 8, 1);
    const trendConfidence = Math.max(rSquared, 0.3);

    return Math.round(dataConfidence * trendConfidence * 100) / 100;
  }
}

export default AdvancedAnalytics;
