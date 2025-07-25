/**
 * Form Analysis Service
 * AI-powered exercise technique analysis using OpenAI Vision API
 */

import OpenAI from "openai";

export interface ExerciseFormAnalysis {
  exerciseId: string;
  exerciseName: string;
  overallScore: number; // 0-100
  analysis: {
    setup: FormSectionAnalysis;
    execution: FormSectionAnalysis;
    completion: FormSectionAnalysis;
  };
  keyFindings: string[];
  recommendations: string[];
  commonMistakes: string[];
  safetyFlags: SafetyFlag[];
  confidence: number; // 0-100
  processedFrames: number;
}

export interface FormSectionAnalysis {
  score: number; // 0-100
  feedback: string;
  issues: FormIssue[];
  correctAspects: string[];
}

export interface FormIssue {
  type: 'posture' | 'movement' | 'timing' | 'safety' | 'range_of_motion';
  severity: 'low' | 'medium' | 'high';
  description: string;
  correction: string;
  timestamp?: number; // seconds in video
}

export interface SafetyFlag {
  type: 'injury_risk' | 'improper_load' | 'dangerous_position';
  severity: 'warning' | 'critical';
  description: string;
  immediateAction: string;
}

export interface VideoProcessingResult {
  success: boolean;
  videoId: string;
  frames: ExtractedFrame[];
  duration: number;
  error?: string;
}

export interface ExtractedFrame {
  timestamp: number;
  frameData: string; // base64 encoded image
  phase: 'setup' | 'execution' | 'completion';
}

export interface ExerciseReference {
  id: string;
  name: string;
  nameEs: string;
  category: string;
  muscleGroups: string[];
  keyPositions: {
    setup: string[];
    execution: string[];
    completion: string[];
  };
  commonMistakes: {
    description: string;
    descriptionEs: string;
    correction: string;
    correctionEs: string;
  }[];
  safetyPoints: string[];
}

export class FormAnalysisService {
  private openai: OpenAI;
  private exerciseDatabase: Map<string, ExerciseReference>;

  constructor(openaiApiKey: string) {
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
    
    // Initialize exercise reference database
    this.exerciseDatabase = this.initializeExerciseDatabase();
  }

