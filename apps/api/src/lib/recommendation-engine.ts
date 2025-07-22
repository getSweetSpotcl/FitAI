/**
 * Advanced Recommendation Engine for FitAI
 * AI-powered personalized recommendations for workouts, exercises, and training optimization
 */

export interface UserProfile {
  id: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  preferences: UserPreferences;
  physicalProfile: PhysicalProfile;
  constraints: Constraint[];
  performanceHistory: PerformanceMetrics[];
}

export interface UserPreferences {
  workoutDuration: number; // minutes
  preferredIntensity: 'low' | 'moderate' | 'high';
  exerciseTypes: string[]; // ['compound', 'isolation', 'functional']
  equipmentPreferences: string[];
  timeSlots: TimeSlot[];
  restDayPreferences: string[];
}

export interface PhysicalProfile {
  age: number;
  weight: number;
  height: number;
  bodyFatPercentage?: number;
  injuries: Injury[];
  limitations: string[];
}

export interface Constraint {
  type: 'time' | 'equipment' | 'injury' | 'environment';
  description: string;
  severity: 'low' | 'moderate' | 'high';
  workarounds?: string[];
}

export interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  preference: 'preferred' | 'acceptable' | 'last-resort';
}

export interface Injury {
  location: string;
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'recovering' | 'healed';
  restrictions: string[];
}

export interface PerformanceMetrics {
  date: Date;
  volume: number;
  intensity: number;
  duration: number;
  fatigue: number;
  satisfaction: number;
  adherence: number;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: number; // 1-10
  compound: boolean;
  alternatives: ExerciseAlternative[];
  contraindications: string[];
  instructions: string[];
  formCues: string[];
}

export interface ExerciseAlternative {
  exerciseId: string;
  reason: string;
  difficulty: 'easier' | 'similar' | 'harder';
  equipment: string[];
}

export interface WorkoutRecommendation {
  id: string;
  name: string;
  description: string;
  exercises: RecommendedExercise[];
  estimatedDuration: number;
  difficulty: number;
  focus: string[];
  reasoning: string[];
  alternatives: WorkoutAlternative[];
  adaptations: WorkoutAdaptation[];
}

export interface RecommendedExercise {
  exercise: Exercise;
  sets: number;
  reps: string;
  weight?: string;
  rest: number;
  rpe: string;
  notes: string[];
  progression: ExerciseProgression;
}

export interface ExerciseProgression {
  currentLevel: number;
  nextLevel: ProgressionStep;
  timeframe: string;
  markers: string[];
}

export interface ProgressionStep {
  parameter: 'weight' | 'reps' | 'sets' | 'tempo' | 'rest';
  change: string;
  condition: string;
}

export interface WorkoutAlternative {
  reason: string;
  modifications: string[];
  exercises?: RecommendedExercise[];
}

export interface WorkoutAdaptation {
  trigger: string;
  modification: string;
  explanation: string;
}

export interface ScheduleRecommendation {
  weeklyPlan: WeeklyPlan;
  reasoning: string[];
  alternatives: WeeklyPlan[];
  adaptations: ScheduleAdaptation[];
}

export interface WeeklyPlan {
  days: DayPlan[];
  totalVolume: number;
  intensityDistribution: IntensityDistribution;
  recoveryScore: number;
}

export interface DayPlan {
  day: string;
  workout?: WorkoutRecommendation;
  type: 'workout' | 'rest' | 'active-recovery';
  reasoning: string;
}

export interface IntensityDistribution {
  low: number; // percentage
  moderate: number;
  high: number;
}

export interface ScheduleAdaptation {
  condition: string;
  change: string;
  implementation: string;
}

export interface OptimalSchedule {
  schedule: ScheduleRecommendation;
  adherencePrediction: number;
  successFactors: string[];
  riskFactors: string[];
}

export interface DeloadRecommendation {
  timing: string;
  duration: number;
  modifications: DeloadModification[];
  activities: string[];
  reasoning: string[];
}

