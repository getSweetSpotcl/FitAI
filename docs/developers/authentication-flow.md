# Flujo de Autenticación - FitAI API

Esta guía explica el flujo completo de autenticación usando Clerk en aplicaciones React Native que consumen la API de FitAI.

## 🔐 Arquitectura de Autenticación

FitAI utiliza **Clerk** como proveedor de autenticación, proporcionando:
- Autenticación segura con JWT tokens
- Gestión de sesiones automática
- Soporte para múltiples métodos de login
- Gestión de metadata de usuario (roles, planes)

## 📋 Configuración Inicial

### 1. Variables de Entorno

```bash
# .env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 2. Configuración de Clerk Provider

```typescript
// App.tsx
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      console.error('SecureStore get item error: ', err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('SecureStore save item error: ', err);
      return;
    }
  },
};

export default function App() {
  return (
    <ClerkProvider 
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <RootNavigator />
    </ClerkProvider>
  );
}
```

## 🚪 Implementación de Login

### 1. Pantalla de Login

```typescript
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export const LoginScreen = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!isLoaded || loading) return;

    setLoading(true);
    try {
      const completeSignIn = await signIn.create({
        identifier: email,
        password,
      });

      if (completeSignIn.status === 'complete') {
        await setActive({ session: completeSignIn.createdSessionId });
        router.replace('/(tabs)/dashboard');
      } else {
        console.error('Sign in not complete:', completeSignIn.status);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error: any) => {
    if (error.errors?.[0]) {
      const errorCode = error.errors[0].code;
      switch (errorCode) {
        case 'form_identifier_not_found':
          return 'Usuario no encontrado. Verifica tu email.';
        case 'form_password_incorrect':
          return 'Contraseña incorrecta.';
        case 'too_many_requests':
          return 'Demasiados intentos. Espera un momento.';
        default:
          return error.errors[0].message || 'Error de autenticación.';
      }
    }
    return 'Error de conexión. Intenta nuevamente.';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={loading || !email || !password}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

### 2. Pantalla de Registro

```typescript
// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';

export const RegisterScreen = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!isLoaded || loading) return;

    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerifying(true);
    } catch (err: any) {
      console.error('Sign up error:', err);
      Alert.alert('Error', err.errors?.[0]?.message || 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!isLoaded || loading) return;

    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        // Redirigir a onboarding o dashboard
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      Alert.alert('Error', 'Código de verificación incorrecto');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verificar Email</Text>
        <Text style={styles.subtitle}>
          Hemos enviado un código a {email}
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Código de verificación"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
        />
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleVerification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Verificar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear Cuenta</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Nombre"
        value={firstName}
        onChangeText={setFirstName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Apellido"
        value={lastName}
        onChangeText={setLastName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Contraseña (mín. 8 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Crear Cuenta</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## 🔄 Gestión de Sesiones

### 1. Hook Personalizado para Auth

```typescript
// src/hooks/useAuth.ts
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';
import { UsersService } from '../services/users';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin';
  plan: 'free' | 'premium' | 'pro';
  profileComplete: boolean;
}

export const useAuth = () => {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken, signOut } = useClerkAuth();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoaded) {
      if (user) {
        loadUserProfile();
      } else {
        setAuthUser(null);
        setLoading(false);
      }
    }
  }, [user, userLoaded]);

  const loadUserProfile = async () => {
    try {
      const profile = await UsersService.getProfile();
      
      setAuthUser({
        id: profile.id,
        email: profile.email,
        firstName: user?.firstName || undefined,
        lastName: user?.lastName || undefined,
        role: profile.role,
        plan: profile.plan,
        profileComplete: !!profile.profile,
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      // En caso de error, crear objeto básico desde Clerk
      setAuthUser({
        id: user?.id || '',
        email: user?.emailAddresses[0]?.emailAddress || '',
        firstName: user?.firstName || undefined,
        lastName: user?.lastName || undefined,
        role: 'user',
        plan: 'free',
        profileComplete: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setAuthUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshProfile = () => {
    if (user) {
      loadUserProfile();
    }
  };

  return {
    user: authUser,
    isAuthenticated: !!authUser,
    loading,
    getToken,
    logout,
    refreshProfile,
  };
};
```

### 2. Protección de Rutas

```typescript
// src/components/AuthGuard.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { LoginScreen } from '../screens/LoginScreen';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePremium?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAdmin, 
  requirePremium 
}) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Acceso denegado. Se requieren permisos de administrador.</Text>
      </View>
    );
  }

  if (requirePremium && user?.plan === 'free') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Esta función requiere una suscripción Premium o Pro.</Text>
      </View>
    );
  }

  return <>{children}</>;
};
```

## 🔗 Integración con API

### 1. Cliente HTTP Autenticado

```typescript
// src/services/api/authenticatedClient.ts
import axios, { AxiosInstance } from 'axios';
import { useAuth } from '../../hooks/useAuth';

class AuthenticatedAPIClient {
  private client: AxiosInstance;
  private getToken: (() => Promise<string | null>) | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  setTokenProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private setupInterceptors() {
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

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expirado o inválido
          console.log('Token expired, redirecting to login');
          // Trigger logout en la app
        }
        return Promise.reject(error);
      }
    );
  }

  get client() {
    return this.client;
  }
}

export const authenticatedAPIClient = new AuthenticatedAPIClient(
  process.env.EXPO_PUBLIC_API_BASE_URL!
);
```

### 2. Proveedor de API

```typescript
// src/providers/APIProvider.tsx
import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authenticatedAPIClient } from '../services/api/authenticatedClient';

interface APIProviderProps {
  children: React.ReactNode;
}

