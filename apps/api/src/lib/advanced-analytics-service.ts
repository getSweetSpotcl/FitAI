import { DatabaseClient } from '../db/database';
import {
  UserAnalyticsSnapshot,
  ProgressPrediction,
  WorkoutInsight,
  PerformanceTrend,
  UserAchievement,
  UserComparison,
  DashboardAnalytics,
  TrendAnalysisResult,
  TrendDirection,
  PeriodType,
  InsightType,
  AchievementType,
  ChartData,
  ChartDataPoint
} from '../types/analytics';

export class AdvancedAnalyticsService {
  constructor(private sql: DatabaseClient) {}

  /**
   * Generate comprehensive dashboard analytics for a user
   */
  async generateDashboardAnalytics(userId: string): Promise<DashboardAnalytics> {
    try {
      // Get current and previous periods
      const [currentPeriod, previousPeriod] = await Promise.all([
        this.getLatestSnapshot(userId, 'monthly'),
        this.getPreviousSnapshot(userId, 'monthly')
      ]);

      // Get supporting data
      const [insights, predictions, achievements, comparisons] = await Promise.all([
        this.getRecentInsights(userId, 10),
        this.getUserPredictions(userId),
        this.getRecentAchievements(userId, 5),
        this.getUserComparisons(userId)
      ]);

      // Calculate key metrics
      const keyMetrics = await this.calculateKeyMetrics(userId, currentPeriod, previousPeriod);

      return {
        userId,
        currentPeriod: currentPeriod!,
        previousPeriod,
        keyMetrics,
        recentInsights: insights,
        predictions,
        recentAchievements: achievements,
        benchmarkComparisons: comparisons,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Generate dashboard analytics error:', error);
      throw new Error('Failed to generate dashboard analytics');
    }
  }

  /**
   * Create analytics snapshot for a period
   */
  async createAnalyticsSnapshot(userId: string, periodType: PeriodType): Promise<UserAnalyticsSnapshot> {
    try {
      const { startDate, endDate } = this.getPeriodDates(periodType);
      
      // Calculate all metrics for this period
      const workoutMetrics = await this.calculateWorkoutMetrics(userId, startDate, endDate);
      const performanceMetrics = await this.calculatePerformanceMetrics(userId, startDate, endDate);
      const healthMetrics = await this.calculateHealthMetrics(userId, startDate, endDate);
      const bodyComposition = await this.calculateBodyCompositionChanges(userId, startDate, endDate);
      const goalProgress = await this.calculateGoalProgress(userId, startDate, endDate);
      const scores = await this.calculateCompositeScores(userId, startDate, endDate);

      // Create snapshot
      const snapshot: Omit<UserAnalyticsSnapshot, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        periodType,
        periodStart: startDate,
        periodEnd: endDate,
        ...workoutMetrics,
        ...performanceMetrics,
        ...healthMetrics,
        ...bodyComposition,
        ...goalProgress,
        ...scores
      };

      // Save to database
      const result = await this.sql`
        INSERT INTO user_analytics_snapshots (
          user_id, period_type, period_start, period_end,
          total_workouts, total_workout_minutes, total_volume_kg, avg_workout_intensity,
          total_calories_burned, total_distance_km, strength_pr_count, endurance_improvements,
          consistency_score, avg_recovery_score, avg_sleep_hours, avg_sleep_efficiency,
          avg_hrv_score, avg_resting_hr, weight_change_kg, body_fat_change,
          muscle_mass_change, goals_achieved, goals_total, goal_completion_rate,
          overall_fitness_score, progress_velocity, adherence_score
        ) VALUES (
          ${snapshot.userId}, ${snapshot.periodType}, ${snapshot.periodStart.toISOString()},
          ${snapshot.periodEnd.toISOString()}, ${snapshot.totalWorkouts}, ${snapshot.totalWorkoutMinutes},
          ${snapshot.totalVolumeKg}, ${snapshot.avgWorkoutIntensity}, ${snapshot.totalCaloriesBurned},
          ${snapshot.totalDistanceKm}, ${snapshot.strengthPrCount}, ${snapshot.enduranceImprovements},
          ${snapshot.consistencyScore}, ${snapshot.avgRecoveryScore}, ${snapshot.avgSleepHours},
          ${snapshot.avgSleepEfficiency}, ${snapshot.avgHrvScore}, ${snapshot.avgRestingHr},
          ${snapshot.weightChangeKg}, ${snapshot.bodyFatChange}, ${snapshot.muscleMassChange},
          ${snapshot.goalsAchieved}, ${snapshot.goalsTotal}, ${snapshot.goalCompletionRate},
          ${snapshot.overallFitnessScore}, ${snapshot.progressVelocity}, ${snapshot.adherenceScore}
        )
        ON CONFLICT (user_id, period_type, period_start) DO UPDATE SET
          total_workouts = EXCLUDED.total_workouts,
          total_workout_minutes = EXCLUDED.total_workout_minutes,
          total_volume_kg = EXCLUDED.total_volume_kg,
          avg_workout_intensity = EXCLUDED.avg_workout_intensity,
          total_calories_burned = EXCLUDED.total_calories_burned,
          total_distance_km = EXCLUDED.total_distance_km,
          strength_pr_count = EXCLUDED.strength_pr_count,
          endurance_improvements = EXCLUDED.endurance_improvements,
          consistency_score = EXCLUDED.consistency_score,
          avg_recovery_score = EXCLUDED.avg_recovery_score,
          avg_sleep_hours = EXCLUDED.avg_sleep_hours,
          avg_sleep_efficiency = EXCLUDED.avg_sleep_efficiency,
          avg_hrv_score = EXCLUDED.avg_hrv_score,
          avg_resting_hr = EXCLUDED.avg_resting_hr,
          weight_change_kg = EXCLUDED.weight_change_kg,
          body_fat_change = EXCLUDED.body_fat_change,
          muscle_mass_change = EXCLUDED.muscle_mass_change,
          goals_achieved = EXCLUDED.goals_achieved,
          goals_total = EXCLUDED.goals_total,
          goal_completion_rate = EXCLUDED.goal_completion_rate,
          overall_fitness_score = EXCLUDED.overall_fitness_score,
          progress_velocity = EXCLUDED.progress_velocity,
          adherence_score = EXCLUDED.adherence_score,
          updated_at = NOW()
        RETURNING *
      `;

      return this.mapAnalyticsSnapshot((result as any[])[0]);

    } catch (error) {
      console.error('Create analytics snapshot error:', error);
      throw new Error('Failed to create analytics snapshot');
    }
  }

