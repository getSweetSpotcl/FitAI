import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

class AuthService {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(API_ENDPOINTS.LOGIN, data);
    if (response.token) {
      apiService.setAuthToken(response.token);
    }
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(API_ENDPOINTS.REGISTER, data);
    if (response.token) {
      apiService.setAuthToken(response.token);
    }
    return response;
  }

  async logout(): Promise<void> {
    try {
      await apiService.post(API_ENDPOINTS.LOGOUT);
    } finally {
      apiService.setAuthToken(null);
    }
  }

  setToken(token: string) {
    apiService.setAuthToken(token);
  }

  clearToken() {
    apiService.setAuthToken(null);
  }
}

export default new AuthService();