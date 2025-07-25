/**
 * Smart Health Sync Service
 * Advanced bidirectional synchronization with Apple HealthKit and intelligent health recommendations
 */

import OpenAI from "openai";
import type { DatabaseClient } from "../db/database";

export interface HealthSyncConfiguration {
  userId: string;
  syncEnabled: boolean;
  syncFrequency: 'real_time' | 'hourly' | 'daily';
  autoWriteEnabled: boolean; // Write FitAI workouts back to HealthKit
  priorityMetrics: string[]; // Metrics to sync with higher frequency
  intelligentRecommendations: boolean;
}

export interface SmartHealthRecommendation {
  id: string;
  type: 'workout_adjustment' | 'recovery_day' | 'nutrition' | 'sleep' | 'hydration';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  aiReasoning: string;
  actionItems: string[];
  dataSupporting: {
    metricType: string;
    value: number;
    threshold: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  confidence: number; // 0-100
  validUntil: Date;
  implemented?: boolean;
}

export interface BiDirectionalSyncResult {
  success: boolean;
  syncDirection: 'from_healthkit' | 'to_healthkit' | 'bidirectional';
  recordsProcessed: {
    fromHealthKit: number;
    toHealthKit: number;
  };
  newRecommendations: SmartHealthRecommendation[];
  syncTime: Date;
  nextSyncAt: Date;
  errors?: string[];
}

export interface HealthKitWorkoutExport {
  workoutSessionId: string;
  workoutType: string; // HKWorkoutActivityType
  startDate: Date;
  endDate: Date;
  duration: number; // seconds
  totalEnergyBurned: number; // kcal
  totalDistance?: number; // meters
  heartRateData?: {
    timestamp: Date;
    value: number;
  }[];
  metadata: {
    source: 'FitAI';
    routineName?: string;
    exerciseCount: number;
    totalVolume?: number;
    averageRPE?: number;
  };
}

export class SmartHealthSyncService {
  private openai: OpenAI;

  constructor(
    private database: DatabaseClient,
    openaiApiKey: string
  ) {
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
  }

