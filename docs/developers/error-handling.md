# Manejo de Errores - FitAI API

Esta guía proporciona best practices para el manejo robusto de errores al integrar con la API de FitAI en aplicaciones React Native.

## 🎯 Tipos de Errores

### 1. Errores de API (HTTP)

```typescript
export interface APIErrorResponse {
  success: false;
  error: string;
  message: string;
  path?: string;
  details?: Record<string, any>;
}

export interface APISuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### 2. Códigos de Error HTTP Comunes

| Código | Tipo | Descripción |
|--------|------|-------------|
| 400 | Bad Request | Datos de entrada inválidos |
| 401 | Unauthorized | Token de autenticación faltante o inválido |
| 403 | Forbidden | Sin permisos para la acción |
| 404 | Not Found | Recurso no encontrado |
| 429 | Too Many Requests | Límite de rate limiting excedido |
| 500 | Internal Server Error | Error del servidor |
| 503 | Service Unavailable | Servicio temporalmente no disponible |

## 🛠️ Sistema de Manejo de Errores

### 1. Interceptor de Errores Axios

```typescript
// src/services/api/errorInterceptor.ts
import { AxiosError, AxiosResponse } from 'axios';
import { Alert } from 'react-native';
import { APIErrorResponse } from '../types/api';

export class APIErrorHandler {
  static handleError(error: AxiosError<APIErrorResponse>): APIError {
    if (error.response) {
      // Error de respuesta del servidor
      return this.handleHTTPError(error.response);
    } else if (error.request) {
      // Error de red/conexión
      return this.handleNetworkError(error);
    } else {
      // Error de configuración
      return this.handleConfigError(error);
    }
  }

  private static handleHTTPError(response: AxiosResponse<APIErrorResponse>): APIError {
    const { status, data } = response;
    
    switch (status) {
      case 400:
        return {
          type: 'validation',
          code: 'BAD_REQUEST',
          message: data.message || 'Datos de entrada inválidos',
          userMessage: 'Por favor revisa los datos ingresados',
          recoverable: true,
        };

      case 401:
        return {
          type: 'authentication',
          code: 'UNAUTHORIZED',
          message: data.message || 'No autorizado',
          userMessage: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente',
          recoverable: true,
          action: 'logout',
        };

      case 403:
        return {
          type: 'authorization',
          code: 'FORBIDDEN',
          message: data.message || 'Sin permisos',
          userMessage: 'No tienes permisos para realizar esta acción',
          recoverable: false,
        };

      case 404:
        return {
          type: 'not_found',
          code: 'NOT_FOUND',
          message: data.message || 'Recurso no encontrado',
          userMessage: 'El contenido solicitado no está disponible',
          recoverable: false,
        };

      case 429:
        return {
          type: 'rate_limit',
          code: 'TOO_MANY_REQUESTS',
          message: data.message || 'Límite de requests excedido',
          userMessage: 'Has realizado demasiadas solicitudes. Intenta más tarde',
          recoverable: true,
          retryAfter: this.getRetryAfter(response.headers),
        };

      case 500:
        return {
          type: 'server',
          code: 'INTERNAL_SERVER_ERROR',
          message: data.message || 'Error interno del servidor',
          userMessage: 'Algo salió mal en nuestros servidores. Intenta más tarde',
          recoverable: true,
        };

      default:
        return {
          type: 'unknown',
          code: 'UNKNOWN_HTTP_ERROR',
          message: `HTTP ${status}: ${data.message}`,
          userMessage: 'Ha ocurrido un error inesperado',
          recoverable: true,
        };
    }
  }

  private static handleNetworkError(error: AxiosError): APIError {
    return {
      type: 'network',
      code: 'NETWORK_ERROR',
      message: error.message || 'Error de conexión',
      userMessage: 'Problemas de conexión. Verifica tu internet',
      recoverable: true,
    };
  }

  private static handleConfigError(error: AxiosError): APIError {
    return {
      type: 'config',
      code: 'CONFIG_ERROR',
      message: error.message || 'Error de configuración',
      userMessage: 'Error en la aplicación. Intenta reiniciar',
      recoverable: true,
    };
  }

  private static getRetryAfter(headers: any): number | undefined {
    const retryAfter = headers['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter, 10) * 1000; // Convertir a ms
    }
    return undefined;
  }
}

