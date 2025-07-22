# FitAI API Documentation

## Overview

This documentation provides complete API reference for integrating with the FitAI backend in your standalone mobile application. The API is built with Hono.js on Cloudflare Workers and supports JWT authentication.

**Base URL:** `https://your-api-domain.workers.dev`  
**API Version:** `v1`  
**Authentication:** JWT Bearer tokens

## Table of Contents

1. [Authentication](#authentication)
2. [Core Endpoints](#core-endpoints)
3. [Premium Features](#premium-features)
4. [Social Features](#social-features)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [React Native Integration](#react-native-integration)

---

## Authentication

### JWT Token Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Auth Endpoints

#### POST /api/v1/auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "Juan Pérez"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "Juan Pérez",
      "plan": "free",
      "created_at": "2025-01-22T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Usuario registrado exitosamente"
}
```

#### POST /api/v1/auth/login

Authenticate existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "Juan Pérez",
      "plan": "free",
      "last_login_at": "2025-01-22T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Inicio de sesión exitoso"
}
```

#### POST /api/v1/auth/refresh

Refresh JWT token.

**Headers:**
```
Authorization: Bearer <current_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token refreshed successfully"
}
```

#### POST /api/v1/auth/logout

Logout user (client-side token cleanup).

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Core Endpoints

### Users

#### GET /api/v1/users/me

Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "Juan Pérez",
    "plan": "premium",
    "profile": {
      "goals": ["muscle_gain"],
      "experienceLevel": "intermediate",
      "availableDays": 4,
      "height": 175,
      "weight": 80,
      "age": 28
    },
    "stats": {
      "workoutsCompleted": 89,
      "currentStreak": 127,
      "prsSet": 15
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2025-01-22T10:00:00Z"
  }
}
```

#### PUT /api/v1/users/me

Update user profile.

**Request:**
```json
{
  "name": "Juan Carlos Pérez",
  "goals": ["muscle_gain", "strength"],
  "experienceLevel": "advanced",
  "availableDays": 5,
  "height": 175,
  "weight": 82,
  "age": 28
}
```

#### GET /api/v1/users/me/progress

Get user progress metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "last_30_days",
    "metrics": {
      "strengthGain": 12,
      "volumeIncrease": 18,
      "consistencyScore": 92,
      "totalWorkouts": 12,
      "avgWorkoutDuration": 48
    },
    "personalRecords": [
      {
        "exerciseId": "bench_press",
        "exerciseName": "Bench Press",
        "weight": 180,
        "reps": 1,
        "achievedAt": "2024-12-28T10:00:00Z"
      }
    ],
    "weeklyFrequency": {
      "target": 4,
      "actual": 4.2,
      "days": [true, true, false, true, true, true, false]
    }
  }
}
```

### Workouts

#### GET /api/v1/workouts

Get user's workouts with pagination.

**Query Parameters:**
- `limit` (default: 20)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "workout_123",
      "userId": "user_123",
      "name": "Push Day",
      "startedAt": "2024-12-30T09:00:00Z",
      "completedAt": "2024-12-30T09:45:00Z",
      "duration": 45,
      "exercises": [
        {
          "id": "ex1",
          "exerciseId": "bench_press",
          "exerciseName": "Bench Press",
          "sets": [
            { "reps": 10, "weight": 175, "completed": true, "rpe": 7 },
            { "reps": 8, "weight": 180, "completed": true, "rpe": 8 }
          ],
          "restTime": 180
        }
      ],
      "totalVolume": 2450,
      "notes": "Good session, felt strong on bench"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 50
  }
}
```

#### POST /api/v1/workouts

Create new workout.

**Request:**
```json
{
  "name": "Upper Body Strength",
  "exercises": [
    {
      "exerciseId": "bench_press",
      "exerciseName": "Bench Press",
      "targetSets": 4,
      "targetReps": "8-10",
      "restTime": 180
    }
  ]
}
```

#### GET /api/v1/workouts/:id

Get specific workout details.

#### PUT /api/v1/workouts/:id

Update workout.

#### POST /api/v1/workouts/:id/complete

Complete a workout session.

**Request:**
```json
{
  "duration": 65,
  "totalVolume": 3250,
  "notes": "Great session, all sets completed"
}
```

#### GET /api/v1/workouts/stats/summary

Get workout statistics.

**Query Parameters:**
- `period`: week, month, year

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "totalWorkouts": 12,
    "totalVolume": 28450,
    "avgDuration": 48,
    "consistency": 92,
    "strengthGain": 12,
    "topExercises": [
      { "name": "Bench Press", "sessions": 8, "maxWeight": 185 },
      { "name": "Deadlift", "sessions": 6, "maxWeight": 315 }
    ]
  }
}
```