  /**
   * Analyze exercise form from video URL
   */
  async analyzeExerciseForm(
    videoUrl: string,
    exerciseId: string,
    userLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<ExerciseFormAnalysis> {
    try {
      console.log(`Starting form analysis for exercise ${exerciseId}`);

      // Get exercise reference data
      const exerciseRef = this.exerciseDatabase.get(exerciseId);
      if (!exerciseRef) {
        throw new Error(`Exercise ${exerciseId} not found in database`);
      }

      // Process video and extract key frames
      const videoResult = await this.processVideo(videoUrl);
      if (!videoResult.success) {
        throw new Error(`Video processing failed: ${videoResult.error}`);
      }

      // Analyze each frame using OpenAI Vision
      const frameAnalyses = await this.analyzeFramesWithAI(
        videoResult.frames,
        exerciseRef,
        userLevel
      );

      // Compile comprehensive analysis
      const analysis = this.compileFormAnalysis(
        frameAnalyses,
        exerciseRef,
        videoResult.duration,
        userLevel
      );

      console.log(`Form analysis completed for ${exerciseId} with score ${analysis.overallScore}`);
      return analysis;

    } catch (error) {
      console.error('Form analysis error:', error);
      throw new Error(`Form analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process video to extract key frames
   * This is a simplified implementation - in production would use FFmpeg
   */
  private async processVideo(videoUrl: string): Promise<VideoProcessingResult> {
    try {
      // For now, we'll simulate frame extraction
      // In production, this would use FFmpeg to extract frames at specific intervals
      const mockFrames: ExtractedFrame[] = [
        {
          timestamp: 0,
          frameData: 'mock_base64_setup_frame',
          phase: 'setup'
        },
        {
          timestamp: 2,
          frameData: 'mock_base64_execution_frame',
          phase: 'execution'
        },
        {
          timestamp: 4,
          frameData: 'mock_base64_completion_frame',
          phase: 'completion'
        }
      ];

      // TODO: Implement real video processing with FFmpeg
      // 1. Download video from URL
      // 2. Use FFmpeg to extract frames at key timestamps
      // 3. Identify exercise phases (setup, execution, completion)
      // 4. Convert frames to base64 for OpenAI Vision API

      return {
        success: true,
        videoId: `video_${Date.now()}`,
        frames: mockFrames,
        duration: 6, // seconds
      };

    } catch (error) {
      console.error('Video processing error:', error);
      return {
        success: false,
        videoId: '',
        frames: [],
        duration: 0,
        error: error instanceof Error ? error.message : 'Video processing failed'
      };
    }
  }

  /**
   * Analyze frames using OpenAI Vision API
   */
  private async analyzeFramesWithAI(
    frames: ExtractedFrame[],
    exerciseRef: ExerciseReference,
    userLevel: string
  ): Promise<any[]> {
    const analyses = [];

    for (const frame of frames) {
      try {
        // Create specific prompt for this exercise and phase
        const prompt = this.createAnalysisPrompt(exerciseRef, frame.phase, userLevel);

        // For now, return mock analysis since we don't have real frame data
        // In production, this would call OpenAI Vision API:
        /*
        const response = await this.openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${frame.frameData}` }
                }
              ]
            }
          ],
          max_tokens: 1000
        });
        */

        // Mock analysis for now
        const mockAnalysis = this.generateMockFrameAnalysis(frame, exerciseRef);
        analyses.push(mockAnalysis);

      } catch (error) {
        console.error(`Error analyzing frame at ${frame.timestamp}s:`, error);
        // Continue with other frames even if one fails
        analyses.push({
          timestamp: frame.timestamp,
          phase: frame.phase,
          error: error instanceof Error ? error.message : 'Analysis failed'
        });
      }
    }

    return analyses;
  }

  /**
   * Create analysis prompt for OpenAI Vision
   */
  private createAnalysisPrompt(
    exerciseRef: ExerciseReference,
    phase: string,
    userLevel: string
  ): string {
    const levelAdjustment = {
      beginner: "Sea más tolerante con imperfecciones menores y enfóquese en aspectos fundamentales de seguridad.",
      intermediate: "Proporcione un análisis balanceado de técnica y seguridad.",
      advanced: "Sea más crítico con los detalles técnicos y optimizaciones de rendimiento."
    };

    return `
Analiza la técnica de ejercicio en esta imagen para el ejercicio: ${exerciseRef.nameEs} (${exerciseRef.name}).

FASE ACTUAL: ${phase}

INFORMACIÓN DEL EJERCICIO:
- Categoría: ${exerciseRef.category}
- Grupos musculares: ${exerciseRef.muscleGroups.join(', ')}
- Posiciones clave para esta fase: ${exerciseRef.keyPositions[phase as keyof typeof exerciseRef.keyPositions]?.join(', ')}

NIVEL DEL USUARIO: ${userLevel}
${levelAdjustment[userLevel as keyof typeof levelAdjustment]}

INSTRUCCIONES DE ANÁLISIS:
1. Evalúa la postura y alineación corporal
2. Revisa la posición de las articulaciones clave
3. Identifica cualquier desviación de la técnica correcta
4. Busca señales de riesgo de lesión
5. Considera el rango de movimiento apropiado

Proporciona tu análisis en formato JSON con:
- score: número del 0-100
- feedback: descripción detallada en español
- issues: array de problemas identificados
- correctAspects: array de aspectos ejecutados correctamente
- safetyFlags: array de banderas de seguridad si aplica

Sé específico y constructivo en tus comentarios.
`;
  }

  /**
   * Generate mock frame analysis for development
   */
  private generateMockFrameAnalysis(frame: ExtractedFrame, exerciseRef: ExerciseReference): any {
    const scores = { setup: 85, execution: 78, completion: 82 };
    const baseScore = scores[frame.phase as keyof typeof scores] || 80;

    return {
      timestamp: frame.timestamp,
      phase: frame.phase,
      score: baseScore,
      feedback: `Análisis de la fase de ${frame.phase} para ${exerciseRef.nameEs}. Técnica generalmente correcta con oportunidades de mejora.`,
      issues: [
        {
          type: 'posture',
          severity: 'medium',
          description: `Ligera desalineación en la fase de ${frame.phase}`,
          correction: 'Mantén la columna neutra y los hombros hacia atrás'
        }
      ],
      correctAspects: [
        `Buena posición inicial en fase ${frame.phase}`,
        'Rango de movimiento apropiado',
        'Control del peso adecuado'
      ],
      safetyFlags: []
    };
  }

  /**
   * Compile comprehensive form analysis from frame analyses
   */
  private compileFormAnalysis(
    frameAnalyses: any[],
    exerciseRef: ExerciseReference,
    duration: number,
    userLevel: string
  ): ExerciseFormAnalysis {
    // Calculate phase scores
    const setupFrames = frameAnalyses.filter(f => f.phase === 'setup');
    const executionFrames = frameAnalyses.filter(f => f.phase === 'execution');
    const completionFrames = frameAnalyses.filter(f => f.phase === 'completion');

    const setupScore = this.calculatePhaseScore(setupFrames);
    const executionScore = this.calculatePhaseScore(executionFrames);
    const completionScore = this.calculatePhaseScore(completionFrames);

    // Overall score (weighted by importance)
    const overallScore = Math.round(
      setupScore * 0.2 + executionScore * 0.6 + completionScore * 0.2
    );

    // Compile all issues
    const allIssues = frameAnalyses.flatMap(f => f.issues || []);
    const allSafetyFlags = frameAnalyses.flatMap(f => f.safetyFlags || []);

    // Generate recommendations based on analysis
    const recommendations = this.generateRecommendations(
      allIssues,
      exerciseRef,
      userLevel,
      overallScore
    );

    return {
      exerciseId: exerciseRef.id,
      exerciseName: exerciseRef.nameEs,
      overallScore,
      analysis: {
        setup: {
          score: setupScore,
          feedback: this.generatePhaseeFeedback('setup', setupFrames, exerciseRef),
          issues: setupFrames.flatMap(f => f.issues || []),
          correctAspects: setupFrames.flatMap(f => f.correctAspects || [])
        },
        execution: {
          score: executionScore,
          feedback: this.generatePhaseeFeedback('execution', executionFrames, exerciseRef),
          issues: executionFrames.flatMap(f => f.issues || []),
          correctAspects: executionFrames.flatMap(f => f.correctAspects || [])
        },
        completion: {
          score: completionScore,
          feedback: this.generatePhaseeFeedback('completion', completionFrames, exerciseRef),
          issues: completionFrames.flatMap(f => f.issues || []),
          correctAspects: completionFrames.flatMap(f => f.correctAspects || [])
        }
      },
      keyFindings: this.generateKeyFindings(allIssues, overallScore),
      recommendations,
      commonMistakes: exerciseRef.commonMistakes.map(m => m.descriptionEs),
      safetyFlags: allSafetyFlags,
      confidence: this.calculateConfidence(frameAnalyses.length, duration),
      processedFrames: frameAnalyses.length
    };
  }

  private calculatePhaseScore(phaseFrames: any[]): number {
    if (phaseFrames.length === 0) return 0;
    const validFrames = phaseFrames.filter(f => typeof f.score === 'number');
    if (validFrames.length === 0) return 0;
    
    const totalScore = validFrames.reduce((sum, f) => sum + f.score, 0);
    return Math.round(totalScore / validFrames.length);
  }

  private generatePhaseeFeedback(phase: string, frames: any[], exerciseRef: ExerciseReference): string {
    const avgScore = this.calculatePhaseScore(frames);
    const phaseNames = {
      setup: 'preparación',
      execution: 'ejecución',
      completion: 'finalización'
    };

    const phaseName = phaseNames[phase as keyof typeof phaseNames] || phase;
    
    if (avgScore >= 90) {
      return `Excelente técnica en la fase de ${phaseName}. Mantén este nivel de ejecución.`;
    } else if (avgScore >= 75) {
      return `Buena técnica en la fase de ${phaseName} con algunas oportunidades de mejora.`;
    } else if (avgScore >= 60) {
      return `Técnica aceptable en la fase de ${phaseName}, pero necesita atención a los detalles.`;
    } else {
      return `La fase de ${phaseName} requiere trabajo significativo para mejorar la técnica y seguridad.`;
    }
  }

  private generateKeyFindings(issues: FormIssue[], overallScore: number): string[] {
    const findings: string[] = [];

    if (overallScore >= 85) {
      findings.push('Técnica general muy sólida con ejecución consistente');
    } else if (overallScore >= 70) {
      findings.push('Técnica competente con algunos aspectos a pulir');
    } else {
      findings.push('Técnica necesita mejoras significativas para optimizar resultados y seguridad');
    }

    // Group issues by type
    const issuesByType = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(issuesByType).forEach(([type, count]) => {
      if (count >= 2) {
        const typeNames = {
          posture: 'postura',
          movement: 'movimiento',
          timing: 'ritmo',
          safety: 'seguridad',
          range_of_motion: 'rango de movimiento'
        };
        findings.push(`Patrón recurrente de problemas de ${typeNames[type as keyof typeof typeNames] || type}`);
      }
    });

    return findings.slice(0, 5); // Limit to top 5 findings
  }

  private generateRecommendations(
    issues: FormIssue[],
    exerciseRef: ExerciseReference,
    userLevel: string,
    overallScore: number
  ): string[] {
    const recommendations: string[] = [];

    // Level-specific recommendations
    if (userLevel === 'beginner' && overallScore < 70) {
      recommendations.push('Considera trabajar con un entrenador personal para establecer una base técnica sólida');
      recommendations.push('Reduce el peso y enfócate en dominar el patrón de movimiento');
    }

    // Issue-specific recommendations
    const postureIssues = issues.filter(i => i.type === 'posture').length;
    const movementIssues = issues.filter(i => i.type === 'movement').length;

    if (postureIssues >= 2) {
      recommendations.push('Dedica tiempo a ejercicios de movilidad y fortalecimiento postural');
    }

    if (movementIssues >= 2) {
      recommendations.push('Practique el movimiento sin peso para internalizar el patrón correcto');
    }

    // General recommendations
    if (overallScore < 60) {
      recommendations.push('Considera grabar más videos desde diferentes ángulos para un análisis más completo');
    }

    recommendations.push('Revisa los errores comunes de este ejercicio y realiza una autoevaluación regular');

    return recommendations.slice(0, 6); // Limit to 6 recommendations
  }

  private calculateConfidence(frameCount: number, duration: number): number {
    // Base confidence on number of frames analyzed and video duration
    let confidence = Math.min(90, frameCount * 20); // More frames = higher confidence
    
    // Adjust for video duration (longer videos generally provide better analysis)
    if (duration >= 10) confidence += 5;
    if (duration >= 30) confidence += 5;
    
    // Minimum confidence threshold
    confidence = Math.max(confidence, 40);
    
    return Math.round(confidence);
  }

  /**
   * Initialize exercise reference database
   */
  private initializeExerciseDatabase(): Map<string, ExerciseReference> {
    const exercises = new Map<string, ExerciseReference>();

    // Add common exercises with reference data
    exercises.set('bench_press', {
      id: 'bench_press',
      name: 'Bench Press',
      nameEs: 'Press de Banca',
      category: 'Compound Upper Body',
      muscleGroups: ['chest', 'triceps', 'shoulders'],
      keyPositions: {
        setup: ['Posición supina en banco', 'Pies firmes en el suelo', 'Retracción escapular', 'Agarre simétrico de la barra'],
        execution: ['Descenso controlado al pecho', 'Pausa breve en el pecho', 'Empuje explosivo hacia arriba', 'Codos a 45 grados'],
        completion: ['Extensión completa de brazos', 'Control de la barra', 'Respiración controlada']
      },
      commonMistakes: [
        {
          description: 'Bouncing the bar off the chest',
          descriptionEs: 'Rebotar la barra en el pecho',
          correction: 'Control the descent and pause briefly on chest',
          correctionEs: 'Controla el descenso y haz una pausa breve en el pecho'
        },
        {
          description: 'Flaring elbows too wide',
          descriptionEs: 'Abrir demasiado los codos',
          correction: 'Keep elbows at 45-degree angle',
          correctionEs: 'Mantén los codos en ángulo de 45 grados'
        }
      ],
      safetyPoints: ['Always use a spotter', 'Check bar balance', 'Maintain shoulder blade retraction']
    });

    exercises.set('squat', {
      id: 'squat',
      name: 'Squat',
      nameEs: 'Sentadilla',
      category: 'Compound Lower Body',
      muscleGroups: ['quadriceps', 'glutes', 'hamstrings', 'core'],
      keyPositions: {
        setup: ['Pies separados al ancho de hombros', 'Barra centrada en trapecios', 'Core activado', 'Mirada al frente'],
        execution: ['Descenso con cadera hacia atrás', 'Rodillas siguiendo dirección de pies', 'Profundidad apropiada', 'Pecho arriba'],
        completion: ['Empuje desde talones', 'Extensión completa de cadera', 'Rodillas alineadas', 'Postura erecta']
      },
      commonMistakes: [
        {
          description: 'Knees caving inward',
          descriptionEs: 'Rodillas colapsando hacia adentro',
          correction: 'Push knees out in line with toes',
          correctionEs: 'Empuja las rodillas en línea con los dedos de los pies'
        }
      ],
      safetyPoints: ['Proper depth without rounding back', 'Keep chest up', 'Drive through heels']
    });

    exercises.set('deadlift', {
      id: 'deadlift',
      name: 'Deadlift',
      nameEs: 'Peso Muerto',
      category: 'Compound Full Body',
      muscleGroups: ['hamstrings', 'glutes', 'back', 'traps', 'core'],
      keyPositions: {
        setup: ['Barra sobre medio pie', 'Posición de pies estable', 'Agarre firme', 'Columna neutra'],
        execution: ['Empuje desde piernas', 'Cadera hacia adelante', 'Barra pegada al cuerpo', 'Extensión simultánea'],
        completion: ['Posición erecta completa', 'Hombros hacia atrás', 'Cadera completamente extendida']
      },
      commonMistakes: [
        {
          description: 'Rounding the back',
          descriptionEs: 'Redondear la espalda',
          correction: 'Maintain neutral spine throughout',
          correctionEs: 'Mantén la columna neutra durante todo el movimiento'
        }
      ],
      safetyPoints: ['Never round the back', 'Keep bar close to body', 'Full hip extension at top']
    });

    return exercises;
  }

  /**
   * Get available exercises for analysis
   */
  getAvailableExercises(): ExerciseReference[] {
    return Array.from(this.exerciseDatabase.values());
  }

  /**
   * Check if exercise is supported for form analysis
   */
  isExerciseSupported(exerciseId: string): boolean {
    return this.exerciseDatabase.has(exerciseId);
  }
}