  /**
   * Perform intelligent bidirectional sync with HealthKit
   */
  async performSmartSync(userId: string): Promise<BiDirectionalSyncResult> {
    try {
      console.log(`Starting smart health sync for user ${userId}`);

      // Get user's sync configuration
      const syncConfig = await this.getSyncConfiguration(userId);
      if (!syncConfig.syncEnabled) {
        throw new Error('Health sync is disabled for this user');
      }

      const result: BiDirectionalSyncResult = {
        success: true,
        syncDirection: 'bidirectional',
        recordsProcessed: {
          fromHealthKit: 0,
          toHealthKit: 0
        },
        newRecommendations: [],
        syncTime: new Date(),
        nextSyncAt: this.calculateNextSyncTime(syncConfig.syncFrequency),
        errors: []
      };

      // Phase 1: Sync FROM HealthKit (import new health data)
      try {
        const importResult = await this.syncFromHealthKit(userId, syncConfig);
        result.recordsProcessed.fromHealthKit = importResult.recordsImported;
      } catch (error) {
        result.errors?.push(`Import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Phase 2: Sync TO HealthKit (export FitAI workouts)
      if (syncConfig.autoWriteEnabled) {
        try {
          const exportResult = await this.syncToHealthKit(userId);
          result.recordsProcessed.toHealthKit = exportResult.recordsExported;
        } catch (error) {
          result.errors?.push(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Phase 3: Generate intelligent recommendations
      if (syncConfig.intelligentRecommendations) {
        try {
          const recommendations = await this.generateSmartRecommendations(userId);
          result.newRecommendations = recommendations;
        } catch (error) {
          result.errors?.push(`Recommendations error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update sync status
      await this.updateSyncStatus(userId, result);

      console.log(`Smart sync completed for user ${userId}:`, result);
      return result;

    } catch (error) {
      console.error('Smart health sync error:', error);
      return {
        success: false,
        syncDirection: 'bidirectional',
        recordsProcessed: { fromHealthKit: 0, toHealthKit: 0 },
        newRecommendations: [],
        syncTime: new Date(),
        nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        errors: [error instanceof Error ? error.message : 'Unknown sync error']
      };
    }
  }

  /**
   * Sync health data FROM HealthKit into FitAI database
   */
  private async syncFromHealthKit(userId: string, config: HealthSyncConfiguration): Promise<{ recordsImported: number }> {
    // This would normally call HealthKit APIs or process data from the mobile app
    // For now, we'll simulate the process and focus on the database operations

    let recordsImported = 0;

    // Get the last sync timestamp
    const lastSync = await this.getLastSyncTimestamp(userId, 'from_healthkit');
    const since = lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default 24 hours

    // Simulate importing priority metrics with higher resolution
    for (const metricType of config.priorityMetrics) {
      try {
        // In production, this would call HealthKit APIs
        const mockHealthData = this.generateMockHealthData(metricType, since);
        
        if (mockHealthData.length > 0) {
          await this.batchInsertHealthMetrics(userId, mockHealthData);
          recordsImported += mockHealthData.length;
        }
      } catch (error) {
        console.error(`Error importing ${metricType}:`, error);
      }
    }

    // Import workouts from HealthKit
    try {
      const mockWorkouts = this.generateMockHealthKitWorkouts(since);
      if (mockWorkouts.length > 0) {
        await this.importHealthKitWorkouts(userId, mockWorkouts);
        recordsImported += mockWorkouts.length;
      }
    } catch (error) {
      console.error('Error importing HealthKit workouts:', error);
    }

    // Update last sync timestamp
    await this.updateLastSyncTimestamp(userId, 'from_healthkit');

    return { recordsImported };
  }

  /**
   * Sync FitAI workout data TO HealthKit
   */
  private async syncToHealthKit(userId: string): Promise<{ recordsExported: number }> {
    let recordsExported = 0;

    try {
      // Get unsynced FitAI workouts
      const unsyncedWorkouts = await this.getUnsyncedWorkouts(userId);

      for (const workout of unsyncedWorkouts) {
        try {
          // Convert FitAI workout to HealthKit format
          const healthKitWorkout = await this.convertToHealthKitWorkout(workout);
          
          // In production, this would write to HealthKit
          // For now, we'll just mark as exported and store the conversion
          await this.markWorkoutAsExported(workout.id, healthKitWorkout);
          recordsExported++;

          console.log(`Exported workout ${workout.id} to HealthKit format`);
        } catch (error) {
          console.error(`Error exporting workout ${workout.id}:`, error);
        }
      }

      // Update last sync timestamp
      await this.updateLastSyncTimestamp(userId, 'to_healthkit');

    } catch (error) {
      console.error('Error in syncToHealthKit:', error);
    }

    return { recordsExported };
  }

  /**
   * Generate intelligent health recommendations using AI
   */
  async generateSmartRecommendations(userId: string): Promise<SmartHealthRecommendation[]> {
    try {
      // Get recent health data for analysis
      const healthData = await this.getRecentHealthDataForAnalysis(userId);
      
      if (!healthData || Object.keys(healthData).length === 0) {
        return [];
      }

      // Create AI prompt for health analysis
      const prompt = this.createHealthAnalysisPrompt(healthData);

      // Call OpenAI for intelligent analysis
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Eres un especialista en salud y fitness que analiza datos de salud para generar recomendaciones personalizadas. Responde en español y sé específico en tus recomendaciones."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      });

      // Parse AI response and create structured recommendations
      const aiAnalysis = response.choices[0]?.message?.content || '';
      const recommendations = await this.parseAIRecommendations(userId, aiAnalysis, healthData);

      // Save recommendations to database
      for (const recommendation of recommendations) {
        await this.saveRecommendation(userId, recommendation);
      }

      return recommendations;

    } catch (error) {
      console.error('Error generating smart recommendations:', error);
      return [];
    }
  }

  /**
   * Get user's sync configuration
   */
  async getSyncConfiguration(userId: string): Promise<HealthSyncConfiguration> {
    try {
      const result = await this.database`
        SELECT * FROM health_sync_configs 
        WHERE user_id = ${userId}
        LIMIT 1
      `;

      if ((result as any[]).length === 0) {
        // Create default configuration
        return await this.createDefaultSyncConfig(userId);
      }

      const config = (result as any[])[0];
      return {
        userId,
        syncEnabled: config.sync_enabled || false,
        syncFrequency: config.sync_frequency || 'daily',
        autoWriteEnabled: config.auto_write_enabled || false,
        priorityMetrics: JSON.parse(config.priority_metrics || '["heart_rate", "steps", "calories"]'),
        intelligentRecommendations: config.intelligent_recommendations || true
      };
    } catch (error) {
      console.error('Error getting sync configuration:', error);
      // Return safe defaults
      return {
        userId,
        syncEnabled: true,
        syncFrequency: 'daily',
        autoWriteEnabled: false,
        priorityMetrics: ['heart_rate', 'steps', 'calories'],
        intelligentRecommendations: true
      };
    }
  }

  /**
   * Create default sync configuration for new users
   */
  private async createDefaultSyncConfig(userId: string): Promise<HealthSyncConfiguration> {
    const defaultConfig: HealthSyncConfiguration = {
      userId,
      syncEnabled: true,
      syncFrequency: 'daily',
      autoWriteEnabled: false,
      priorityMetrics: ['heart_rate', 'steps', 'calories', 'sleep_analysis'],
      intelligentRecommendations: true
    };

    try {
      await this.database`
        INSERT INTO health_sync_configs (
          user_id, sync_enabled, sync_frequency, auto_write_enabled,
          priority_metrics, intelligent_recommendations, created_at
        ) VALUES (
          ${userId}, ${defaultConfig.syncEnabled}, ${defaultConfig.syncFrequency},
          ${defaultConfig.autoWriteEnabled}, ${JSON.stringify(defaultConfig.priorityMetrics)},
          ${defaultConfig.intelligentRecommendations}, NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          sync_enabled = EXCLUDED.sync_enabled,
          updated_at = NOW()
      `;
    } catch (error) {
      console.error('Error creating default sync config:', error);
    }

    return defaultConfig;
  }

  /**
   * Calculate next sync time based on frequency
   */
  private calculateNextSyncTime(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'real_time':
        return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      case 'daily':
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    }
  }

  /**
   * Generate mock health data for development/testing
   */
  private generateMockHealthData(metricType: string, since: Date): any[] {
    const mockData = [];
    const now = new Date();
    const hoursSinceSync = Math.floor((now.getTime() - since.getTime()) / (1000 * 60 * 60));
    
    // Generate data points based on metric type
    for (let i = 0; i < Math.min(hoursSinceSync, 24); i++) {
      const timestamp = new Date(since.getTime() + i * 60 * 60 * 1000);
      
      let value, unit;
      switch (metricType) {
        case 'heart_rate':
          value = 60 + Math.random() * 40; // 60-100 bpm
          unit = 'bpm';
          break;
        case 'steps':
          value = Math.floor(Math.random() * 2000) + 500; // 500-2500 steps per hour
          unit = 'count';
          break;
        case 'calories':
          value = Math.floor(Math.random() * 100) + 50; // 50-150 calories per hour
          unit = 'kcal';
          break;
        default:
          continue;
      }

      mockData.push({
        metric_type: metricType,
        value,
        unit,
        recorded_at: timestamp,
        source: 'HealthKit',
        source_uuid: `mock_${metricType}_${timestamp.getTime()}`
      });
    }

    return mockData;
  }

  /**
   * Generate mock HealthKit workouts for development
   */
  private generateMockHealthKitWorkouts(since: Date): any[] {
    const workoutTypes = ['running', 'cycling', 'strength_training', 'yoga'];
    const mockWorkouts = [];
    
    // Generate 1-3 workouts since last sync
    const workoutCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < workoutCount; i++) {
      const startTime = new Date(since.getTime() + Math.random() * (Date.now() - since.getTime()));
      const duration = (20 + Math.random() * 40) * 60; // 20-60 minutes in seconds
      const endTime = new Date(startTime.getTime() + duration * 1000);
      
      mockWorkouts.push({
        healthkit_uuid: `mock_workout_${startTime.getTime()}`,
        workout_type: workoutTypes[Math.floor(Math.random() * workoutTypes.length)],
        start_time: startTime,
        end_time: endTime,
        duration_seconds: duration,
        total_energy_burned: Math.floor(duration * 0.1), // ~6 kcal/min
        total_distance: Math.random() > 0.5 ? Math.random() * 5000 : null, // 0-5km
        source: 'HealthKit'
      });
    }
    
    return mockWorkouts;
  }

