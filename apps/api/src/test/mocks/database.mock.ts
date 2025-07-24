import { vi } from "vitest";

// Mock database client - simulate Neon client behavior
export const mockSql = Object.assign(
  vi.fn((strings: TemplateStringsArray, ..._values: any[]) => {
    const query = strings.join("?").toLowerCase();

    // Mock user profile query
    if (query.includes("user_profiles")) {
      return Promise.resolve([
        {
          id: "profile_test_123",
          user_id: "user_test_123",
          goals: ["weight_loss", "muscle_gain"],
          fitness_level: "intermediate",
          height_cm: 180,
          weight_kg: 80,
          created_at: new Date("2024-01-01"),
        },
      ]);
    }

    // Mock user stats queries
    if (query.includes("workout_sessions") && query.includes("count")) {
      return Promise.resolve([{ count: "42" }]);
    }

    if (query.includes("avg(duration_minutes)")) {
      return Promise.resolve([{ avg_duration: 45 }]);
    }

    if (query.includes("sum(total_volume_kg)")) {
      return Promise.resolve([{ total_volume: 12500 }]);
    }

    // Mock personal records query
    if (query.includes("personal_records")) {
      return Promise.resolve([
        {
          id: "pr_test_123",
          exercise_id: "ex_test_123",
          record_type: "1rm",
          value: 100,
          achieved_at: new Date("2024-01-10"),
        },
      ]);
    }

    // Mock update queries
    if (query.includes("update") && query.includes("users")) {
      return Promise.resolve([mockUser]);
    }

    if (query.includes("update") && query.includes("user_profiles")) {
      return Promise.resolve([
        {
          id: "profile_test_123",
          user_id: "user_test_123",
          updated_at: new Date(),
        },
      ]);
    }

    // Mock insert queries
    if (query.includes("insert") && query.includes("user_preferences")) {
      return Promise.resolve([
        {
          id: "pref_test_123",
          user_id: "user_test_123",
          created_at: new Date(),
        },
      ]);
    }

    // Default empty result
    return Promise.resolve([]);
  }),
  {
    query: vi.fn(),
    end: vi.fn(),
    unsafe: vi.fn().mockResolvedValue([]),
  }
);

// Mock database results
export const mockUser = {
  id: "user_test_123",
  clerk_user_id: "clerk_test_123",
  email: "test@example.com",
  name: "Test User",
  subscription_plan: "premium",
  user_role: "user",
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-01"),
};

export const mockExercise = {
  id: "ex_test_123",
  name: "Test Exercise",
  name_es: "Ejercicio de Prueba",
  category: "strength",
  muscle_groups: ["chest", "triceps"],
  equipment: ["barbell"],
  difficulty: "intermediate",
  instructions: "Test instructions",
  instructions_es: "Instrucciones de prueba",
};

export const mockRoutine = {
  id: "routine_test_123",
  user_id: "user_test_123",
  name: "Test Routine",
  description: "Test routine description",
  difficulty_level: "intermediate",
  estimated_duration: 60,
  target_muscle_groups: ["chest", "back"],
  equipment_needed: ["barbell", "dumbbell"],
  is_ai_generated: false,
  is_active: true,
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-01"),
};

export const mockWorkoutSession = {
  id: "session_test_123",
  user_id: "user_test_123",
  routine_id: "routine_test_123",
  started_at: new Date("2024-01-15T10:00:00Z"),
  completed_at: null,
  duration_minutes: null,
  total_volume_kg: 0,
  average_rpe: null,
  status: "active",
  created_at: new Date("2024-01-15T10:00:00Z"),
  updated_at: new Date("2024-01-15T10:00:00Z"),
};

// Mock query implementations
export const setupDatabaseMocks = () => {
  return mockSql;
};

export const createDatabaseClient = vi.fn(() => mockSql);

export const getUserByClerkId = vi.fn(async (_sql: any, clerkId: string) => {
  if (clerkId === "clerk_test_123") {
    return mockUser;
  }
  return null;
});

export const getUserById = vi.fn(async (_sql: any, userId: string) => {
  if (userId === "user_test_123") {
    return mockUser;
  }
  return null;
});

export const getExercises = vi.fn(async (_sql: any, _filters: any) => {
  return [mockExercise];
});

export const getUserRoutines = vi.fn(async (_sql: any, userId: string) => {
  if (userId === "user_test_123") {
    return [mockRoutine];
  }
  return [];
});
