/**
 * Real-Time Feed Service
 * Advanced social feed with real-time activity updates and intelligent content curation
 */

import type { DatabaseClient } from "../db/database";

export interface FeedActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  activityType: 'workout_completed' | 'achievement_earned' | 'routine_shared' | 'pr_set' | 'milestone_reached' | 'challenge_joined' | 'goal_achieved';
  title: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
  isHighlighted: boolean;
  engagementScore: number;
  mediaUrls?: string[];
  reactions: {
    likes: number;
    comments: number;
    shares: number;
  };
  userReaction?: 'like' | 'love' | 'fire' | 'strong';
}

export interface FeedQuery {
  userId: string;
  feedType: 'following' | 'discover' | 'global' | 'trending';
  limit?: number;
  offset?: number;
  timeframe?: 'hour' | 'day' | 'week' | 'month';
  activityTypes?: string[];
  includeOwnActivities?: boolean;
}

export interface FeedResponse {
  activities: FeedActivity[];
  hasMore: boolean;
  nextOffset: number;
  totalCount: number;
  lastUpdated: Date;
}

export class RealTimeFeedService {
  constructor(private database: DatabaseClient) {}

  /**
   * Get personalized activity feed for user
   */
  async getPersonalizedFeed(query: FeedQuery): Promise<FeedResponse> {
    try {
      const { userId, feedType, limit = 20, offset = 0, timeframe = 'day', activityTypes, includeOwnActivities = false } = query;
      
      let activities: FeedActivity[] = [];
      let totalCount = 0;

      switch (feedType) {
        case 'following':
          ({ activities, totalCount } = await this.getFollowingFeed(userId, limit, offset, timeframe, activityTypes, includeOwnActivities));
          break;
        case 'discover':
          ({ activities, totalCount } = await this.getDiscoverFeed(userId, limit, offset, timeframe, activityTypes));
          break;
        case 'global':
          ({ activities, totalCount } = await this.getGlobalFeed(limit, offset, timeframe, activityTypes));
          break;
        case 'trending':
          ({ activities, totalCount } = await this.getTrendingFeed(limit, offset, timeframe));
          break;
        default:
          throw new Error(`Unsupported feed type: ${feedType}`);
      }

      // Apply intelligent ranking and personalization
      const rankedActivities = await this.applyIntelligentRanking(activities, userId);

      return {
        activities: rankedActivities,
        hasMore: offset + limit < totalCount,
        nextOffset: offset + limit,
        totalCount,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Get personalized feed error:', error);
      throw new Error(`Failed to get personalized feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create new activity in the feed
   */
  async createActivity(activity: Omit<FeedActivity, 'id' | 'timestamp' | 'reactions' | 'engagementScore'>): Promise<FeedActivity> {
    try {
      const activityId = crypto.randomUUID();
      const timestamp = new Date();

      await this.database`
        INSERT INTO feed_activities (
          id, user_id, activity_type, title, description, metadata,
          is_highlighted, media_urls, created_at
        ) VALUES (
          ${activityId}, ${activity.userId}, ${activity.activityType},
          ${activity.title}, ${activity.description}, ${JSON.stringify(activity.metadata)},
          ${activity.isHighlighted}, ${JSON.stringify(activity.mediaUrls || [])}, NOW()
        )
      `;

      // Create notifications for followers
      await this.notifyFollowers(activity.userId, activityId, activity.activityType);

      const createdActivity: FeedActivity = {
        ...activity,
        id: activityId,
        timestamp,
        reactions: { likes: 0, comments: 0, shares: 0 },
        engagementScore: this.calculateInitialEngagementScore(activity)
      };

      return createdActivity;
    } catch (error) {
      console.error('Create activity error:', error);
      throw new Error('Failed to create activity');
    }
  }

  /**
   * React to a feed activity
   */
  async reactToActivity(
    userId: string, 
    activityId: string, 
    reactionType: 'like' | 'love' | 'fire' | 'strong'
  ): Promise<{ success: boolean, newCount: number }> {
    try {
      // Check if user already reacted
      const existingReaction = await this.database`
        SELECT id, reaction_type FROM activity_reactions
        WHERE user_id = ${userId} AND activity_id = ${activityId}
        LIMIT 1
      `;

      if ((existingReaction as any[]).length > 0) {
        // Update existing reaction
        await this.database`
          UPDATE activity_reactions
          SET reaction_type = ${reactionType}, updated_at = NOW()
          WHERE user_id = ${userId} AND activity_id = ${activityId}
        `;
      } else {
        // Create new reaction
        await this.database`
          INSERT INTO activity_reactions (
            id, user_id, activity_id, reaction_type, created_at
          ) VALUES (
            ${crypto.randomUUID()}, ${userId}, ${activityId}, ${reactionType}, NOW()
          )
        `;
      }

      // Get updated reaction count
      const countResult = await this.database`
        SELECT COUNT(*) as count
        FROM activity_reactions
        WHERE activity_id = ${activityId}
      `;

      const newCount = parseInt((countResult as any[])[0]?.count || '0');

      // Update engagement score
      await this.updateEngagementScore(activityId);

      return { success: true, newCount };
    } catch (error) {
      console.error('React to activity error:', error);
      throw new Error('Failed to react to activity');
    }
  }

  /**
   * Get trending activities based on engagement
   */
  async getTrendingActivities(
    limit: number = 10, 
    timeframe: string = 'day'
  ): Promise<FeedActivity[]> {
    try {
      const { startDate } = this.getTimeframeRange(timeframe);

      const result = await this.database`
        SELECT 
          fa.*,
          up.display_name as user_name,
          up.avatar_url as user_avatar,
          COALESCE(reaction_counts.likes, 0) as likes,
          COALESCE(reaction_counts.comments, 0) as comments,
          COALESCE(reaction_counts.shares, 0) as shares,
          COALESCE(fa.engagement_score, 0) as engagement_score
        FROM feed_activities fa
        JOIN user_profiles up ON fa.user_id = up.user_id
        LEFT JOIN (
          SELECT 
            activity_id,
            COUNT(CASE WHEN reaction_type IN ('like', 'love') THEN 1 END) as likes,
            COUNT(CASE WHEN reaction_type = 'comment' THEN 1 END) as comments,
            COUNT(CASE WHEN reaction_type = 'share' THEN 1 END) as shares
          FROM activity_reactions
          GROUP BY activity_id
        ) reaction_counts ON fa.id = reaction_counts.activity_id
        WHERE fa.created_at >= ${startDate.toISOString()}
          AND up.privacy_settings->>'profilePublic' IS DISTINCT FROM 'false'
        ORDER BY 
          fa.engagement_score DESC,
          (reaction_counts.likes + reaction_counts.comments * 2 + reaction_counts.shares * 3) DESC,
          fa.created_at DESC
        LIMIT ${limit}
      `;

      return this.mapActivities(result as any[]);
    } catch (error) {
      console.error('Get trending activities error:', error);
      return [];
    }
  }

  /**
   * Bulk create activities from workout completion
   */
  async createWorkoutActivities(userId: string, workoutData: any): Promise<FeedActivity[]> {
    try {
      const activities: FeedActivity[] = [];

      // Main workout completion activity
      const mainActivity = await this.createActivity({
        userId,
        userName: workoutData.userName || 'Usuario',
        userAvatar: workoutData.userAvatar,
        activityType: 'workout_completed',
        title: `Completó un entrenamiento de ${workoutData.routineName || 'entrenamiento'}`,
        description: `Duración: ${workoutData.duration || 0} min, Volumen: ${workoutData.totalVolume || 0} kg`,
        metadata: {
          routineId: workoutData.routineId,
          routineName: workoutData.routineName,
          duration: workoutData.duration,
          totalVolume: workoutData.totalVolume,
          exerciseCount: workoutData.exerciseCount,
          averageRPE: workoutData.averageRPE
        },
        isHighlighted: workoutData.totalVolume > 1000 || workoutData.duration > 60,
        mediaUrls: workoutData.mediaUrls || []
      });

      activities.push(mainActivity);

      // Check for PR activities
      if (workoutData.personalRecords && workoutData.personalRecords.length > 0) {
        for (const pr of workoutData.personalRecords) {
          const prActivity = await this.createActivity({
            userId,
            userName: workoutData.userName || 'Usuario',
            userAvatar: workoutData.userAvatar,
            activityType: 'pr_set',
            title: `¡Nuevo récord personal en ${pr.exerciseName}!`,
            description: `${pr.weight}kg x ${pr.reps} reps (anterior: ${pr.previousWeight}kg x ${pr.previousReps})`,
            metadata: {
              exerciseId: pr.exerciseId,
              exerciseName: pr.exerciseName,
              newWeight: pr.weight,
              newReps: pr.reps,
              previousWeight: pr.previousWeight,
              previousReps: pr.previousReps,
              improvement: pr.improvement
            },
            isHighlighted: true,
            mediaUrls: []
          });

          activities.push(prActivity);
        }
      }

      // Check for milestone activities
      if (workoutData.milestones && workoutData.milestones.length > 0) {
        for (const milestone of workoutData.milestones) {
          const milestoneActivity = await this.createActivity({
            userId,
            userName: workoutData.userName || 'Usuario',
            userAvatar: workoutData.userAvatar,
            activityType: 'milestone_reached',
            title: `¡Hito alcanzado: ${milestone.title}!`,
            description: milestone.description,
            metadata: {
              milestoneType: milestone.type,
              value: milestone.value,
              unit: milestone.unit
            },
            isHighlighted: true,
            mediaUrls: []
          });

          activities.push(milestoneActivity);
        }
      }

      return activities;
    } catch (error) {
      console.error('Create workout activities error:', error);
      return [];
    }
  }

  // Private helper methods

  private async getFollowingFeed(
    userId: string, 
    limit: number, 
    offset: number, 
    timeframe: string, 
    activityTypes?: string[],
    includeOwnActivities?: boolean
  ): Promise<{ activities: FeedActivity[], totalCount: number }> {
    
    const { startDate } = this.getTimeframeRange(timeframe);
    
    let activityTypeFilter = '';
    if (activityTypes && activityTypes.length > 0) {
      activityTypeFilter = `AND fa.activity_type = ANY(ARRAY[${activityTypes.map(t => `'${t}'`).join(',')}])`;
    }

    let userFilter = `AND sf.following_id = fa.user_id`;
    if (includeOwnActivities) {
      userFilter = `AND (sf.following_id = fa.user_id OR fa.user_id = '${userId}')`;
    }

    const result = await this.database`
      SELECT 
        fa.*,
        up.display_name as user_name,
        up.avatar_url as user_avatar,
        COALESCE(reaction_counts.likes, 0) as likes,
        COALESCE(reaction_counts.comments, 0) as comments,
        COALESCE(reaction_counts.shares, 0) as shares,
        ur.reaction_type as user_reaction
      FROM feed_activities fa
      JOIN user_profiles up ON fa.user_id = up.user_id
      LEFT JOIN social_follows sf ON sf.follower_id = ${userId}
      LEFT JOIN (
        SELECT 
          activity_id,
          COUNT(CASE WHEN reaction_type IN ('like', 'love') THEN 1 END) as likes,
          COUNT(CASE WHEN reaction_type = 'comment' THEN 1 END) as comments,
          COUNT(CASE WHEN reaction_type = 'share' THEN 1 END) as shares
        FROM activity_reactions
        GROUP BY activity_id
      ) reaction_counts ON fa.id = reaction_counts.activity_id
      LEFT JOIN activity_reactions ur ON fa.id = ur.activity_id AND ur.user_id = ${userId}
      WHERE fa.created_at >= ${startDate.toISOString()}
        ${userFilter}
        ${activityTypeFilter}
      ORDER BY 
        fa.is_highlighted DESC,
        fa.engagement_score DESC,
        fa.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countResult = await this.database`
      SELECT COUNT(*) as total
      FROM feed_activities fa
      LEFT JOIN social_follows sf ON sf.follower_id = ${userId}
      WHERE fa.created_at >= ${startDate.toISOString()}
        ${userFilter}
        ${activityTypeFilter}
    `;

    return {
      activities: this.mapActivities(result as unknown as any[]),
      totalCount: parseInt((countResult as unknown as any[])[0]?.total || '0')
    };
  }

  private async getDiscoverFeed(
    userId: string, 
    limit: number, 
    offset: number, 
    timeframe: string, 
    activityTypes?: string[]
  ): Promise<{ activities: FeedActivity[], totalCount: number }> {
    
    const { startDate } = this.getTimeframeRange(timeframe);
    
    let activityTypeFilter = '';
    if (activityTypes && activityTypes.length > 0) {
      activityTypeFilter = `AND fa.activity_type = ANY(ARRAY[${activityTypes.map(t => `'${t}'`).join(',')}])`;
    }

    // Get activities from users not being followed, with high engagement
    const result = await this.database.unsafe(`
      SELECT 
        fa.*,
        up.display_name as user_name,
        up.avatar_url as user_avatar,
        COALESCE(reaction_counts.likes, 0) as likes,
        COALESCE(reaction_counts.comments, 0) as comments,
        COALESCE(reaction_counts.shares, 0) as shares,
        ur.reaction_type as user_reaction
      FROM feed_activities fa
      JOIN user_profiles up ON fa.user_id = up.user_id
      LEFT JOIN social_follows sf ON sf.follower_id = '${userId}' AND sf.following_id = fa.user_id
      LEFT JOIN (
        SELECT 
          activity_id,
          COUNT(CASE WHEN reaction_type IN ('like', 'love') THEN 1 END) as likes,
          COUNT(CASE WHEN reaction_type = 'comment' THEN 1 END) as comments,
          COUNT(CASE WHEN reaction_type = 'share' THEN 1 END) as shares
        FROM activity_reactions
        GROUP BY activity_id
      ) reaction_counts ON fa.id = reaction_counts.activity_id
      LEFT JOIN activity_reactions ur ON fa.id = ur.activity_id AND ur.user_id = '${userId}'
      WHERE fa.created_at >= '${startDate.toISOString()}'
        AND sf.id IS NULL -- Not following this user
        AND fa.user_id != '${userId}' -- Not own activities
        AND up.privacy_settings->>'profilePublic' IS DISTINCT FROM 'false'
        AND fa.engagement_score > 10 -- High engagement activities
        ${activityTypeFilter}
      ORDER BY 
        fa.engagement_score DESC,
        (reaction_counts.likes + reaction_counts.comments * 2) DESC,
        fa.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const countResult = await this.database.unsafe(`
      SELECT COUNT(*) as total
      FROM feed_activities fa
      JOIN user_profiles up ON fa.user_id = up.user_id
      LEFT JOIN social_follows sf ON sf.follower_id = '${userId}' AND sf.following_id = fa.user_id
      WHERE fa.created_at >= '${startDate.toISOString()}'
        AND sf.id IS NULL
        AND fa.user_id != '${userId}'
        AND up.privacy_settings->>'profilePublic' IS DISTINCT FROM 'false'
        AND fa.engagement_score > 10
        ${activityTypeFilter}
    `);

    return {
      activities: this.mapActivities(result as unknown as any[]),
      totalCount: parseInt((countResult as unknown as any[])[0]?.total || '0')
    };
  }

  private async getGlobalFeed(
    limit: number, 
    offset: number, 
    timeframe: string, 
    activityTypes?: string[]
  ): Promise<{ activities: FeedActivity[], totalCount: number }> {
    
    const { startDate } = this.getTimeframeRange(timeframe);
    
    let activityTypeFilter = '';
    if (activityTypes && activityTypes.length > 0) {
      activityTypeFilter = `AND fa.activity_type = ANY(ARRAY[${activityTypes.map(t => `'${t}'`).join(',')}])`;
    }

    const result = await this.database.unsafe(`
      SELECT 
        fa.*,
        up.display_name as user_name,
        up.avatar_url as user_avatar,
        COALESCE(reaction_counts.likes, 0) as likes,
        COALESCE(reaction_counts.comments, 0) as comments,
        COALESCE(reaction_counts.shares, 0) as shares
      FROM feed_activities fa
      JOIN user_profiles up ON fa.user_id = up.user_id
      LEFT JOIN (
        SELECT 
          activity_id,
          COUNT(CASE WHEN reaction_type IN ('like', 'love') THEN 1 END) as likes,
          COUNT(CASE WHEN reaction_type = 'comment' THEN 1 END) as comments,
          COUNT(CASE WHEN reaction_type = 'share' THEN 1 END) as shares
        FROM activity_reactions
        GROUP BY activity_id
      ) reaction_counts ON fa.id = reaction_counts.activity_id
      WHERE fa.created_at >= '${startDate.toISOString()}'
        AND up.privacy_settings->>'profilePublic' IS DISTINCT FROM 'false'
        ${activityTypeFilter}
      ORDER BY 
        fa.is_highlighted DESC,
        fa.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const countResult = await this.database.unsafe(`
      SELECT COUNT(*) as total
      FROM feed_activities fa
      JOIN user_profiles up ON fa.user_id = up.user_id
      WHERE fa.created_at >= '${startDate.toISOString()}'
        AND up.privacy_settings->>'profilePublic' IS DISTINCT FROM 'false'
        ${activityTypeFilter}
    `);

    return {
      activities: this.mapActivities(result as unknown as any[]),
      totalCount: parseInt((countResult as unknown as any[])[0]?.total || '0')
    };
  }

  private async getTrendingFeed(
    limit: number, 
    offset: number, 
    timeframe: string
  ): Promise<{ activities: FeedActivity[], totalCount: number }> {
    
    const trendingActivities = await this.getTrendingActivities(limit + offset, timeframe);
    const slicedActivities = trendingActivities.slice(offset, offset + limit);

    return {
      activities: slicedActivities,
      totalCount: trendingActivities.length
    };
  }

  private async applyIntelligentRanking(activities: FeedActivity[], userId: string): Promise<FeedActivity[]> {
    // Apply machine learning-style ranking based on user preferences and engagement
    // For now, we'll use a simple scoring system
    
    return activities.sort((a, b) => {
      let scoreA = a.engagementScore;
      let scoreB = b.engagementScore;
      
      // Boost highlighted activities
      if (a.isHighlighted) scoreA += 10;
      if (b.isHighlighted) scoreB += 10;
      
      // Boost recent activities
      const hoursAgo = (Date.now() - a.timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 2) scoreA += 5;
      
      const hoursBgo = (Date.now() - b.timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursBgo < 2) scoreB += 5;
      
      return scoreB - scoreA;
    });
  }

  private calculateInitialEngagementScore(activity: Omit<FeedActivity, 'id' | 'timestamp' | 'reactions' | 'engagementScore'>): number {
    let score = 1; // Base score
    
    // Activity type multipliers
    const typeMultipliers = {
      'workout_completed': 1,
      'achievement_earned': 3,
      'routine_shared': 2,
      'pr_set': 4,
      'milestone_reached': 3,
      'challenge_joined': 2,
      'goal_achieved': 3
    };
    
    score *= typeMultipliers[activity.activityType] || 1;
    
    // Highlighted content gets boost
    if (activity.isHighlighted) score *= 2;
    
    // Media content gets boost
    if (activity.mediaUrls && activity.mediaUrls.length > 0) score *= 1.5;
    
    return Math.round(score);
  }

  private async updateEngagementScore(activityId: string): Promise<void> {
    try {
      const result = await this.database`
        SELECT 
          COUNT(CASE WHEN reaction_type IN ('like', 'love') THEN 1 END) as likes,
          COUNT(CASE WHEN reaction_type = 'comment' THEN 1 END) as comments,
          COUNT(CASE WHEN reaction_type = 'share' THEN 1 END) as shares
        FROM activity_reactions
        WHERE activity_id = ${activityId}
      `;

      const stats = (result as any[])[0];
      const likes = parseInt(stats?.likes || '0');
      const comments = parseInt(stats?.comments || '0');
      const shares = parseInt(stats?.shares || '0');

      // Calculate engagement score: likes + comments*2 + shares*3
      const engagementScore = likes + (comments * 2) + (shares * 3);

      await this.database`
        UPDATE feed_activities
        SET engagement_score = ${engagementScore}
        WHERE id = ${activityId}
      `;
    } catch (error) {
      console.error('Update engagement score error:', error);
    }
  }

  private async notifyFollowers(userId: string, activityId:string, activityType: string): Promise<void> {
    try {
      // Get followers
      const followers = await this.database`
        SELECT follower_id
        FROM social_follows
        WHERE following_id = ${userId}
          AND status = 'active'
      `;

      // Create notifications for each follower
      for (const follower of followers as any[]) {
        await this.database`
          INSERT INTO social_notifications (
            id, user_id, type, title, message, data, created_at
          ) VALUES (
            ${crypto.randomUUID()}, ${follower.follower_id}, 'feed_activity',
            'Nueva actividad', 'Hay nueva actividad en tu feed',
            ${JSON.stringify({ activityId, activityType, fromUserId: userId })}, NOW()
          )
        `;
      }
    } catch (error) {
      console.error('Notify followers error:', error);
    }
  }

  private getTimeframeRange(timeframe: string): { startDate: Date } {
    const startDate = new Date();
    
    switch (timeframe) {
      case 'hour':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 1);
    }
    
    return { startDate };
  }

  private mapActivities(rows: any[]): FeedActivity[] {
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || `Usuario ${row.user_id.slice(-4)}`,
      userAvatar: row.user_avatar,
      activityType: row.activity_type,
      title: row.title,
      description: row.description,
      metadata: JSON.parse(row.metadata || '{}'),
      timestamp: new Date(row.created_at),
      isHighlighted: row.is_highlighted || false,
      engagementScore: parseInt(row.engagement_score || '0'),
      mediaUrls: JSON.parse(row.media_urls || '[]'),
      reactions: {
        likes: parseInt(row.likes || '0'),
        comments: parseInt(row.comments || '0'),
        shares: parseInt(row.shares || '0')
      },
      userReaction: row.user_reaction
    }));
  }
}