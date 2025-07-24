import type { DatabaseClient } from "../db/database";
import type {
  AddHealthMetricRequest,
  AppleWatchWorkout,
  GoalProgress,
  HealthDashboardQuery,
  HealthDashboardResponse,
  HealthInsight,
  HealthKitPermissionRequest,
  HealthMetric,
  HeartRateAnalysisQuery,
  HeartRateData,
  TrendData,
  UpdateHealthProfileRequest,
  UserHealthProfile,
} from "../types/health";

export class HealthKitService {
  constructor(private sql: DatabaseClient) {}

  // ==================== HEALTH PROFILE MANAGEMENT ====================

  /**
   * Get or create user health profile
   */
  async getUserHealthProfile(
    userId: string
  ): Promise<UserHealthProfile | null> {
    try {
      const result = await this.sql`
        SELECT * FROM user_health_profiles
        WHERE user_id = ${userId}
      `;

      if ((result as any[]).length === 0) {
        // Create default health profile
        return await this.createDefaultHealthProfile(userId);
      }

      return this.mapHealthProfile((result as any[])[0]);
    } catch (error) {
      console.error("Get health profile error:", error);
      throw new Error("Failed to get health profile");
    }
  }

  /**
   * Update user health profile
   */
  async updateHealthProfile(
    userId: string,
    updates: UpdateHealthProfileRequest
  ): Promise<UserHealthProfile> {
    try {
      // Build update parts with proper escaping
      const updateParts: string[] = [];

      if (updates.birthDate) {
        updateParts.push(
          `birth_date = '${updates.birthDate.toISOString().split("T")[0]}'`
        );
      }
      if (updates.biologicalSex) {
        updateParts.push(`biological_sex = '${updates.biologicalSex}'`);
      }
      if (updates.bloodType) {
        updateParts.push(`blood_type = '${updates.bloodType}'`);
      }
      if (updates.heightCm !== undefined) {
        updateParts.push(`height_cm = ${updates.heightCm}`);
      }
      if (updates.weightKg !== undefined) {
        updateParts.push(`weight_kg = ${updates.weightKg}`);
      }
      if (updates.shareHealthData !== undefined) {
        updateParts.push(`share_health_data = ${updates.shareHealthData}`);
      }
      if (updates.shareWorkoutData !== undefined) {
        updateParts.push(`share_workout_data = ${updates.shareWorkoutData}`);
      }
      if (updates.shareHeartRate !== undefined) {
        updateParts.push(`share_heart_rate = ${updates.shareHeartRate}`);
      }
      if (updates.autoSyncWorkouts !== undefined) {
        updateParts.push(`auto_sync_workouts = ${updates.autoSyncWorkouts}`);
      }
      if (updates.syncFrequency) {
        updateParts.push(`sync_frequency = '${updates.syncFrequency}'`);
      }

      if (updateParts.length === 0) {
        throw new Error("No updates provided");
      }

      updateParts.push("updated_at = NOW()");

      const result = await this.sql.unsafe(`
        UPDATE user_health_profiles 
        SET ${updateParts.join(", ")}
        WHERE user_id = '${userId}'
        RETURNING *
      `);

      return this.mapHealthProfile((result as unknown as any[])[0]);
    } catch (error) {
      console.error("Update health profile error:", error);
      throw new Error("Failed to update health profile");
    }
  }

  // ==================== HEALTHKIT PERMISSIONS ====================

