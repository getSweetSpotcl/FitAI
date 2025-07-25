/**
 * Dynamic Achievements Service
 * Advanced achievement system with real-time triggers and dynamic badge generation
 */

import type { DatabaseClient } from "../db/database";

export interface DynamicAchievement {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  category: 'strength' | 'endurance' | 'consistency' | 'social' | 'milestone' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  icon: string;
  conditions: AchievementCondition[];
  isSecret: boolean;
  isRepeatable: boolean;
  cooldownDays?: number;
  prerequisites?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AchievementCondition {
  type: 'workout_count' | 'volume_total' | 'streak_days' | 'rpe_average' | 'exercise_mastery' | 'social_interaction' | 'time_based';
  operator: 'gte' | 'lte' | 'eq' | 'range';
  value: number;
  valueMax?: number;
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all_time';
  metadata?: Record<string, any>;
}

export interface UserAchievementProgress {
  userId: string;
  achievementId: string;
  currentValue: number;
  targetValue: number;
  progress: number; // 0-100
  isCompleted: boolean;
  completedAt?: Date;
  lastUpdated: Date;
}

export interface AchievementTriggerEvent {
  userId: string;
  eventType: 'workout_completed' | 'exercise_performed' | 'social_action' | 'milestone_reached' | 'manual_trigger';
  eventData: Record<string, any>;
  timestamp: Date;
}

export class DynamicAchievementsService {
  constructor(private database: DatabaseClient) {}

  /**
   * Initialize default achievements in the database
   */
  async initializeDefaultAchievements(): Promise<void> {
    const defaultAchievements: Omit<DynamicAchievement, 'createdAt' | 'updatedAt'>[] = [
      // Strength Achievements
      {
        id: 'first_workout',
        name: 'First Steps',
        nameEs: 'Primeros Pasos',
        description: 'Complete your first workout',
        descriptionEs: 'Completa tu primer entrenamiento',
        category: 'milestone',
        rarity: 'common',
        points: 10,
        icon: '🏃‍♂️',
        conditions: [{ type: 'workout_count', operator: 'gte', value: 1, timeframe: 'all_time' }],
        isSecret: false,
        isRepeatable: false
      },
      {
        id: 'volume_beast_1000',
        name: 'Volume Beast',
        nameEs: 'Bestia del Volumen',
        description: 'Lift 1000kg total volume in a single workout',
        descriptionEs: 'Levanta 1000kg de volumen total en un entrenamiento',
        category: 'strength',
        rarity: 'rare',
        points: 50,
        icon: '💪',
        conditions: [{ type: 'volume_total', operator: 'gte', value: 1000, timeframe: 'day' }],
        isSecret: false,
        isRepeatable: true,
        cooldownDays: 7
      },
      {
        id: 'streak_warrior_7',
        name: 'Streak Warrior',
        nameEs: 'Guerrero de la Racha',
        description: 'Complete workouts for 7 consecutive days',
        descriptionEs: 'Completa entrenamientos por 7 días consecutivos',
        category: 'consistency',
        rarity: 'epic',
        points: 100,
        icon: '🔥',
        conditions: [{ type: 'streak_days', operator: 'gte', value: 7, timeframe: 'all_time' }],
        isSecret: false,
        isRepeatable: true,
        cooldownDays: 30
      },
      {
        id: 'perfectionist',
        name: 'Perfectionist',
        nameEs: 'Perfeccionista',
        description: 'Complete 10 workouts with average RPE below 6',
        descriptionEs: 'Completa 10 entrenamientos con RPE promedio menor a 6',
        category: 'consistency',
        rarity: 'rare',
        points: 75,
        icon: '⭐',
        conditions: [
          { type: 'workout_count', operator: 'gte', value: 10, timeframe: 'month' },
          { type: 'rpe_average', operator: 'lte', value: 6, timeframe: 'month' }
        ],
        isSecret: false,
        isRepeatable: true,
        cooldownDays: 30
      },
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        nameEs: 'Mariposa Social',
        description: 'Follow 10 users and share 5 workouts',
        descriptionEs: 'Sigue a 10 usuarios y comparte 5 entrenamientos',
        category: 'social',
        rarity: 'common',
        points: 25,
        icon: '🦋',
        conditions: [
          { type: 'social_interaction', operator: 'gte', value: 10, metadata: { action: 'follow' } },
          { type: 'social_interaction', operator: 'gte', value: 5, metadata: { action: 'share_workout' } }
        ],
        isSecret: false,
        isRepeatable: false
      },
      {
        id: 'hundred_club',
        name: 'Hundred Club',
        nameEs: 'Club de los Cien',
        description: 'Complete 100 total workouts',
        descriptionEs: 'Completa 100 entrenamientos en total',
        category: 'milestone',
        rarity: 'epic',
        points: 200,
        icon: '💯',
        conditions: [{ type: 'workout_count', operator: 'gte', value: 100, timeframe: 'all_time' }],
        isSecret: false,
        isRepeatable: false
      },
      {
        id: 'exercise_master_squat',
        name: 'Squat Master',
        nameEs: 'Maestro del Squat',
        description: 'Perform squats in 20 different workouts',
        descriptionEs: 'Realiza squats en 20 entrenamientos diferentes',
        category: 'strength',
        rarity: 'rare',
        points: 60,
        icon: '🏋️‍♂️',
        conditions: [{ 
          type: 'exercise_mastery', 
          operator: 'gte', 
          value: 20, 
          metadata: { exercise_name: 'squat' } 
        }],
        isSecret: false,
        isRepeatable: false
      },
      {
        id: 'early_bird',
        name: 'Early Bird',
        nameEs: 'Madrugador',
        description: 'Complete 10 workouts before 7 AM',
        descriptionEs: 'Completa 10 entrenamientos antes de las 7 AM',
        category: 'special',
        rarity: 'rare',
        points: 50,
        icon: '🌅',
        conditions: [{ 
          type: 'time_based', 
          operator: 'gte', 
          value: 10, 
          metadata: { hour_before: 7 } 
        }],
        isSecret: false,
        isRepeatable: true,
        cooldownDays: 90
      }
    ];