### Exercises

#### GET /api/v1/exercises

Get all exercises (public endpoint, no auth required).

**Query Parameters:**
- `category`: Exercise category
- `muscle_group`: Target muscle group
- `equipment`: Required equipment
- `difficulty`: Exercise difficulty
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bench_press",
      "name": "Bench Press",
      "name_es": "Press de Banca",
      "muscle_groups": ["chest", "shoulders", "triceps"],
      "equipment": ["barbell"],
      "difficulty": "intermediate",
      "instructions_es": "Acuéstate en el banco...",
      "tips_es": ["Mantén los omóplatos juntos", "Controla la bajada"]
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 250
  }
}
```

#### GET /api/v1/exercises/:id

Get specific exercise details.

#### GET /api/v1/exercises/search/:query

Search exercises by name.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bench_press",
      "name": "Bench Press",
      "name_es": "Press de Banca",
      "muscle_groups": ["chest", "shoulders", "triceps"],
      "equipment": "barbell",
      "difficulty": "intermediate"
    }
  ],
  "query": "press",
  "count": 15
}
```

#### GET /api/v1/exercises/meta/categories

Get exercise categories.

#### GET /api/v1/exercises/meta/muscle-groups

Get muscle group options.

#### GET /api/v1/exercises/meta/equipment

Get equipment types.

### Routines

#### GET /api/v1/routines

Get user's routines.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "routine_123",
      "userId": "user_123",
      "name": "Push Pull Legs",
      "description": "6-day PPL split for hypertrophy",
      "difficulty": "intermediate",
      "duration_weeks": 8,
      "days_per_week": 6,
      "goals": ["muscle_gain"],
      "equipment_needed": ["barbell", "dumbbell"],
      "generated_by_ai": false,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### GET /api/v1/routines/:id