export interface DeloadModification {
  parameter: 'volume' | 'intensity' | 'frequency';
  reduction: number; // percentage
  explanation: string;
}

export class RecommendationEngine {
  private exerciseDatabase: Exercise[] = [];
  private userProfiles: Map<string, UserProfile> = new Map();

  constructor(exerciseDatabase: Exercise[]) {
    this.exerciseDatabase = exerciseDatabase;
  }

  /**
   * Generate personalized exercise substitutions
   */
  async generateExerciseSubstitutions(
    originalExercise: Exercise,
    userConstraints: Constraint[]
  ): Promise<Exercise[]> {
    const substitutions: Exercise[] = [];
    
    // Filter constraints relevant to exercise selection
    const equipmentConstraints = userConstraints.filter(c => c.type === 'equipment');
    const injuryConstraints = userConstraints.filter(c => c.type === 'injury');
    
    // Find exercises that target same muscle groups
    const sameMuscleExercises = this.exerciseDatabase.filter(exercise => {
      return exercise.muscleGroups.some(muscle => 
        originalExercise.muscleGroups.includes(muscle)
      );
    });

    // Apply constraint filters
    const filteredExercises = sameMuscleExercises.filter(exercise => {
      // Check equipment constraints
      if (equipmentConstraints.length > 0) {
        const hasRequiredEquipment = exercise.equipment.some(eq => 
          !equipmentConstraints.some(constraint => 
            constraint.description.toLowerCase().includes(eq.toLowerCase())
          )
        );
        if (!hasRequiredEquipment) return false;
      }

      // Check injury constraints
      if (injuryConstraints.length > 0) {
        const conflictsWithInjury = exercise.contraindications.some(contra =>
          injuryConstraints.some(constraint =>
            constraint.description.toLowerCase().includes(contra.toLowerCase())
          )
        );
        if (conflictsWithInjury) return false;
      }

      return true;
    });

    // Rank by similarity and suitability
    const rankedSubstitutions = filteredExercises
      .map(exercise => ({
        exercise,
        similarity: this.calculateExerciseSimilarity(originalExercise, exercise),
        suitability: this.calculateExerciseSuitability(exercise, userConstraints)
      }))
      .sort((a, b) => (b.similarity + b.suitability) - (a.similarity + a.suitability))
      .slice(0, 5) // Top 5 alternatives
      .map(item => item.exercise);

    return rankedSubstitutions;
  }

  /**
   * Optimize workout timing based on user data and performance
   */
  async optimizeWorkoutTiming(
    userSchedule: TimeSlot[],
    performanceData: PerformanceMetrics[]
  ): Promise<OptimalSchedule> {
    // Analyze performance patterns by time of day
    const timePerformanceMap = this.analyzeTimePerformance(performanceData);
    
    // Find optimal workout times
    const optimalTimes = this.findOptimalWorkoutTimes(userSchedule, timePerformanceMap);
    
    // Generate weekly schedule
    const weeklyPlan = this.generateOptimalWeeklyPlan(optimalTimes, performanceData);
    
    // Calculate adherence prediction
    const adherencePrediction = this.predictAdherence(weeklyPlan, userSchedule);
    
    // Identify success and risk factors
    const successFactors = this.identifySuccessFactors(weeklyPlan, performanceData);
    const riskFactors = this.identifyRiskFactors(weeklyPlan, userSchedule);

    return {
      schedule: {
        weeklyPlan,
        reasoning: [
          'Horarios optimizados basados en tu rendimiento histórico',
          'Balance entre intensidad y recuperación',
          'Adaptado a tu disponibilidad personal'
        ],
        alternatives: this.generateAlternativeSchedules(weeklyPlan),
        adaptations: this.generateScheduleAdaptations()
      },
      adherencePrediction,
      successFactors,
      riskFactors
    };
  }