    for (const achievement of defaultAchievements) {
      try {
        await this.database`
          INSERT INTO dynamic_achievements (
            id, name, name_es, description, description_es, category, rarity, points,
            icon, conditions, is_secret, is_repeatable, cooldown_days, prerequisites,
            created_at, updated_at
          ) VALUES (
            ${achievement.id}, ${achievement.name}, ${achievement.nameEs},
            ${achievement.description}, ${achievement.descriptionEs}, ${achievement.category},
            ${achievement.rarity}, ${achievement.points}, ${achievement.icon},
            ${JSON.stringify(achievement.conditions)}, ${achievement.isSecret},
            ${achievement.isRepeatable}, ${achievement.cooldownDays || null}, 
            ${JSON.stringify(achievement.prerequisites || [])}, NOW(), NOW()
          )
          ON CONFLICT (id) DO NOTHING
        `;
      } catch (error) {
        console.error(`Error inserting achievement ${achievement.id}:`, error);
      }
    }
  }

  /**
   * Process achievement triggers when user events occur
   */
  async processTriggerEvent(event: AchievementTriggerEvent): Promise<DynamicAchievement[]> {
    try {
      console.log(`Processing achievement trigger for user ${event.userId}:`, event.eventType);

      // Get all active achievements
      const achievements = await this.getAllActiveAchievements();
      const earnedAchievements: DynamicAchievement[] = [];

      for (const achievement of achievements) {
        // Skip if user already has this achievement and it's not repeatable
        if (!achievement.isRepeatable) {
          const existing = await this.checkUserHasAchievement(event.userId, achievement.id);
          if (existing) continue;
        }

        // Check cooldown for repeatable achievements
        if (achievement.isRepeatable && achievement.cooldownDays) {
          const lastEarned = await this.getLastEarnedDate(event.userId, achievement.id);
          if (lastEarned) {
            const cooldownEnd = new Date(lastEarned.getTime() + achievement.cooldownDays * 24 * 60 * 60 * 1000);
            if (new Date() < cooldownEnd) continue;
          }
        }

        // Check prerequisites
        if (achievement.prerequisites && achievement.prerequisites.length > 0) {
          const hasPrerequisites = await this.checkPrerequisites(event.userId, achievement.prerequisites);
          if (!hasPrerequisites) continue;
        }

        // Evaluate achievement conditions
        const isEarned = await this.evaluateAchievementConditions(event.userId, achievement, event);
        
        if (isEarned) {
          await this.grantAchievement(event.userId, achievement.id);
          earnedAchievements.push(achievement);
          console.log(`Achievement earned: ${achievement.nameEs} by user ${event.userId}`);
        }
      }

      return earnedAchievements;
    } catch (error) {
      console.error('Process trigger event error:', error);
      return [];
    }
  }

