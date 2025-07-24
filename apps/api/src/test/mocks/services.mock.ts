import { vi } from "vitest";

// Mock OpenAI/AI Service
export const mockAIService = {
  generateRoutine: vi.fn().mockResolvedValue({
    name: "AI Generated Routine",
    description: "Test AI routine",
    weeks: [
      {
        weekNumber: 1,
        days: [
          {
            dayNumber: 1,
            dayName: "Lunes",
            exercises: [
              {
                exerciseId: "ex_test_123",
                exerciseName: "Test Exercise",
                sets: 3,
                reps: "8-10",
                weight: "Progresivo",
                restSeconds: 120,
                notes: "Test notes",
              },
            ],
          },
        ],
      },
    ],
    difficulty: "intermediate",
    estimatedDuration: 60,
    targetMuscleGroups: ["chest", "back"],
    equipmentNeeded: ["barbell", "dumbbell"],
  }),

  generateCoachingAdvice: vi
    .fn()
    .mockResolvedValue(
      "Great workout! Focus on maintaining proper form during the bench press."
    ),

  analyzeExerciseForm: vi.fn().mockResolvedValue({
    feedback: "Your form looks good overall",
    corrections: ["Keep your back straight", "Control the descent"],
    safetyScore: 8.5,
  }),
};

// Mock Redis/Cache
export const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn().mockResolvedValue({ keys: [] }),
};

// Mock MercadoPago
export const mockMercadoPago = {
  preferences: {
    create: vi.fn().mockResolvedValue({
      body: {
        id: "test_preference_123",
        init_point:
          "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=test_preference_123",
        sandbox_init_point:
          "https://sandbox.mercadopago.cl/checkout/v1/redirect?pref_id=test_preference_123",
      },
    }),
  },
  payment: {
    get: vi.fn().mockResolvedValue({
      body: {
        id: "payment_test_123",
        status: "approved",
        status_detail: "accredited",
        external_reference: "user_test_123_premium_monthly",
        transaction_amount: 9990,
        currency_id: "CLP",
      },
    }),
  },
};

// Mock Clerk
export const mockClerkClient = {
  verifyToken: vi.fn().mockResolvedValue({
    sub: "clerk_test_123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  }),
  users: {
    getUser: vi.fn().mockResolvedValue({
      id: "clerk_test_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      firstName: "Test",
      lastName: "User",
    }),
  },
};

// Mock Upstash Redis Rate Limiter
export const mockRateLimiter = {
  limit: vi.fn().mockResolvedValue({
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 3600000,
  }),
};

// Mock Health Service
export const mockHealthDataService = {
  saveHealthMetrics: vi.fn().mockResolvedValue(5),
  saveHealthWorkouts: vi.fn().mockResolvedValue(3),
  saveSleepData: vi.fn().mockResolvedValue(1),
  saveHRVData: vi.fn().mockResolvedValue(2),
  updateSyncStatus: vi.fn().mockResolvedValue(undefined),
  getHealthMetrics: vi.fn().mockResolvedValue([
    {
      id: "metric_test_123",
      userId: "user_test_123",
      metricType: "heart_rate",
      value: 75,
      unit: "bpm",
      sourceApp: "Apple Health",
      recordedAt: new Date("2024-01-15T10:00:00Z"),
      syncedAt: new Date("2024-01-15T10:05:00Z"),
      metadata: {},
      createdAt: new Date("2024-01-15T10:05:00Z"),
    },
  ]),
  calculateRecoveryScore: vi.fn().mockResolvedValue({
    currentScore: 85,
    trend: "improving",
    factorsInfluencing: {
      sleep: "positive",
      hrv: "positive",
      workloadBalance: "neutral",
      consistency: "positive",
    },
    recommendations: [
      "Continue with your current training intensity",
      "Maintain good sleep habits",
    ],
    nextRecommendationDate: new Date("2024-01-16"),
  }),
};

// Mock HealthKit Service
export const mockHealthKitService = {
  getUserHealthProfile: vi.fn().mockResolvedValue({
    id: "profile_test_123",
    userId: "user_test_123",
    healthkitEnabled: true,
    appleWatchConnected: true,
    healthkitPermissions: {
      read: ["heart_rate", "workout", "step_count"],
      write: ["workout"],
      share: ["workout"],
    },
    syncFrequency: "real_time",
    lastSyncAt: new Date("2024-01-15T09:00:00Z"),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  }),

  updateHealthKitPermissions: vi.fn().mockResolvedValue({
    id: "profile_test_123",
    userId: "user_test_123",
    healthkitEnabled: true,
    healthkitPermissions: {
      read: ["heart_rate", "workout", "step_count", "active_energy"],
      write: ["workout"],
      share: ["workout", "heart_rate"],
    },
  }),

  syncAppleWatchWorkout: vi.fn().mockResolvedValue({
    id: "watch_workout_123",
    userId: "user_test_123",
    healthkitUuid: "hk_uuid_123",
    workoutType: "running",
    startTime: new Date("2024-01-15T08:00:00Z"),
    endTime: new Date("2024-01-15T08:30:00Z"),
    durationSeconds: 1800,
    totalEnergyBurnedKcal: 250,
    totalDistanceMeters: 5000,
    avgHeartRateBpm: 150,
    maxHeartRateBpm: 175,
  }),
};
