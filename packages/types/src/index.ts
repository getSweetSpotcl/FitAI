// Core User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  goals: FitnessGoal[];
  experienceLevel: ExperienceLevel;
  availableDays: number;
  sessionDuration: number; // minutes
  injuries?: string[];
  height?: number; // cm
  weight?: number; // kg
  age?: number;
  availableEquipment: Equipment[];
}

// Fitness Types
export type FitnessGoal = 
  | "muscle_gain" 
  | "weight_loss" 
  | "strength" 
  | "endurance" 
  | "general_fitness";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type Equipment = 
  | "barbell" 
  | "dumbbell" 
  | "kettlebell" 
  | "resistance_bands" 
  | "pullup_bar" 
  | "bodyweight";

// Exercise Types
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscleGroups: MuscleGroup[];
  equipment: Equipment;
  instructions: string[];
  difficulty: ExperienceLevel;
  videoUrl?: string;
}

export type ExerciseCategory = "compound" | "isolation" | "cardio";

export type MuscleGroup = 
  | "chest" 
  | "back" 
  | "shoulders" 
  | "biceps" 
  | "triceps" 
  | "legs" 
  | "glutes" 
  | "core" 
  | "cardio";

// Workout Types
export interface WorkoutSession {
  id: string;
  userId: string;
  routineId?: string;
  name: string;
  startedAt: Date;
  completedAt?: Date;
  exercises: WorkoutExercise[];
  notes?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: ExerciseSet[];
  restTime?: number; // seconds
  notes?: string;
  supersetWith?: string; // Exercise ID
}

export interface ExerciseSet {
  id: string;
  reps: number;
  weight: number; // kg
  restTime?: number; // seconds
  rpe?: number; // Rate of Perceived Exertion (1-10)
  completed: boolean;
  completedAt?: Date;
}

// Routine Types
export interface WorkoutRoutine {
  id: string;
  userId: string;
  name: string;
  description?: string;
  weeklyPlan: RoutineDay[];
  isActive: boolean;
  createdAt: Date;
  generatedByAI: boolean;
}

export interface RoutineDay {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  name: string; // "Push Day", "Pull Day", etc.
  exercises: RoutineExercise[];
}

export interface RoutineExercise {
  exerciseId: string;
  targetSets: number;
  targetReps: number | [number, number]; // Single number or range [min, max]
  targetWeight?: number;
  restTime: number; // seconds
  notes?: string;
}

// Progress Types
export interface ProgressMetrics {
  userId: string;
  date: Date;
  totalVolume: number; // kg
  totalSets: number;
  totalReps: number;
  averageIntensity: number; // average RPE
  workoutDuration: number; // minutes
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  type: PRType;
  value: number;
  reps?: number;
  achievedAt: Date;
}

export type PRType = "1rm" | "volume" | "endurance" | "weight";

// AI Types
export interface AIInsight {
  id: string;
  userId: string;
  type: InsightType;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  actionable: boolean;
  createdAt: Date;
  dismissed?: boolean;
}

export type InsightType = 
  | "plateau_detection" 
  | "overtraining_warning" 
  | "progression_suggestion" 
  | "form_improvement" 
  | "recovery_advice";

// Subscription Types
export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
}

export type SubscriptionPlan = "free" | "premium" | "pro";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "incomplete";

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Authentication Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}