  /**
   * Recommend deload weeks based on fatigue markers
   */
  async recommendDeloadWeek(fatigueMarkers: PerformanceMetrics[]): Promise<DeloadRecommendation> {
    // Analyze fatigue trends
    const fatigueAnalysis = this.analyzeFatigueTrends(fatigueMarkers);
    
    // Determine deload timing
    const timing = this.calculateDeloadTiming(fatigueAnalysis);
    
    // Generate deload modifications
    const modifications = this.generateDeloadModifications(fatigueAnalysis);
    
    // Recommend alternative activities
    const activities = this.recommendDeloadActivities(fatigueAnalysis);
    
    return {
      timing,
      duration: this.calculateDeloadDuration(fatigueAnalysis),
      modifications,
      activities,
      reasoning: [
        'Indicadores de fatiga acumulada detectados',
        'Descarga programada para optimizar recuperación',
        'Mantenimiento de patrón de movimiento sin sobrecarga'
      ]
    };
  }

  /**
   * Generate comprehensive workout recommendation
   */
  async generateWorkoutRecommendation(userProfile: UserProfile): Promise<WorkoutRecommendation> {
    // Select exercises based on goals and constraints
    const selectedExercises = await this.selectOptimalExercises(userProfile);
    
    // Create exercise prescriptions
    const recommendedExercises = await this.prescribeExercises(selectedExercises, userProfile);
    
    // Calculate workout parameters
    const estimatedDuration = this.calculateWorkoutDuration(recommendedExercises);
    const difficulty = this.calculateWorkoutDifficulty(recommendedExercises, userProfile);
    
    // Generate reasoning
    const reasoning = this.generateWorkoutReasoning(userProfile, recommendedExercises);
    
    // Create alternatives and adaptations
    const alternatives = await this.generateWorkoutAlternatives(recommendedExercises, userProfile);
    const adaptations = this.generateWorkoutAdaptations(userProfile);

    return {
      id: `workout_${Date.now()}`,
      name: this.generateWorkoutName(userProfile.goals, recommendedExercises),
      description: this.generateWorkoutDescription(userProfile, recommendedExercises),
      exercises: recommendedExercises,
      estimatedDuration,
      difficulty,
      focus: this.identifyWorkoutFocus(recommendedExercises),
      reasoning,
      alternatives,
      adaptations
    };
  }

  // Private helper methods

  private calculateExerciseSimilarity(exercise1: Exercise, exercise2: Exercise): number {
    let similarity = 0;
    
    // Muscle group overlap
    const muscleOverlap = exercise1.muscleGroups.filter(muscle => 
      exercise2.muscleGroups.includes(muscle)
    ).length;
    similarity += (muscleOverlap / Math.max(exercise1.muscleGroups.length, exercise2.muscleGroups.length)) * 0.4;
    
    // Exercise category match
    if (exercise1.category === exercise2.category) similarity += 0.2;
    
    // Compound/isolation match
    if (exercise1.compound === exercise2.compound) similarity += 0.2;
    
    // Difficulty similarity
    const difficultyDiff = Math.abs(exercise1.difficulty - exercise2.difficulty);
    similarity += (1 - (difficultyDiff / 10)) * 0.2;
    
    return similarity;
  }

  private calculateExerciseSuitability(exercise: Exercise, constraints: Constraint[]): number {
    let suitability = 1.0;
    
    constraints.forEach(constraint => {
      if (constraint.severity === 'high') suitability -= 0.3;
      else if (constraint.severity === 'moderate') suitability -= 0.2;
      else suitability -= 0.1;
    });
    
    return Math.max(0, suitability);
  }

  private analyzeTimePerformance(performanceData: PerformanceMetrics[]): Map<string, number> {
    // Mock implementation - would analyze actual performance by time of day
    const timeMap = new Map<string, number>();
    timeMap.set('morning', 0.85);
    timeMap.set('afternoon', 0.75);
    timeMap.set('evening', 0.90);
    return timeMap;
  }

