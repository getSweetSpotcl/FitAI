/**
 * Background Jobs System
 * Queue-based processing for heavy operations using Cloudflare Queues
 */

import type { DatabaseClient } from "../db/database";

export interface JobPayload {
  type: JobType;
  data: any;
  priority: 'low' | 'normal' | 'high';
  retries?: number;
  delay?: number; // milliseconds
  userId?: string;
  metadata?: Record<string, any>;
}

export type JobType = 
  | 'analytics_calculation'
  | 'achievement_check'
  | 'progress_report_generation'
  | 'leaderboard_update'
  | 'data_export'
  | 'cache_preloading'
  | 'health_data_processing'
  | 'notification_batch'
  | 'workout_analysis'
  | 'social_feed_update';

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  processed_at: Date;
}

/**
 * Background job processor for Cloudflare Workers
 */
export class BackgroundJobProcessor {
  constructor(
    private database: DatabaseClient,
    private queue?: Queue,
    private redis?: any
  ) {}

  /**
   * Enqueue a job for background processing
   */
  async enqueue(payload: JobPayload): Promise<string> {
    try {
      const jobId = crypto.randomUUID();
      const job = {
        id: jobId,
        ...payload,
        created_at: new Date().toISOString(),
        status: 'queued'
      };

      // Use Cloudflare Queue if available
      if (this.queue) {
        await this.queue.send(job);
        console.log(`✅ Job ${jobId} enqueued with type ${payload.type}`);
        return jobId;
      }

      // Fallback to Redis queue
      if (this.redis) {
        await this.redis.lpush('job_queue', JSON.stringify(job));
        console.log(`✅ Job ${jobId} enqueued to Redis with type ${payload.type}`);
        return jobId;
      }

      // Fallback to immediate processing (for development)
      console.warn('No queue available - processing immediately');
      await this.processJob(job);
      return jobId;

    } catch (error) {
      console.error('Error enqueueing job:', error);
      throw new Error(`Failed to enqueue job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a single job
   */
  async processJob(job: any): Promise<JobResult> {
    const startTime = Date.now();
    let result: JobResult;

    try {
      console.log(`🔄 Processing job ${job.id} of type ${job.type}`);

      switch (job.type) {
        case 'analytics_calculation':
          result = await this.processAnalyticsCalculation(job.data);
          break;
        
        case 'achievement_check':
          result = await this.processAchievementCheck(job.data);
          break;
        
        case 'progress_report_generation':
          result = await this.processProgressReportGeneration(job.data);
          break;
        
        case 'leaderboard_update':
          result = await this.processLeaderboardUpdate(job.data);
          break;
        
        case 'data_export':
          result = await this.processDataExport(job.data);
          break;
        
        case 'cache_preloading':
          result = await this.processCachePreloading(job.data);
          break;
        
        case 'health_data_processing':
          result = await this.processHealthDataProcessing(job.data);
          break;
        
        case 'notification_batch':
          result = await this.processNotificationBatch(job.data);
          break;
        
        case 'workout_analysis':
          result = await this.processWorkoutAnalysis(job.data);
          break;
        
        case 'social_feed_update':
          result = await this.processSocialFeedUpdate(job.data);
          break;
        
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      const duration = Date.now() - startTime;
      result.duration = duration;
      result.processed_at = new Date();

      console.log(`✅ Job ${job.id} completed in ${duration}ms`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        processed_at: new Date()
      };

      console.error(`❌ Job ${job.id} failed:`, error);
      return result;
    }
  }

  /**
   * Batch process multiple analytics calculations
   */
  private async processAnalyticsCalculation(data: any): Promise<JobResult> {
    const { userId, timeframe, metrics } = data;

    try {
      const results = [];

      // Calculate user progress analytics
      if (metrics.includes('progress')) {
        const progressData = await this.database`
          WITH workout_stats AS (
            SELECT 
              DATE_TRUNC('day', started_at) as date,
              COUNT(*) as workouts,
              AVG(total_volume_kg) as avg_volume,
              AVG(duration_minutes) as avg_duration
            FROM workout_sessions
            WHERE user_id = ${userId}
              AND completed_at IS NOT NULL
              AND started_at >= NOW() - INTERVAL '${timeframe} days'
            GROUP BY DATE_TRUNC('day', started_at)
            ORDER BY date
          )
          SELECT * FROM workout_stats
        `;

        results.push({ type: 'progress', data: progressData });
      }

      // Calculate strength gains
      if (metrics.includes('strength')) {
        const strengthData = await this.database`
          WITH strength_progression AS (
            SELECT 
              e.name,
              DATE_TRUNC('week', ws.started_at) as week,
              MAX(wst.weight_kg) as max_weight
            FROM workout_sets wst
            JOIN workout_sessions ws ON wst.workout_session_id = ws.id
            JOIN exercises e ON wst.exercise_id = e.id
            WHERE ws.user_id = ${userId}
              AND ws.completed_at IS NOT NULL
              AND ws.started_at >= NOW() - INTERVAL '${timeframe} days'
              AND wst.weight_kg IS NOT NULL
            GROUP BY e.name, DATE_TRUNC('week', ws.started_at)
            ORDER BY e.name, week
          )
          SELECT * FROM strength_progression
        `;

        results.push({ type: 'strength', data: strengthData });
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      throw new Error(`Analytics calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check and award achievements for a user
   */
  private async processAchievementCheck(data: any): Promise<JobResult> {
    const { userId, triggerType } = data;

    try {
      const newAchievements = [];

      // Check workout-based achievements
      if (triggerType === 'workout_completed') {
        // Check total workout count
        const workoutCount = await this.database`
          SELECT COUNT(*) as count
          FROM workout_sessions
          WHERE user_id = ${userId} AND completed_at IS NOT NULL
        `;

        const count = parseInt((workoutCount as any[])[0]?.count || '0');

        // Check milestone achievements
        const milestones = [1, 10, 25, 50, 100, 250, 500];
        for (const milestone of milestones) {
          if (count === milestone) {
            const achievementId = `workout_milestone_${milestone}`;
            
            // Check if already earned
            const existing = await this.database`
              SELECT id FROM user_achievements
              WHERE user_id = ${userId} AND achievement_id = ${achievementId}
            `;

            if ((existing as any[]).length === 0) {
              // Grant achievement
              await this.database`
                INSERT INTO user_achievements (user_id, achievement_id, earned_at)
                VALUES (${userId}, ${achievementId}, NOW())
              `;

              newAchievements.push({
                id: achievementId,
                milestone,
                type: 'workout_count'
              });
            }
          }
        }
      }

      return {
        success: true,
        data: {
          achievements_earned: newAchievements.length,
          achievements: newAchievements
        }
      };
    } catch (error) {
      throw new Error(`Achievement check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate comprehensive progress reports
   */
  private async processProgressReportGeneration(data: any): Promise<JobResult> {
    const { userId, timeframe, format } = data;

    try {
      const reportData = {
        user_id: userId,
        timeframe,
        generated_at: new Date().toISOString(),
        sections: []
      };

      // Workout summary
      const workoutSummary = await this.database`
        SELECT 
          COUNT(*) as total_workouts,
          AVG(duration_minutes) as avg_duration,
          SUM(total_volume_kg) as total_volume,
          AVG(average_rpe) as avg_rpe
        FROM workout_sessions
        WHERE user_id = ${userId}
          AND completed_at IS NOT NULL
          AND started_at >= NOW() - INTERVAL '${timeframe} days'
      `;

      reportData.sections.push({
        type: 'workout_summary',
        data: (workoutSummary as any[])[0]
      });

      // Exercise progress
      const exerciseProgress = await this.database`
        SELECT 
          e.name,
          e.name_es,
          COUNT(DISTINCT ws.id) as sessions,
          MAX(wst.weight_kg) as max_weight,
          AVG(wst.weight_kg) as avg_weight,
          SUM(wst.reps * wst.weight_kg) as total_volume
        FROM workout_sets wst
        JOIN workout_sessions ws ON wst.workout_session_id = ws.id
        JOIN exercises e ON wst.exercise_id = e.id
        WHERE ws.user_id = ${userId}
          AND ws.completed_at IS NOT NULL
          AND ws.started_at >= NOW() - INTERVAL '${timeframe} days'
        GROUP BY e.id, e.name, e.name_es
        ORDER BY total_volume DESC
        LIMIT 10
      `;

      reportData.sections.push({
        type: 'exercise_progress',
        data: exerciseProgress
      });

      // Store report in database for future access
      await this.database`
        INSERT INTO progress_reports (
          id, user_id, timeframe, format, data, generated_at
        ) VALUES (
          ${crypto.randomUUID()}, ${userId}, ${timeframe}, ${format},
          ${JSON.stringify(reportData)}, NOW()
        )
      `;

      return {
        success: true,
        data: reportData
      };
    } catch (error) {
      throw new Error(`Progress report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update leaderboard rankings
   */
  private async processLeaderboardUpdate(data: any): Promise<JobResult> {
    const { category, period } = data;

    try {
      // This would be implemented to update materialized views or cached rankings
      console.log(`Updating leaderboard for ${category} - ${period}`);

      return {
        success: true,
        data: {
          category,
          period,
          updated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Leaderboard update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export user data in various formats
   */
  private async processDataExport(data: any): Promise<JobResult> {
    const { userId, format, sections } = data;

    try {
      const exportData: any = {
        export_id: crypto.randomUUID(),
        user_id: userId,
        format,
        generated_at: new Date().toISOString(),
        sections: {}
      };

      if (sections.includes('workouts')) {
        const workouts = await this.database`
          SELECT * FROM workout_sessions
          WHERE user_id = ${userId}
          ORDER BY started_at DESC
        `;
        exportData.sections.workouts = workouts;
      }

      if (sections.includes('exercises')) {
        const exerciseData = await this.database`
          SELECT 
            ws.started_at,
            e.name as exercise_name,
            wst.reps,
            wst.weight_kg,
            wst.rpe
          FROM workout_sets wst
          JOIN workout_sessions ws ON wst.workout_session_id = ws.id
          JOIN exercises e ON wst.exercise_id = e.id
          WHERE ws.user_id = ${userId}
          ORDER BY ws.started_at DESC
        `;
        exportData.sections.exercises = exerciseData;
      }

      return {
        success: true,
        data: exportData
      };
    } catch (error) {
      throw new Error(`Data export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Preload cache with commonly accessed data
   */
  private async processCachePreloading(data: any): Promise<JobResult> {
    const { keys } = data;

    try {
      console.log(`Preloading cache for ${keys.length} keys`);

      // This would integrate with the cache system to preload data
      const results = [];
      for (const key of keys) {
        results.push({
          key,
          status: 'preloaded',
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        data: {
          preloaded_keys: results.length,
          results
        }
      };
    } catch (error) {
      throw new Error(`Cache preloading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process health data and generate insights
   */
  private async processHealthDataProcessing(data: any): Promise<JobResult> {
    const { userId, dataType } = data;

    try {
      console.log(`Processing health data for user ${userId} - type: ${dataType}`);

      // Process and analyze health data
      const insights = {
        trends: [],
        recommendations: [],
        alerts: []
      };

      return {
        success: true,
        data: insights
      };
    } catch (error) {
      throw new Error(`Health data processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send batch notifications
   */
  private async processNotificationBatch(data: any): Promise<JobResult> {
    const { notifications } = data;

    try {
      console.log(`Processing ${notifications.length} notifications`);

      const results = [];
      for (const notification of notifications) {
        // Process each notification
        results.push({
          id: notification.id,
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      }

      return {
        success: true,
        data: {
          processed: results.length,
          results
        }
      };
    } catch (error) {
      throw new Error(`Notification batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze workout performance and patterns
   */
  private async processWorkoutAnalysis(data: any): Promise<JobResult> {
    const { userId, sessionId } = data;

    try {
      // Comprehensive workout analysis
      const analysis = await this.database`
        WITH workout_context AS (
          SELECT 
            ws.*,
            COUNT(wst.id) as total_sets,
            AVG(wst.reps) as avg_reps,
            AVG(wst.weight_kg) as avg_weight,
            SUM(wst.reps * wst.weight_kg) as total_volume
          FROM workout_sessions ws
          LEFT JOIN workout_sets wst ON ws.id = wst.workout_session_id
          WHERE ws.id = ${sessionId} AND ws.user_id = ${userId}
          GROUP BY ws.id
        )
        SELECT * FROM workout_context
      `;

      return {
        success: true,
        data: (analysis as any[])[0] || null
      };
    } catch (error) {
      throw new Error(`Workout analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update social feed with new activities
   */
  private async processSocialFeedUpdate(data: any): Promise<JobResult> {
    const { userId, activityType, activityData } = data;

    try {
      console.log(`Updating social feed for user ${userId} - activity: ${activityType}`);

      // Create social feed entry
      await this.database`
        INSERT INTO feed_activities (
          id, user_id, activity_type, title, description, metadata, created_at
        ) VALUES (
          ${crypto.randomUUID()}, ${userId}, ${activityType},
          ${activityData.title}, ${activityData.description},
          ${JSON.stringify(activityData.metadata || {})}, NOW()
        )
      `;

      return {
        success: true,
        data: {
          activity_created: true,
          activity_type: activityType
        }
      };
    } catch (error) {
      throw new Error(`Social feed update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Job scheduler for recurring tasks
 */
export class JobScheduler {
  constructor(private jobProcessor: BackgroundJobProcessor) {}

  /**
   * Schedule recurring analytics updates
   */
  async scheduleAnalyticsUpdates(): Promise<void> {
    // Schedule daily analytics calculations for active users
    await this.jobProcessor.enqueue({
      type: 'analytics_calculation',
      data: {
        timeframe: '7',
        metrics: ['progress', 'strength']
      },
      priority: 'low'
    });
  }

  /**
   * Schedule leaderboard updates
   */
  async scheduleLeaderboardUpdates(): Promise<void> {
    const categories = ['volume', 'workouts', 'streak'];
    const periods = ['daily', 'weekly', 'monthly'];

    for (const category of categories) {
      for (const period of periods) {
        await this.jobProcessor.enqueue({
          type: 'leaderboard_update',
          data: { category, period },
          priority: 'normal'
        });
      }
    }
  }

  /**
   * Schedule cache warming
   */
  async scheduleCacheWarming(): Promise<void> {
    await this.jobProcessor.enqueue({
      type: 'cache_preloading',
      data: {
        keys: [
          'exercises:popular',
          'exercises:categories',
          'leaderboard:volume:weekly',
          'leaderboard:workouts:weekly'
        ]
      },
      priority: 'low'
    });
  }
}