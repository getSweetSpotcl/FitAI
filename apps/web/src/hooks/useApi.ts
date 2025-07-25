'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useCallback } from 'react';
import { apiRequest, ApiError } from '@/lib/api';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const { getToken } = useAuth();
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const request = useCallback(async (
    endpoint: string,
    requestOptions: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = await getToken();
      
      if (!token) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const data = await apiRequest<T>(endpoint, {
        ...requestOptions,
        token,
      });

      setState({ data, error: null, isLoading: false });
      options.onSuccess?.(data);
      
      return data;
    } catch (error) {
      const apiError = error instanceof ApiError 
        ? error 
        : new ApiError('Unknown error occurred', 0, 'UNKNOWN_ERROR');

      setState({ data: null, error: apiError, isLoading: false });
      options.onError?.(apiError);
      
      return null;
    }
  }, [getToken, options]);

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false });
  }, []);

  return {
    ...state,
    request,
    reset,
  };
}

// Specialized hooks for common patterns
export function useApiGet<T = any>(endpoint: string, options: UseApiOptions = {}) {
  const api = useApi<T>(options);

  const fetch = useCallback(() => {
    return api.request(endpoint, { method: 'GET' });
  }, [api, endpoint]);

  return {
    ...api,
    fetch,
  };
}

export function useApiPost<T = any>(endpoint: string, options: UseApiOptions = {}) {
  const api = useApi<T>(options);

  const post = useCallback((body: any) => {
    return api.request(endpoint, { method: 'POST', body });
  }, [api, endpoint]);

  return {
    ...api,
    post,
  };
}

export function useApiPut<T = any>(endpoint: string, options: UseApiOptions = {}) {
  const api = useApi<T>(options);

  const put = useCallback((body: any) => {
    return api.request(endpoint, { method: 'PUT', body });
  }, [api, endpoint]);

  return {
    ...api,
    put,
  };
}