export interface APIError {
  type: 'validation' | 'authentication' | 'authorization' | 'not_found' | 
        'rate_limit' | 'server' | 'network' | 'config' | 'unknown';
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
  action?: 'logout' | 'retry' | 'refresh';
  retryAfter?: number;
  details?: Record<string, any>;
}
```

### 2. Hook para Manejo Global de Errores

```typescript
// src/hooks/useErrorHandler.ts
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './useAuth';
import { APIError, APIErrorHandler } from '../services/api/errorInterceptor';
import { useRouter } from 'expo-router';

export const useErrorHandler = () => {
  const { logout } = useAuth();
  const router = useRouter();

  const handleError = useCallback(async (error: any): Promise<void> => {
    let apiError: APIError;

    if (error.isAxiosError) {
      apiError = APIErrorHandler.handleError(error);
    } else if (error.type && error.code) {
      // Ya es un APIError
      apiError = error;
    } else {
      // Error genérico
      apiError = {
        type: 'unknown',
        code: 'UNKNOWN_ERROR',
        message: error.message || 'Error desconocido',
        userMessage: 'Ha ocurrido un error inesperado',
        recoverable: true,
      };
    }

    // Ejecutar acciones automáticas
    await executeErrorAction(apiError);

    // Mostrar mensaje al usuario si es necesario
    if (shouldShowUserMessage(apiError)) {
      showErrorToUser(apiError);
    }

    // Log para debugging
    logError(apiError, error);
  }, [logout, router]);

  const executeErrorAction = async (apiError: APIError) => {
    switch (apiError.action) {
      case 'logout':
        await logout();
        router.replace('/login');
        break;
      
      case 'retry':
        // Implementar lógica de retry automático
        break;
      
      case 'refresh':
        // Implementar refresh de datos
        break;
    }
  };

  const shouldShowUserMessage = (apiError: APIError): boolean => {
    // No mostrar errores de autenticación si ya se está manejando logout
    if (apiError.type === 'authentication' && apiError.action === 'logout') {
      return false;
    }
    
    return true;
  };

  const showErrorToUser = (apiError: APIError) => {
    const title = getErrorTitle(apiError.type);
    
    Alert.alert(
      title,
      apiError.userMessage,
      [
        {
          text: 'OK',
          style: 'default',
        },
        ...(apiError.recoverable ? [{
          text: 'Reintentar',
          style: 'default',
          onPress: () => {
            // Implementar lógica de retry
          },
        }] : []),
      ]
    );
  };

  const getErrorTitle = (errorType: APIError['type']): string => {
    switch (errorType) {
      case 'validation':
        return 'Datos Inválidos';
      case 'authentication':
        return 'Sesión Expirada';
      case 'authorization':
        return 'Sin Permisos';
      case 'not_found':
        return 'No Encontrado';
      case 'rate_limit':
        return 'Límite Excedido';
      case 'server':
        return 'Error del Servidor';
      case 'network':
        return 'Error de Conexión';
      default:
        return 'Error';
    }
  };

  const logError = (apiError: APIError, originalError: any) => {
    console.error('API Error:', {
      type: apiError.type,
      code: apiError.code,
      message: apiError.message,
      userMessage: apiError.userMessage,
      originalError,
      timestamp: new Date().toISOString(),
    });
  };

  return { handleError };
};
```

### 3. Wrapper para Requests con Manejo de Errores

```typescript
// src/services/api/safeRequest.ts
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiClient } from './client';
import { APIError, APIErrorHandler } from './errorInterceptor';

export interface SafeRequestResult<T> {
  data?: T;
  error?: APIError;
  success: boolean;
}

export class SafeRequest {
  static async get<T>(
    url: string, 
    config?: AxiosRequestConfig
  ): Promise<SafeRequestResult<T>> {
    try {
      const response: AxiosResponse<T> = await apiClient.get(url, config);
      return {
        data: response.data,
        success: true,
      };
    } catch (error) {
      return {
        error: APIErrorHandler.handleError(error as any),
        success: false,
      };
    }
  }

  static async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<SafeRequestResult<T>> {
    try {
      const response: AxiosResponse<T> = await apiClient.post(url, data, config);
      return {
        data: response.data,
        success: true,
      };
    } catch (error) {
      return {
        error: APIErrorHandler.handleError(error as any),
        success: false,
      };
    }
  }

