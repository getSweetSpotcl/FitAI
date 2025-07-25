/**
 * Leaderboard Service
 * Dynamic leaderboard system with real user data
 */

import type { DatabaseClient } from "../db/database";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatar?: string;
  value: number;
  unit: string;
  change: string;
  badge?: string;
  streak?: number;
  lastActivity?: Date;
}

export interface LeaderboardResult {
  leaderboard: LeaderboardEntry[];
  userPosition?: LeaderboardEntry;
  metadata: {
    period: string;
    category: string;
    totalParticipants: number;
    lastUpdated: Date;
    cutoffDate: Date;
  };
}

export interface LeaderboardQuery {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  category: 'volume' | 'workouts' | 'streak' | 'achievements' | 'consistency';
  limit?: number;
  userId?: string;
}

export class LeaderboardService {
  constructor(private database: DatabaseClient) {}

  /**
   * Get leaderboard based on query parameters
   */
  async getLeaderboard(query: LeaderboardQuery): Promise<LeaderboardResult> {
    try {
      const { period, category, limit = 50, userId } = query;
      
      // Calculate date range for the period
      const { startDate, endDate } = this.calculateDateRange(period);
      
      let leaderboardData: LeaderboardEntry[] = [];
      let totalParticipants = 0;
      
      switch (category) {
        case 'volume':
          ({ leaderboard: leaderboardData, total: totalParticipants } = 
            await this.getVolumeLeaderboard(startDate, endDate, limit));
          break;
        case 'workouts':
          ({ leaderboard: leaderboardData, total: totalParticipants } = 
            await this.getWorkoutsLeaderboard(startDate, endDate, limit));
          break;
        case 'streak':
          ({ leaderboard: leaderboardData, total: totalParticipants } = 
            await this.getStreakLeaderboard(startDate, endDate, limit));
          break;
        case 'achievements':
          ({ leaderboard: leaderboardData, total: totalParticipants } = 
            await this.getAchievementsLeaderboard(startDate, endDate, limit));
          break;
        case 'consistency':
          ({ leaderboard: leaderboardData, total: totalParticipants } = 
            await this.getConsistencyLeaderboard(startDate, endDate, limit));
          break;
        default:
          throw new Error(`Unsupported leaderboard category: ${category}`);
      }
      
      // Find user position if userId provided
      let userPosition: LeaderboardEntry | undefined;
      if (userId) {
        userPosition = await this.getUserPosition(userId, category, period);
      }
      
      return {
        leaderboard: leaderboardData,
        userPosition,
        metadata: {
          period,
          category,
          totalParticipants,
          lastUpdated: new Date(),
          cutoffDate: startDate
        }
      };
      
    } catch (error) {
      console.error('Get leaderboard error:', error);
      throw new Error(`Failed to get leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get volume-based leaderboard (total weight lifted)
   */
  private async getVolumeLeaderboard(
    startDate: Date, 
    endDate: Date, 
    limit: number
  ): Promise<{ leaderboard: LeaderboardEntry[], total: number }> {
    
    const result = await this.database`
      WITH user_volumes AS (
        SELECT 
          ws.user_id,
          COALESCE(SUM(ws.total_volume_kg), 0) as total_volume,
          COUNT(ws.id) as workout_count,
          MAX(ws.completed_at) as last_workout
        FROM workout_sessions ws
        WHERE ws.completed_at IS NOT NULL
          AND ws.started_at >= ${startDate.toISOString()}
          AND ws.started_at <= ${endDate.toISOString()}
        GROUP BY ws.user_id
        HAVING COUNT(ws.id) >= 1
      ),
      ranked_users AS (
        SELECT 
          uv.*,
          up.display_name,
          up.avatar_url,
          ROW_NUMBER() OVER (ORDER BY uv.total_volume DESC, uv.workout_count DESC) as rank
        FROM user_volumes uv
        JOIN user_profiles up ON uv.user_id = up.user_id
        WHERE up.privacy_settings->>'showStats' IS DISTINCT FROM 'false'
      )
      SELECT 
        rank,
        user_id,
        display_name,
        avatar_url,
        total_volume,
        workout_count,
        last_workout
      FROM ranked_users
      ORDER BY rank
      LIMIT ${limit + 10}
    `;

    const totalResult = await this.database`
      SELECT COUNT(DISTINCT ws.user_id) as total
      FROM workout_sessions ws
      WHERE ws.completed_at IS NOT NULL
        AND ws.started_at >= ${startDate.toISOString()}
        AND ws.started_at <= ${endDate.toISOString()}
    `;

    const leaderboard: LeaderboardEntry[] = (result as any[]).map((row, index) => ({
      rank: parseInt(row.rank),
      userId: row.user_id,
      displayName: row.display_name || `Usuario ${row.user_id.slice(-4)}`,
      avatar: row.avatar_url,
      value: Math.round(parseFloat(row.total_volume) || 0),
      unit: 'kg',
      change: this.calculateChange(index, 'stable'), // TODO: Calculate real change
      badge: this.getBadgeForRank(parseInt(row.rank)),
      lastActivity: row.last_workout ? new Date(row.last_workout) : undefined
    }));

    return {
      leaderboard,
      total: parseInt((totalResult as any[])[0]?.total || '0')
    };
  }

  /**
   * Get workouts-based leaderboard (most workouts completed)
   */
  private async getWorkoutsLeaderboard(
    startDate: Date, 
    endDate: Date, 
    limit: number
  ): Promise<{ leaderboard: LeaderboardEntry[], total: number }> {
    
    const result = await this.database`
      WITH user_workouts AS (
        SELECT 
          ws.user_id,
          COUNT(ws.id) as workout_count,
          AVG(ws.duration_minutes) as avg_duration,
          MAX(ws.completed_at) as last_workout
        FROM workout_sessions ws
        WHERE ws.completed_at IS NOT NULL
          AND ws.started_at >= ${startDate.toISOString()}
          AND ws.started_at <= ${endDate.toISOString()}
        GROUP BY ws.user_id
        HAVING COUNT(ws.id) >= 1
      ),
      ranked_users AS (
        SELECT 
          uw.*,
          up.display_name,
          up.avatar_url,
          ROW_NUMBER() OVER (ORDER BY uw.workout_count DESC, uw.avg_duration DESC) as rank
        FROM user_workouts uw
        JOIN user_profiles up ON uw.user_id = up.user_id
        WHERE up.privacy_settings->>'showStats' IS DISTINCT FROM 'false'
      )
      SELECT 
        rank,
        user_id,
        display_name,
        avatar_url,
        workout_count,
        avg_duration,
        last_workout
      FROM ranked_users
      ORDER BY rank
      LIMIT ${limit + 10}
    `;

    const totalResult = await this.database`
      SELECT COUNT(DISTINCT ws.user_id) as total
      FROM workout_sessions ws
      WHERE ws.completed_at IS NOT NULL
        AND ws.started_at >= ${startDate.toISOString()}
        AND ws.started_at <= ${endDate.toISOString()}
    `;

    const leaderboard: LeaderboardEntry[] = (result as any[]).map((row, index) => ({
      rank: parseInt(row.rank),
      userId: row.user_id,
      displayName: row.display_name || `Usuario ${row.user_id.slice(-4)}`,
      avatar: row.avatar_url,
      value: parseInt(row.workout_count),
      unit: 'entrenamientos',
      change: this.calculateChange(index, 'stable'),
      badge: this.getBadgeForRank(parseInt(row.rank)),
      lastActivity: row.last_workout ? new Date(row.last_workout) : undefined
    }));

    return {
      leaderboard,
      total: parseInt((totalResult as any[])[0]?.total || '0')
    };
  }

  /**
   * Get streak-based leaderboard (current workout streaks)
   */
  private async getStreakLeaderboard(
    startDate: Date, 
    endDate: Date, 
    limit: number
  ): Promise<{ leaderboard: LeaderboardEntry[], total: number }> {
    
    const result = await this.database`
      WITH user_streaks AS (
        SELECT 
          ws.user_id,
          COUNT(DISTINCT DATE(ws.started_at)) as workout_days,
          MAX(ws.completed_at) as last_workout,
          MIN(ws.started_at) as first_workout
        FROM workout_sessions ws
        WHERE ws.completed_at IS NOT NULL
          AND ws.started_at >= ${startDate.toISOString()}
          AND ws.started_at <= ${endDate.toISOString()}
        GROUP BY ws.user_id
        HAVING COUNT(DISTINCT DATE(ws.started_at)) >= 2
      ),
      ranked_users AS (
        SELECT 
          us.*,
          up.display_name,
          up.avatar_url,
          ROW_NUMBER() OVER (ORDER BY us.workout_days DESC, us.last_workout DESC) as rank
        FROM user_streaks us
        JOIN user_profiles up ON us.user_id = up.user_id
        WHERE up.privacy_settings->>'showStats' IS DISTINCT FROM 'false'
      )
      SELECT 
        rank,
        user_id,
        display_name,
        avatar_url,
        workout_days,
        last_workout,
        first_workout
      FROM ranked_users
      ORDER BY rank
      LIMIT ${limit + 10}
    `;

    const totalResult = await this.database`
      SELECT COUNT(DISTINCT ws.user_id) as total
      FROM workout_sessions ws
      WHERE ws.completed_at IS NOT NULL
        AND ws.started_at >= ${startDate.toISOString()}
        AND ws.started_at <= ${endDate.toISOString()}
    `;

    const leaderboard: LeaderboardEntry[] = (result as any[]).map((row, index) => ({
      rank: parseInt(row.rank),
      userId: row.user_id,
      displayName: row.display_name || `Usuario ${row.user_id.slice(-4)}`,
      avatar: row.avatar_url,
      value: parseInt(row.workout_days),
      unit: 'días',
      change: this.calculateChange(index, 'stable'),
      badge: this.getBadgeForRank(parseInt(row.rank)),
      streak: parseInt(row.workout_days),
      lastActivity: row.last_workout ? new Date(row.last_workout) : undefined
    }));

    return {
      leaderboard,
      total: parseInt((totalResult as any[])[0]?.total || '0')
    };
  }

  /**
   * Get achievements-based leaderboard (most achievements earned)
   */
  private async getAchievementsLeaderboard(
    startDate: Date, 
    endDate: Date, 
    limit: number
  ): Promise<{ leaderboard: LeaderboardEntry[], total: number }> {
    
    const result = await this.database`
      WITH user_achievements AS (
        SELECT 
          ua.user_id,
          COUNT(ua.id) as achievement_count,
          SUM(a.points) as total_points,
          MAX(ua.earned_at) as last_achievement
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.earned_at >= ${startDate.toISOString()}
          AND ua.earned_at <= ${endDate.toISOString()}
        GROUP BY ua.user_id
        HAVING COUNT(ua.id) >= 1
      ),
      ranked_users AS (
        SELECT 
          ua.*,
          up.display_name,
          up.avatar_url,
          ROW_NUMBER() OVER (ORDER BY ua.total_points DESC, ua.achievement_count DESC) as rank
        FROM user_achievements ua
        JOIN user_profiles up ON ua.user_id = up.user_id
        WHERE up.privacy_settings->>'showAchievements' IS DISTINCT FROM 'false'
      )
      SELECT 
        rank,
        user_id,
        display_name,
        avatar_url,
        achievement_count,
        total_points,
        last_achievement
      FROM ranked_users
      ORDER BY rank
      LIMIT ${limit + 10}
    `;

    const totalResult = await this.database`
      SELECT COUNT(DISTINCT ua.user_id) as total
      FROM user_achievements ua
      WHERE ua.earned_at >= ${startDate.toISOString()}
        AND ua.earned_at <= ${endDate.toISOString()}
    `;

    const leaderboard: LeaderboardEntry[] = (result as any[]).map((row, index) => ({
      rank: parseInt(row.rank),
      userId: row.user_id,
      displayName: row.display_name || `Usuario ${row.user_id.slice(-4)}`,
      avatar: row.avatar_url,
      value: parseInt(row.total_points || row.achievement_count),
      unit: 'puntos',
      change: this.calculateChange(index, 'stable'),
      badge: this.getBadgeForRank(parseInt(row.rank)),
      lastActivity: row.last_achievement ? new Date(row.last_achievement) : undefined
    }));

    return {
      leaderboard,
      total: parseInt((totalResult as any[])[0]?.total || '0')
    };
  }

  /**
   * Get consistency-based leaderboard (workout frequency/regularity)
   */
  private async getConsistencyLeaderboard(
    startDate: Date, 
    endDate: Date, 
    limit: number
  ): Promise<{ leaderboard: LeaderboardEntry[], total: number }> {
    
    const result = await this.database`
      WITH user_consistency AS (
        SELECT 
          ws.user_id,
          COUNT(ws.id) as total_workouts,
          COUNT(DISTINCT DATE(ws.started_at)) as unique_days,
          EXTRACT(DAYS FROM (${endDate.toISOString()}::date - ${startDate.toISOString()}::date)) as period_days,
          MAX(ws.completed_at) as last_workout
        FROM workout_sessions ws
        WHERE ws.completed_at IS NOT NULL
          AND ws.started_at >= ${startDate.toISOString()}
          AND ws.started_at <= ${endDate.toISOString()}
        GROUP BY ws.user_id
        HAVING COUNT(ws.id) >= 3
      ),
      ranked_users AS (
        SELECT 
          uc.*,
          up.display_name,
          up.avatar_url,
          ROUND((uc.unique_days::float / GREATEST(uc.period_days, 1)) * 100, 1) as consistency_score,
          ROW_NUMBER() OVER (
            ORDER BY 
              (uc.unique_days::float / GREATEST(uc.period_days, 1)) DESC,
              uc.total_workouts DESC
          ) as rank
        FROM user_consistency uc
        JOIN user_profiles up ON uc.user_id = up.user_id
        WHERE up.privacy_settings->>'showStats' IS DISTINCT FROM 'false'
      )
      SELECT 
        rank,
        user_id,
        display_name,
        avatar_url,
        total_workouts,
        unique_days,
        consistency_score,
        last_workout
      FROM ranked_users
      ORDER BY rank
      LIMIT ${limit + 10}
    `;

    const totalResult = await this.database`
      SELECT COUNT(DISTINCT ws.user_id) as total
      FROM workout_sessions ws
      WHERE ws.completed_at IS NOT NULL
        AND ws.started_at >= ${startDate.toISOString()}
        AND ws.started_at <= ${endDate.toISOString()}
    `;

    const leaderboard: LeaderboardEntry[] = (result as any[]).map((row, index) => ({
      rank: parseInt(row.rank),
      userId: row.user_id,
      displayName: row.display_name || `Usuario ${row.user_id.slice(-4)}`,
      avatar: row.avatar_url,
      value: Math.round(parseFloat(row.consistency_score) || 0),
      unit: '% consistencia',
      change: this.calculateChange(index, 'stable'),
      badge: this.getBadgeForRank(parseInt(row.rank)),
      lastActivity: row.last_workout ? new Date(row.last_workout) : undefined
    }));

    return {
      leaderboard,
      total: parseInt((totalResult as any[])[0]?.total || '0')
    };
  }

  /**
   * Get user's position in specific leaderboard
   */
  private async getUserPosition(
    userId: string, 
    category: string, 
    period: string
  ): Promise<LeaderboardEntry | undefined> {
    try {
      const { startDate, endDate } = this.calculateDateRange(period as any);
      
      // Get user's stats for the period
      let query: string;
      let params: any[] = [userId, startDate.toISOString(), endDate.toISOString()];
      
      switch (category) {
        case 'volume':
          query = `
            WITH user_rank AS (
              SELECT 
                user_id,
                COALESCE(SUM(total_volume_kg), 0) as total_volume,
                ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(total_volume_kg), 0) DESC) as rank
              FROM workout_sessions ws
              WHERE ws.completed_at IS NOT NULL
                AND ws.started_at >= $2
                AND ws.started_at <= $3
              GROUP BY user_id
            )
            SELECT 
              ur.rank,
              ur.total_volume as value,
              up.display_name,
              up.avatar_url
            FROM user_rank ur
            JOIN user_profiles up ON ur.user_id = up.user_id
            WHERE ur.user_id = $1
          `;
          break;
          
        case 'workouts':
          query = `
            WITH user_rank AS (
              SELECT 
                user_id,
                COUNT(id) as workout_count,
                ROW_NUMBER() OVER (ORDER BY COUNT(id) DESC) as rank
              FROM workout_sessions ws
              WHERE ws.completed_at IS NOT NULL
                AND ws.started_at >= $2
                AND ws.started_at <= $3
              GROUP BY user_id
            )
            SELECT 
              ur.rank,
              ur.workout_count as value,
              up.display_name,
              up.avatar_url
            FROM user_rank ur
            JOIN user_profiles up ON ur.user_id = up.user_id
            WHERE ur.user_id = $1
          `;
          break;
          
        default:
          return undefined;
      }
      
      const result = await this.database.unsafe(query);
      const userRow = (result as unknown as any[])[0];
      
      if (!userRow) {
        return undefined;
      }
      
      return {
        rank: parseInt(userRow.rank),
        userId,
        displayName: userRow.display_name || 'Tú',
        avatar: userRow.avatar_url,
        value: Math.round(parseFloat(userRow.value) || 0),
        unit: category === 'volume' ? 'kg' : 'entrenamientos',
        change: '0', // TODO: Calculate change from previous period
        badge: this.getBadgeForRank(parseInt(userRow.rank))
      };
      
    } catch (error) {
      console.error('Get user position error:', error);
      return undefined;
    }
  }

  /**
   * Calculate date range for different periods
   */
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
      case 'yearly':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'all_time':
        startDate.setFullYear(2020, 0, 1); // Set to a reasonable start date
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        // Default to weekly
        const defaultDayOfWeek = startDate.getDay();
        const defaultDaysToMonday = defaultDayOfWeek === 0 ? 6 : defaultDayOfWeek - 1;
        startDate.setDate(startDate.getDate() - defaultDaysToMonday);
        startDate.setHours(0, 0, 0, 0);
    }
    
    return { startDate, endDate };
  }

  /**
   * Calculate position change (placeholder - would need historical data)
   */
  private calculateChange(currentRank: number, trend: 'up' | 'down' | 'stable'): string {
    // TODO: Implement real change calculation by comparing with previous period
    const changes = ['+3', '+1', '0', '-1', '-2', '+2', '+4', '-3'];
    return changes[currentRank % changes.length];
  }

  /**
   * Get badge for user rank
   */
  private getBadgeForRank(rank: number): string | undefined {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '⭐';
    if (rank <= 25) return '🎯';
    return undefined;
  }
}