Get routine with all days and exercises.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "routine_123",
    "name": "Push Pull Legs",
    "description": "6-day PPL split",
    "days": [
      {
        "id": "day_1",
        "name": "Push Day",
        "day_of_week": 1,
        "exercises": [
          {
            "id": "re_1",
            "exercise_id": "bench_press",
            "name": "Bench Press",
            "name_es": "Press de Banca",
            "target_sets": 4,
            "target_reps_min": 8,
            "target_reps_max": 10,
            "rest_time_seconds": 180,
            "rpe_target": 8,
            "notes": "Focus on form"
          }
        ]
      }
    ]
  }
}
```

#### POST /api/v1/routines

Create new routine.

**Request:**
```json
{
  "name": "My Custom Routine",
  "description": "Personalized strength routine",
  "difficulty": "intermediate",
  "duration_weeks": 12,
  "days_per_week": 4,
  "goals": ["strength", "muscle_gain"],
  "equipment_needed": ["barbell", "dumbbell"]
}
```

#### PUT /api/v1/routines/:id

Update routine.

#### DELETE /api/v1/routines/:id

Delete routine (soft delete).

#### POST /api/v1/routines/:id/days/:dayId/exercises

Add exercise to routine day.

#### POST /api/v1/routines/:id/start-workout

Start workout from routine.

**Request:**
```json
{
  "dayId": "day_1"
}
```

---

## Premium Features

### AI-Powered Features

#### POST /api/v1/ai/generate-routine

Generate personalized routine using AI.

**Plan Requirements:** Free users get 1/month, Premium+ unlimited

**Request:**
```json
{
  "experienceLevel": "intermediate",
  "goals": ["muscle_gain", "strength"],
  "availableDays": 4,
  "availableEquipment": ["barbell", "dumbbell", "bodyweight"],
  "injuries": ["lower_back"],
  "specificGoals": ["improve bench press"],
  "restrictions": ["no squats"],
  "preferredDuration": 60
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "routine": {
      "name": "Intermediate Strength & Hypertrophy",
      "description": "4-day upper/lower split optimized for your goals",
      "duration_weeks": 8,
      "days": [
        {
          "name": "Upper Body Power",
          "exercises": [
            {
              "name": "Bench Press",
              "sets": 4,
              "reps": "5-6",
              "rest": 180,
              "notes": "Focus on explosive concentric"
            }
          ]
        }
      ]
    },
    "reasoning": "Based on your intermediate level and strength goals..."
  },
  "cached": false,
  "message": "Rutina generada exitosamente"
}
```

#### POST /api/v1/ai/analyze-progress

Get AI analysis of workout progress.

**Request:**
```json
{
  "workoutHistory": [
    {
      "date": "2025-01-15",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": [{"reps": 8, "weight": 80, "rpe": 7}]
        }
      ]
    }
  ],
  "timeframe": "last_30_days"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "strength_gain",
        "priority": "high",
        "title": "Excellent Strength Progress",
        "message": "Your bench press has improved by 12% this month",
        "actionable": true,
        "recommendation": "Continue with current rep ranges"
      }
    ],
    "metrics": {
      "overallProgress": 85,
      "strengthTrend": "increasing",
      "consistencyScore": 92
    },
    "nextSteps": [
      "Continue current progression scheme",
      "Focus on form quality"
    ]
  }
}
```

#### POST /api/v1/ai/exercise-advice

Get specific exercise advice.

**Request:**
```json
{
  "exerciseName": "Bench Press",
  "question": "How can I improve my form?",
  "userLevel": "intermediate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "advice": "Para mejorar tu técnica en press de banca...",
    "keyPoints": [
      "Mantén retracción escapular",
      "Controla la fase excéntrica",
      "Mantén arco natural en la espalda"
    ],
    "commonMistakes": [
      "Levantar demasiado rápido",
      "No retraer los omóplatos"
    ],
    "safety": "Si sientes dolor, detente inmediatamente"
  },
  "cached": false,
  "remaining": 45
}
```

#### POST /api/v1/ai/quick-tip

Get motivational tip.

### Premium AI Features (Premium/Pro Plans)

#### POST /api/v1/premium-ai/generate-advanced-routine

Advanced routine generation with periodization.

**Plan Requirements:** Premium or Pro

#### POST /api/v1/premium-ai/analyze-fatigue

Fatigue pattern analysis.

**Plan Requirements:** Pro only

#### POST /api/v1/premium-ai/predict-load-progression

Predict optimal load progression.

#### POST /api/v1/premium-ai/analyze-exercise-form

Exercise form analysis (beta feature).

### Payments (MercadoPago Integration)

#### GET /api/v1/payments/plans

Get available subscription plans.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "premium",
      "name": "FitAI Premium",
      "price": {
        "monthly": "$9.99",
        "annual": "$99.99",
        "monthlyRaw": 9.99,
        "annualRaw": 99.99,
        "savings": "$19.89"
      },
      "currency": "USD",
      "features": [
        "Rutinas IA ilimitadas",
        "Análisis avanzado de progreso",
        "Consejos personalizados"
      ]
    }
  ]
}
```

#### POST /api/v1/payments/create-subscription

Create subscription payment preference.

**Request:**
```json
{
  "planId": "premium",
  "billingCycle": "monthly",
  "firstName": "Juan",
  "lastName": "Pérez"
}
```

#### GET /api/v1/payments/subscription

Get user's current subscription.

### Analytics (Premium Feature)

#### POST /api/v1/analytics/plateau-detection

Detect training plateaus.

**Plan Requirements:** Premium or Pro

#### POST /api/v1/analytics/optimal-volume

Calculate optimal training volume.

#### POST /api/v1/analytics/injury-risk-assessment

Assess injury risk factors.

**Plan Requirements:** Pro only

#### POST /api/v1/analytics/one-rep-max

Estimate one rep max.

---

## Social Features

### Profiles

#### GET /api/v1/social/profile/:userId?