  /**
   * Update HealthKit permissions
   */
  async updateHealthKitPermissions(
    userId: string,
    permissionRequest: HealthKitPermissionRequest
  ): Promise<UserHealthProfile> {
    try {
      const permissionsJson = JSON.stringify(
        permissionRequest.permissions
      ).replace(/'/g, "''");

      const result = await this.sql.unsafe(`
        UPDATE user_health_profiles 
        SET 
          healthkit_enabled = TRUE,
          healthkit_permissions = '${permissionsJson}',
          updated_at = NOW()
        WHERE user_id = '${userId}'
        RETURNING *
      `);

      if ((result as unknown as any[]).length === 0) {
        throw new Error("Health profile not found");
      }

      // Log permission change
      await this.createSyncLog(userId, "permission_update", "completed", 1);

      return this.mapHealthProfile((result as unknown as any[])[0]);
    } catch (error) {
      console.error("Update HealthKit permissions error:", error);
      throw new Error("Failed to update HealthKit permissions");
    }
  }

  // ==================== HEALTH METRICS ====================

  /**
   * Add health metric data point
   */
  async addHealthMetric(
    userId: string,
    metric: AddHealthMetricRequest
  ): Promise<HealthMetric> {
    try {
      const recordedAt = metric.recordedAt || new Date();
      const notes = metric.notes
        ? `'${metric.notes.replace(/'/g, "''")}'`
        : "NULL";
      const sourceDevice = metric.sourceDevice
        ? `'${metric.sourceDevice.replace(/'/g, "''")}'`
        : "NULL";

      const result = await this.sql.unsafe(`
        INSERT INTO health_metrics (
          user_id, metric_type, metric_value, metric_unit,
          data_source, source_device, recorded_at, notes
        ) VALUES (
          '${userId}', '${metric.metricType}', ${metric.metricValue}, '${metric.metricUnit}',
          'manual', ${sourceDevice}, '${recordedAt.toISOString()}', ${notes}
        )
        RETURNING *
      `);

      return this.mapHealthMetric((result as unknown as any[])[0]);
    } catch (error) {
      console.error("Add health metric error:", error);
      throw new Error("Failed to add health metric");
    }
  }

  /**
   * Get health metrics for user
   */
  async getHealthMetrics(
    userId: string,
    metricTypes?: string[],
    limit: number = 100
  ): Promise<HealthMetric[]> {
    try {
      let whereClause = `user_id = '${userId}'`;

      if (metricTypes && metricTypes.length > 0) {
        const typesFilter = metricTypes.map((type) => `'${type}'`).join(",");
        whereClause += ` AND metric_type IN (${typesFilter})`;
      }

      const result = await this.sql.unsafe(`
        SELECT * FROM health_metrics
        WHERE ${whereClause}
        ORDER BY recorded_at DESC
        LIMIT ${limit}
      `);

      return (result as unknown as any[]).map(this.mapHealthMetric);
    } catch (error) {
      console.error("Get health metrics error:", error);
      throw new Error("Failed to get health metrics");
    }
  }

  // ==================== HEART RATE DATA ====================

  /**
   * Add heart rate data
   */
  async addHeartRateData(
    userId: string,
    heartRateData: {
      heartRateBpm: number;
      context?: string;
      workoutSessionId?: string;
      recordedAt?: Date;
      dataSource?: string;
      sourceDevice?: string;
    }
  ): Promise<HeartRateData> {
    try {
      const recordedAt = heartRateData.recordedAt || new Date();
      const context = heartRateData.context
        ? `'${heartRateData.context}'`
        : "NULL";
      const workoutSessionId = heartRateData.workoutSessionId
        ? `'${heartRateData.workoutSessionId}'`
        : "NULL";
      const dataSource = heartRateData.dataSource || "manual";
      const sourceDevice = heartRateData.sourceDevice
        ? `'${heartRateData.sourceDevice.replace(/'/g, "''")}'`
        : "NULL";

      const result = await this.sql.unsafe(`
        INSERT INTO heart_rate_data (
          user_id, heart_rate_bpm, heart_rate_context, workout_session_id,
          data_source, source_device, recorded_at
        ) VALUES (
          '${userId}', ${heartRateData.heartRateBpm}, ${context}, ${workoutSessionId},
          '${dataSource}', ${sourceDevice}, '${recordedAt.toISOString()}'
        )
        RETURNING *
      `);

      return this.mapHeartRateData((result as unknown as any[])[0]);
    } catch (error) {
      console.error("Add heart rate data error:", error);
      throw new Error("Failed to add heart rate data");
    }
  }

  /**
   * Get heart rate analysis
   */
  async getHeartRateAnalysis(
    userId: string,
    query: HeartRateAnalysisQuery
  ): Promise<{
    avgHeartRate: number;
    maxHeartRate: number;
    minHeartRate: number;
    restingHeartRate?: number;
    trend: TrendData;
  }> {
    try {
      const startDate = query.startDate.toISOString();
      const endDate = query.endDate.toISOString();
      let contextFilter = "";

      if (query.context) {
        contextFilter = `AND heart_rate_context = '${query.context}'`;
      }

      const result = await this.sql.unsafe(`
        SELECT 
          AVG(heart_rate_bpm) as avg_hr,
          MAX(heart_rate_bpm) as max_hr,
          MIN(heart_rate_bpm) as min_hr,
          COUNT(*) as total_readings
        FROM heart_rate_data
        WHERE user_id = '${userId}'
          AND recorded_at BETWEEN '${startDate}' AND '${endDate}'
          ${contextFilter}
      `);

      const stats = (result as unknown as any[])[0];

      // Get trend data
      const trendResult = await this.sql.unsafe(`
        SELECT 
          DATE(recorded_at) as date,
          AVG(heart_rate_bpm) as avg_hr
        FROM heart_rate_data
        WHERE user_id = '${userId}'
          AND recorded_at BETWEEN '${startDate}' AND '${endDate}'
          ${contextFilter}
        GROUP BY DATE(recorded_at)
        ORDER BY date
      `);

      const trendData: TrendData = {
        metric: "heart_rate",
        period: `${query.startDate.toISOString().split("T")[0]} to ${query.endDate.toISOString().split("T")[0]}`,
        dataPoints: (trendResult as unknown as any[]).map((row) => ({
          date: new Date(row.date),
          value: parseFloat(row.avg_hr),
          change: 0, // TODO: Calculate change
        })),
        trendDirection: "stable", // TODO: Calculate trend direction
        trendStrength: 0.5, // TODO: Calculate trend strength
      };

      return {
        avgHeartRate: parseFloat(stats.avg_hr) || 0,
        maxHeartRate: parseInt(stats.max_hr) || 0,
        minHeartRate: parseInt(stats.min_hr) || 0,
        trend: trendData,
      };
    } catch (error) {
      console.error("Get heart rate analysis error:", error);
      throw new Error("Failed to get heart rate analysis");
    }
  }

  // ==================== APPLE WATCH WORKOUTS ====================

  /**
   * Sync Apple Watch workout data
   */
  async syncAppleWatchWorkout(
    userId: string,
    workoutData: {
      healthkitUuid: string;
      workoutType: string;
      startTime: Date;
      endTime: Date;
      totalEnergyBurned?: number;
      activeEnergyBurned?: number;
      totalDistance?: number;
      avgHeartRate?: number;
      maxHeartRate?: number;
      sourceDevice?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<AppleWatchWorkout> {
    try {
      // Check if workout already exists
      const existing = await this.sql`
        SELECT id FROM apple_watch_workouts
        WHERE user_id = ${userId} AND healthkit_uuid = ${workoutData.healthkitUuid}
      `;

      if ((existing as any[]).length > 0) {
        throw new Error("Workout already synced");
      }

      const durationSeconds = Math.floor(
        (workoutData.endTime.getTime() - workoutData.startTime.getTime()) / 1000
      );
      const totalEnergyBurned = workoutData.totalEnergyBurned || "NULL";
      const activeEnergyBurned = workoutData.activeEnergyBurned || "NULL";
      const totalDistance = workoutData.totalDistance || "NULL";
      const avgHeartRate = workoutData.avgHeartRate || "NULL";
      const maxHeartRate = workoutData.maxHeartRate || "NULL";
      const sourceDevice = workoutData.sourceDevice
        ? `'${workoutData.sourceDevice.replace(/'/g, "''")}'`
        : "NULL";
      const metadata = JSON.stringify(workoutData.metadata || {}).replace(
        /'/g,
        "''"
      );

      const result = await this.sql.unsafe(`
        INSERT INTO apple_watch_workouts (
          user_id, healthkit_uuid, workout_type, start_time, end_time,
          duration_seconds, total_energy_burned_kcal, active_energy_burned_kcal,
          total_distance_meters, avg_heart_rate_bpm, max_heart_rate_bpm,
          source_device, metadata
        ) VALUES (
          '${userId}', '${workoutData.healthkitUuid}', '${workoutData.workoutType}',
          '${workoutData.startTime.toISOString()}', '${workoutData.endTime.toISOString()}',
          ${durationSeconds}, ${totalEnergyBurned}, ${activeEnergyBurned},
          ${totalDistance}, ${avgHeartRate}, ${maxHeartRate},
          ${sourceDevice}, '${metadata}'
        )
        RETURNING *
      `);

      await this.createSyncLog(userId, "apple_watch_workout", "completed", 1);

      return this.mapAppleWatchWorkout((result as unknown as any[])[0]);
    } catch (error) {
      console.error("Sync Apple Watch workout error:", error);
      throw new Error("Failed to sync Apple Watch workout");
    }
  }

  // ==================== HEALTH DASHBOARD ====================

  /**
   * Generate health dashboard data
   */
  async generateHealthDashboard(
    userId: string,
    query: HealthDashboardQuery
  ): Promise<HealthDashboardResponse> {
    try {
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();

      switch (query.period) {
        case "week":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case "quarter":
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case "year":
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Get summary statistics
      const summaryResult = await this.sql.unsafe(`
        SELECT 
          COUNT(DISTINCT aw.id) as total_workouts,
          AVG(hr.heart_rate_bpm) as avg_heart_rate,
          SUM(das.active_energy_kcal) as total_active_calories,
          AVG(das.step_count) as avg_steps_per_day
        FROM user_health_profiles uhp
        LEFT JOIN apple_watch_workouts aw ON uhp.user_id = aw.user_id 
          AND aw.start_time BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
        LEFT JOIN heart_rate_data hr ON uhp.user_id = hr.user_id 
          AND hr.recorded_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
        LEFT JOIN daily_activity_summaries das ON uhp.user_id = das.user_id 
          AND das.activity_date BETWEEN '${startDate.toISOString().split("T")[0]}' AND '${endDate.toISOString().split("T")[0]}'
        WHERE uhp.user_id = '${userId}'
      `);

      const summary = (summaryResult as unknown as any[])[0];

      // Get recent metrics
      const recentMetrics = await this.getHealthMetrics(userId, undefined, 10);

      // Get active insights (mock for now)
      const activeInsights: HealthInsight[] = [];

      // Calculate goal progress (mock for now)
      const goalProgress: GoalProgress[] = [
        {
          goalType: "daily_steps",
          currentValue: parseInt(summary.avg_steps_per_day) || 0,
          goalValue: 10000,
          unit: "steps",
          progress: Math.min(
            (parseInt(summary.avg_steps_per_day) || 0) / 10000,
            1
          ),
          status:
            (parseInt(summary.avg_steps_per_day) || 0) >= 10000
              ? "exceeded"
              : "on_track",
        },
      ];

      return {
        summary: {
          totalWorkouts: parseInt(summary.total_workouts) || 0,
          avgHeartRate: parseFloat(summary.avg_heart_rate) || 0,
          totalActiveCalories: parseFloat(summary.total_active_calories) || 0,
          avgStepsPerDay: parseInt(summary.avg_steps_per_day) || 0,
          sleepHoursAvg: 7.5, // Mock data
        },
        trends: {
          heartRateTrend: {
            metric: "heart_rate",
            period: query.period,
            dataPoints: [],
            trendDirection: "stable",
            trendStrength: 0.5,
          },
          weightTrend: {
            metric: "weight",
            period: query.period,
            dataPoints: [],
            trendDirection: "stable",
            trendStrength: 0.5,
          },
          activityTrend: {
            metric: "activity",
            period: query.period,
            dataPoints: [],
            trendDirection: "up",
            trendStrength: 0.7,
          },
        },
        recentMetrics,
        activeInsights,
        goalProgress,
      };
    } catch (error) {
      console.error("Generate health dashboard error:", error);
      throw new Error("Failed to generate health dashboard");
    }
  }

  // ==================== SYNC MANAGEMENT ====================

  /**
   * Create sync log entry
   */
  async createSyncLog(
    userId: string,
    syncType: string,
    status: string,
    dataPoints: number = 0
  ): Promise<void> {
    try {
      await this.sql.unsafe(`
        INSERT INTO healthkit_sync_logs (
          user_id, sync_type, sync_status, data_points_synced
        ) VALUES (
          '${userId}', '${syncType}', '${status}', ${dataPoints}
        )
      `);
    } catch (error) {
      console.error("Create sync log error:", error);
      // Don't throw - sync logs are not critical
    }
  }

  // ==================== HELPER METHODS ====================

  private async createDefaultHealthProfile(
    userId: string
  ): Promise<UserHealthProfile> {
    try {
      const result = await this.sql`
        INSERT INTO user_health_profiles (user_id)
        VALUES (${userId})
        RETURNING *
      `;

      return this.mapHealthProfile((result as any[])[0]);
    } catch (error) {
      console.error("Create default health profile error:", error);
      throw new Error("Failed to create default health profile");
    }
  }

  // ==================== MAPPING FUNCTIONS ====================

  private mapHealthProfile = (row: any): UserHealthProfile => ({
    id: row.id,
    userId: row.user_id,
    birthDate: row.birth_date ? new Date(row.birth_date) : undefined,
    biologicalSex: row.biological_sex,
    bloodType: row.blood_type,
    heightCm: row.height_cm ? parseFloat(row.height_cm) : undefined,
    weightKg: row.weight_kg ? parseFloat(row.weight_kg) : undefined,
    healthkitEnabled: row.healthkit_enabled || false,
    healthkitPermissions: row.healthkit_permissions
      ? JSON.parse(row.healthkit_permissions)
      : { read: [], write: [], share: [] },
    appleWatchConnected: row.apple_watch_connected || false,
    shareHealthData: row.share_health_data || false,
    shareWorkoutData: row.share_workout_data || true,
    shareHeartRate: row.share_heart_rate || false,
    autoSyncWorkouts: row.auto_sync_workouts || true,
    syncFrequency: row.sync_frequency || "real_time",
    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });

  private mapHealthMetric = (row: any): HealthMetric => ({
    id: row.id,
    userId: row.user_id,
    metricType: row.metric_type,
    value: parseFloat(row.metric_value),
    unit: row.metric_unit,
    sourceApp: row.data_source,
    recordedAt: new Date(row.recorded_at),
    syncedAt: new Date(row.synced_at),
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
    createdAt: new Date(row.created_at),
  });

  private mapHeartRateData = (row: any): HeartRateData => ({
    id: row.id,
    userId: row.user_id,
    heartRateBpm: parseInt(row.heart_rate_bpm),
    heartRateContext: row.heart_rate_context,
    workoutSessionId: row.workout_session_id,
    dataSource: row.data_source,
    sourceDevice: row.source_device,
    healthkitUuid: row.healthkit_uuid,
    recordedAt: new Date(row.recorded_at),
    syncedAt: new Date(row.synced_at),
    confidenceLevel: row.confidence_level || 1.0,
    motionContext: row.motion_context,
    createdAt: new Date(row.created_at),
  });

  private mapAppleWatchWorkout = (row: any): AppleWatchWorkout => ({
    id: row.id,
    userId: row.user_id,
    healthkitUuid: row.healthkit_uuid,
    workoutType: row.workout_type,
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    durationSeconds: parseInt(row.duration_seconds),
    totalEnergyBurnedKcal: row.total_energy_burned_kcal
      ? parseFloat(row.total_energy_burned_kcal)
      : undefined,
    activeEnergyBurnedKcal: row.active_energy_burned_kcal
      ? parseFloat(row.active_energy_burned_kcal)
      : undefined,
    totalDistanceMeters: row.total_distance_meters
      ? parseFloat(row.total_distance_meters)
      : undefined,
    avgHeartRateBpm: row.avg_heart_rate_bpm
      ? parseInt(row.avg_heart_rate_bpm)
      : undefined,
    maxHeartRateBpm: row.max_heart_rate_bpm
      ? parseInt(row.max_heart_rate_bpm)
      : undefined,
    minHeartRateBpm: row.min_heart_rate_bpm
      ? parseInt(row.min_heart_rate_bpm)
      : undefined,
    heartRateZones: row.heart_rate_zones
      ? JSON.parse(row.heart_rate_zones)
      : undefined,
    sourceDevice: row.source_device,
    workoutLocation: row.workout_location,
    syncedToFitai: row.synced_to_fitai || false,
    fitaiWorkoutSessionId: row.fitai_workout_session_id,
    syncConflicts: row.sync_conflicts
      ? JSON.parse(row.sync_conflicts)
      : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}
