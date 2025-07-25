import { serverApiRequest } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api';

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string[];
  instructions: string[];
  imageUrl?: string;
}

export interface WorkoutSet {
  reps?: number;
  weight?: number;
  duration?: number; // for time-based exercises
  restTime?: number;
}

export interface WorkoutExercise {
  exerciseId: string;
  exercise: Exercise;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Workout {
  id: string;
  userId: string;
  routineId?: string;
  name: string;
  startedAt: string;
  completedAt?: string;
  duration?: number; // in minutes
  exercises: WorkoutExercise[];
  status: 'planned' | 'in_progress' | 'completed' | 'skipped';
  notes?: string;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // estimated minutes
  muscleGroups: string[];
  equipment: string[];
  exercises: Array<{
    exerciseId: string;
    exercise: Exercise;
    sets: number;
    reps?: string; // can be "8-12" or "10"
    weight?: string; // can be "bodyweight" or weight description
    restTime?: number;
  }>;
  isAiGenerated: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkoutData {
  routineId?: string;
  name?: string;
  exercises: Array<{
    exerciseId: string;
    sets: WorkoutSet[];
  }>;
  notes?: string;
}

export interface WorkoutFilters {
  status?: 'planned' | 'in_progress' | 'completed' | 'skipped';
  dateFrom?: string;
  dateTo?: string;
  routineId?: string;
  limit?: number;
  offset?: number;
}

export class WorkoutService {
  static async getWorkouts(filters?: WorkoutFilters): Promise<{
    workouts: Workout[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.routineId) params.append('routineId', filters.routineId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const endpoint = filters ? 
      `${API_ENDPOINTS.WORKOUTS}?${params.toString()}` : 
      API_ENDPOINTS.WORKOUTS;
      
    return serverApiRequest(endpoint);
  }

  static async getWorkout(id: string): Promise<Workout> {
    return serverApiRequest<Workout>(`${API_ENDPOINTS.WORKOUTS}/${id}`);
  }

  static async createWorkout(data: CreateWorkoutData): Promise<Workout> {
    return serverApiRequest<Workout>(API_ENDPOINTS.WORKOUTS, {
      method: 'POST',
      body: data,
    });
  }

  static async updateWorkout(id: string, data: Partial<CreateWorkoutData>): Promise<Workout> {
    return serverApiRequest<Workout>(`${API_ENDPOINTS.WORKOUTS}/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  static async completeWorkout(id: string): Promise<Workout> {
    return serverApiRequest<Workout>(`${API_ENDPOINTS.WORKOUTS}/${id}/complete`, {
      method: 'POST',
    });
  }

  static async getRoutines(): Promise<Routine[]> {
    return serverApiRequest<Routine[]>(API_ENDPOINTS.ROUTINES);
  }

  static async getRoutine(id: string): Promise<Routine> {
    return serverApiRequest<Routine>(`${API_ENDPOINTS.ROUTINES}/${id}`);
  }

  static async generateAiRoutine(preferences: {
    goals: string[];
    experienceLevel: string;
    availableTime: number;
    equipment: string[];
    muscleGroups: string[];
  }): Promise<Routine> {
    return serverApiRequest<Routine>(API_ENDPOINTS.GENERATE_ROUTINE, {
      method: 'POST',
      body: preferences,
    });
  }

  // Utility methods
  static formatWorkoutDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  static getWorkoutIntensity(workout: Workout): 'light' | 'moderate' | 'intense' {
    if (!workout.exercises.length) return 'light';
    
    const totalSets = workout.exercises.reduce(
      (sum, exercise) => sum + exercise.sets.length, 
      0
    );
    
    if (totalSets >= 20) return 'intense';
    if (totalSets >= 12) return 'moderate';
    return 'light';
  }

  static calculateWorkoutVolume(workout: Workout): number {
    return workout.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((setTotal, set) => {
        return setTotal + ((set.weight || 0) * (set.reps || 0));
      }, 0);
    }, 0);
  }
}