  /**
   * Analyze trends and generate insights
   */
  async analyzeTrends(userId: string): Promise<TrendAnalysisResult[]> {
    try {
      // Get historical data for key metrics
      const metrics = [
        'overall_fitness_score',
        'strength_pr_count',
        'consistency_score',
        'avg_recovery_score',
        'total_volume_kg'
      ];

      const trends: TrendAnalysisResult[] = [];

      for (const metric of metrics) {
        const trend = await this.calculateMetricTrend(userId, metric);
        trends.push(trend);
      }

      // Generate insights based on trends
      const insights = await this.generateTrendInsights(userId, trends);
      
      // Save insights to database
      for (const insight of insights) {
        await this.saveWorkoutInsight(userId, insight);
      }

      return trends;

    } catch (error) {
      console.error('Analyze trends error:', error);
      throw new Error('Failed to analyze trends');
    }
  }

  /**
   * Generate predictive analysis
   */
  async generatePredictions(userId: string): Promise<ProgressPrediction[]> {
    try {
      const predictions: ProgressPrediction[] = [];

      // Strength progression prediction
      const strengthPrediction = await this.predictStrengthProgress(userId);
      if (strengthPrediction) predictions.push(strengthPrediction);

      // Weight goal prediction
      const weightPrediction = await this.predictWeightGoal(userId);
      if (weightPrediction) predictions.push(weightPrediction);

      // Fitness score prediction
      const fitnessPrediction = await this.predictFitnessScore(userId);
      if (fitnessPrediction) predictions.push(fitnessPrediction);

      // Save predictions to database
      for (const prediction of predictions) {
        await this.savePrediction(prediction);
      }

      return predictions;

    } catch (error) {
      console.error('Generate predictions error:', error);
      throw new Error('Failed to generate predictions');
    }
  }

