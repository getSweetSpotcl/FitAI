import { vi } from 'vitest';

// Mock database client
export const mockSql = {
  query: vi.fn(),
  end: vi.fn(),
  unsafe: vi.fn(),
};

// Mock database results
export const mockUser = {
  id: 'user_test_123',
  clerk_user_id: 'clerk_test_123',
  email: 'test@example.com',
  name: 'Test User',
  subscription_plan: 'premium',
  user_role: 'user',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

export const mockExercise = {
  id: 'ex_test_123',
  name: 'Test Exercise',
  name_es: 'Ejercicio de Prueba',
  category: 'strength',
  muscle_groups: ['chest', 'triceps'],
  equipment: ['barbell'],
  difficulty: 'intermediate',
  instructions: 'Test instructions',
  instructions_es: 'Instrucciones de prueba',
};

export const mockRoutine = {
  id: 'routine_test_123',
  user_id: 'user_test_123',
  name: 'Test Routine',
  description: 'Test routine description',
  difficulty_level: 'intermediate',
  estimated_duration: 60,
  target_muscle_groups: ['chest', 'back'],
  equipment_needed: ['barbell', 'dumbbell'],
  is_ai_generated: false,
  is_active: true,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

export const mockWorkoutSession = {
  id: 'session_test_123',
  user_id: 'user_test_123',
  routine_id: 'routine_test_123',
  started_at: new Date('2024-01-15T10:00:00Z'),
  completed_at: null,
  duration_minutes: null,
  total_volume_kg: 0,
  average_rpe: null,
  status: 'active',
  created_at: new Date('2024-01-15T10:00:00Z'),
  updated_at: new Date('2024-01-15T10:00:00Z'),
};

// Mock query implementations
export const setupDatabaseMocks = () => {
  // Default mock implementation
  mockSql.query = vi.fn().mockResolvedValue([]);
  mockSql.unsafe = vi.fn().mockResolvedValue([]);
  
  // Template tag function mock
  const sqlMock = vi.fn((strings: TemplateStringsArray, ...values: any[]) => {
    return Promise.resolve([]);
  }) as any;
  
  sqlMock.unsafe = mockSql.unsafe;
  sqlMock.end = mockSql.end;
  
  return sqlMock;
};

export const createDatabaseClient = vi.fn(() => setupDatabaseMocks());

export const getUserByClerkId = vi.fn(async (sql: any, clerkId: string) => {
  if (clerkId === 'clerk_test_123') {
    return mockUser;
  }
  return null;
});

export const getUserById = vi.fn(async (sql: any, userId: string) => {
  if (userId === 'user_test_123') {
    return mockUser;
  }
  return null;
});

export const getExercises = vi.fn(async (sql: any, filters: any) => {
  return [mockExercise];
});

export const getUserRoutines = vi.fn(async (sql: any, userId: string) => {
  if (userId === 'user_test_123') {
    return [mockRoutine];
  }
  return [];
});