  private findOptimalWorkoutTimes(schedule: TimeSlot[], performanceMap: Map<string, number>): TimeSlot[] {
    return schedule
      .filter(slot => slot.preference !== 'last-resort')
      .sort((a, b) => {
        const aPerformance = performanceMap.get(this.getTimeOfDay(a.startTime)) || 0.5;
        const bPerformance = performanceMap.get(this.getTimeOfDay(b.startTime)) || 0.5;
        return bPerformance - aPerformance;
      });
  }

  private getTimeOfDay(time: string): string {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  private generateOptimalWeeklyPlan(optimalTimes: TimeSlot[], performanceData: PerformanceMetrics[]): WeeklyPlan {
    // Mock implementation
    const days: DayPlan[] = [
      { day: 'Monday', type: 'workout', reasoning: 'High energy after weekend rest' },
      { day: 'Tuesday', type: 'rest', reasoning: 'Recovery day' },
      { day: 'Wednesday', type: 'workout', reasoning: 'Mid-week training session' },
      { day: 'Thursday', type: 'active-recovery', reasoning: 'Light movement for recovery' },
      { day: 'Friday', type: 'workout', reasoning: 'End week strong' },
      { day: 'Saturday', type: 'rest', reasoning: 'Weekend recovery' },
      { day: 'Sunday', type: 'rest', reasoning: 'Full rest before new week' }
    ];

    return {
      days,
      totalVolume: 12000,
      intensityDistribution: { low: 30, moderate: 50, high: 20 },
      recoveryScore: 0.8
    };
  }

  private predictAdherence(plan: WeeklyPlan, userSchedule: TimeSlot[]): number {
    // Mock adherence prediction based on schedule compatibility
    return 0.82; // 82% predicted adherence
  }

  private identifySuccessFactors(plan: WeeklyPlan, performanceData: PerformanceMetrics[]): string[] {
    return [
      'Horarios alineados con tu mejor rendimiento',
      'Distribución equilibrada de intensidad',
      'Días de descanso estratégicamente ubicados'
    ];
  }

  private identifyRiskFactors(plan: WeeklyPlan, userSchedule: TimeSlot[]): string[] {
    return [
      'Posibles conflictos con horarios laborales los miércoles',
      'Riesgo de fatiga acumulada sin descarga programada'
    ];
  }

  private generateAlternativeSchedules(basePlan: WeeklyPlan): WeeklyPlan[] {
    // Generate alternative schedules
    return [basePlan]; // Mock - would generate actual alternatives
  }

  private generateScheduleAdaptations(): ScheduleAdaptation[] {
    return [
      {
        condition: 'Si tienes poco tiempo',
        change: 'Reduce duración del entrenamiento en 25%',
        implementation: 'Elimina ejercicios accesorios y enfócate en compuestos'
      },
      {
        condition: 'Si te sientes fatigado',
        change: 'Reduce intensidad en 20%',
        implementation: 'Usa RPE más bajo y añade descansos extra'
      }
    ];
  }

  private analyzeFatigueTrends(fatigueMarkers: PerformanceMetrics[]): any {
    // Analyze fatigue patterns
    const avgFatigue = fatigueMarkers.reduce((sum, m) => sum + m.fatigue, 0) / fatigueMarkers.length;
    const trend = this.calculateTrend(fatigueMarkers.map(m => m.fatigue));
    
    return {
      avgFatigue,
      trend,
      severity: avgFatigue > 7 ? 'high' : avgFatigue > 5 ? 'moderate' : 'low'
    };
  }

  private calculateTrend(values: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateDeloadTiming(fatigueAnalysis: any): string {
    if (fatigueAnalysis.severity === 'high') return 'Inmediato';
    if (fatigueAnalysis.severity === 'moderate') return 'Próxima semana';
    return 'En 2-3 semanas';
  }

  private generateDeloadModifications(fatigueAnalysis: any): DeloadModification[] {
    const modifications: DeloadModification[] = [];
    
    if (fatigueAnalysis.severity === 'high') {
      modifications.push({
        parameter: 'volume',
        reduction: 50,
        explanation: 'Reducir volumen significativamente para permitir recuperación completa'
      });
      modifications.push({
        parameter: 'intensity',
        reduction: 30,
        explanation: 'Bajar intensidad para reducir estrés del sistema nervioso'
      });
    } else {
      modifications.push({
        parameter: 'volume',
        reduction: 30,
        explanation: 'Reducción moderada de volumen manteniendo patrones de movimiento'
      });
    }
    
    return modifications;
  }

  private calculateDeloadDuration(fatigueAnalysis: any): number {
    if (fatigueAnalysis.severity === 'high') return 7; // 1 week
    if (fatigueAnalysis.severity === 'moderate') return 5; // 5 days
    return 3; // 3 days
  }

  private recommendDeloadActivities(fatigueAnalysis: any): string[] {
    return [
      'Caminatas ligeras (20-30 minutos)',
      'Yoga o stretching suave',
      'Natación a ritmo relajado',
      'Trabajo de movilidad y flexibilidad',
      'Masaje o técnicas de recuperación'
    ];
  }

  private async selectOptimalExercises(userProfile: UserProfile): Promise<Exercise[]> {
    // Mock implementation - would use complex algorithms
    return this.exerciseDatabase.slice(0, 6);
  }

  private async prescribeExercises(exercises: Exercise[], userProfile: UserProfile): Promise<RecommendedExercise[]> {
    return exercises.map(exercise => ({
      exercise,
      sets: this.calculateOptimalSets(exercise, userProfile),
      reps: this.calculateOptimalReps(exercise, userProfile),
      weight: this.calculateStartingWeight(exercise, userProfile),
      rest: this.calculateRestTime(exercise, userProfile),
      rpe: this.calculateTargetRPE(exercise, userProfile),
      notes: this.generateExerciseNotes(exercise, userProfile),
      progression: this.generateExerciseProgression(exercise, userProfile)
    }));
  }

  private calculateOptimalSets(exercise: Exercise, userProfile: UserProfile): number {
    if (userProfile.experienceLevel === 'beginner') return 2;
    if (exercise.compound) return 3;
    return 3;
  }

  private calculateOptimalReps(exercise: Exercise, userProfile: UserProfile): string {
    if (userProfile.goals.includes('strength')) return '3-5';
    if (userProfile.goals.includes('hypertrophy')) return '8-12';
    return '6-10';
  }

  private calculateStartingWeight(exercise: Exercise, userProfile: UserProfile): string {
    return 'Peso que permita completar todas las repeticiones con RPE objetivo';
  }

  private calculateRestTime(exercise: Exercise, userProfile: UserProfile): number {
    if (exercise.compound && userProfile.goals.includes('strength')) return 180; // 3 minutes
    if (exercise.compound) return 120; // 2 minutes
    return 90; // 1.5 minutes
  }

  private calculateTargetRPE(exercise: Exercise, userProfile: UserProfile): string {
    if (userProfile.experienceLevel === 'beginner') return '6-7';
    if (userProfile.goals.includes('strength')) return '8-9';
    return '7-8';
  }

  private generateExerciseNotes(exercise: Exercise, userProfile: UserProfile): string[] {
    const notes = [...exercise.formCues];
    
    if (userProfile.experienceLevel === 'beginner') {
      notes.push('Enfócate en la técnica correcta antes que en el peso');
    }
    
    return notes.slice(0, 3); // Limit to 3 notes
  }

  private generateExerciseProgression(exercise: Exercise, userProfile: UserProfile): ExerciseProgression {
    return {
      currentLevel: 1,
      nextLevel: {
        parameter: 'weight',
        change: '+2.5kg',
        condition: 'Completa todas las series con RPE<8'
      },
      timeframe: '2-3 semanas',
      markers: ['Técnica consistente', 'Sin dolor o molestias']
    };
  }

  private calculateWorkoutDuration(exercises: RecommendedExercise[]): number {
    let duration = 10; // Warm-up
    
    exercises.forEach(ex => {
      const exerciseTime = ex.sets * (30 + ex.rest); // 30 seconds per set + rest
      duration += exerciseTime / 60; // Convert to minutes
    });
    
    duration += 10; // Cool-down
    
    return Math.round(duration);
  }

  private calculateWorkoutDifficulty(exercises: RecommendedExercise[], userProfile: UserProfile): number {
    const avgExerciseDifficulty = exercises.reduce((sum, ex) => sum + ex.exercise.difficulty, 0) / exercises.length;
    
    // Adjust for user experience
    let adjustedDifficulty = avgExerciseDifficulty;
    if (userProfile.experienceLevel === 'beginner') adjustedDifficulty *= 0.8;
    if (userProfile.experienceLevel === 'advanced') adjustedDifficulty *= 1.2;
    
    return Math.round(Math.max(1, Math.min(10, adjustedDifficulty)));
  }

  private generateWorkoutReasoning(userProfile: UserProfile, exercises: RecommendedExercise[]): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`Entrenamiento diseñado para tu nivel: ${userProfile.experienceLevel}`);
    reasoning.push(`Enfocado en tus objetivos: ${userProfile.goals.join(', ')}`);
    reasoning.push(`Duración optimizada según tu disponibilidad`);
    
    if (exercises.some(ex => ex.exercise.compound)) {
      reasoning.push('Incluye ejercicios compuestos para máxima eficiencia');
    }
    
    return reasoning;
  }