  /**
   * Generate chart data for visualization
   */
  async generateChartData(userId: string, metric: string, period: PeriodType): Promise<ChartData> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period, 12); // Last 12 periods
      
      // Get historical data
      const data = await this.getMetricHistory(userId, metric, startDate, endDate, period);
      
      // Format as chart data
      const chartData: ChartDataPoint[] = data.map(point => ({
        date: point.date.toISOString().split('T')[0],
        value: point.value,
        label: this.formatMetricValue(point.value, metric)
      }));

      // Determine chart type based on metric
      const chartType = this.getChartType(metric);
      
      return {
        title: this.getMetricDisplayName(metric),
        type: chartType,
        data: chartData,
        yAxis: {
          label: this.getMetricDisplayName(metric),
          unit: this.getMetricUnit(metric)
        }
      };

    } catch (error) {
      console.error('Generate chart data error:', error);
      throw new Error('Failed to generate chart data');
    }
  }

  // Private helper methods

  private async getLatestSnapshot(userId: string, periodType: PeriodType): Promise<UserAnalyticsSnapshot | null> {
    const result = await this.sql`
      SELECT * FROM user_analytics_snapshots
      WHERE user_id = ${userId} AND period_type = ${periodType}
      ORDER BY period_start DESC
      LIMIT 1
    `;

    return (result as any[]).length > 0 ? this.mapAnalyticsSnapshot((result as any[])[0]) : null;
  }

  private async getPreviousSnapshot(userId: string, periodType: PeriodType): Promise<UserAnalyticsSnapshot | null> {
    const result = await this.sql`
      SELECT * FROM user_analytics_snapshots
      WHERE user_id = ${userId} AND period_type = ${periodType}
      ORDER BY period_start DESC
      LIMIT 1 OFFSET 1
    `;

    return (result as any[]).length > 0 ? this.mapAnalyticsSnapshot((result as any[])[0]) : null;
  }

  private async calculateWorkoutMetrics(userId: string, startDate: Date, endDate: Date) {
    const result = await this.sql`
      SELECT 
        COUNT(*) as total_workouts,
        COALESCE(SUM(duration_minutes), 0) as total_workout_minutes,
        COALESCE(AVG(CASE WHEN intensity > 0 THEN intensity END), 0) as avg_workout_intensity,
        COALESCE(SUM(calories_burned), 0) as total_calories_burned,
        COALESCE(SUM(distance_km), 0) as total_distance_km
      FROM workout_sessions
      WHERE user_id = ${userId}
        AND started_at >= ${startDate.toISOString()}
        AND started_at <= ${endDate.toISOString()}
        AND status = 'completed'
    `;

    const data = (result as any[])[0];
    
    // Calculate total volume from exercises
    const volumeResult = await this.sql`
      SELECT COALESCE(SUM(sets * reps * weight), 0) as total_volume
      FROM workout_exercises we
      JOIN workout_sessions ws ON we.workout_session_id = ws.id
      WHERE ws.user_id = ${userId}
        AND ws.started_at >= ${startDate.toISOString()}
        AND ws.started_at <= ${endDate.toISOString()}
        AND ws.status = 'completed'
    `;

    const totalVolumeKg = (volumeResult as any[])[0]?.total_volume || 0;

    return {
      totalWorkouts: parseInt(data.total_workouts) || 0,
      totalWorkoutMinutes: parseInt(data.total_workout_minutes) || 0,
      totalVolumeKg: parseFloat(totalVolumeKg) || 0,
      avgWorkoutIntensity: parseFloat(data.avg_workout_intensity) || 0,
      totalCaloriesBurned: parseInt(data.total_calories_burned) || 0,
      totalDistanceKm: parseFloat(data.total_distance_km) || 0
    };
  }

  private async calculatePerformanceMetrics(userId: string, startDate: Date, endDate: Date) {
    // Count personal records in this period
    const prResult = await this.sql`
      SELECT COUNT(*) as pr_count
      FROM workout_exercises we
      JOIN workout_sessions ws ON we.workout_session_id = ws.id
      WHERE ws.user_id = ${userId}
        AND ws.started_at >= ${startDate.toISOString()}
        AND ws.started_at <= ${endDate.toISOString()}
        AND we.is_personal_record = true
    `;

    // Calculate consistency (workouts per week vs target)
    const weeksBetween = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const workoutsResult = await this.sql`
      SELECT COUNT(*) as total_workouts
      FROM workout_sessions
      WHERE user_id = ${userId}
        AND started_at >= ${startDate.toISOString()}
        AND started_at <= ${endDate.toISOString()}
        AND status = 'completed'
    `;

    const totalWorkouts = parseInt((workoutsResult as any[])[0].total_workouts) || 0;
    const targetWorkoutsPerWeek = 3; // This could come from user profile
    const expectedWorkouts = weeksBetween * targetWorkoutsPerWeek;
    const consistencyScore = expectedWorkouts > 0 ? Math.min(100, (totalWorkouts / expectedWorkouts) * 100) : 0;

    return {
      strengthPrCount: parseInt((prResult as any[])[0].pr_count) || 0,
      enduranceImprovements: 0, // TODO: Calculate endurance improvements
      consistencyScore: Math.round(consistencyScore)
    };
  }

  private async calculateHealthMetrics(userId: string, startDate: Date, endDate: Date) {
    // Get health metrics from health data
    const healthResult = await this.sql`
      SELECT 
        AVG(CASE WHEN recovery_score IS NOT NULL THEN recovery_score END) as avg_recovery_score,
        AVG(CASE WHEN total_sleep_minutes IS NOT NULL THEN total_sleep_minutes / 60.0 END) as avg_sleep_hours,
        AVG(CASE WHEN sleep_efficiency IS NOT NULL THEN sleep_efficiency END) as avg_sleep_efficiency
      FROM health_sleep_data hsd
      WHERE user_id = ${userId}
        AND sleep_start >= ${startDate.toISOString()}
        AND sleep_start <= ${endDate.toISOString()}
    `;

    const hrvResult = await this.sql`
      SELECT AVG(recovery_score) as avg_hrv_score
      FROM health_hrv_data
      WHERE user_id = ${userId}
        AND recorded_at >= ${startDate.toISOString()}
        AND recorded_at <= ${endDate.toISOString()}
    `;

    const restingHrResult = await this.sql`
      SELECT AVG(value) as avg_resting_hr
      FROM health_metrics
      WHERE user_id = ${userId}
        AND metric_type = 'resting_heart_rate'
        AND recorded_at >= ${startDate.toISOString()}
        AND recorded_at <= ${endDate.toISOString()}
    `;

    const health = (healthResult as any[])[0];
    const hrv = (hrvResult as any[])[0];
    const hr = (restingHrResult as any[])[0];

    return {
      avgRecoveryScore: parseFloat(health?.avg_recovery_score) || 0,
      avgSleepHours: parseFloat(health?.avg_sleep_hours) || 0,
      avgSleepEfficiency: parseFloat(health?.avg_sleep_efficiency) || 0,
      avgHrvScore: parseFloat(hrv?.avg_hrv_score) || 0,
      avgRestingHr: parseInt(hr?.avg_resting_hr) || 0
    };
  }

  private async calculateBodyCompositionChanges(userId: string, startDate: Date, endDate: Date) {
    // Get weight change from health metrics
    const weightResult = await this.sql`
      WITH first_weight AS (
        SELECT value as first_value
        FROM health_metrics
        WHERE user_id = ${userId} AND metric_type = 'body_weight'
          AND recorded_at >= ${startDate.toISOString()}
        ORDER BY recorded_at ASC
        LIMIT 1
      ),
      last_weight AS (
        SELECT value as last_value
        FROM health_metrics
        WHERE user_id = ${userId} AND metric_type = 'body_weight'
          AND recorded_at <= ${endDate.toISOString()}
        ORDER BY recorded_at DESC
        LIMIT 1
      )
      SELECT 
        COALESCE(l.last_value - f.first_value, 0) as weight_change
      FROM first_weight f
      CROSS JOIN last_weight l
    `;

    const weightChange = (weightResult as any[])[0]?.weight_change || 0;

    return {
      weightChangeKg: parseFloat(weightChange) || 0,
      bodyFatChange: 0, // TODO: Calculate from body fat data
      muscleMassChange: 0 // TODO: Calculate from muscle mass data
    };
  }

  private async calculateGoalProgress(userId: string, startDate: Date, endDate: Date) {
    // This would integrate with a goals system
    return {
      goalsAchieved: 0,
      goalsTotal: 0,
      goalCompletionRate: 0
    };
  }

  private async calculateCompositeScores(userId: string, startDate: Date, endDate: Date) {
    // Calculate overall fitness score (composite of multiple factors)
    const overallFitnessScore = 75; // TODO: Implement proper calculation
    const progressVelocity = 0.5; // TODO: Calculate rate of improvement
    const adherenceScore = 85; // TODO: Calculate plan adherence

    return {
      overallFitnessScore,
      progressVelocity,
      adherenceScore
    };
  }

  private async calculateKeyMetrics(userId: string, current: UserAnalyticsSnapshot, previous?: UserAnalyticsSnapshot) {
    const fitnessChange = previous ? current.overallFitnessScore - previous.overallFitnessScore : 0;
    const workoutCompletionRate = current.totalWorkouts > 0 ? (current.totalWorkouts / (current.totalWorkouts + 2)) * 100 : 0; // Assuming some target

    return {
      fitnessScore: {
        current: current.overallFitnessScore,
        change: fitnessChange,
        trend: this.getTrendFromChange(fitnessChange)
      },
      workoutFrequency: {
        current: current.totalWorkouts,
        target: 12, // 3 per week for monthly
        completionRate: workoutCompletionRate
      },
      recoveryScore: {
        current: current.avgRecoveryScore,
        trend: this.getTrendFromChange(previous ? current.avgRecoveryScore - previous.avgRecoveryScore : 0),
        daysInOptimalRange: Math.round(current.avgRecoveryScore > 70 ? 20 : 10) // Estimate
      },
      strengthProgress: {
        personalRecords: current.strengthPrCount,
        totalVolumeIncrease: previous ? current.totalVolumeKg - previous.totalVolumeKg : 0,
        topExerciseGains: [] // TODO: Implement
      }
    };
  }

  private getTrendFromChange(change: number): TrendDirection {
    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    if (Math.abs(change) <= 2) return 'plateauing';
    return 'volatile';
  }

  private getPeriodDates(periodType: PeriodType, periodsBack: number = 1): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(now);

    switch (periodType) {
      case 'weekly':
        startDate.setDate(startDate.getDate() - (7 * periodsBack));
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - periodsBack);
        break;
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() - (3 * periodsBack));
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - periodsBack);
        break;
    }

    return { startDate, endDate };
  }

  private async getRecentInsights(userId: string, limit: number): Promise<WorkoutInsight[]> {
    const result = await this.sql`
      SELECT * FROM workout_insights
      WHERE user_id = ${userId}
        AND is_dismissed = FALSE
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY importance_score DESC, detected_at DESC
      LIMIT ${limit}
    `;

    return (result as any[]).map(this.mapWorkoutInsight);
  }

  private async getUserPredictions(userId: string): Promise<ProgressPrediction[]> {
    const result = await this.sql`
      SELECT * FROM progress_predictions
      WHERE user_id = ${userId}
        AND prediction_date >= NOW()
      ORDER BY confidence_score DESC, prediction_date ASC
      LIMIT 10
    `;

    return (result as any[]).map(this.mapProgressPrediction);
  }

  private async getRecentAchievements(userId: string, limit: number): Promise<UserAchievement[]> {
    const result = await this.sql`
      SELECT * FROM user_achievements
      WHERE user_id = ${userId}
      ORDER BY achieved_at DESC
      LIMIT ${limit}
    `;

    return (result as any[]).map(this.mapUserAchievement);
  }

  private async getUserComparisons(userId: string): Promise<UserComparison[]> {
    const result = await this.sql`
      SELECT * FROM user_comparisons
      WHERE user_id = ${userId}
        AND (valid_until IS NULL OR valid_until > NOW())
      ORDER BY calculated_at DESC
      LIMIT 10
    `;

    return (result as any[]).map(this.mapUserComparison);
  }

  private mapAnalyticsSnapshot(row: any): UserAnalyticsSnapshot {
    return {
      id: row.id,
      userId: row.user_id,
      periodType: row.period_type,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      totalWorkouts: row.total_workouts || 0,
      totalWorkoutMinutes: row.total_workout_minutes || 0,
      totalVolumeKg: parseFloat(row.total_volume_kg) || 0,
      avgWorkoutIntensity: parseFloat(row.avg_workout_intensity) || 0,
      totalCaloriesBurned: row.total_calories_burned || 0,
      totalDistanceKm: parseFloat(row.total_distance_km) || 0,
      strengthPrCount: row.strength_pr_count || 0,
      enduranceImprovements: row.endurance_improvements || 0,
      consistencyScore: parseFloat(row.consistency_score) || 0,
      avgRecoveryScore: parseFloat(row.avg_recovery_score) || 0,
      avgSleepHours: parseFloat(row.avg_sleep_hours) || 0,
      avgSleepEfficiency: parseFloat(row.avg_sleep_efficiency) || 0,
      avgHrvScore: parseFloat(row.avg_hrv_score) || 0,
      avgRestingHr: row.avg_resting_hr || 0,
      weightChangeKg: parseFloat(row.weight_change_kg) || 0,
      bodyFatChange: parseFloat(row.body_fat_change) || 0,
      muscleMassChange: parseFloat(row.muscle_mass_change) || 0,
      goalsAchieved: row.goals_achieved || 0,
      goalsTotal: row.goals_total || 0,
      goalCompletionRate: parseFloat(row.goal_completion_rate) || 0,
      overallFitnessScore: parseFloat(row.overall_fitness_score) || 0,
      progressVelocity: parseFloat(row.progress_velocity) || 0,
      adherenceScore: parseFloat(row.adherence_score) || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // Placeholder methods for full implementation
  private async calculateMetricTrend(userId: string, metric: string): Promise<TrendAnalysisResult> {
    // TODO: Implement trend calculation
    return {
      metric,
      trend: 'improving',
      confidence: 75,
      significantChange: true,
      changePercent: 15.5,
      projectedValue: 85,
      recommendations: ['Keep up the great work!']
    };
  }

  private async generateTrendInsights(userId: string, trends: TrendAnalysisResult[]): Promise<WorkoutInsight[]> {
    const insights: WorkoutInsight[] = [];

    for (const trend of trends) {
      if (trend.significantChange) {
        const insight: Partial<WorkoutInsight> = {
          insightType: 'pattern',
          insightCategory: 'performance',
          title: this.getTrendInsightTitle(trend),
          description: this.getTrendInsightDescription(trend),
          insightData: {
            metric: trend.metric,
            changePercent: trend.changePercent,
            projectedValue: trend.projectedValue,
            confidence: trend.confidence
          },
          importanceScore: Math.round(trend.confidence * 0.8),
          confidenceScore: trend.confidence,
          actionable: trend.recommendations.length > 0,
          detectedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };
        insights.push(insight as WorkoutInsight);
      }
    }

    return insights;
  }

  private async saveWorkoutInsight(userId: string, insight: Partial<WorkoutInsight>): Promise<void> {
    await this.sql`
      INSERT INTO workout_insights (
        user_id, insight_type, insight_category, title, description,
        insight_data, importance_score, confidence_score, actionable,
        detected_at, expires_at
      ) VALUES (
        ${userId}, ${insight.insightType}, ${insight.insightCategory},
        ${insight.title}, ${insight.description}, ${JSON.stringify(insight.insightData)},
        ${insight.importanceScore}, ${insight.confidenceScore}, ${insight.actionable},
        ${insight.detectedAt!.toISOString()}, ${insight.expiresAt?.toISOString() || null}
      )
      ON CONFLICT (user_id, title, detected_at) DO NOTHING
    `;
  }

  private async predictStrengthProgress(userId: string): Promise<ProgressPrediction | null> {
    try {
      // Get recent strength data from analytics snapshots
      const result = await this.sql`
        SELECT strength_pr_count, total_volume_kg, period_start
        FROM user_analytics_snapshots
        WHERE user_id = ${userId} AND period_type = 'monthly'
        ORDER BY period_start DESC
        LIMIT 6
      `;

      const data = result as any[];
      if (data.length < 3) return null;

      // Simple linear regression for strength prediction
      const volumeData = data.map((d, i) => ({ x: i, y: parseFloat(d.total_volume_kg) || 0 }));
      const slope = this.calculateLinearTrend(volumeData);
      
      if (slope <= 0) return null; // No positive trend

      const currentVolume = volumeData[0].y;
      const predictedVolume = currentVolume + (slope * 3); // 3 months ahead
      
      return {
        id: crypto.randomUUID(),
        userId,
        predictionType: 'strength_volume',
        predictionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
        predictedValue: Math.round(predictedVolume),
        confidenceScore: Math.min(95, Math.max(50, 70 + (data.length * 5))),
        modelVersion: 'linear_v1.0',
        inputDataPoints: data.length,
        predictionHorizonDays: 90,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Strength prediction error:', error);
      return null;
    }
  }

  private async predictWeightGoal(userId: string): Promise<ProgressPrediction | null> {
    try {
      // Get recent weight data from health metrics
      const result = await this.sql`
        SELECT value, recorded_at
        FROM health_metrics
        WHERE user_id = ${userId} AND metric_type = 'body_weight'
        ORDER BY recorded_at DESC
        LIMIT 12
      `;

      const data = result as any[];
      if (data.length < 4) return null;

      // Calculate weight trend
      const weightData = data.map((d, i) => ({ 
        x: i, 
        y: parseFloat(d.value),
        date: new Date(d.recorded_at)
      }));
      
      const slope = this.calculateLinearTrend(weightData);
      const currentWeight = weightData[0].y;
      
      // Predict weight in 30 days
      const predictedWeight = currentWeight + (slope * 4); // ~4 weeks
      const confidenceScore = Math.abs(slope) < 0.5 ? 85 : Math.max(50, 85 - Math.abs(slope) * 10);
      
      return {
        id: crypto.randomUUID(),
        userId,
        predictionType: 'weight_progress',
        predictionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        predictedValue: Math.round(predictedWeight * 10) / 10,
        confidenceScore: Math.round(confidenceScore),
        modelVersion: 'linear_v1.0',
        inputDataPoints: data.length,
        predictionHorizonDays: 30,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Weight prediction error:', error);
      return null;
    }
  }

  private async predictFitnessScore(userId: string): Promise<ProgressPrediction | null> {
    try {
      // Get recent fitness score data
      const result = await this.sql`
        SELECT overall_fitness_score, period_start
        FROM user_analytics_snapshots
        WHERE user_id = ${userId} AND period_type = 'monthly'
          AND overall_fitness_score > 0
        ORDER BY period_start DESC
        LIMIT 6
      `;

      const data = result as any[];
      if (data.length < 3) return null;

      const fitnessData = data.map((d, i) => ({ 
        x: i, 
        y: parseFloat(d.overall_fitness_score) || 0 
      }));
      
      const slope = this.calculateLinearTrend(fitnessData);
      const currentScore = fitnessData[0].y;
      const predictedScore = Math.min(100, Math.max(0, currentScore + (slope * 2))); // 2 months
      
      // Higher confidence for consistent trends
      const consistency = this.calculateTrendConsistency(fitnessData);
      const confidenceScore = Math.round(60 + (consistency * 30));
      
      return {
        id: crypto.randomUUID(),
        userId,
        predictionType: 'fitness_score',
        predictionDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 2 months
        predictedValue: Math.round(predictedScore),
        confidenceScore,
        modelVersion: 'trend_v1.0',
        inputDataPoints: data.length,
        predictionHorizonDays: 60,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Fitness score prediction error:', error);
      return null;
    }
  }

  private async savePrediction(prediction: ProgressPrediction): Promise<void> {
    await this.sql`
      INSERT INTO progress_predictions (
        user_id, prediction_type, prediction_date, predicted_value,
        confidence_score, model_version, input_data_points, prediction_horizon_days
      ) VALUES (
        ${prediction.userId}, ${prediction.predictionType}, ${prediction.predictionDate.toISOString()},
        ${prediction.predictedValue}, ${prediction.confidenceScore}, ${prediction.modelVersion || null},
        ${prediction.inputDataPoints}, ${prediction.predictionHorizonDays}
      )
      ON CONFLICT (user_id, prediction_type, prediction_date) DO UPDATE SET
        predicted_value = EXCLUDED.predicted_value,
        confidence_score = EXCLUDED.confidence_score,
        model_version = EXCLUDED.model_version,
        input_data_points = EXCLUDED.input_data_points,
        prediction_horizon_days = EXCLUDED.prediction_horizon_days
    `;
  }

  private async getMetricHistory(userId: string, metric: string, startDate: Date, endDate: Date, period: PeriodType): Promise<Array<{date: Date, value: number}>> {
    const column = this.getMetricColumnName(metric);
    
    const result = await this.sql`
      SELECT period_start as date, ${this.sql.unsafe(column)} as value
      FROM user_analytics_snapshots
      WHERE user_id = ${userId}
        AND period_type = ${period}
        AND period_start >= ${startDate.toISOString()}
        AND period_start <= ${endDate.toISOString()}
        AND ${this.sql.unsafe(column)} IS NOT NULL
      ORDER BY period_start ASC
    `;

    return (result as any[]).map(row => ({
      date: new Date(row.date),
      value: parseFloat(row.value) || 0
    }));
  }

  private getChartType(metric: string): 'line' | 'bar' | 'area' | 'scatter' {
    // Most fitness metrics work well as line charts
    return 'line';
  }

  private getMetricDisplayName(metric: string): string {
    const displayNames: Record<string, string> = {
      'overall_fitness_score': 'Fitness Score',
      'strength_pr_count': 'Personal Records',
      'total_volume_kg': 'Training Volume',
      'consistency_score': 'Consistency Score',
      'avg_recovery_score': 'Recovery Score'
    };
    return displayNames[metric] || metric;
  }

  private getMetricUnit(metric: string): string {
    const units: Record<string, string> = {
      'overall_fitness_score': 'score',
      'strength_pr_count': 'PRs',
      'total_volume_kg': 'kg',
      'consistency_score': '%',
      'avg_recovery_score': 'score'
    };
    return units[metric] || '';
  }

  private formatMetricValue(value: number, metric: string): string {
    const unit = this.getMetricUnit(metric);
    return `${Math.round(value * 10) / 10}${unit}`;
  }

  private calculateLinearTrend(data: Array<{x: number, y: number}>): number {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = data.reduce((sum, point) => sum + point.x, 0);
    const sumY = data.reduce((sum, point) => sum + point.y, 0);
    const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);
    
    // Calculate slope using least squares method
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  private calculateTrendConsistency(data: Array<{x: number, y: number}>): number {
    if (data.length < 3) return 0;
    
    // Calculate how consistent the trend is (0-1 scale)
    const slope = this.calculateLinearTrend(data);
    const predicted = data.map(point => slope * point.x + data[0].y);
    
    // Calculate R-squared (coefficient of determination)
    const actualMean = data.reduce((sum, point) => sum + point.y, 0) / data.length;
    const totalSumSquares = data.reduce((sum, point) => sum + Math.pow(point.y - actualMean, 2), 0);
    const residualSumSquares = data.reduce((sum, point, i) => sum + Math.pow(point.y - predicted[i], 2), 0);
    
    const rSquared = totalSumSquares === 0 ? 0 : 1 - (residualSumSquares / totalSumSquares);
    return Math.max(0, Math.min(1, rSquared));
  }

  private getMetricColumnName(metric: string): string {
    const columnMap: Record<string, string> = {
      'overall_fitness_score': 'overall_fitness_score',
      'strength_pr_count': 'strength_pr_count',
      'total_volume_kg': 'total_volume_kg',
      'consistency_score': 'consistency_score',
      'avg_recovery_score': 'avg_recovery_score',
      'total_workouts': 'total_workouts',
      'avg_workout_intensity': 'avg_workout_intensity'
    };
    return columnMap[metric] || metric;
  }

  private getTrendInsightTitle(trend: TrendAnalysisResult): string {
    const metricName = this.getMetricDisplayName(trend.metric);
    
    switch (trend.trend) {
      case 'improving':
        return `📈 Tu ${metricName} está mejorando`;
      case 'declining':
        return `📉 Tu ${metricName} está declinando`;
      case 'plateauing':
        return `📊 Tu ${metricName} se ha estabilizado`;
      case 'volatile':
        return `🔄 Tu ${metricName} muestra variabilidad`;
      default:
        return `Análisis de ${metricName}`;
    }
  }

  private getTrendInsightDescription(trend: TrendAnalysisResult): string {
    const changeDirection = trend.changePercent > 0 ? 'aumentado' : 'disminuido';
    const changeAbs = Math.abs(trend.changePercent);
    
    return `Tu ${this.getMetricDisplayName(trend.metric)} ha ${changeDirection} un ${changeAbs.toFixed(1)}% en las últimas semanas. ${trend.recommendations.join(' ')}`;
  }

  // Database result mappers
  private mapWorkoutInsight = (row: any): WorkoutInsight => ({
    id: row.id,
    userId: row.user_id,
    insightType: row.insight_type,
    insightCategory: row.insight_category,
    title: row.title,
    description: row.description,
    insightData: row.insight_data || {},
    importanceScore: row.importance_score,
    confidenceScore: row.confidence_score,
    actionable: row.actionable,
    isRead: row.is_read,
    isDismissed: row.is_dismissed,
    userFeedback: row.user_feedback,
    detectedAt: new Date(row.detected_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    createdAt: new Date(row.created_at)
  });

  private mapProgressPrediction = (row: any): ProgressPrediction => ({
    id: row.id,
    userId: row.user_id,
    predictionType: row.prediction_type,
    predictionDate: new Date(row.prediction_date),
    predictedValue: parseFloat(row.predicted_value),
    confidenceScore: parseFloat(row.confidence_score),
    actualValue: row.actual_value ? parseFloat(row.actual_value) : undefined,
    accuracyScore: row.accuracy_score ? parseFloat(row.accuracy_score) : undefined,
    modelVersion: row.model_version,
    inputDataPoints: row.input_data_points,
    predictionHorizonDays: row.prediction_horizon_days,
    createdAt: new Date(row.created_at),
    achievedAt: row.achieved_at ? new Date(row.achieved_at) : undefined
  });

  private mapUserAchievement = (row: any): UserAchievement => ({
    id: row.id,
    userId: row.user_id,
    achievementType: row.achievement_type,
    category: row.category,
    name: row.name,
    description: row.description,
    iconName: row.icon_name,
    badgeColor: row.badge_color,
    valueAchieved: parseFloat(row.value_achieved),
    unit: row.unit,
    previousBest: row.previous_best ? parseFloat(row.previous_best) : undefined,
    improvementPercent: row.improvement_percent ? parseFloat(row.improvement_percent) : undefined,
    difficultyLevel: row.difficulty_level,
    rarityScore: row.rarity_score,
    pointsAwarded: row.points_awarded,
    achievedAt: new Date(row.achieved_at),
    createdAt: new Date(row.created_at)
  });

  private mapUserComparison = (row: any): UserComparison => ({
    id: row.id,
    userId: row.user_id,
    comparisonType: row.comparison_type,
    metricName: row.metric_name,
    userValue: parseFloat(row.user_value),
    comparisonValue: parseFloat(row.comparison_value),
    percentileRank: row.percentile_rank ? parseFloat(row.percentile_rank) : undefined,
    comparisonGroup: row.comparison_group,
    sampleSize: row.sample_size,
    calculatedAt: new Date(row.calculated_at),
    validUntil: row.valid_until ? new Date(row.valid_until) : undefined
  });
}