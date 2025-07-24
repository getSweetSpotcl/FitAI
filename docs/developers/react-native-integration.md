# Guía de Integración React Native - FitAI API

Esta guía te ayudará a integrar la API de FitAI en tu aplicación React Native paso a paso.

## 📋 Requisitos Previos

### Dependencias Requeridas
```bash
npm install @clerk/clerk-expo axios react-query @react-native-async-storage/async-storage
```

### Dependencias Opcionales (Recomendadas)
```bash
# Para state management
npm install zustand

# Para UI components
npm install react-native-elements react-native-vector-icons

# Para charts y analytics
npm install react-native-chart-kit

# Para health data
npm install react-native-health expo-health
```

## 🔧 Configuración Inicial

### 1. Setup de Clerk Authentication

```typescript
// App.tsx
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export default function App() {
  return (
    <ClerkProvider 
      publishableKey="your_clerk_publishable_key"
      tokenCache={tokenCache}
    >
      <YourAppContent />
    </ClerkProvider>
  );
}
```

### 2. Cliente HTTP Base

```typescript
// src/services/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? 'https://fitai-api.sweetspot-627.workers.dev'
  : 'https://api.getfitia.com';

class APIClient {
  private client: AxiosInstance;
  private getToken?: () => Promise<string | null>;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setAuthProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private setupInterceptors() {
    // Request interceptor para agregar auth token
    this.client.interceptors.request.use(
      async (config) => {
        if (this.getToken) {
          const token = await this.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor para manejo de errores
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expirado, redirect a login
          await AsyncStorage.removeItem('user_session');
          // Trigger logout en tu app
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new APIClient();
```

### 3. Hook para Autenticación

```typescript
// src/hooks/useAPI.ts
import { useAuth } from '@clerk/clerk-expo';
import { useEffect } from 'react';
import { apiClient } from '../services/api/client';

export const useAPI = () => {
  const { getToken } = useAuth();

  useEffect(() => {
    apiClient.setAuthProvider(getToken);
  }, [getToken]);

  return apiClient;
};
```

## 🏗️ Servicios por Funcionalidad

### 1. Servicio de Usuarios

```typescript
// src/services/users.ts
import { apiClient } from './api/client';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'premium' | 'pro';
  profile?: {
    goals: string[];
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    availableDays: number;
    height?: number;
    weight?: number;
    age?: number;
  };
  stats: {
    workoutsCompleted: number;
    currentStreak: number;
    prsSet: number;
  };
}

export class UsersService {
  static async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<{
      success: boolean;
      data: UserProfile;
    }>('/api/v1/users/me');
    return response.data;
  }

  static async updateProfile(profileData: Partial<UserProfile>): Promise<void> {
    await apiClient.put('/api/v1/users/me', profileData);
  }

  static async getProgress(period = 'last_30_days') {
    return apiClient.get(`/api/v1/users/me/progress?period=${period}`);
  }

  static async updatePreferences(preferences: any) {
    return apiClient.put('/api/v1/users/me/preferences', preferences);
  }
}
```

### 2. Servicio de Entrenamientos

```typescript
// src/services/workouts.ts
import { apiClient } from './api/client';

export interface WorkoutSession {
  id: string;
  name: string;
  startedAt: string;
  completedAt?: string;
  durationMinutes?: number;
  totalVolumeKg?: number;
  averageRpe?: number;
  notes?: string;
  mood?: 'terrible' | 'bad' | 'okay' | 'good' | 'amazing';
}

export interface WorkoutSet {
  exerciseId: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  restTimeSeconds?: number;
  rpe?: number;
  notes?: string;
}

export class WorkoutsService {
  static async getWorkouts(limit = 20, offset = 0) {
    return apiClient.get(`/api/v1/workouts?limit=${limit}&offset=${offset}`);
  }

  static async createWorkout(workoutData: {
    name: string;
    routineId?: string;
  }): Promise<WorkoutSession> {
    const response = await apiClient.post<{
      success: boolean;
      data: WorkoutSession;
    }>('/api/v1/workouts', workoutData);
    return response.data;
  }

  static async getWorkout(workoutId: string) {
    return apiClient.get(`/api/v1/workouts/${workoutId}`);
  }

  static async addSet(workoutId: string, setData: WorkoutSet) {
    return apiClient.post(`/api/v1/workouts/${workoutId}/sets`, setData);
  }

  static async completeWorkout(workoutId: string, completionData: {
    duration?: number;
    totalVolume?: number;
    notes?: string;
    mood?: string;
  }) {
    return apiClient.post(`/api/v1/workouts/${workoutId}/complete`, completionData);
  }
}
```

### 3. Servicio de IA

```typescript
// src/services/ai.ts
import { apiClient } from './api/client';

export interface RoutinePreferences {
  goals: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  availableDays: number;
  availableEquipment: string[];
  timePerWorkout?: number;
}

export class AIService {
  static async generateRoutine(preferences: RoutinePreferences) {
    return apiClient.post('/api/v1/ai/generate-routine', { preferences });
  }

  static async getCoachingAdvice(workoutData: any) {
    return apiClient.post('/api/v1/ai/coaching-advice', workoutData);
  }

  static async getUsageStats() {
    return apiClient.get('/api/v1/ai/usage-stats');
  }

  static async getPlanInfo() {
    return apiClient.get('/api/v1/ai/plan-info');
  }
}
```

## 🎛️ Hooks Personalizados

### 1. Hook para Perfil de Usuario

```typescript
// src/hooks/useUserProfile.ts
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { UsersService, UserProfile } from '../services/users';

export const useUserProfile = () => {
  return useQuery<UserProfile>('userProfile', UsersService.getProfile, {
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation(UsersService.updateProfile, {
    onSuccess: () => {
      queryClient.invalidateQueries('userProfile');
    },
  });
};
```