  private async generateWorkoutAlternatives(exercises: RecommendedExercise[], userProfile: UserProfile): Promise<WorkoutAlternative[]> {
    return [
      {
        reason: 'Si tienes menos tiempo disponible',
        modifications: ['Reducir descansos a 60 segundos', 'Eliminar último ejercicio accesorio']
      },
      {
        reason: 'Si no tienes acceso a todo el equipamiento',
        modifications: ['Usar ejercicios con peso corporal', 'Sustituir con ejercicios de equipamiento disponible']
      }
    ];
  }

  private generateWorkoutAdaptations(userProfile: UserProfile): WorkoutAdaptation[] {
    return [
      {
        trigger: 'Fatiga excesiva (RPE >9)',
        modification: 'Reducir peso en 10-20%',
        explanation: 'Priorizar técnica y volumen sobre intensidad'
      },
      {
        trigger: 'Dolor o molestia',
        modification: 'Suspender ejercicio y sustituir',
        explanation: 'La seguridad es prioritaria sobre el progreso'
      }
    ];
  }

  private generateWorkoutName(goals: string[], exercises: RecommendedExercise[]): string {
    if (goals.includes('strength') && exercises.some(ex => ex.exercise.compound)) {
      return 'Entrenamiento de Fuerza - Movimientos Compuestos';
    }
    if (goals.includes('hypertrophy')) {
      return 'Entrenamiento de Hipertrofia - Volumen Optimizado';
    }
    return 'Entrenamiento Personalizado';
  }

  private generateWorkoutDescription(userProfile: UserProfile, exercises: RecommendedExercise[]): string {
    const compoundCount = exercises.filter(ex => ex.exercise.compound).length;
    const isolationCount = exercises.length - compoundCount;
    
    return `Entrenamiento adaptado para ${userProfile.experienceLevel} con ${compoundCount} ejercicios compuestos y ${isolationCount} de aislamiento. Enfoque en ${userProfile.goals.join(' y ')}.`;
  }

  private identifyWorkoutFocus(exercises: RecommendedExercise[]): string[] {
    const muscleGroups = new Set<string>();
    exercises.forEach(ex => {
      ex.exercise.muscleGroups.forEach(muscle => muscleGroups.add(muscle));
    });
    
    return Array.from(muscleGroups);
  }
}

export default RecommendationEngine;