  /**
   * Batch insert health metrics
   */
  private async batchInsertHealthMetrics(userId: string, metrics: any[]): Promise<void> {
    if (metrics.length === 0) return;

    try {
      // Insert metrics one by one using parameterized queries for safety
      for (const metric of metrics) {
        await this.database`
          INSERT INTO health_metrics (
            id, user_id, metric_type, value, unit, recorded_at, source, source_uuid
          ) VALUES (
            ${crypto.randomUUID()}, ${userId}, ${metric.metric_type}, 
            ${metric.value}, ${metric.unit}, ${metric.recorded_at.toISOString()}, 
            ${metric.source}, ${metric.source_uuid}
          )
          ON CONFLICT (user_id, source_uuid) DO NOTHING
        `;
      }
    } catch (error) {
      console.error('Batch insert health metrics error:', error);
      throw error;
    }
  }

  /**
   * Import HealthKit workouts
   */
  private async importHealthKitWorkouts(userId: string, workouts: any[]): Promise<void> {
    for (const workout of workouts) {
      try {
        await this.database`
          INSERT INTO health_workouts (
            id, user_id, healthkit_uuid, workout_type, start_time, end_time,
            duration_seconds, total_energy_burned, total_distance, source, created_at
          ) VALUES (
            ${crypto.randomUUID()}, ${userId}, ${workout.healthkit_uuid},
            ${workout.workout_type}, ${workout.start_time.toISOString()}, ${workout.end_time.toISOString()},
            ${workout.duration_seconds}, ${workout.total_energy_burned}, ${workout.total_distance},
            ${workout.source}, NOW()
          )
          ON CONFLICT (healthkit_uuid) DO NOTHING
        `;
      } catch (error) {
        console.error(`Error importing HealthKit workout ${workout.healthkit_uuid}:`, error);
      }
    }
  }

