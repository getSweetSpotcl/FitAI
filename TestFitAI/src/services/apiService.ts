import { API_CONFIG } from '../config/api';

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

class ApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.VERSION}`;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers: customHeaders = {},
      token
    } = options;

    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Add authorization header if token is provided
    const authToken = token || this.authToken;
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(
          'Request timeout',
          0,
          'TIMEOUT'
        );
      }

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

  // Convenience methods
  async get<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async delete<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }
}

export default new ApiService();