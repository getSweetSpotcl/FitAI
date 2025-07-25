import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  createdAt: string;
  preferences: {
    fitnessGoals: string[];
    experienceLevel: string;
    availableTime?: number;
    equipment?: string[];
  };
  subscription: {
    plan: 'free' | 'premium' | 'pro';
    status: 'active' | 'cancelled' | 'expired';
    expiresAt?: string;
  };
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  preferences?: {
    fitnessGoals?: string[];
    experienceLevel?: string;
    availableTime?: number;
    equipment?: string[];
  };
}

class UserService {
  async getProfile(): Promise<UserProfile> {
    return apiService.get<UserProfile>(API_ENDPOINTS.USER_PROFILE);
  }

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    return apiService.put<UserProfile>(API_ENDPOINTS.UPDATE_PROFILE, data);
  }
}

export default new UserService();