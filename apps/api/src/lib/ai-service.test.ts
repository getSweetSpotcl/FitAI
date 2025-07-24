import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIService } from "./ai-service";

// Mock OpenAI module
const mockCreate = vi.fn();

vi.mock("openai", () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

describe("AIService", () => {
  let aiService: AIService;
  const mockApiKey = "test_openai_api_key";

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create service instance
    aiService = new AIService(mockApiKey);
  });

  describe("generateRoutine", () => {
    it("should generate routine for premium user", async () => {
      const mockRoutineResponse = {
        name: "Rutina de Fuerza Avanzada",
        description: "Rutina enfocada en ganancia de fuerza",
        difficulty: "advanced",
        durationWeeks: 4,
        daysPerWeek: 4,
        estimatedDuration: 75,
        targetMuscleGroups: ["chest", "triceps", "shoulders"],
        equipmentNeeded: ["barbell", "dumbbell", "bench"],
        days: [
          {
            dayOfWeek: 1,
            name: "Día 1: Pecho y Tríceps",
            description: "Enfoque en movimientos compuestos pesados",
            exercises: [
              {
                name: "Press de Banca",
                targetSets: 4,
                targetRepsMin: 6,
                targetRepsMax: 8,
                restTimeSeconds: 180,
                notes: "Enfoque en peso pesado",
              },
            ],
          },
        ],
      };

      // Mock the OpenAI response
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockRoutineResponse),
            },
          },
        ],
      });

      const request = {
        userProfile: {
          goals: ["strength", "muscle_gain"],
          experienceLevel: "advanced" as const,
          availableDays: 4,
          equipment: ["barbell", "dumbbell", "cables"],
          workoutLocation: "gym" as const,
        },
        preferences: {
          duration: 75,
        },
        plan: "premium" as const,
      };

      const result = await aiService.generateRoutine(request);

      expect(result).toBeDefined();
      expect(result.name).toBe("Rutina de Fuerza Avanzada");
      expect(result.difficulty).toBe("advanced");
      expect(result.estimatedDuration).toBe(75);
      expect(result.days).toHaveLength(1);
      expect(result.days[0].exercises).toHaveLength(1);
      
      // Verify OpenAI was called with correct parameters
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          messages: expect.any(Array),
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        })
      );
    });

    it("should generate basic routine for free user", async () => {
      const mockBasicRoutine = {
        name: "Rutina Básica de Cuerpo Completo",
        description: "Rutina simple para principiantes",
        difficulty: "beginner",
        durationWeeks: 4,
        daysPerWeek: 3,
        estimatedDuration: 45,
        targetMuscleGroups: ["full_body"],
        equipmentNeeded: ["bodyweight"],
        days: [
          {
            dayOfWeek: 1,
            name: "Día 1: Cuerpo Completo",
            description: "Ejercicios básicos",
            exercises: [
              {
                name: "Flexiones",
                targetSets: 3,
                targetRepsMin: 8,
                targetRepsMax: 12,
                restTimeSeconds: 60,
              },
            ],
          },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockBasicRoutine),
            },
          },
        ],
      });

      const request = {
        userProfile: {
          goals: ["general_fitness"],
          experienceLevel: "beginner" as const,
          availableDays: 3,
          equipment: ["bodyweight"],
          workoutLocation: "home" as const,
        },
        preferences: {
          duration: 45,
        },
        plan: "free" as const,
      };

      const result = await aiService.generateRoutine(request);

      expect(result).toBeDefined();
      expect(result.name).toBe("Rutina Básica de Cuerpo Completo");
      expect(result.difficulty).toBe("beginner");
      
      // Verify free plan uses cheaper model
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-3.5-turbo",
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        })
      );
    });

    it("should handle API errors gracefully", async () => {
      mockCreate.mockRejectedValueOnce(new Error("OpenAI API Error"));

      const request = {
        userProfile: {
          goals: ["strength"],
          experienceLevel: "intermediate" as const,
          availableDays: 3,
          equipment: ["barbell"],
          workoutLocation: "gym" as const,
        },
        preferences: {
          duration: 60,
        },
        plan: "premium" as const,
      };

      await expect(
        aiService.generateRoutine(request)
      ).rejects.toThrow("Failed to generate routine");
    });
  });

  describe("generateCoachingAdvice", () => {
    it("should generate coaching advice", async () => {
      const mockAdvice = "Excelente trabajo! Tu rendimiento muestra una progresión constante. Considera aumentar el peso en 2.5kg para el press de banca la próxima semana.";

      // Clear any previous mock state
      mockCreate.mockClear();
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: mockAdvice,
            },
          },
        ],
      });

      const workoutData = {
        exercises: [
          {
            name: "Press de Banca",
            sets: [
              { reps: 8, weight: 80 },
              { reps: 7, weight: 80 },
              { reps: 6, weight: 80 },
            ],
          },
        ],
        duration: 65,
        totalVolume: 3360,
      };

      const result = await aiService.generateCoachingAdvice(workoutData, "premium");

      expect(result).toBe(mockAdvice);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          temperature: 0.8,
          max_tokens: 500,
        })
      );
    });

    it("should provide basic advice for free users", async () => {
      const mockBasicAdvice = "¡Buen trabajo! Mantén la consistencia en tus entrenamientos.";

      // Clear any previous mock state
      mockCreate.mockClear();
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: mockBasicAdvice,
            },
          },
        ],
      });

      const workoutData = { exercises: [] };

      const result = await aiService.generateCoachingAdvice(workoutData, "free");

      expect(result).toBe(mockBasicAdvice);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-3.5-turbo",
          temperature: 0.8,
          max_tokens: 500,
        })
      );
    });
  });

  describe("analyzeExerciseForm", () => {
    it("should return placeholder response for exercise form analysis", async () => {
      const result = await aiService.analyzeExerciseForm("video_url", "Sentadilla");

      expect(result).toMatchObject({
        feedback: "Análisis de forma no disponible en esta versión",
        corrections: [],
        score: 0,
      });
      
      // This method doesn't use OpenAI yet (placeholder implementation)
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("validateAndFormatRoutine", () => {
    it("should validate and format AI-generated routine", async () => {
      const mockRoutineData = {
        name: "Test Routine",
        description: "Test description",
        difficulty: "intermediate",
        durationWeeks: 8,
        daysPerWeek: 4,
        estimatedDuration: 60,
        targetMuscleGroups: ["chest", "back"],
        equipmentNeeded: ["barbell", "dumbbell"],
        days: [
          {
            dayOfWeek: 1,
            name: "Day 1",
            description: "Chest and triceps",
            exercises: [
              {
                name: "Bench Press",
                targetSets: 4,
                targetRepsMin: 8,
                targetRepsMax: 10,
                restTimeSeconds: 120,
              },
            ],
          },
        ],
      };

      // Mock a response that will go through validateAndFormatRoutine
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockRoutineData),
            },
          },
        ],
      });

      const request = {
        userProfile: {
          goals: ["strength"],
          experienceLevel: "intermediate" as const,
          availableDays: 4,
          equipment: ["barbell", "dumbbell"],
          workoutLocation: "gym" as const,
        },
        preferences: {
          duration: 60,
        },
        plan: "premium" as const,
      };

      const result = await aiService.generateRoutine(request);

      expect(result).toMatchObject({
        name: "Test Routine",
        description: "Test description",
        difficulty: "intermediate",
        estimatedDuration: 60,
        targetMuscleGroups: ["chest", "back"],
        equipmentNeeded: ["barbell", "dumbbell"],
      });
      expect(result.days).toHaveLength(1);
      expect(result.days[0].exercises).toHaveLength(1);
    });
  });

  describe("model selection", () => {
    it("should use correct model based on user plan", async () => {
      // Test through actual method calls that use the model
      const mockResponse = {
        name: "Test",
        description: "Test",
        difficulty: "beginner",
        durationWeeks: 4,
        daysPerWeek: 3,
        estimatedDuration: 45,
        targetMuscleGroups: ["full_body"],
        equipmentNeeded: ["bodyweight"],
        days: [],
      };

      // Mock response
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse),
            },
          },
        ],
      });

      const userProfile = {
        goals: ["general_fitness"],
        experienceLevel: "beginner" as const,
        availableDays: 3,
        equipment: ["bodyweight"],
        workoutLocation: "home" as const,
      };

      // Test different plans use different models
      await aiService.generateRoutine({
        userProfile,
        preferences: { duration: 45 },
        plan: "free",
      });
      expect(mockCreate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          model: "gpt-3.5-turbo",
        })
      );

      await aiService.generateRoutine({
        userProfile,
        preferences: { duration: 45 },
        plan: "premium",
      });
      expect(mockCreate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
        })
      );

      await aiService.generateRoutine({
        userProfile,
        preferences: { duration: 45 },
        plan: "pro",
      });
      expect(mockCreate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          model: "gpt-4o",
        })
      );
    });
  });
});