  /**
   * Get unsynced FitAI workouts for export to HealthKit
   */
  private async getUnsyncedWorkouts(userId: string): Promise<any[]> {
    try {
      const result = await this.database`
        SELECT ws.*, r.name as routine_name
        FROM workout_sessions ws 
        LEFT JOIN routines r ON ws.routine_id = r.id
        WHERE ws.user_id = ${userId} 
          AND ws.completed_at IS NOT NULL
          AND ws.exported_to_healthkit = false
          AND ws.started_at >= NOW() - INTERVAL '7 days'
        ORDER BY ws.started_at DESC
        LIMIT 10
      `;

      return result as any[];
    } catch (error) {
      console.error('Error getting unsynced workouts:', error);
      return [];
    }
  }

  /**
   * Convert FitAI workout to HealthKit format
   */
  private async convertToHealthKitWorkout(workout: any): Promise<HealthKitWorkoutExport> {
    try {
      // Get workout sets for additional data
      const sets = await this.database`
        SELECT COUNT(*) as exercise_count, SUM(reps * weight_kg) as total_volume
        FROM workout_sets 
        WHERE workout_session_id = ${workout.id}
      `;

      const setsData = (sets as any[])[0] || {};

      // Map FitAI workout types to HealthKit workout types
      const healthKitType = this.mapToHealthKitWorkoutType(workout.routine_name || 'Strength Training');

      return {
        workoutSessionId: workout.id,
        workoutType: healthKitType,
        startDate: new Date(workout.started_at),
        endDate: new Date(workout.completed_at),
        duration: workout.duration_minutes * 60, // Convert to seconds
        totalEnergyBurned: this.estimateCaloriesBurned(workout.duration_minutes, workout.total_volume_kg),
        totalDistance: undefined, // FitAI doesn't track distance
        heartRateData: [], // Would be populated from heart rate records
        metadata: {
          source: 'FitAI',
          routineName: workout.routine_name,
          exerciseCount: parseInt(setsData.exercise_count) || 0,
          totalVolume: parseFloat(setsData.total_volume) || 0,
          averageRPE: workout.average_rpe
        }
      };
    } catch (error) {
      console.error('Error converting workout to HealthKit format:', error);
      throw error;
    }
  }

