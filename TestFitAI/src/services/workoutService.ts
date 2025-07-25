import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

export interface Exercise {
  exerciseId: string;
  name: string;
  sets: Array<{
    reps?: number;
    weight?: number;
    duration?: number;
    restTime?: number;
  }>;
  notes?: string;
}

export interface Workout {
  id: string;
  routineId: string;
  userId: string;
  startedAt: string;
  completedAt?: string;
  exercises: Exercise[];
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface CreateWorkoutData {
  routineId: string;
  startedAt: string;
  exercises: Exercise[];
  notes?: string;
}

export interface UpdateWorkoutData {
  completedAt?: string;
  exercises?: Exercise[];
  notes?: string;
  status?: 'in_progress' | 'completed' | 'cancelled';
}

class WorkoutService {
  async getWorkouts(limit?: number, offset?: number): Promise<Workout[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const endpoint = params.toString() 
      ? `${API_ENDPOINTS.WORKOUTS}?${params.toString()}`
      : API_ENDPOINTS.WORKOUTS;
      
    return apiService.get<Workout[]>(endpoint);
  }

  async getWorkout(id: string): Promise<Workout> {
    return apiService.get<Workout>(API_ENDPOINTS.WORKOUT_DETAIL(id));
  }

  async createWorkout(data: CreateWorkoutData): Promise<Workout> {
    return apiService.post<Workout>(API_ENDPOINTS.WORKOUTS, data);
  }

  async updateWorkout(id: string, data: UpdateWorkoutData): Promise<Workout> {
    return apiService.patch<Workout>(API_ENDPOINTS.WORKOUT_DETAIL(id), data);
  }

  async deleteWorkout(id: string): Promise<void> {
    return apiService.delete<void>(API_ENDPOINTS.WORKOUT_DETAIL(id));
  }
}

export default new WorkoutService();