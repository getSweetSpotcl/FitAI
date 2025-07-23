import { DatabaseClient } from '../db/database';
import {
  HealthMetric,
  HRVData,
  SleepData,
  HealthWorkout,
  HealthSyncStatus,
  RecoveryRecommendation,
  HealthMetricType,
  HealthDataType,
  SyncStatus,
  TrainingReadiness,
  RecoveryAnalysis,
  HealthMetricsQuery
} from '../types/health';

export class HealthDataService {
  constructor(private sql: DatabaseClient) {}

  /**
   * Save health metrics to database
   */
  async saveHealthMetrics(userId: string, metrics: Omit<HealthMetric, 'id' | 'userId' | 'syncedAt' | 'createdAt'>[]): Promise<number> {
    if (metrics.length === 0) return 0;

    let insertedCount = 0;
    
    for (const metric of metrics) {
      try {
        await this.sql`
          INSERT INTO health_metrics (
            user_id, metric_type, value, unit, source_app, recorded_at, metadata
          ) VALUES (
            ${userId}, ${metric.metricType}, ${metric.value}, ${metric.unit},
            ${metric.sourceApp}, ${metric.recordedAt.toISOString()}, ${JSON.stringify(metric.metadata)}
          )
          ON CONFLICT (user_id, metric_type, recorded_at) DO NOTHING
        `;
        insertedCount++;
      } catch (error) {
        console.error('Error saving health metric:', error);
      }
    }

    return insertedCount;
  }

  /**
   * Save HRV data to database
   */
  async saveHRVData(userId: string, hrvData: Omit<HRVData, 'id' | 'userId' | 'syncedAt' | 'createdAt'>[]): Promise<number> {
    if (hrvData.length === 0) return 0;

    let insertedCount = 0;
    
    for (const hrv of hrvData) {
      try {
        await this.sql`
          INSERT INTO health_hrv_data (
            user_id, rmssd_ms, sdnn_ms, stress_score, recovery_score, recorded_at, metadata
          ) VALUES (
            ${userId}, ${hrv.rmssdMs}, ${hrv.sdnnMs}, ${hrv.stressScore}, 
            ${hrv.recoveryScore}, ${hrv.recordedAt.toISOString()}, ${JSON.stringify(hrv.metadata)}
          )
          ON CONFLICT (user_id, recorded_at) DO UPDATE SET
            rmssd_ms = EXCLUDED.rmssd_ms,
            sdnn_ms = EXCLUDED.sdnn_ms,
            stress_score = EXCLUDED.stress_score,
            recovery_score = EXCLUDED.recovery_score,
            metadata = EXCLUDED.metadata
        `;
        insertedCount++;
      } catch (error) {
        console.error('Error saving HRV data:', error);
      }
    }

    return insertedCount;
  }

  /**
   * Save sleep data to database
   */
  async saveSleepData(userId: string, sleepData: Omit<SleepData, 'id' | 'userId' | 'syncedAt' | 'createdAt'>[]): Promise<number> {
    if (sleepData.length === 0) return 0;

    let insertedCount = 0;
    
    for (const sleep of sleepData) {
      try {
        await this.sql`
          INSERT INTO health_sleep_data (
            user_id, sleep_start, sleep_end, total_sleep_minutes, deep_sleep_minutes,
            rem_sleep_minutes, light_sleep_minutes, awake_minutes, sleep_efficiency,
            sleep_quality_score, recorded_at, metadata
          ) VALUES (
            ${userId}, ${sleep.sleepStart.toISOString()}, ${sleep.sleepEnd.toISOString()},
            ${sleep.totalSleepMinutes}, ${sleep.deepSleepMinutes || null},
            ${sleep.remSleepMinutes || null}, ${sleep.lightSleepMinutes || null},
            ${sleep.awakeMinutes || null}, ${sleep.sleepEfficiency || null},
            ${sleep.sleepQualityScore || null}, ${sleep.recordedAt.toISOString()},
            ${JSON.stringify(sleep.metadata)}
          )
          ON CONFLICT (user_id, sleep_start) DO UPDATE SET
            sleep_end = EXCLUDED.sleep_end,
            total_sleep_minutes = EXCLUDED.total_sleep_minutes,
            deep_sleep_minutes = EXCLUDED.deep_sleep_minutes,
            rem_sleep_minutes = EXCLUDED.rem_sleep_minutes,
            light_sleep_minutes = EXCLUDED.light_sleep_minutes,
            awake_minutes = EXCLUDED.awake_minutes,
            sleep_efficiency = EXCLUDED.sleep_efficiency,
            sleep_quality_score = EXCLUDED.sleep_quality_score,
            metadata = EXCLUDED.metadata
        `;
        insertedCount++;
      } catch (error) {
        console.error('Error saving sleep data:', error);
      }
    }

    return insertedCount;
  }