### 2. Hook para Entrenamientos

```typescript
// src/hooks/useWorkouts.ts
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { WorkoutsService } from '../services/workouts';

export const useWorkouts = (limit = 20, offset = 0) => {
  return useQuery(
    ['workouts', limit, offset],
    () => WorkoutsService.getWorkouts(limit, offset),
    {
      keepPreviousData: true,
    }
  );
};

export const useCreateWorkout = () => {
  const queryClient = useQueryClient();
  
  return useMutation(WorkoutsService.createWorkout, {
    onSuccess: () => {
      queryClient.invalidateQueries('workouts');
    },
  });
};

export const useWorkout = (workoutId: string) => {
  return useQuery(
    ['workout', workoutId],
    () => WorkoutsService.getWorkout(workoutId),
    {
      enabled: !!workoutId,
    }
  );
};
```

## 💾 State Management con Zustand

```typescript
// src/store/workoutStore.ts
import { create } from 'zustand';
import { WorkoutSession, WorkoutSet } from '../services/workouts';

interface WorkoutStore {
  activeWorkout: WorkoutSession | null;
  workoutSets: WorkoutSet[];
  
  setActiveWorkout: (workout: WorkoutSession | null) => void;
  addSet: (set: WorkoutSet) => void;
  updateSet: (index: number, set: Partial<WorkoutSet>) => void;
  clearWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  activeWorkout: null,
  workoutSets: [],
  
  setActiveWorkout: (workout) => set({ activeWorkout: workout }),
  
  addSet: (newSet) => set((state) => ({
    workoutSets: [...state.workoutSets, newSet]
  })),
  
  updateSet: (index, setUpdate) => set((state) => ({
    workoutSets: state.workoutSets.map((set, i) => 
      i === index ? { ...set, ...setUpdate } : set
    )
  })),
  
  clearWorkout: () => set({ 
    activeWorkout: null, 
    workoutSets: [] 
  }),
}));
```

## 🎨 Componentes de Ejemplo

### 1. Componente de Login

```typescript
// src/components/LoginScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';

export const LoginScreen = () => {
  const { signIn, setActive, isLoaded } = useSignIn();

  const handleEmailSignIn = async (email: string, password: string) => {
    if (!isLoaded) return;

    try {
      const completeSignIn = await signIn.create({
        identifier: email,
        password,
      });

      if (completeSignIn.status === 'complete') {
        await setActive({ session: completeSignIn.createdSessionId });
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión en FitAI</Text>
      {/* Implementar formulario de login */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
});
```

### 2. Componente de Entrenamiento Activo

```typescript
// src/components/ActiveWorkout.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useWorkoutStore } from '../store/workoutStore';
import { useCreateWorkout } from '../hooks/useWorkouts';

export const ActiveWorkout = () => {
  const { activeWorkout, workoutSets, addSet } = useWorkoutStore();
  const createWorkout = useCreateWorkout();

  const handleAddSet = (exerciseId: string) => {
    const setNumber = workoutSets.filter(s => s.exerciseId === exerciseId).length + 1;
    
    addSet({
      exerciseId,
      setNumber,
      reps: 0,
      weightKg: 0,
    });
  };

  if (!activeWorkout) {
    return (
      <View>
        <Text>No hay entrenamiento activo</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>Entrenamiento: {activeWorkout.name}</Text>
      <Text>Sets completados: {workoutSets.length}</Text>
      
      <TouchableOpacity onPress={() => handleAddSet('exercise_id')}>
        <Text>Agregar Set</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## 🔍 Manejo de Errores

```typescript
// src/utils/errorHandler.ts
import { AxiosError } from 'axios';

export interface APIError {
  success: false;
  error: string;
  message: string;
  path?: string;
}

export const handleAPIError = (error: AxiosError<APIError>) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        return 'No autorizado. Por favor inicia sesión nuevamente.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 429:
        return 'Has excedido el límite de requests. Intenta más tarde.';
      case 500:
        return 'Error del servidor. Intenta más tarde.';
      default:
        return data?.message || 'Ha ocurrido un error inesperado.';
    }
  }
  
  if (error.request) {
    return 'Error de conexión. Verifica tu conexión a internet.';
  }
  
  return 'Error inesperado. Intenta nuevamente.';
};
```

## 📱 Offline Support

```typescript
// src/hooks/useOfflineSync.ts
import { useEffect } from 'react';
import NetInfo from '@react-native-netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useOfflineSync = () => {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        syncPendingRequests();
      }
    });

    return unsubscribe;
  }, []);

  const syncPendingRequests = async () => {
    try {
      const pendingRequests = await AsyncStorage.getItem('pendingRequests');
      if (pendingRequests) {
        const requests = JSON.parse(pendingRequests);
        // Procesar requests pendientes
        for (const request of requests) {
          await processRequest(request);
        }
        await AsyncStorage.removeItem('pendingRequests');
      }
    } catch (error) {
      console.error('Error syncing offline requests:', error);
    }
  };

  const processRequest = async (request: any) => {
    // Implementar lógica de sincronización
  };
};
```

## 🚀 Siguiente Paso

Una vez completada la integración básica, continúa con:

1. [**Flujo de Autenticación**](./authentication-flow.md) - Implementación detallada de auth
2. [**Manejo de Errores**](./error-handling.md) - Best practices para errores
3. [**Cliente HTTP**](./http-client.md) - Configuración avanzada del cliente

¿Tienes preguntas sobre la integración? Consulta la [documentación OpenAPI](../api/openapi.yaml) o contacta soporte técnico.