  static async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<SafeRequestResult<T>> {
    try {
      const response: AxiosResponse<T> = await apiClient.put(url, data, config);
      return {
        data: response.data,
        success: true,
      };
    } catch (error) {
      return {
        error: APIErrorHandler.handleError(error as any),
        success: false,
      };
    }
  }

  static async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<SafeRequestResult<T>> {
    try {
      const response: AxiosResponse<T> = await apiClient.delete(url, config);
      return {
        data: response.data,
        success: true,
      };
    } catch (error) {
      return {
        error: APIErrorHandler.handleError(error as any),
        success: false,
      };
    }
  }
}
```

## 🔄 Manejo de Errores con React Query

### 1. Configuración Global

```typescript
// src/providers/QueryProvider.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useErrorHandler } from '../hooks/useErrorHandler';

const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { handleError } = useErrorHandler();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error: any) => {
          // No reintentar errores de autenticación o autorización
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            return false;
          }
          
          // Reintentar hasta 3 veces para otros errores
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        onError: (error) => {
          handleError(error);
        },
      },
      mutations: {
        retry: false,
        onError: (error) => {
          handleError(error);
        },
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider;
```

### 2. Hook Personalizado con Manejo de Errores

```typescript
// src/hooks/useApiQuery.ts
import { useQuery, UseMutationOptions, useMutation } from 'react-query';
import { SafeRequest, SafeRequestResult } from '../services/api/safeRequest';
import { APIError } from '../services/api/errorInterceptor';

export interface UseApiQueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  onError?: (error: APIError) => void;
  onSuccess?: (data: T) => void;
}

export const useApiQuery = <T>(
  queryKey: string | string[],
  url: string,
  options?: UseApiQueryOptions<T>
) => {
  return useQuery(
    queryKey,
    async (): Promise<T> => {
      const result = await SafeRequest.get<T>(url);
      
      if (!result.success && result.error) {
        throw result.error;
      }
      
      return result.data!;
    },
    {
      enabled: options?.enabled,
      staleTime: options?.staleTime,
      cacheTime: options?.cacheTime,
      onError: options?.onError,
      onSuccess: options?.onSuccess,
    }
  );
};

export const useApiMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<SafeRequestResult<TData>>,
  options?: UseMutationOptions<TData, APIError, TVariables>
) => {
  return useMutation(
    async (variables: TVariables): Promise<TData> => {
      const result = await mutationFn(variables);
      
      if (!result.success && result.error) {
        throw result.error;
      }
      
      return result.data!;
    },
    options
  );
};
```

## 🎭 Componentes de UI para Errores

### 1. Componente de Error Genérico

```typescript
// src/components/ErrorDisplay.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { APIError } from '../services/api/errorInterceptor';

interface ErrorDisplayProps {
  error: APIError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return '📡';
      case 'authentication':
        return '🔐';
      case 'authorization':
        return '🚫';
      case 'rate_limit':
        return '⏱️';
      case 'server':
        return '🔧';
      default:
        return '⚠️';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{getErrorIcon()}</Text>
      <Text style={styles.title}>
        {error.type === 'network' ? 'Sin Conexión' : 'Error'}
      </Text>
      <Text style={styles.message}>{error.userMessage}</Text>
      
      <View style={styles.actions}>
        {error.recoverable && onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        )}
        
        {onDismiss && (
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>Cerrar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    margin: 16,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#212529',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6c757d',
    marginBottom: 20,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dismissText: {
    color: 'white',
    fontWeight: '600',
  },
});
```

### 2. Boundary de Error para React

```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            reset={this.handleReset} 
          />
        );
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>¡Ups! Algo salió mal</Text>
          <Text style={styles.message}>
            La aplicación encontró un error inesperado. 
            Intenta reiniciar la pantalla.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

## 🔄 Estrategias de Retry

### 1. Retry Automático con Backoff

```typescript
// src/utils/retryStrategy.ts
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

export class RetryStrategy {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    const {
      maxAttempts,
      baseDelay,
      maxDelay,
      backoffFactor,
      retryCondition = this.defaultRetryCondition,
    } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts || !retryCondition(error)) {
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );

        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  private static defaultRetryCondition(error: any): boolean {
    // Reintentar solo errores de red o del servidor
    if (error.isAxiosError) {
      const status = error.response?.status;
      return !status || status >= 500 || status === 429;
    }
    
    return false;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Uso del retry strategy
export const useRetryableRequest = () => {
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    return RetryStrategy.executeWithRetry(operation, {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
    });
  }, []);

  return { executeWithRetry };
};
```