  /**
   * Map FitAI routine to HealthKit workout type
   */
  private mapToHealthKitWorkoutType(routineName: string): string {
    const name = routineName.toLowerCase();
    
    if (name.includes('cardio') || name.includes('running')) return 'HKWorkoutActivityTypeRunning';
    if (name.includes('cycling') || name.includes('bike')) return 'HKWorkoutActivityTypeCycling';
    if (name.includes('yoga')) return 'HKWorkoutActivityTypeYoga';
    if (name.includes('hiit')) return 'HKWorkoutActivityTypeHighIntensityIntervalTraining';
    if (name.includes('swimming')) return 'HKWorkoutActivityTypeSwimming';
    
    // Default to functional strength training
    return 'HKWorkoutActivityTypeFunctionalStrengthTraining';
  }

  /**
   * Estimate calories burned for workout
   */
  private estimateCaloriesBurned(durationMinutes: number, totalVolume?: number): number {
    // Simple estimation: 6 kcal/min for strength training + volume bonus
    const baseCalories = durationMinutes * 6;
    const volumeBonus = totalVolume ? Math.floor(totalVolume / 1000) * 10 : 0;
    
    return Math.round(baseCalories + volumeBonus);
  }

  /**
   * Mark workout as exported to HealthKit
   */
  private async markWorkoutAsExported(workoutId: string, healthKitData: HealthKitWorkoutExport): Promise<void> {
    try {
      await this.database`
        UPDATE workout_sessions 
        SET 
          exported_to_healthkit = true,
          healthkit_export_data = ${JSON.stringify(healthKitData)},
          exported_at = NOW()
        WHERE id = ${workoutId}
      `;
    } catch (error) {
      console.error('Error marking workout as exported:', error);
    }
  }