Get social profile (own or other user's).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "displayName": "Carlos Entrenador",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=user_123",
    "bio": "Entrenador personal certificado | 5+ años",
    "level": "Avanzado",
    "totalWorkouts": 285,
    "streakDays": 42,
    "achievements": [
      {
        "id": "strength_milestone",
        "name": "Fuerza Épica",
        "description": "Levantaste 100kg en press de banca",
        "icon": "⚡",
        "category": "strength",
        "rarity": "epic"
      }
    ],
    "stats": {
      "totalVolume": 125000,
      "strongestLifts": [
        { "exercise": "Press de Banca", "weight": 102.5 }
      ]
    }
  }
}
```

### Shared Routines

#### GET /api/v1/social/routines

Get community shared routines.

**Query Parameters:**
- `category`: strength, hypertrophy, endurance
- `difficulty`: 1-10
- `page`, `limit`

#### POST /api/v1/social/routines

Share a routine with the community.

#### POST /api/v1/social/routines/:routineId/like

Like/unlike a shared routine.

### Achievements & Challenges

#### GET /api/v1/social/achievements

Get user's achievements and available ones.

#### GET /api/v1/social/challenges

Get active and upcoming challenges.

#### POST /api/v1/social/challenges/:challengeId/join

Join a community challenge.

### Leaderboards

#### GET /api/v1/social/leaderboards

Get leaderboards by category and period.

**Query Parameters:**
- `period`: weekly, monthly, yearly
- `category`: volume, strength, consistency

---

## Health Integration

### HealthKit Sync

#### POST /api/v1/health/sync-workout

Sync workout data from HealthKit.

**Request:**
```json
{
  "workoutActivityType": "HKWorkoutActivityTypeTraditionalStrengthTraining",
  "startDate": "2025-01-22T09:00:00Z",
  "endDate": "2025-01-22T10:15:00Z",
  "totalEnergyBurned": 245,
  "heartRateData": [
    {
      "value": 145,
      "date": "2025-01-22T09:15:00Z"
    }
  ]
}
```

#### GET /api/v1/health/stats

Get health statistics summary.

#### POST /api/v1/health/heart-rate

Record heart rate data during workout.

---

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'premium' | 'pro';
  profile?: {
    goals: string[];
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    availableDays: number;
    height?: number; // cm
    weight?: number; // kg
    age?: number;
  };
  created_at: string;
  updated_at: string;
}
```

### Workout
```typescript
interface Workout {
  id: string;
  userId: string;
  name: string;
  startedAt: string;
  completedAt?: string;
  duration?: number; // minutes
  exercises: WorkoutExercise[];
  totalVolume?: number; // kg
  notes?: string;
}

interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  restTime?: number; // seconds
}

interface WorkoutSet {
  reps: number;
  weight: number; // kg
  completed: boolean;
  rpe?: number; // 1-10
  notes?: string;
}
```

### Exercise
```typescript
interface Exercise {
  id: string;
  name: string;
  name_es: string;
  muscle_groups: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions_es: string;
  tips_es: string[];
  image_url?: string;
}
```

### Routine
```typescript
interface Routine {
  id: string;
  userId: string;
  name: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_weeks?: number;
  days_per_week?: number;
  goals: string[];
  equipment_needed: string[];
  generated_by_ai: boolean;
  days: RoutineDay[];
  created_at: string;
}

interface RoutineDay {
  id: string;
  name: string;
  day_of_week: number; // 1-7
  exercises: RoutineExercise[];
}

interface RoutineExercise {
  id: string;
  exercise_id: string;
  target_sets: number;
  target_reps_min?: number;
  target_reps_max?: number;
  target_weight_kg?: number;
  rest_time_seconds?: number;
  rpe_target?: number;
  notes?: string;
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error Type",
  "message": "Human readable error message",
  "path": "/api/v1/endpoint"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient plan/permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

### Common Error Types

#### Authentication Errors
```json
{
  "error": "Unauthorized",
  "message": "User not authenticated"
}
```

#### Plan Restriction Errors
```json
{
  "error": "Forbidden", 
  "message": "Esta función requiere un plan Premium o Pro. Actualiza tu suscripción."
}
```

#### Validation Errors
```json
{
  "error": "Bad Request",
  "message": "Email, password, and name are required"
}
```

---

## React Native Integration

### Setup

Install required dependencies:
```bash
npm install @react-native-async-storage/async-storage
```

### API Client Setup

```typescript
// api/client.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-api-domain.workers.dev/api/v1';

class FitAIApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadToken();
  }

  private async loadToken() {
    this.token = await AsyncStorage.getItem('fitai_token');
  }

  private async saveToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('fitai_token', token);
  }

  private async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('fitai_token');
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Authentication methods
  async register(email: string, password: string, name: string) {
    const response = await this.request<{
      success: boolean;
      data: { user: any; token: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    if (response.data.token) {
      await this.saveToken(response.data.token);
    }

    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<{
      success: boolean;
      data: { user: any; token: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data.token) {
      await this.saveToken(response.data.token);
    }

    return response;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    await this.clearToken();
  }

  // User methods
  async getCurrentUser() {
    return this.request('/users/me');
  }

  async updateProfile(profileData: any) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Workout methods
  async getWorkouts(limit = 20, offset = 0) {
    return this.request(`/workouts?limit=${limit}&offset=${offset}`);
  }

  async createWorkout(workoutData: any) {
    return this.request('/workouts', {
      method: 'POST',
      body: JSON.stringify(workoutData),
    });
  }

  async completeWorkout(workoutId: string, completionData: any) {
    return this.request(`/workouts/${workoutId}/complete`, {
      method: 'POST',
      body: JSON.stringify(completionData),
    });
  }

  // Exercise methods
  async getExercises(filters: any = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/exercises?${queryParams}`);
  }

  async searchExercises(query: string) {
    return this.request(`/exercises/search/${encodeURIComponent(query)}`);
  }

  // AI methods
  async generateRoutine(preferences: any) {
    return this.request('/ai/generate-routine', {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  }

  async getExerciseAdvice(exerciseName: string, question: string) {
    return this.request('/ai/exercise-advice', {
      method: 'POST',
      body: JSON.stringify({ exerciseName, question }),
    });
  }

  // Health methods
  async syncHealthKitWorkout(workoutData: any) {
    return this.request('/health/sync-workout', {
      method: 'POST',
      body: JSON.stringify(workoutData),
    });
  }
}

export const fitaiApi = new FitAIApiClient(API_BASE_URL);
```

### Usage Examples

#### Authentication Hook
```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { fitaiApi } from '../api/client';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fitaiApi.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      console.log('User not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fitaiApi.login(email, password);
    setUser(response.data.user);
    return response;
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await fitaiApi.register(email, password, name);
    setUser(response.data.user);
    return response;
  };

  const logout = async () => {
    await fitaiApi.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
};
```

#### Workout Screen Example
```typescript
// screens/WorkoutScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { fitaiApi } from '../api/client';

export const WorkoutScreen = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const response = await fitaiApi.getWorkouts();
      setWorkouts(response.data);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderWorkout = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.workoutCard}>
      <Text style={styles.workoutName}>{item.name}</Text>
      <Text style={styles.workoutDate}>
        {new Date(item.startedAt).toLocaleDateString()}
      </Text>
      <Text style={styles.workoutStats}>
        {item.duration}min • {item.totalVolume}kg total
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Entrenamientos</Text>
      <FlatList
        data={workouts}
        renderItem={renderWorkout}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadWorkouts}
      />
    </View>
  );
};
```

#### Exercise Search
```typescript
// components/ExerciseSearch.tsx
import React, { useState } from 'react';
import { TextInput, FlatList, Text, TouchableOpacity } from 'react-native';
import { fitaiApi } from '../api/client';

export const ExerciseSearch = ({ onSelectExercise }: { onSelectExercise: (exercise: any) => void }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchExercises = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fitaiApi.searchExercises(searchQuery);
      setResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TextInput
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          searchExercises(text);
        }}
        placeholder="Buscar ejercicios..."
        style={styles.searchInput}
      />
      <FlatList
        data={results}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.exerciseItem}
            onPress={() => onSelectExercise(item)}
          >
            <Text style={styles.exerciseName}>{item.name_es}</Text>
            <Text style={styles.muscleGroups}>
              {item.muscle_groups.join(', ')}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
      />
    </>
  );
};
```

### Error Handling
```typescript
// utils/errorHandler.ts
export const handleApiError = (error: any) => {
  if (error.message.includes('not authenticated')) {
    // Redirect to login
    return 'Por favor, inicia sesión nuevamente';
  }
  
  if (error.message.includes('Premium')) {
    // Show upgrade prompt
    return 'Esta función requiere una suscripción Premium';
  }
  
  return error.message || 'Ocurrió un error inesperado';
};
```

This documentation provides everything you need to integrate with the FitAI API in your standalone mobile application. The API offers comprehensive fitness tracking, AI-powered features, and social functionality with clear upgrade paths for premium features.