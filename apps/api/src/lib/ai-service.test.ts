import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIService } from './ai-service';

// Mock fetch globally
global.fetch = vi.fn();

describe('AIService', () => {
  let aiService: AIService;
  const mockApiKey = 'test_openai_api_key';
  
  beforeEach(() => {
    vi.clearAllMocks();
    aiService = new AIService(mockApiKey);
  });

  describe('generateRoutine', () => {
    it('should generate routine for premium user', async () => {
      const mockResponse = {
        name: 'Rutina de Fuerza Avanzada',
        description: 'Rutina enfocada en ganancia de fuerza',
        weeks: [
          {
            weekNumber: 1,
            days: [
              {
                dayNumber: 1,
                dayName: 'Lunes',
                focusArea: 'Pecho y Tríceps',
                exercises: [
                  {
                    exerciseId: 'bench_press',
                    exerciseName: 'Press de Banca',
                    sets: 4,
                    reps: '6-8',
                    weight: 'Progresivo',
                    restSeconds: 180,
                    notes: 'Enfoque en peso pesado',
                  },
                ],
              },
            ],
          },
        ],
        difficulty: 'advanced',
        estimatedDuration: 75,
        targetMuscleGroups: ['chest', 'triceps'],
        equipmentNeeded: ['barbell', 'dumbbell'],
        progressionTips: ['Incrementa peso 2.5kg cada semana'],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const routineParams = {
        goals: ['strength', 'muscle_gain'],
        experienceLevel: 'advanced',
        availableDays: 4,
        sessionDuration: 75,
        equipment: ['barbell', 'dumbbell', 'pullup_bar'],
        targetMuscleGroups: ['chest', 'back', 'legs'],
        preferences: {
          workoutStyle: 'strength',
          intensity: 'high',
        },
      };

      const result = await aiService.generateRoutine(routineParams, 'premium');

      expect(result).toMatchObject(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockApiKey}`,
          },
          body: expect.stringContaining('gpt-4o-mini'),
        })
      );
    });

    it('should generate basic routine for free user', async () => {
      const mockResponse = {
        name: 'Rutina Básica de Cuerpo Completo',
        description: 'Rutina simple para principiantes',
        weeks: [
          {
            weekNumber: 1,
            days: [
              {
                dayNumber: 1,
                dayName: 'Lunes',
                exercises: [
                  {
                    exerciseId: 'squat',
                    exerciseName: 'Sentadilla',
                    sets: 3,
                    reps: '10-12',
                    restSeconds: 90,
                  },
                ],
              },
            ],
          },
        ],
        difficulty: 'beginner',
        estimatedDuration: 45,
        targetMuscleGroups: ['full_body'],
        equipmentNeeded: ['bodyweight'],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const routineParams = {
        goals: ['general_fitness'],
        experienceLevel: 'beginner',
        availableDays: 3,
        sessionDuration: 45,
        equipment: ['bodyweight'],
      };

      const result = await aiService.generateRoutine(routineParams, 'free');

      expect(result).toMatchObject(mockResponse);
      expect(result.weeks[0].days.length).toBeLessThanOrEqual(3); // Free users get limited days
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const routineParams = {
        goals: ['strength'],
        experienceLevel: 'intermediate',
        availableDays: 4,
        sessionDuration: 60,
        equipment: ['barbell'],
      };

      await expect(
        aiService.generateRoutine(routineParams, 'premium')
      ).rejects.toThrow('Failed to generate routine');
    });
  });

  describe('generateCoachingAdvice', () => {
    it('should generate coaching advice', async () => {
      const mockAdvice = 'Excelente trabajo! Tu rendimiento muestra una progresión constante. Considera aumentar el peso en 2.5kg para el press de banca la próxima semana.';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: mockAdvice,
              },
            },
          ],
        }),
      });

      const workoutData = {
        exercises: [
          {
            name: 'Press de Banca',
            sets: [
              { reps: 8, weight: 80, rpe: 7 },
              { reps: 8, weight: 80, rpe: 8 },
              { reps: 7, weight: 80, rpe: 9 },
            ],
          },
        ],
        duration: 65,
        overallRating: 8,
      };

      const result = await aiService.generateCoachingAdvice(workoutData, 'premium');

      expect(result).toBe(mockAdvice);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('entrenador personal experto'),
        })
      );
    });

    it('should provide basic advice for free users', async () => {
      const mockAdvice = '¡Buen trabajo! Mantén la consistencia en tus entrenamientos.';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: mockAdvice,
              },
            },
          ],
        }),
      });

      const workoutData = {
        exercises: [],
        duration: 45,
        overallRating: 7,
      };

      const result = await aiService.generateCoachingAdvice(workoutData, 'free');

      expect(result).toBe(mockAdvice);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining('gpt-3.5-turbo'),
        })
      );
    });
  });

  describe('analyzeExerciseForm', () => {
    it('should analyze exercise form for premium users', async () => {
      const mockAnalysis = {
        feedback: 'Tu técnica de sentadilla muestra buena profundidad',
        corrections: [
          'Mantén las rodillas alineadas con los pies',
          'Asegúrate de mantener la espalda recta',
        ],
        safetyScore: 8.5,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockAnalysis),
              },
            },
          ],
        }),
      });

      const result = await aiService.analyzeExerciseForm('video_url_here', 'squat');

      expect(result).toMatchObject(mockAnalysis);
    });
  });

  describe('validateAndFormatRoutine', () => {
    it('should validate and format AI-generated routine', () => {
      const rawRoutineData = {
        name: 'Test Routine',
        description: 'Test Description',
        weeks: [
          {
            weekNumber: 1,
            days: [
              {
                dayNumber: 1,
                exercises: [
                  {
                    exerciseId: 'test_exercise',
                    sets: 3,
                    reps: '8-10',
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = (aiService as any).validateAndFormatRoutine(rawRoutineData);

      expect(result).toMatchObject({
        name: 'Test Routine',
        description: 'Test Description',
        weeks: expect.any(Array),
        difficulty: 'intermediate',
        estimatedDuration: 60,
        targetMuscleGroups: [],
        equipmentNeeded: [],
      });
    });
  });

  describe('model selection', () => {
    it('should use correct model based on user plan', () => {
      const service = new AIService(mockApiKey);
      
      expect((service as any).modelByPlan).toEqual({
        free: 'gpt-3.5-turbo',
        premium: 'gpt-4o-mini',
        pro: 'gpt-4o',
      });
    });
  });
});