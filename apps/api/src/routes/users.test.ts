import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import users from './users';
import { mockUser, mockSql } from '../test/mocks/database.mock';

// Mock database module
vi.mock('../db/database', () => ({
  createDatabaseClient: vi.fn(() => mockSql),
  getUserByClerkId: vi.fn(async (sql: any, clerkId: string) => {
    if (clerkId === 'clerk_test_123') {
      return mockUser;
    }
    return null;
  }),
  getUserById: vi.fn(async (sql: any, userId: string) => {
    if (userId === 'user_test_123') {
      return mockUser;
    }
    return null;
  }),
}));

describe('Users Routes', () => {
  let app: Hono;
  
  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    
    // Add mock auth middleware
    app.use('*', async (c, next) => {
      c.set('user', {
        userId: 'clerk_test_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user' as const,
        plan: 'premium' as const,
      });
      await next();
    });
    
    app.route('/api/v1/users', users);
    
    // Setup default mock responses
    mockSql.query = vi.fn().mockResolvedValue([]);
    const sqlMock = vi.fn((strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join('?');
      
      // Mock user profile query
      if (query.includes('SELECT * FROM user_profiles')) {
        return Promise.resolve([{
          goals: ['muscle_gain', 'strength'],
          experience_level: 'intermediate',
          available_days: 4,
          height: 175,
          weight: 70,
          age: 25,
          equipment_access: ['dumbbell', 'barbell'],
          workout_location: 'gym',
          injuries: [],
        }]);
      }
      
      // Mock workout stats query
      if (query.includes('COUNT(*) as workouts_completed')) {
        return Promise.resolve([{
          workouts_completed: 45,
          unique_days: 30,
        }]);
      }
      
      // Mock streak query
      if (query.includes('current_streak')) {
        return Promise.resolve([{
          current_streak: 7,
        }]);
      }
      
      // Mock PRs query
      if (query.includes('COUNT(*) as prs_set')) {
        return Promise.resolve([{
          prs_set: 12,
        }]);
      }
      
      return Promise.resolve([]);
    }) as any;
    
    Object.assign(mockSql, sqlMock);
  });

  describe('GET /api/v1/users/me', () => {
    it('should return user profile with stats', async () => {
      const res = await app.request('/api/v1/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      
      expect(data).toMatchObject({
        success: true,
        data: {
          id: 'user_test_123',
          clerkUserId: 'clerk_test_123',
          email: 'test@example.com',
          name: 'Test User',
          plan: 'premium',
          role: 'user',
          profile: {
            goals: ['muscle_gain', 'strength'],
            experienceLevel: 'intermediate',
            availableDays: 4,
            height: 175,
            weight: 70,
            age: 25,
            equipment: ['dumbbell', 'barbell'],
            workoutLocation: 'gym',
            injuries: [],
          },
          stats: {
            workoutsCompleted: 45,
            currentStreak: 7,
            prsSet: 12,
          },
        },
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Create app without auth middleware
      const unauthApp = new Hono();
      unauthApp.route('/api/v1/users', users);
      
      const res = await unauthApp.request('/api/v1/users/me', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.message).toBe('User not authenticated');
    });
  });

  describe('PUT /api/v1/users/me', () => {
    it('should update user profile', async () => {
      // Mock update queries
      mockSql.query = vi.fn()
        .mockResolvedValueOnce([]) // UPDATE users
        .mockResolvedValueOnce([{ id: 'profile_123' }]) // SELECT profile
        .mockResolvedValueOnce([]); // UPDATE profile
        
      const sqlMock = vi.fn((strings: TemplateStringsArray, ...values: any[]) => {
        const query = strings.join('?');
        
        if (query.includes('UPDATE users')) {
          return Promise.resolve([]);
        }
        
        if (query.includes('SELECT id FROM user_profiles')) {
          return Promise.resolve([{ id: 'profile_123' }]);
        }
        
        if (query.includes('UPDATE user_profiles')) {
          return Promise.resolve([]);
        }
        
        if (query.includes('SELECT * FROM user_profiles')) {
          return Promise.resolve([{
            goals: ['muscle_gain', 'fat_loss'],
            experience_level: 'advanced',
            available_days: 5,
            height: 175,
            weight: 72,
            age: 26,
          }]);
        }
        
        return Promise.resolve([]);
      }) as any;
      
      Object.assign(mockSql, sqlMock);

      const updateData = {
        name: 'Updated Test User',
        profile: {
          goals: ['muscle_gain', 'fat_loss'],
          experienceLevel: 'advanced',
          availableDays: 5,
          height: 175,
          weight: 72,
          age: 26,
        },
      };

      const res = await app.request('/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      
      expect(data).toMatchObject({
        success: true,
        message: 'Perfil actualizado exitosamente',
      });
    });
  });

  describe('GET /api/v1/users/me/progress', () => {
    it('should return user progress metrics', async () => {
      // Mock progress queries
      const sqlMock = vi.fn((strings: TemplateStringsArray, ...values: any[]) => {
        return Promise.resolve([]);
      }) as any;
      
      sqlMock.unsafe = vi.fn((query: string) => {
        if (query.includes('COUNT(*) as total_workouts')) {
          return Promise.resolve([{
            total_workouts: 12,
            avg_duration: 65,
            total_volume: 8500,
            avg_rpe: 7.2,
          }]);
        }
        
        if (query.includes('AVG(workout_count) as avg_weekly_workouts')) {
          return Promise.resolve([{
            avg_weekly_workouts: 3.5,
            weeks_active: 4,
          }]);
        }
        
        if (query.includes('day_of_week, workout_count')) {
          return Promise.resolve([
            { day_of_week: 1, workout_count: 2 },
            { day_of_week: 3, workout_count: 3 },
            { day_of_week: 5, workout_count: 2 },
          ]);
        }
        
        return Promise.resolve([]);
      });
      
      Object.assign(mockSql, sqlMock);
      
      // Mock personal records query
      mockSql.query = vi.fn((strings: TemplateStringsArray) => {
        const query = strings.join('?');
        
        if (query.includes('personal_records')) {
          return Promise.resolve([
            {
              exercise_id: 'ex_123',
              exercise_name: 'Bench Press',
              category: 'strength',
              record_type: 'max_weight',
              value: 100,
              unit: 'kg',
              achieved_at: new Date('2024-01-10'),
            },
          ]);
        }
        
        if (query.includes('available_days FROM user_profiles')) {
          return Promise.resolve([{ available_days: 4 }]);
        }
        
        return Promise.resolve([]);
      }) as any;

      const res = await app.request('/api/v1/users/me/progress?period=last_30_days', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      
      expect(data).toMatchObject({
        success: true,
        data: {
          period: 'last_30_days',
          metrics: {
            totalWorkouts: 12,
            avgWorkoutDuration: 65,
            totalVolume: 8500,
            avgRPE: '7.2',
            consistencyScore: 87,
          },
          personalRecords: expect.arrayContaining([
            expect.objectContaining({
              exerciseName: 'Bench Press',
              recordType: 'max_weight',
              value: 100,
              unit: 'kg',
            }),
          ]),
          weeklyFrequency: {
            target: 4,
            actual: '3.5',
            days: expect.any(Array),
          },
        },
      });
    });
  });

  describe('PUT /api/v1/users/me/preferences', () => {
    it('should update user preferences', async () => {
      const sqlMock = vi.fn((strings: TemplateStringsArray, ...values: any[]) => {
        const query = strings.join('?');
        
        if (query.includes('UPDATE user_profiles')) {
          return Promise.resolve([{
            preferences: { language: 'es', units: 'metric' },
            updated_at: new Date('2024-01-15'),
          }]);
        }
        
        return Promise.resolve([]);
      }) as any;
      
      Object.assign(mockSql, sqlMock);

      const preferences = {
        language: 'es',
        units: 'metric',
        notifications: {
          workouts: true,
          achievements: true,
          social: false,
        },
      };

      const res = await app.request('/api/v1/users/me/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      
      expect(data).toMatchObject({
        success: true,
        message: 'Preferencias actualizadas exitosamente',
      });
    });
  });

  describe('DELETE /api/v1/users/me', () => {
    it('should soft delete user account', async () => {
      const sqlMock = vi.fn((strings: TemplateStringsArray, ...values: any[]) => {
        const query = strings.join('?');
        
        if (query.includes('UPDATE users') && query.includes('deleted_at')) {
          return Promise.resolve([]);
        }
        
        return Promise.resolve([]);
      }) as any;
      
      Object.assign(mockSql, sqlMock);

      const res = await app.request('/api/v1/users/me', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      
      expect(data).toMatchObject({
        success: true,
        message: 'Cuenta eliminada exitosamente',
      });
    });
  });
});