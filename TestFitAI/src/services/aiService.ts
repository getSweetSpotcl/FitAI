import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

export interface GenerateRoutineParams {
  goals: string[];
  experienceLevel: string;
  availableTime: number;
  equipment: string[];
  muscleGroups: string[];
}

export interface GeneratedRoutine {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  exercises: Array<{
    id: string;
    name: string;
    sets: number;
    reps: string;
    restTime: number;
    notes?: string;
  }>;
  aiNotes: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatContext {
  userGoals?: string[];
  experienceLevel?: string;
  recentWorkouts?: string[];
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  exercises?: Array<{
    name: string;
    description: string;
  }>;
}

class AIService {
  async generateRoutine(params: GenerateRoutineParams): Promise<GeneratedRoutine> {
    return apiService.post<GeneratedRoutine>(API_ENDPOINTS.GENERATE_ROUTINE, params);
  }

  async chat(message: string, context?: ChatContext): Promise<ChatResponse> {
    return apiService.post<ChatResponse>(API_ENDPOINTS.AI_CHAT, {
      message,
      context,
    });
  }
}

export default new AIService();