  /**
   * Save health workouts to database
   */
  async saveHealthWorkouts(userId: string, workouts: Omit<HealthWorkout, 'id' | 'userId' | 'syncedAt' | 'createdAt'>[]): Promise<number> {
    if (workouts.length === 0) return 0;

    let insertedCount = 0;
    
    for (const workout of workouts) {
      try {
        await this.sql`
          INSERT INTO health_workouts (
            user_id, apple_health_uuid, workout_type, start_time, end_time,
            duration_minutes, calories_burned, distance_km, average_heart_rate,
            max_heart_rate, source_app, metadata
          ) VALUES (
            ${userId}, ${workout.appleHealthUuid || null}, ${workout.workoutType},
            ${workout.startTime.toISOString()}, ${workout.endTime.toISOString()},
            ${workout.durationMinutes}, ${workout.caloriesBurned || null},
            ${workout.distanceKm || null}, ${workout.averageHeartRate || null},
            ${workout.maxHeartRate || null}, ${workout.sourceApp},
            ${JSON.stringify(workout.metadata)}
          )
          ON CONFLICT (user_id, apple_health_uuid) DO UPDATE SET
            workout_type = EXCLUDED.workout_type,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            duration_minutes = EXCLUDED.duration_minutes,
            calories_burned = EXCLUDED.calories_burned,
            distance_km = EXCLUDED.distance_km,
            average_heart_rate = EXCLUDED.average_heart_rate,
            max_heart_rate = EXCLUDED.max_heart_rate,
            metadata = EXCLUDED.metadata
        `;
        insertedCount++;
      } catch (error) {
        console.error('Error saving health workout:', error);
      }
    }

    return insertedCount;
  }

  /**
   * Update sync status for a data type
   */
  async updateSyncStatus(
    userId: string,
    dataType: HealthDataType,
    status: SyncStatus,
    recordsSynced: number,
    errorMessage?: string
  ): Promise<void> {
    await this.sql`
      INSERT INTO health_sync_status (
        user_id, data_type, last_sync_at, sync_status, records_synced, error_message
      ) VALUES (
        ${userId}, ${dataType}, NOW(), ${status}, ${recordsSynced}, ${errorMessage || null}
      )
      ON CONFLICT (user_id, data_type) DO UPDATE SET
        last_sync_at = NOW(),
        sync_status = EXCLUDED.sync_status,
        records_synced = EXCLUDED.records_synced,
        error_message = EXCLUDED.error_message,
        updated_at = NOW()
    `;
  }

  /**
   * Get health metrics with optional filtering
   */
  async getHealthMetrics(userId: string, queryParams: HealthMetricsQuery): Promise<HealthMetric[]> {
    const { metricTypes, startDate, endDate, limit = 1000 } = queryParams;
    
    let whereClause = `user_id = '${userId}'`;
    
    if (metricTypes && metricTypes.length > 0) {
      const typesStr = metricTypes.map(t => `'${t}'`).join(',');
      whereClause += ` AND metric_type IN (${typesStr})`;
    }
    
    if (startDate) {
      whereClause += ` AND recorded_at >= '${startDate.toISOString()}'`;
    }
    
    if (endDate) {
      whereClause += ` AND recorded_at <= '${endDate.toISOString()}'`;
    }

    let sqlQuery = `
      SELECT * FROM health_metrics 
      WHERE ${whereClause}
      ORDER BY recorded_at DESC
      LIMIT ${limit}
    `;

    const result = await this.sql.unsafe(sqlQuery);
    return ((result as unknown) as any[]).map(this.mapHealthMetric.bind(this));
  }

