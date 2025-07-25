import { serverApiRequest } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api';

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

export class UserService {
  static async getProfile(): Promise<UserProfile> {
    return serverApiRequest<UserProfile>(API_ENDPOINTS.USER_PROFILE);
  }

  static async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    return serverApiRequest<UserProfile>(API_ENDPOINTS.UPDATE_PROFILE, {
      method: 'PUT',
      body: data,
    });
  }
}

// Client-side hooks for user data
export const userServiceHooks = {
  useProfile: () => {
    // This would be implemented using the useApi hook
    // For now, we'll create direct component usage
  },
};