export const APIProvider: React.FC<APIProviderProps> = ({ children }) => {
  const { getToken } = useAuth();

  useEffect(() => {
    authenticatedAPIClient.setTokenProvider(getToken);
  }, [getToken]);

  return <>{children}</>;
};
```

## 🎯 Casos de Uso Avanzados

### 1. Renovación Automática de Tokens

```typescript
// src/services/auth/tokenManager.ts
import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<string | null> | null = null;
  private getToken: (() => Promise<string | null>) | null = null;

  static getInstance() {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  setTokenProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  async getValidToken(): Promise<string | null> {
    if (!this.getToken) return null;

    // Si ya hay una renovación en proceso, esperar el resultado
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    try {
      // Intentar obtener token actual
      const token = await this.getToken();
      
      if (token) {
        // Verificar si el token está próximo a expirar
        const payload = this.parseJWT(token);
        const now = Date.now() / 1000;
        const expiry = payload.exp;
        
        // Si expira en menos de 5 minutos, renovar
        if (expiry - now < 300) {
          this.refreshPromise = this.refreshToken();
          const newToken = await this.refreshPromise;
          this.refreshPromise = null;
          return newToken;
        }
        
        return token;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting valid token:', error);
      return null;
    }
  }

  private async refreshToken(): Promise<string | null> {
    try {
      if (!this.getToken) return null;
      
      // Clerk maneja la renovación automáticamente
      const newToken = await this.getToken();
      return newToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  private parseJWT(token: string) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }
}

export const tokenManager = TokenManager.getInstance();
```

### 2. Listener de Cambios de Sesión

```typescript
// src/hooks/useSessionListener.ts
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export const useSessionListener = () => {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn === false) {
      // Usuario deslogueado, limpiar estado local
      router.replace('/login');
    } else if (isSignedIn === true) {
      // Usuario logueado, verificar si necesita onboarding
      checkOnboardingStatus();
    }
  }, [isSignedIn]);

  const checkOnboardingStatus = async () => {
    try {
      const profile = await UsersService.getProfile();
      if (!profile.profile) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      router.replace('/onboarding');
    }
  };
};
```

## 🛡️ Mejores Prácticas de Seguridad

### 1. Validación de Permisos

```typescript
// src/utils/permissions.ts
export const checkPermissions = (
  userPlan: string,
  userRole: string,
  requiredPermission: string
): boolean => {
  const permissions = {
    free: ['basic_workouts', 'basic_ai'],
    premium: ['basic_workouts', 'basic_ai', 'advanced_ai', 'analytics', 'social'],
    pro: ['*'], // Todas las funcionalidades
  };

  const rolePermissions = {
    user: permissions[userPlan as keyof typeof permissions] || [],
    admin: ['*'],
  };

  const userPermissions = rolePermissions[userRole as keyof typeof rolePermissions];
  
  return userPermissions.includes('*') || userPermissions.includes(requiredPermission);
};

export const requirePermission = (permission: string) => {
  return (WrappedComponent: React.ComponentType<any>) => {
    return (props: any) => {
      const { user } = useAuth();
      
      if (!user || !checkPermissions(user.plan, user.role, permission)) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>No tienes permisos para acceder a esta función</Text>
          </View>
        );
      }
      
      return <WrappedComponent {...props} />;
    };
  };
};
```

### 2. Manejo de Errores de Autenticación

```typescript
// src/utils/authErrorHandler.ts
import { ClerkAPIError } from '@clerk/types';

export const handleAuthError = (error: ClerkAPIError | any): string => {
  if (error.errors && error.errors.length > 0) {
    const firstError = error.errors[0];
    
    switch (firstError.code) {
      case 'session_token_not_found':
        return 'Sesión expirada. Por favor inicia sesión nuevamente.';
      case 'session_token_invalid':
        return 'Token de sesión inválido. Por favor inicia sesión nuevamente.';
      case 'unauthorized':
        return 'No tienes autorización para realizar esta acción.';
      case 'forbidden':
        return 'Acceso denegado.';
      default:
        return firstError.message || 'Error de autenticación desconocido.';
    }
  }
  
  return 'Error de autenticación. Por favor intenta nuevamente.';
};
```

## 📱 Integración con Navegación

```typescript
// src/navigation/AuthNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../hooks/useAuth';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { TabNavigator } from './TabNavigator';

const Stack = createStackNavigator();

export const AuthNavigator = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  if (!user?.profileComplete) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      </Stack.Navigator>
    );
  }

  return <TabNavigator />;
};
```

## 🔧 Testing

```typescript
// src/__tests__/auth.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useAuth } from '../hooks/useAuth';

// Mock Clerk
jest.mock('@clerk/clerk-expo', () => ({
  useUser: () => ({ user: mockUser, isLoaded: true }),
  useAuth: () => ({ 
    getToken: jest.fn().mockResolvedValue('mock-token'),
    signOut: jest.fn(),
  }),
}));

describe('useAuth Hook', () => {
  it('should return authenticated user', async () => {
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
    });
  });

  it('should handle logout', async () => {
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      result.current.logout();
    });
    
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

## 🚀 Siguiente Paso

Una vez implementado el flujo de autenticación, continúa con:

1. [**Cliente HTTP**](./http-client.md) - Configuración avanzada del cliente HTTP
2. [**Manejo de Errores**](./error-handling.md) - Best practices para manejo de errores
3. [**TypeScript Types**](./typescript-types.md) - Tipos compartidos con la API

¿Necesitas ayuda con la implementación? Consulta los [ejemplos de código](../examples/) o contacta soporte técnico.