  /**
   * Get latest HRV data for user
   */
  async getLatestHRVData(userId: string, days: number = 7): Promise<HRVData[]> {
    const result = await this.sql`
      SELECT * FROM health_hrv_data
      WHERE user_id = ${userId}
        AND recorded_at >= NOW() - INTERVAL '${days} days'
      ORDER BY recorded_at DESC
    `;

    return (result as any[]).map(this.mapHRVData);
  }

  /**
   * Get sleep data for date range
   */
  async getSleepData(userId: string, startDate: Date, endDate: Date): Promise<SleepData[]> {
    const result = await this.sql`
      SELECT * FROM health_sleep_data
      WHERE user_id = ${userId}
        AND sleep_start >= ${startDate.toISOString()}
        AND sleep_start <= ${endDate.toISOString()}
      ORDER BY sleep_start DESC
    `;

    return (result as any[]).map(this.mapSleepData);
  }

  /**
   * Get health workouts for date range
   */
  async getHealthWorkouts(userId: string, startDate: Date, endDate: Date): Promise<HealthWorkout[]> {
    const result = await this.sql`
      SELECT * FROM health_workouts
      WHERE user_id = ${userId}
        AND start_time >= ${startDate.toISOString()}
        AND start_time <= ${endDate.toISOString()}
      ORDER BY start_time DESC
    `;

    return (result as any[]).map(this.mapHealthWorkout);
  }

