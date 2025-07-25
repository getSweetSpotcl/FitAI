/**
 * SQL Query Optimizer
 * Performance optimization utilities for database queries
 */

import type { DatabaseClient } from "../db/database";

/**
 * Query performance monitoring and optimization utilities
 */
export class SQLOptimizer {
  constructor(private database: DatabaseClient) {}

  /**
   * Create database indexes for optimal performance
   */
  async createOptimalIndexes(): Promise<void> {
    try {
      console.log('Creating performance indexes...');

      // Core user operations indexes
      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_clerk_id 
        ON users(clerk_user_id) WHERE is_active = true AND deleted_at IS NULL
      `;

      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
        ON users(email) WHERE is_active = true AND deleted_at IS NULL
      `;

      // Workout sessions performance indexes
      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_sessions_user_completed 
        ON workout_sessions(user_id, completed_at) WHERE completed_at IS NOT NULL
      `;

      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_sessions_started_at 
        ON workout_sessions(started_at DESC) WHERE completed_at IS NOT NULL
      `;

      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_sessions_user_date_range 
        ON workout_sessions(user_id, started_at DESC) WHERE completed_at IS NOT NULL
      `;

      // Workout sets performance indexes
      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_sets_session_exercise 
        ON workout_sets(workout_session_id, exercise_id, set_number)
      `;

      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_sets_exercise_weight 
        ON workout_sets(exercise_id, weight_kg DESC) WHERE weight_kg IS NOT NULL
      `;

      // Exercise filtering indexes
      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_category_difficulty 
        ON exercises(category_id, difficulty) WHERE difficulty IS NOT NULL
      `;

      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_muscle_groups_gin 
        ON exercises USING gin(muscle_groups)
      `;

      // Health metrics performance indexes
      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_metrics_user_type_date 
        ON health_metrics(user_id, metric_type, recorded_at DESC)
      `;

      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_sleep_user_date 
        ON health_sleep_data(user_id, sleep_start DESC)
      `;

      // Achievements performance indexes
      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_achievements_user_earned 
        ON user_achievements(user_id, earned_at DESC)
      `;

      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_achievements_rarity_points 
        ON achievements(rarity, points DESC)
      `;

      // Social features indexes
      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_activities_created_engagement 
        ON feed_activities(created_at DESC, engagement_score DESC) 
        WHERE created_at > NOW() - INTERVAL '30 days'
      `;

      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_follows_follower_status 
        ON social_follows(follower_id, status) WHERE status = 'active'
      `;

      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_follows_following_status 
        ON social_follows(following_id, status) WHERE status = 'active'
      `;

      // Dynamic achievements indexes
      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dynamic_achievements_active_rarity 
        ON dynamic_achievements(is_active, rarity, points DESC) WHERE is_active = true
      `;

      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_dynamic_achievements_user_earned 
        ON user_dynamic_achievements(user_id, earned_at DESC)
      `;

      // Payment system indexes
      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_subscriptions_user_status 
        ON payment_subscriptions(user_id, status, next_billing_date)
      `;

      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_transactions_subscription_status 
        ON payment_transactions(subscription_id, status, created_at DESC)
      `;

      // Leaderboard optimization indexes
      await this.database`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_sessions_volume_leaderboard 
        ON workout_sessions(total_volume_kg DESC, completed_at DESC) 
        WHERE completed_at IS NOT NULL AND total_volume_kg IS NOT NULL
      `;

      console.log('✅ All performance indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
      throw error;
    }
  }

  /**
   * Optimized user workout stats query
   */
  async getOptimizedUserWorkoutStats(
    userId: string, 
    daysBack: number = 30
  ): Promise<any> {
    try {
      // Single optimized query instead of multiple separate queries
      const result = await this.database`
        WITH workout_stats AS (
          SELECT 
            COUNT(*) as total_workouts,
            AVG(duration_minutes) as avg_duration,
            SUM(total_volume_kg) as total_volume,
            AVG(average_rpe) as avg_rpe,
            MAX(started_at) as last_workout,
            MIN(started_at) as first_workout
          FROM workout_sessions
          WHERE user_id = ${userId}
            AND completed_at IS NOT NULL
            AND started_at >= NOW() - INTERVAL '${daysBack} days'
        ),
        exercise_stats AS (
          SELECT 
            COUNT(DISTINCT wst.exercise_id) as unique_exercises,
            SUM(wst.reps) as total_reps,
            COUNT(wst.id) as total_sets
          FROM workout_sessions ws
          JOIN workout_sets wst ON ws.id = wst.workout_session_id
          WHERE ws.user_id = ${userId}
            AND ws.completed_at IS NOT NULL
            AND ws.started_at >= NOW() - INTERVAL '${daysBack} days'
        ),
        streak_info AS (
          SELECT 
            COUNT(DISTINCT DATE(started_at)) as workout_days
          FROM workout_sessions
          WHERE user_id = ${userId}
            AND completed_at IS NOT NULL
            AND started_at >= NOW() - INTERVAL '${Math.min(daysBack, 30)} days'
        )
        SELECT 
          ws.*,
          es.unique_exercises,
          es.total_reps,
          es.total_sets,
          si.workout_days
        FROM workout_stats ws
        CROSS JOIN exercise_stats es
        CROSS JOIN streak_info si
      `;

      return (result as any[])[0] || {};
    } catch (error) {
      console.error('Error getting optimized workout stats:', error);
      throw error;
    }
  }

  /**
   * Optimized leaderboard query with materialized calculation
   */
  async getOptimizedLeaderboard(
    category: 'volume' | 'workouts' | 'streak',
    period: 'daily' | 'weekly' | 'monthly',
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { startDate, endDate } = this.calculateDateRange(period);

      let query: string;
      
      switch (category) {
        case 'volume':
          query = `
            WITH ranked_users AS (
              SELECT 
                ws.user_id,
                up.display_name,
                up.avatar_url,
                COALESCE(SUM(ws.total_volume_kg), 0) as total_volume,
                COUNT(ws.id) as workout_count,
                MAX(ws.completed_at) as last_workout,
                ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ws.total_volume_kg), 0) DESC) as rank
              FROM workout_sessions ws
              JOIN user_profiles up ON ws.user_id = up.user_id
              WHERE ws.completed_at IS NOT NULL
                AND ws.started_at >= '${startDate.toISOString()}'
                AND ws.started_at <= '${endDate.toISOString()}'
                AND up.privacy_settings->>'showStats' IS DISTINCT FROM 'false'
              GROUP BY ws.user_id, up.display_name, up.avatar_url
              HAVING SUM(ws.total_volume_kg) > 0
              ORDER BY total_volume DESC
              LIMIT ${limit + 10}
            )
            SELECT * FROM ranked_users ORDER BY rank
          `;
          break;

        case 'workouts':
          query = `
            WITH ranked_users AS (
              SELECT 
                ws.user_id,
                up.display_name,
                up.avatar_url,
                COUNT(ws.id) as workout_count,
                AVG(ws.duration_minutes) as avg_duration,
                MAX(ws.completed_at) as last_workout,
                ROW_NUMBER() OVER (ORDER BY COUNT(ws.id) DESC, AVG(ws.duration_minutes) DESC) as rank
              FROM workout_sessions ws
              JOIN user_profiles up ON ws.user_id = up.user_id
              WHERE ws.completed_at IS NOT NULL
                AND ws.started_at >= '${startDate.toISOString()}'
                AND ws.started_at <= '${endDate.toISOString()}'
                AND up.privacy_settings->>'showStats' IS DISTINCT FROM 'false'
              GROUP BY ws.user_id, up.display_name, up.avatar_url
              HAVING COUNT(ws.id) > 0
              ORDER BY workout_count DESC
              LIMIT ${limit + 10}
            )
            SELECT * FROM ranked_users ORDER BY rank
          `;
          break;

        case 'streak':
          query = `
            WITH user_streaks AS (
              SELECT 
                ws.user_id,
                up.display_name,
                up.avatar_url,
                COUNT(DISTINCT DATE(ws.started_at)) as workout_days,
                MAX(ws.completed_at) as last_workout,
                ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT DATE(ws.started_at)) DESC) as rank
              FROM workout_sessions ws
              JOIN user_profiles up ON ws.user_id = up.user_id
              WHERE ws.completed_at IS NOT NULL
                AND ws.started_at >= '${startDate.toISOString()}'
                AND ws.started_at <= '${endDate.toISOString()}'
                AND up.privacy_settings->>'showStats' IS DISTINCT FROM 'false'
              GROUP BY ws.user_id, up.display_name, up.avatar_url
              HAVING COUNT(DISTINCT DATE(ws.started_at)) >= 2
              ORDER BY workout_days DESC
              LIMIT ${limit + 10}
            )
            SELECT * FROM user_streaks ORDER BY rank
          `;
          break;

        default:
          throw new Error(`Unsupported leaderboard category: ${category}`);
      }

      const result = await this.database.unsafe(query);
      return result as unknown as any[];
    } catch (error) {
      console.error('Error getting optimized leaderboard:', error);
      throw error;
    }
  }

