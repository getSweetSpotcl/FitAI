import { auth } from '@clerk/nextjs/server';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.getfitia.com';
const API_VERSION = '/api/v1';

export const API_ENDPOINTS = {
  // Users
  USER_PROFILE: '/users/profile',
  UPDATE_PROFILE: '/users/profile',
  
  // Analytics
  USER_STATS: '/analytics/user-stats',
  ADMIN_STATS: '/analytics/admin-stats',
  
  // Workouts
  WORKOUTS: '/workouts',
  ROUTINES: '/routines',
  
  // AI
  GENERATE_ROUTINE: '/ai/generate-routine',
  AI_CHAT: '/ai/chat',
  
  // Premium AI
  ANALYZE_PROGRESS: '/premium-ai/analyze-progress',
  
  // Social
  SOCIAL_FEED: '/social/feed',
  SHARE_WORKOUT: '/social/share-workout',
  
  // Health
  SYNC_HEALTH: '/health/sync',
} as const;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  token?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    token
  } = options;

  const url = `${API_BASE_URL}${API_VERSION}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // Add authorization header if token is provided
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses
    if (!response.headers.get('content-type')?.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }
      return response.text() as unknown as T;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.code
      );
    }

    return data;
  } catch (error) {
    // Network or parsing errors
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      'Network error or invalid response',
      0,
      'NETWORK_ERROR'
    );
  }
}

// Server-side API request with Clerk auth
export async function serverApiRequest<T>(
  endpoint: string,
  options: Omit<ApiRequestOptions, 'token'> = {}
): Promise<T> {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
  }

  return apiRequest<T>(endpoint, { ...options, token });
}

// Client-side API request (for use in components)
export async function clientApiRequest<T>(
  endpoint: string,
  options: Omit<ApiRequestOptions, 'token'> = {}
): Promise<T> {
  // This will be handled by the client-side hook
  return apiRequest<T>(endpoint, options);
}