### 2. Cache de Datos para Fallback

```typescript
// src/services/cache/errorFallback.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ErrorFallbackCache {
  private static instance: ErrorFallbackCache;

  static getInstance(): ErrorFallbackCache {
    if (!ErrorFallbackCache.instance) {
      ErrorFallbackCache.instance = new ErrorFallbackCache();
    }
    return ErrorFallbackCache.instance;
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`fallback_${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        
        // Verificar si los datos no están muy viejos (ej: 1 hora)
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 hora
        
        if (now - parsed.timestamp < maxAge) {
          return parsed.data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached fallback data:', error);
      return null;
    }
  }

  async setCachedData<T>(key: string, data: T): Promise<void> {
    try {
      const cached = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`fallback_${key}`, JSON.stringify(cached));
    } catch (error) {
      console.error('Error setting cached fallback data:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const fallbackKeys = keys.filter(key => key.startsWith('fallback_'));
      await AsyncStorage.multiRemove(fallbackKeys);
    } catch (error) {
      console.error('Error clearing fallback cache:', error);
    }
  }
}
```

## 📊 Logging y Monitoreo

### 1. Logger de Errores

```typescript
// src/services/logging/errorLogger.ts
export interface ErrorLogEntry {
  timestamp: string;
  type: string;
  code: string;
  message: string;
  stack?: string;
  userId?: string;
  screen?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100;

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(error: APIError | Error, context?: Record<string, any>): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'type' in error ? error.type : 'javascript',
      code: 'code' in error ? error.code : 'JS_ERROR',
      message: error.message,
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    };

    this.logs.push(entry);

    // Mantener solo los últimos N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // En producción, enviar a servicio de monitoreo
    if (!__DEV__) {
      this.sendToMonitoring(entry);
    }
  }

  private async sendToMonitoring(entry: ErrorLogEntry): Promise<void> {
    try {
      // Implementar envío a servicio de monitoreo
      // (ej: Sentry, Bugsnag, custom endpoint)
    } catch (error) {
      console.error('Failed to send error to monitoring:', error);
    }
  }

  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}
```

## 🧪 Testing

### 1. Tests para Manejo de Errores

```typescript
// src/__tests__/errorHandling.test.ts
import { APIErrorHandler } from '../services/api/errorInterceptor';
import { AxiosError } from 'axios';

describe('APIErrorHandler', () => {
  it('should handle 401 errors correctly', () => {
    const mockError: AxiosError = {
      response: {
        status: 401,
        data: { success: false, error: 'UNAUTHORIZED', message: 'Token expired' },
      },
    } as any;

    const result = APIErrorHandler.handleError(mockError);

    expect(result.type).toBe('authentication');
    expect(result.code).toBe('UNAUTHORIZED');
    expect(result.action).toBe('logout');
    expect(result.recoverable).toBe(true);
  });

  it('should handle network errors', () => {
    const mockError: AxiosError = {
      request: {},
      message: 'Network Error',
    } as any;

    const result = APIErrorHandler.handleError(mockError);

    expect(result.type).toBe('network');
    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.recoverable).toBe(true);
  });
});
```

## 🚀 Mejores Prácticas

### 1. Principios Generales

- **Fail Fast**: Detecta y maneja errores lo antes posible
- **User-Friendly**: Muestra mensajes comprensibles para el usuario
- **Logging**: Registra errores para debugging y monitoreo
- **Recovery**: Proporciona opciones de recuperación cuando sea posible
- **Offline Support**: Mantén funcionalidad básica sin conexión

### 2. Checklist de Implementación

- [ ] Interceptor de errores configurado en cliente HTTP
- [ ] Manejo específico para cada tipo de error HTTP
- [ ] Componentes de UI para mostrar errores al usuario
- [ ] Estrategia de retry para errores recuperables
- [ ] Cache de datos para fallback offline
- [ ] Logging de errores para monitoreo
- [ ] Tests para casos de error críticos

## 🔗 Recursos Relacionados

- [**Cliente HTTP**](./http-client.md) - Configuración del cliente HTTP
- [**Autenticación**](./authentication-flow.md) - Manejo de errores de auth
- [**Offline Support**](./offline-support.md) - Funcionalidad sin conexión

¿Necesitas ayuda implementando el manejo de errores? Consulta los ejemplos de código o contacta soporte técnico.