  /**
   * Get user's achievement progress
   */
  async getUserAchievementProgress(userId: string): Promise<UserAchievementProgress[]> {
    try {
      const achievements = await this.getAllActiveAchievements();
      const progress: UserAchievementProgress[] = [];

      for (const achievement of achievements) {
        // Skip secret achievements user hasn't earned
        if (achievement.isSecret) {
          const hasEarned = await this.checkUserHasAchievement(userId, achievement.id);
          if (!hasEarned) continue;
        }

        const currentProgress = await this.calculateAchievementProgress(userId, achievement);
        progress.push(currentProgress);
      }

      return progress.sort((a, b) => b.progress - a.progress);
    } catch (error) {
      console.error('Get user achievement progress error:', error);
      return [];
    }
  }

  /**
   * Get all earned achievements for a user
   */
  async getUserEarnedAchievements(userId: string): Promise<DynamicAchievement[]> {
    try {
      const result = await this.database`
        SELECT da.*, ua.earned_at
        FROM dynamic_achievements da
        JOIN user_dynamic_achievements ua ON da.id = ua.achievement_id
        WHERE ua.user_id = ${userId}
        ORDER BY ua.earned_at DESC
      `;

      return (result as any[]).map(row => ({
        id: row.id,
        name: row.name,
        nameEs: row.name_es,
        description: row.description,
        descriptionEs: row.description_es,
        category: row.category,
        rarity: row.rarity,
        points: row.points,
        icon: row.icon,
        conditions: JSON.parse(row.conditions),
        isSecret: row.is_secret,
        isRepeatable: row.is_repeatable,
        cooldownDays: row.cooldown_days,
        prerequisites: JSON.parse(row.prerequisites || '[]'),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Get user earned achievements error:', error);
      return [];
    }
  }

  /**
   * Create custom achievement (admin/premium feature)
   */
  async createCustomAchievement(
    creatorId: string, 
    achievementData: Omit<DynamicAchievement, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DynamicAchievement> {
    try {
      const achievementId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      await this.database`
        INSERT INTO dynamic_achievements (
          id, name, name_es, description, description_es, category, rarity, points,
          icon, conditions, is_secret, is_repeatable, cooldown_days, prerequisites,
          creator_id, created_at, updated_at
        ) VALUES (
          ${achievementId}, ${achievementData.name}, ${achievementData.nameEs},
          ${achievementData.description}, ${achievementData.descriptionEs}, 
          ${achievementData.category}, ${achievementData.rarity}, ${achievementData.points},
          ${achievementData.icon}, ${JSON.stringify(achievementData.conditions)},
          ${achievementData.isSecret}, ${achievementData.isRepeatable}, 
          ${achievementData.cooldownDays || null}, ${JSON.stringify(achievementData.prerequisites || [])},
          ${creatorId}, NOW(), NOW()
        )
      `;

      return {
        ...achievementData,
        id: achievementId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Create custom achievement error:', error);
      throw new Error('Failed to create custom achievement');
    }
  }

  // Private helper methods

  private async getAllActiveAchievements(): Promise<DynamicAchievement[]> {
    const result = await this.database`
      SELECT * FROM dynamic_achievements 
      WHERE is_active = true
      ORDER BY rarity DESC, points DESC
    `;

    return (result as any[]).map(row => ({
      id: row.id,
      name: row.name,
      nameEs: row.name_es,
      description: row.description,
      descriptionEs: row.description_es,
      category: row.category,
      rarity: row.rarity,
      points: row.points,
      icon: row.icon,
      conditions: JSON.parse(row.conditions),
      isSecret: row.is_secret,
      isRepeatable: row.is_repeatable,
      cooldownDays: row.cooldown_days,
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  private async checkUserHasAchievement(userId: string, achievementId: string): Promise<boolean> {
    const result = await this.database`
      SELECT id FROM user_dynamic_achievements
      WHERE user_id = ${userId} AND achievement_id = ${achievementId}
      LIMIT 1
    `;
    return (result as any[]).length > 0;
  }

  private async getLastEarnedDate(userId: string, achievementId: string): Promise<Date | null> {
    const result = await this.database`
      SELECT MAX(earned_at) as last_earned
      FROM user_dynamic_achievements
      WHERE user_id = ${userId} AND achievement_id = ${achievementId}
    `;
    
    const lastEarned = (result as any[])[0]?.last_earned;
    return lastEarned ? new Date(lastEarned) : null;
  }

  private async checkPrerequisites(userId: string, prerequisites: string[]): Promise<boolean> {
    const result = await this.database`
      SELECT COUNT(*) as count
      FROM user_dynamic_achievements
      WHERE user_id = ${userId} AND achievement_id = ANY(${prerequisites})
    `;
    
    const count = parseInt((result as any[])[0]?.count || '0');
    return count === prerequisites.length;
  }

  private async evaluateAchievementConditions(
    userId: string, 
    achievement: DynamicAchievement, 
    event: AchievementTriggerEvent
  ): Promise<boolean> {
    for (const condition of achievement.conditions) {
      const currentValue = await this.calculateConditionValue(userId, condition);
      
      if (!this.checkConditionMet(currentValue, condition)) {
        return false;
      }
    }
    return true;
  }

  private async calculateConditionValue(userId: string, condition: AchievementCondition): Promise<number> {
    const { startDate, endDate } = this.getTimeframeRange(condition.timeframe);
    
    switch (condition.type) {
      case 'workout_count':
        const workoutResult = await this.database`
          SELECT COUNT(*) as count
          FROM workout_sessions
          WHERE user_id = ${userId} 
            AND completed_at IS NOT NULL
            AND started_at >= ${startDate.toISOString()}
            AND started_at <= ${endDate.toISOString()}
        `;
        return parseInt((workoutResult as any[])[0]?.count || '0');

      case 'volume_total':
        const volumeResult = await this.database`
          SELECT COALESCE(SUM(total_volume_kg), 0) as total_volume
          FROM workout_sessions
          WHERE user_id = ${userId} 
            AND completed_at IS NOT NULL
            AND started_at >= ${startDate.toISOString()}
            AND started_at <= ${endDate.toISOString()}
        `;
        return parseFloat((volumeResult as any[])[0]?.total_volume || '0');

      case 'streak_days':
        return await this.calculateCurrentStreak(userId);

      case 'rpe_average':
        const rpeResult = await this.database`
          SELECT AVG(average_rpe) as avg_rpe
          FROM workout_sessions
          WHERE user_id = ${userId} 
            AND completed_at IS NOT NULL
            AND average_rpe IS NOT NULL
            AND started_at >= ${startDate.toISOString()}
            AND started_at <= ${endDate.toISOString()}
        `;
        return parseFloat((rpeResult as any[])[0]?.avg_rpe || '10');

      case 'exercise_mastery':
        const exerciseName = condition.metadata?.exercise_name;
        if (!exerciseName) return 0;
        
        const masteryResult = await this.database`
          SELECT COUNT(DISTINCT ws.id) as workout_count
          FROM workout_sessions ws
          JOIN workout_sets wset ON ws.id = wset.workout_session_id
          JOIN exercises e ON wset.exercise_id = e.id
          WHERE ws.user_id = ${userId}
            AND ws.completed_at IS NOT NULL
            AND LOWER(e.name) LIKE ${`%${exerciseName.toLowerCase()}%`}
            AND ws.started_at >= ${startDate.toISOString()}
            AND ws.started_at <= ${endDate.toISOString()}
        `;
        return parseInt((masteryResult as any[])[0]?.workout_count || '0');

      case 'social_interaction':
        const action = condition.metadata?.action;
        if (!action) return 0;
        
        // This would need to be implemented based on your social tables
        return 0; // Placeholder

      case 'time_based':
        const hourBefore = condition.metadata?.hour_before;
        if (!hourBefore) return 0;
        
        const timeResult = await this.database`
          SELECT COUNT(*) as count
          FROM workout_sessions
          WHERE user_id = ${userId} 
            AND completed_at IS NOT NULL
            AND EXTRACT(HOUR FROM started_at) < ${hourBefore}
            AND started_at >= ${startDate.toISOString()}
            AND started_at <= ${endDate.toISOString()}
        `;
        return parseInt((timeResult as any[])[0]?.count || '0');

      default:
        return 0;
    }
  }

  private checkConditionMet(currentValue: number, condition: AchievementCondition): boolean {
    switch (condition.operator) {
      case 'gte':
        return currentValue >= condition.value;
      case 'lte':
        return currentValue <= condition.value;
      case 'eq':
        return currentValue === condition.value;
      case 'range':
        return currentValue >= condition.value && currentValue <= (condition.valueMax || condition.value);
      default:
        return false;
    }
  }

  private async calculateCurrentStreak(userId: string): Promise<number> {
    const result = await this.database`
      WITH daily_workouts AS (
        SELECT DISTINCT DATE(started_at) as workout_date
        FROM workout_sessions
        WHERE user_id = ${userId} AND completed_at IS NOT NULL
        ORDER BY workout_date DESC
      ),
      streak_calculation AS (
        SELECT 
          workout_date,
          workout_date - ROW_NUMBER() OVER (ORDER BY workout_date DESC)::integer as streak_group
        FROM daily_workouts
      )
      SELECT COUNT(*) as streak_length
      FROM streak_calculation
      WHERE streak_group = (
        SELECT streak_group FROM streak_calculation LIMIT 1
      )
    `;
    
    return parseInt((result as any[])[0]?.streak_length || '0');
  }

  private getTimeframeRange(timeframe?: string): { startDate: Date, endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const dayOfWeek = startDate.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(startDate.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'all_time':
      default:
        startDate.setFullYear(2020, 0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }
    
    return { startDate, endDate };
  }

  private async calculateAchievementProgress(
    userId: string, 
    achievement: DynamicAchievement
  ): Promise<UserAchievementProgress> {
    let totalProgress = 0;
    let isCompleted = false;
    let completedAt: Date | undefined;

    // Check if already completed
    const existing = await this.database`
      SELECT earned_at FROM user_dynamic_achievements
      WHERE user_id = ${userId} AND achievement_id = ${achievement.id}
      ORDER BY earned_at DESC
      LIMIT 1
    `;

    if ((existing as any[]).length > 0) {
      isCompleted = true;
      completedAt = new Date((existing as any[])[0].earned_at);
      totalProgress = 100;
    } else {
      // Calculate progress for each condition
      const conditionProgresses: number[] = [];
      
      for (const condition of achievement.conditions) {
        const currentValue = await this.calculateConditionValue(userId, condition);
        const conditionProgress = Math.min((currentValue / condition.value) * 100, 100);
        conditionProgresses.push(conditionProgress);
      }
      
      // Average progress across all conditions
      totalProgress = conditionProgresses.length > 0 
        ? conditionProgresses.reduce((sum, p) => sum + p, 0) / conditionProgresses.length 
        : 0;
    }

    return {
      userId,
      achievementId: achievement.id,
      currentValue: totalProgress,
      targetValue: 100,
      progress: Math.round(totalProgress),
      isCompleted,
      completedAt,
      lastUpdated: new Date()
    };
  }

  private async grantAchievement(userId: string, achievementId: string): Promise<void> {
    try {
      await this.database`
        INSERT INTO user_dynamic_achievements (
          id, user_id, achievement_id, earned_at, created_at
        ) VALUES (
          ${crypto.randomUUID()}, ${userId}, ${achievementId}, NOW(), NOW()
        )
      `;
      
      // Create notification for user
      await this.database`
        INSERT INTO social_notifications (
          id, user_id, type, title, message, data, created_at
        ) VALUES (
          ${crypto.randomUUID()}, ${userId}, 'achievement_earned',
          'Nuevo Logro Desbloqueado!', 
          'Has obtenido un nuevo logro. ¡Felicidades!',
          ${JSON.stringify({ achievementId })}, NOW()
        )
      `;
    } catch (error) {
      console.error('Grant achievement error:', error);
      throw error;
    }
  }
}