  /**
   * Get recent health data for AI analysis
   */
  private async getRecentHealthDataForAnalysis(userId: string): Promise<any> {
    try {
      const [metrics, workouts, sleep, hrv] = await Promise.all([
        // Recent health metrics
        this.database`
          SELECT metric_type, AVG(value) as avg_value, MAX(value) as max_value, 
                 MIN(value) as min_value, COUNT(*) as count, unit
          FROM health_metrics 
          WHERE user_id = ${userId} 
            AND recorded_at >= NOW() - INTERVAL '7 days'
          GROUP BY metric_type, unit
        `,
        
        // Recent workouts
        this.database`
          SELECT COUNT(*) as total_workouts, AVG(duration_minutes) as avg_duration,
                 AVG(total_volume_kg) as avg_volume, AVG(average_rpe) as avg_rpe
          FROM workout_sessions
          WHERE user_id = ${userId} 
            AND completed_at IS NOT NULL
            AND started_at >= NOW() - INTERVAL '7 days'
        `,
        
        // Recent sleep data
        this.database`
          SELECT AVG(total_sleep_minutes) as avg_sleep_minutes,
                 AVG(sleep_efficiency) as avg_efficiency,
                 AVG(sleep_quality_score) as avg_quality
          FROM health_sleep_data
          WHERE user_id = ${userId}
            AND sleep_start >= NOW() - INTERVAL '7 days'
        `,
        
        // Latest HRV data
        this.database`
          SELECT AVG(rmssd_ms) as avg_rmssd, AVG(recovery_score) as avg_recovery,
                 AVG(stress_score) as avg_stress
          FROM health_hrv_data
          WHERE user_id = ${userId}
            AND recorded_at >= NOW() - INTERVAL '7 days'
        `
      ]);

      return {
        metrics: metrics as any[],
        workouts: (workouts as any[])[0] || {},
        sleep: (sleep as any[])[0] || {},
        hrv: (hrv as any[])[0] || {},
        analysisDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting health data for analysis:', error);
      return {};
    }
  }

  /**
   * Create AI prompt for health analysis
   */
  private createHealthAnalysisPrompt(healthData: any): string {
    return `
Analiza los siguientes datos de salud de los últimos 7 días y genera recomendaciones específicas:

MÉTRICAS DE SALUD:
${healthData.metrics?.map((m: any) => 
  `- ${m.metric_type}: Promedio ${Math.round(m.avg_value)} ${m.unit}, Rango ${Math.round(m.min_value)}-${Math.round(m.max_value)}`
).join('\n') || 'No hay datos de métricas'}

ENTRENAMIENTOS:
- Total de entrenamientos: ${healthData.workouts?.total_workouts || 0}
- Duración promedio: ${Math.round(healthData.workouts?.avg_duration || 0)} minutos
- RPE promedio: ${Math.round((healthData.workouts?.avg_rpe || 0) * 10) / 10}
- Volumen promedio: ${Math.round(healthData.workouts?.avg_volume || 0)} kg

SUEÑO:
- Horas promedio: ${Math.round((healthData.sleep?.avg_sleep_minutes || 0) / 60 * 10) / 10}
- Eficiencia promedio: ${Math.round(healthData.sleep?.avg_efficiency || 0)}%
- Calidad promedio: ${Math.round(healthData.sleep?.avg_quality || 0)}/100

HRV Y RECUPERACIÓN:
- RMSSD promedio: ${Math.round(healthData.hrv?.avg_rmssd || 0)} ms
- Score de recuperación: ${Math.round(healthData.hrv?.avg_recovery || 0)}/100
- Score de estrés: ${Math.round(healthData.hrv?.avg_stress || 0)}/100

Genera recomendaciones estructuradas en formato JSON con esta estructura:
{
  "recommendations": [
    {
      "type": "workout_adjustment|recovery_day|nutrition|sleep|hydration",
      "severity": "info|warning|critical",
      "title": "Título conciso",
      "description": "Descripción detallada",
      "aiReasoning": "Por qué esta recomendación es importante",
      "actionItems": ["Acción específica 1", "Acción específica 2"],
      "confidence": 85
    }
  ]
}

Enfócate en recomendaciones prácticas y específicas. Identifica patrones problemáticos y sugiere acciones concretas.
`;
  }

  /**
   * Parse AI recommendations and create structured objects
   */
  private async parseAIRecommendations(
    userId: string, 
    aiAnalysis: string, 
    healthData: any
  ): Promise<SmartHealthRecommendation[]> {
    try {
      // Try to parse JSON from AI response
      const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const recommendations: SmartHealthRecommendation[] = [];

      for (const rec of parsed.recommendations || []) {
        recommendations.push({
          id: crypto.randomUUID(),
          type: rec.type || 'workout_adjustment',
          severity: rec.severity || 'info',
          title: rec.title || 'Recomendación de salud',
          description: rec.description || '',
          aiReasoning: rec.aiReasoning || '',
          actionItems: rec.actionItems || [],
          dataSupporting: this.extractSupportingData(rec.type, healthData),
          confidence: rec.confidence || 70,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          implemented: false
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error parsing AI recommendations:', error);
      // Return fallback recommendations
      return this.generateFallbackRecommendations(healthData);
    }
  }

  /**
   * Extract supporting data for recommendations
   */
  private extractSupportingData(type: string, healthData: any): any[] {
    const supporting = [];

    switch (type) {
      case 'sleep':
        if (healthData.sleep?.avg_sleep_minutes) {
          const hours = healthData.sleep.avg_sleep_minutes / 60;
          supporting.push({
            metricType: 'sleep_duration',
            value: hours,
            threshold: 7,
            trend: hours >= 7 ? 'stable' : 'declining'
          });
        }
        break;
      
      case 'recovery_day':
        if (healthData.hrv?.avg_recovery) {
          supporting.push({
            metricType: 'recovery_score',
            value: healthData.hrv.avg_recovery,
            threshold: 70,
            trend: healthData.hrv.avg_recovery >= 70 ? 'stable' : 'declining'
          });
        }
        break;
    }

    return supporting;
  }

  /**
   * Generate fallback recommendations if AI parsing fails
   */
  private generateFallbackRecommendations(healthData: any): SmartHealthRecommendation[] {
    const recommendations: SmartHealthRecommendation[] = [];

    // Sleep recommendation
    if (healthData.sleep?.avg_sleep_minutes) {
      const hours = healthData.sleep.avg_sleep_minutes / 60;
      if (hours < 7) {
        recommendations.push({
          id: crypto.randomUUID(),
          type: 'sleep',
          severity: 'warning',
          title: 'Mejorar duración del sueño',
          description: `Tu promedio de sueño es ${Math.round(hours * 10) / 10} horas. Se recomienda dormir 7-9 horas por noche.`,
          aiReasoning: 'El sueño insuficiente afecta la recuperación y el rendimiento deportivo.',
          actionItems: [
            'Establece una rutina de sueño consistente',
            'Evita pantallas 1 hora antes de dormir',
            'Considera técnicas de relajación'
          ],
          dataSupporting: [{
            metricType: 'sleep_duration',
            value: hours,
            threshold: 7,
            trend: 'declining'
          }],
          confidence: 85,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          implemented: false
        });
      }
    }

    return recommendations;
  }

  /**
   * Save recommendation to database
   */
  private async saveRecommendation(userId: string, recommendation: SmartHealthRecommendation): Promise<void> {
    try {
      await this.database`
        INSERT INTO smart_health_recommendations (
          id, user_id, type, severity, title, description, ai_reasoning,
          action_items, data_supporting, confidence, valid_until, created_at
        ) VALUES (
          ${recommendation.id}, ${userId}, ${recommendation.type}, ${recommendation.severity},
          ${recommendation.title}, ${recommendation.description}, ${recommendation.aiReasoning},
          ${JSON.stringify(recommendation.actionItems)}, ${JSON.stringify(recommendation.dataSupporting)},
          ${recommendation.confidence}, ${recommendation.validUntil.toISOString()}, NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;
    } catch (error) {
      console.error('Error saving recommendation:', error);
    }
  }

  /**
   * Update sync status in database
   */
  private async updateSyncStatus(userId: string, result: BiDirectionalSyncResult): Promise<void> {
    try {
      await this.database`
        INSERT INTO health_sync_logs (
          id, user_id, sync_direction, records_from_healthkit, records_to_healthkit,
          new_recommendations_count, sync_time, next_sync_at, success, errors, created_at
        ) VALUES (
          ${crypto.randomUUID()}, ${userId}, ${result.syncDirection},
          ${result.recordsProcessed.fromHealthKit}, ${result.recordsProcessed.toHealthKit},
          ${result.newRecommendations.length}, ${result.syncTime.toISOString()},
          ${result.nextSyncAt.toISOString()}, ${result.success},
          ${JSON.stringify(result.errors || [])}, NOW()
        )
      `;
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  /**
   * Get last sync timestamp
   */
  private async getLastSyncTimestamp(userId: string, direction: string): Promise<Date | null> {
    try {
      const result = await this.database`
        SELECT sync_time FROM health_sync_logs
        WHERE user_id = ${userId} 
          AND (sync_direction = ${direction} OR sync_direction = 'bidirectional')
          AND success = true
        ORDER BY sync_time DESC
        LIMIT 1
      `;

      if ((result as any[]).length > 0) {
        return new Date((result as any[])[0].sync_time);
      }
      return null;
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }

  /**
   * Update last sync timestamp
   */
  private async updateLastSyncTimestamp(userId: string, direction: string): Promise<void> {
    try {
      await this.database`
        UPDATE health_sync_configs 
        SET 
          last_sync_at = NOW(),
          last_sync_direction = ${direction},
          updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    } catch (error) {
      console.error('Error updating last sync timestamp:', error);
    }
  }
}