  /**
   * Calculate recovery score based on recent data
   */
  async calculateRecoveryScore(userId: string): Promise<RecoveryAnalysis> {
    // Get recent HRV data (last 7 days)
    const hrvData = await this.getLatestHRVData(userId, 7);
    
    // Get recent sleep data (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const sleepData = await this.getSleepData(userId, startDate, endDate);

    // Basic recovery calculation algorithm
    let recoveryScore = 50; // Base score
    const factors: RecoveryAnalysis['factorsInfluencing'] = {
      sleep: 'neutral',
      hrv: 'neutral',
      workloadBalance: 'neutral',
      consistency: 'neutral'
    };

    // HRV analysis
    if (hrvData.length > 0) {
      const avgRecoveryScore = hrvData.reduce((sum, hrv) => sum + hrv.recoveryScore, 0) / hrvData.length;
      recoveryScore += (avgRecoveryScore - 50) * 0.4; // 40% weight
      
      if (avgRecoveryScore > 70) factors.hrv = 'positive';
      else if (avgRecoveryScore < 40) factors.hrv = 'negative';
    }

    // Sleep analysis
    if (sleepData.length > 0) {
      const avgSleepEfficiency = sleepData
        .filter(s => s.sleepEfficiency)
        .reduce((sum, s) => sum + (s.sleepEfficiency || 0), 0) / sleepData.length;
      
      if (avgSleepEfficiency > 85) {
        recoveryScore += 10;
        factors.sleep = 'positive';
      } else if (avgSleepEfficiency < 70) {
        recoveryScore -= 15;
        factors.sleep = 'negative';
      }
    }

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (hrvData.length >= 3) {
      const recent = hrvData.slice(0, 3).map(h => h.recoveryScore);
      const older = hrvData.slice(-3).map(h => h.recoveryScore);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (factors.sleep === 'negative') {
      recommendations.push('Prioriza dormir 7-9 horas por noche');
      recommendations.push('Mantén horarios regulares de sueño');
    }
    if (factors.hrv === 'negative') {
      recommendations.push('Considera reducir la intensidad del entrenamiento');
      recommendations.push('Incluye más técnicas de relajación y breathing exercises');
    }
    if (recoveryScore < 40) {
      recommendations.push('Programa un día de descanso activo');
    }

    return {
      currentScore: Math.round(Math.max(0, Math.min(100, recoveryScore))),
      trend,
      factorsInfluencing: factors,
      recommendations,
      nextRecommendationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    };
  }

  /**
   * Save recovery recommendation
   */
  async saveRecoveryRecommendation(userId: string, recommendation: Omit<RecoveryRecommendation, 'id' | 'userId' | 'createdAt'>): Promise<void> {
    await this.sql`
      INSERT INTO health_recovery_recommendations (
        user_id, recommendation_date, recovery_score, training_readiness,
        recommended_intensity, recommendations, factors_analyzed, ai_generated
      ) VALUES (
        ${userId}, ${recommendation.recommendationDate.toISOString()}, ${recommendation.recoveryScore},
        ${recommendation.trainingReadiness}, ${recommendation.recommendedIntensity || null},
        ${JSON.stringify(recommendation.recommendations)}, ${JSON.stringify(recommendation.factorsAnalyzed)},
        ${recommendation.aiGenerated}
      )
      ON CONFLICT (user_id, recommendation_date) DO UPDATE SET
        recovery_score = EXCLUDED.recovery_score,
        training_readiness = EXCLUDED.training_readiness,
        recommended_intensity = EXCLUDED.recommended_intensity,
        recommendations = EXCLUDED.recommendations,
        factors_analyzed = EXCLUDED.factors_analyzed,
        ai_generated = EXCLUDED.ai_generated
    `;
  }

  // Helper methods to map database results to TypeScript interfaces
  private mapHealthMetric(row: any): HealthMetric {
    return {
      id: row.id,
      userId: row.user_id,
      metricType: row.metric_type,
      value: parseFloat(row.value),
      unit: row.unit,
      sourceApp: row.source_app,
      recordedAt: new Date(row.recorded_at),
      syncedAt: new Date(row.synced_at),
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at)
    };
  }

  private mapHRVData(row: any): HRVData {
    return {
      id: row.id,
      userId: row.user_id,
      rmssdMs: parseFloat(row.rmssd_ms),
      sdnnMs: parseFloat(row.sdnn_ms),
      stressScore: row.stress_score,
      recoveryScore: row.recovery_score,
      recordedAt: new Date(row.recorded_at),
      syncedAt: new Date(row.synced_at),
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at)
    };
  }

  private mapSleepData(row: any): SleepData {
    return {
      id: row.id,
      userId: row.user_id,
      sleepStart: new Date(row.sleep_start),
      sleepEnd: new Date(row.sleep_end),
      totalSleepMinutes: row.total_sleep_minutes,
      deepSleepMinutes: row.deep_sleep_minutes,
      remSleepMinutes: row.rem_sleep_minutes,
      lightSleepMinutes: row.light_sleep_minutes,
      awakeMinutes: row.awake_minutes,
      sleepEfficiency: row.sleep_efficiency ? parseFloat(row.sleep_efficiency) : undefined,
      sleepQualityScore: row.sleep_quality_score,
      recordedAt: new Date(row.recorded_at),
      syncedAt: new Date(row.synced_at),
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at)
    };
  }

  private mapHealthWorkout(row: any): HealthWorkout {
    return {
      id: row.id,
      userId: row.user_id,
      appleHealthUuid: row.apple_health_uuid,
      workoutType: row.workout_type,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      durationMinutes: row.duration_minutes,
      caloriesBurned: row.calories_burned,
      distanceKm: row.distance_km ? parseFloat(row.distance_km) : undefined,
      averageHeartRate: row.average_heart_rate,
      maxHeartRate: row.max_heart_rate,
      sourceApp: row.source_app,
      syncedAt: new Date(row.synced_at),
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at)
    };
  }
}