  /**
   * Batch insert optimization for multiple records
   */
  async batchInsertWorkoutSets(sets: any[]): Promise<void> {
    if (sets.length === 0) return;

    try {
      // Build values for batch insert
      const values = sets.map(set => 
        `('${set.id}', '${set.workout_session_id}', '${set.exercise_id}', ${set.set_number}, ${set.reps || 'NULL'}, ${set.weight_kg || 'NULL'}, ${set.rest_time_seconds || 'NULL'}, ${set.rpe || 'NULL'}, ${set.notes ? `'${set.notes.replace(/'/g, "''")}'` : 'NULL'}, NOW())`
      ).join(',');

      await this.database.unsafe(`
        INSERT INTO workout_sets (
          id, workout_session_id, exercise_id, set_number, reps, weight_kg, 
          rest_time_seconds, rpe, notes, completed_at
        ) VALUES ${values}
      `);

      console.log(`✅ Batch inserted ${sets.length} workout sets`);
    } catch (error) {
      console.error('Error in batch insert workout sets:', error);
      throw error;
    }
  }

  /**
   * Optimized exercise search with full-text search
   */
  async optimizedExerciseSearch(
    searchQuery: string,
    filters?: {
      category?: string;
      muscle_group?: string;
      equipment?: string;
      difficulty?: string;
    },
    limit: number = 20
  ): Promise<any[]> {
    try {
      let whereConditions: string[] = ['1=1'];
      let searchCondition = '';

      // Full-text search on name and description
      if (searchQuery && searchQuery.trim()) {
        searchCondition = `
          AND (
            LOWER(name) LIKE LOWER('%${searchQuery.replace(/'/g, "''")}%') OR
            LOWER(name_es) LIKE LOWER('%${searchQuery.replace(/'/g, "''")}%') OR
            LOWER(category) LIKE LOWER('%${searchQuery.replace(/'/g, "''")}%')
          )
        `;
      }

      // Add filters
      if (filters?.category) {
        whereConditions.push(`category_id = '${filters.category.replace(/'/g, "''")}'`);
      }

      if (filters?.muscle_group) {
        whereConditions.push(`'${filters.muscle_group.replace(/'/g, "''")}' = ANY(muscle_groups)`);
      }

      if (filters?.equipment) {
        whereConditions.push(`equipment = '${filters.equipment.replace(/'/g, "''")}'`);
      }

      if (filters?.difficulty) {
        whereConditions.push(`difficulty = '${filters.difficulty.replace(/'/g, "''")}'`);
      }

      const query = `
        SELECT 
          *,
          CASE 
            WHEN LOWER(name_es) LIKE LOWER('%${searchQuery.replace(/'/g, "''")}%') THEN 1
            WHEN LOWER(name) LIKE LOWER('%${searchQuery.replace(/'/g, "''")}%') THEN 2
            WHEN LOWER(category) LIKE LOWER('%${searchQuery.replace(/'/g, "''")}%') THEN 3
            ELSE 4
          END as relevance_score
        FROM exercises
        WHERE ${whereConditions.join(' AND ')}
          ${searchCondition}
        ORDER BY relevance_score, name_es
        LIMIT ${limit}
      `;

      const result = await this.database.unsafe(query);
      return result as unknown as any[];
    } catch (error) {
      console.error('Error in optimized exercise search:', error);
      throw error;
    }
  }

  /**
   * Query performance analyzer
   */
  async analyzeQueryPerformance(query: string): Promise<any> {
    try {
      const explainResult = await this.database.unsafe(`EXPLAIN (ANALYZE, BUFFERS) ${query}`);
      return {
        queryPlan: explainResult,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing query performance:', error);
      return null;
    }
  }

  /**
   * Database maintenance operations
   */
  async performMaintenance(): Promise<void> {
    try {
      console.log('Starting database maintenance...');

      // Update table statistics
      await this.database`ANALYZE`;

      // Vacuum analyze for performance
      await this.database`VACUUM ANALYZE workout_sessions`;
      await this.database`VACUUM ANALYZE workout_sets`;
      await this.database`VACUUM ANALYZE users`;
      await this.database`VACUUM ANALYZE exercises`;

      console.log('✅ Database maintenance completed');
    } catch (error) {
      console.error('Error during database maintenance:', error);
      throw error;
    }
  }

  /**
   * Connection pool optimization
   */
  async optimizeConnectionPool(): Promise<void> {
    try {
      // Set optimal connection settings for Neon
      await this.database`SET shared_preload_libraries = 'pg_stat_statements'`;
      await this.database`SET track_activities = on`;
      await this.database`SET track_counts = on`;
      await this.database`SET track_io_timing = on`;
      
      console.log('✅ Connection pool optimized');
    } catch (error) {
      console.error('Error optimizing connection pool:', error);
      // Don't throw - these settings might not be available in all environments
    }
  }

  // Private helper methods

  private calculateDateRange(period: string): { startDate: Date, endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        const dayOfWeek = startDate.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(startDate.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
    }
    
    return { startDate, endDate };
  }
}

/**
 * Query result caching utilities
 */
export class QueryCache {
  private cache = new Map<string, { data: any, timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any): void {
    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Database connection monitoring
 */
export class DatabaseMonitor {
  constructor(private database: DatabaseClient) {}

  async getConnectionStats(): Promise<any> {
    try {
      const stats = await this.database`
        SELECT 
          COUNT(*) as total_connections,
          COUNT(*) FILTER (WHERE state = 'active') as active_connections,
          COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
          AVG(EXTRACT(EPOCH FROM (now() - backend_start))) as avg_connection_age
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;

      return (stats as any[])[0] || {};
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return {};
    }
  }

  async getSlowQueries(limit: number = 10): Promise<any[]> {
    try {
      // This requires pg_stat_statements extension
      const slowQueries = await this.database`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        ORDER BY total_time DESC
        LIMIT ${limit}
      `;

      return slowQueries as any[];
    } catch (error) {
      console.log('pg_stat_statements not available - slow query monitoring disabled');
      return [];
    }
  }
}