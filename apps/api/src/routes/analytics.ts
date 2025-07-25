import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { createDatabaseClient } from "../db/database";
import { AdvancedAnalyticsService } from "../lib/advanced-analytics-service";
import { clerkAuth } from "../middleware/clerk-auth";
import type { PeriodType } from "../types/analytics";

type Bindings = {
  DATABASE_URL: string;
  CACHE: KVNamespace;
  CLERK_SECRET_KEY: string;
  OPENAI_API_KEY: string;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: "free" | "premium" | "pro";
    userId?: string;
    firstName?: string;
    lastName?: string;
    role?: "user" | "admin";
  };
};

const analytics = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Validation schemas
const DashboardQuerySchema = z.object({
  period: z
    .enum(["weekly", "monthly", "quarterly", "yearly"])
    .optional()
    .default("monthly"),
});

const ChartDataQuerySchema = z.object({
  metric: z.string(),
  period: z
    .enum(["weekly", "monthly", "quarterly", "yearly"])
    .default("monthly"),
});

const ReportRequestSchema = z.object({
  reportType: z.enum([
    "fitness_summary",
    "progress_analysis",
    "health_insights",
    "custom",
  ]),
  format: z.enum(["pdf", "csv", "json"]),
  period: z.object({
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
  }),
  sections: z
    .object({
      workoutSummary: z.boolean().optional().default(true),
      progressCharts: z.boolean().optional().default(true),
      healthMetrics: z.boolean().optional().default(true),
      achievements: z.boolean().optional().default(true),
      insights: z.boolean().optional().default(true),
      comparisons: z.boolean().optional().default(false),
      predictions: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
  includeCharts: z.boolean().optional().default(true),
  chartStyle: z.enum(["minimal", "detailed"]).optional().default("detailed"),
});

// Apply auth middleware to all routes
analytics.use("*", clerkAuth());

/**
 * GET /api/v1/analytics/dashboard
 * Get comprehensive dashboard analytics
 */
analytics.get("/dashboard", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    const _query = DashboardQuerySchema.parse(c.req.query());
    const database = createDatabaseClient(c.env.DATABASE_URL);
    const analyticsService = new AdvancedAnalyticsService(database);
    const dashboard = await analyticsService.generateDashboardAnalytics(
      user.id
    );

    return c.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Failed to generate dashboard analytics",
    });
  }
});

/**
 * POST /api/v1/analytics/snapshot
 * Create analytics snapshot for a period
 */
analytics.post("/snapshot", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    // Check for premium plan
    if (user.plan === "free") {
      throw new HTTPException(402, {
        message: "Premium plan required for analytics snapshots",
      });
    }

    const { periodType } = await c.req.json();

    if (
      !periodType ||
      !["weekly", "monthly", "quarterly", "yearly"].includes(periodType)
    ) {
      throw new HTTPException(400, { message: "Invalid period type" });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const analyticsService = new AdvancedAnalyticsService(database);
    const snapshot = await analyticsService.createAnalyticsSnapshot(
      user.id,
      periodType as PeriodType
    );

    return c.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error("Create snapshot error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Failed to create analytics snapshot",
    });
  }
});

/**
 * GET /api/v1/analytics/trends
 * Analyze trends and generate insights
 */
analytics.get("/trends", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    // Check for premium plan
    if (user.plan === "free") {
      throw new HTTPException(402, {
        message: "Premium plan required for trend analysis",
      });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const analyticsService = new AdvancedAnalyticsService(database);
    const trends = await analyticsService.analyzeTrends(user.id);

    return c.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error("Trends analysis error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to analyze trends" });
  }
});

/**
 * GET /api/v1/analytics/predictions
 * Generate predictive analysis
 */
analytics.get("/predictions", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    // Check for premium plan
    if (user.plan === "free") {
      throw new HTTPException(402, {
        message: "Premium plan required for predictions",
      });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const analyticsService = new AdvancedAnalyticsService(database);
    const predictions = await analyticsService.generatePredictions(user.id);

    return c.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    console.error("Predictions generation error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to generate predictions" });
  }
});

/**
 * GET /api/v1/analytics/charts/:metric
 * Generate chart data for visualization
 */
analytics.get("/charts/:metric", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    const metric = c.req.param("metric");
    const query = ChartDataQuerySchema.parse(c.req.query());

    const database = createDatabaseClient(c.env.DATABASE_URL);
    const analyticsService = new AdvancedAnalyticsService(database);
    const chartData = await analyticsService.generateChartData(
      user.id,
      metric,
      query.period
    );

    return c.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error("Chart data generation error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to generate chart data" });
  }
});

/**
 * POST /api/v1/analytics/reports/generate
 * Generate and queue a comprehensive report
 */
analytics.post("/reports/generate", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    // Check for premium plan
    if (user.plan === "free") {
      throw new HTTPException(402, {
        message: "Premium plan required for report generation",
      });
    }

    const reportRequest = ReportRequestSchema.parse(await c.req.json());
    const database = createDatabaseClient(c.env.DATABASE_URL);

    // Save report request to database
    const reportId = crypto.randomUUID();
    await database`
      INSERT INTO user_reports (
        id, user_id, report_type, report_format, start_date, end_date, sections, status
      ) VALUES (
        ${reportId}, ${user.id}, ${reportRequest.reportType}, ${reportRequest.format},
        ${reportRequest.period.startDate.toISOString()}, ${reportRequest.period.endDate.toISOString()},
        ${JSON.stringify(reportRequest.sections)}, 'pending'
      )
    `;

    // Generate report immediately (simplified implementation)
    // In production, this would be queued as a background job
    try {
      // Convert sections object to array of enabled sections
      const enabledSections = Object.keys(reportRequest.sections)
        .filter(key => reportRequest.sections[key as keyof typeof reportRequest.sections] === true)
        .map(key => {
          // Map UI keys to internal keys
          const keyMapping: { [key: string]: string } = {
            'workoutSummary': 'workouts',
            'progressCharts': 'progress',
            'healthMetrics': 'health',
            'achievements': 'achievements',
            'insights': 'insights',
            'comparisons': 'comparisons',
            'predictions': 'predictions'
          };
          return keyMapping[key] || key;
        });

      const reportData = await generateAnalyticsReport(
        database,
        user.id,
        reportRequest.reportType,
        reportRequest.period.startDate,
        reportRequest.period.endDate,
        enabledSections
      );

      // Update report status to completed
      await database`
        UPDATE analytics_reports 
        SET status = 'completed', report_data = ${JSON.stringify(reportData)}, completed_at = NOW()
        WHERE id = ${reportId}
      `;

      return c.json({
        success: true,
        data: {
          reportId,
          status: "completed",
          reportData,
          message: "Report generated successfully",
        },
      });
    } catch (error) {
      // Update report status to failed
      await database`
        UPDATE analytics_reports 
        SET status = 'failed', error_message = ${error instanceof Error ? error.message : 'Unknown error'}
        WHERE id = ${reportId}
      `;

      throw new HTTPException(500, {
        message: "Error generating analytics report",
      });
    }
  } catch (error) {
    console.error("Report generation error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Failed to queue report generation",
    });
  }
});

/**
 * GET /api/v1/analytics/reports/:reportId
 * Check report generation status and download
 */
analytics.get("/reports/:reportId", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    const reportId = c.req.param("reportId");
    const database = createDatabaseClient(c.env.DATABASE_URL);

    const result = await database`
      SELECT * FROM user_reports
      WHERE id = ${reportId} AND user_id = ${user.id}
    `;

    const report = (result as any[])[0];
    if (!report) {
      throw new HTTPException(404, { message: "Report not found" });
    }

    return c.json({
      success: true,
      data: {
        id: report.id,
        reportType: report.report_type,
        format: report.report_format,
        status: report.status,
        fileUrl: report.file_url,
        fileSizeMb: report.file_size_mb,
        generatedAt: report.generated_at,
        expiresAt: report.expires_at,
        downloadCount: report.download_count,
        errorMessage: report.error_message,
      },
    });
  } catch (error) {
    console.error("Report status error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to get report status" });
  }
});

/**
 * GET /api/v1/analytics/insights
 * Get recent workout insights
 */
analytics.get("/insights", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    const limit = parseInt(c.req.query("limit") || "10");
    const unreadOnly = c.req.query("unread") === "true";
    const database = createDatabaseClient(c.env.DATABASE_URL);

    let whereClause = `user_id = '${user.id}' AND is_dismissed = FALSE`;

    if (unreadOnly) {
      whereClause += " AND is_read = FALSE";
    }

    const result = await database.unsafe(`
      SELECT * FROM workout_insights
      WHERE ${whereClause}
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY importance_score DESC, detected_at DESC
      LIMIT ${limit}
    `);

    const insights = (result as unknown as any[]).map((row) => ({
      id: row.id,
      insightType: row.insight_type,
      insightCategory: row.insight_category,
      title: row.title,
      description: row.description,
      insightData: row.insight_data || {},
      importanceScore: row.importance_score,
      confidenceScore: row.confidence_score,
      actionable: row.actionable,
      isRead: row.is_read,
      detectedAt: row.detected_at,
    }));

    return c.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error("Insights fetch error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to fetch insights" });
  }
});

/**
 * PUT /api/v1/analytics/insights/:insightId/read
 * Mark insight as read
 */
analytics.put("/insights/:insightId/read", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    const insightId = c.req.param("insightId");
    const database = createDatabaseClient(c.env.DATABASE_URL);

    await database`
      UPDATE workout_insights
      SET is_read = TRUE
      WHERE id = ${insightId} AND user_id = ${user.id}
    `;

    return c.json({ success: true });
  } catch (error) {
    console.error("Mark insight read error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to mark insight as read" });
  }
});

/**
 * PUT /api/v1/analytics/insights/:insightId/feedback
 * Provide feedback on insight
 */
analytics.put("/insights/:insightId/feedback", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    const insightId = c.req.param("insightId");
    const { feedback } = await c.req.json();

    if (!["helpful", "not_helpful", "irrelevant"].includes(feedback)) {
      throw new HTTPException(400, { message: "Invalid feedback value" });
    }

    const database = createDatabaseClient(c.env.DATABASE_URL);

    await database`
      UPDATE workout_insights
      SET user_feedback = ${feedback}, is_read = TRUE
      WHERE id = ${insightId} AND user_id = ${user.id}
    `;

    return c.json({ success: true });
  } catch (error) {
    console.error("Insight feedback error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Failed to save insight feedback",
    });
  }
});

/**
 * GET /api/v1/analytics/achievements
 * Get user achievements
 */
analytics.get("/achievements", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    const limit = parseInt(c.req.query("limit") || "20");
    const category = c.req.query("category");
    const database = createDatabaseClient(c.env.DATABASE_URL);

    let whereClause = `user_id = '${user.id}'`;

    if (category) {
      whereClause += ` AND category = '${category}'`;
    }

    const result = await database.unsafe(`
      SELECT * FROM user_achievements
      WHERE ${whereClause}
      ORDER BY achieved_at DESC
      LIMIT ${limit}
    `);

    const achievements = (result as unknown as any[]).map((row) => ({
      id: row.id,
      achievementType: row.achievement_type,
      category: row.category,
      name: row.name,
      description: row.description,
      iconName: row.icon_name,
      badgeColor: row.badge_color,
      valueAchieved: parseFloat(row.value_achieved),
      unit: row.unit,
      previousBest: row.previous_best
        ? parseFloat(row.previous_best)
        : undefined,
      improvementPercent: row.improvement_percent
        ? parseFloat(row.improvement_percent)
        : undefined,
      difficultyLevel: row.difficulty_level,
      rarityScore: row.rarity_score,
      pointsAwarded: row.points_awarded,
      achievedAt: row.achieved_at,
    }));

    return c.json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    console.error("Achievements fetch error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to fetch achievements" });
  }
});

// Helper function to generate analytics reports
async function generateAnalyticsReport(
  sql: any,
  userId: string,
  reportType: string,
  startDate: Date,
  endDate: Date,
  sections: string[]
): Promise<any> {
  const reportData: any = {
    reportType,
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    },
    generatedAt: new Date().toISOString(),
    sections: {}
  };

  // Get workout summary
  if (sections.includes('workouts') || sections.includes('all')) {
    const workoutStats = await sql`
      SELECT 
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_workouts,
        COUNT(*) as total_sessions,
        AVG(duration_minutes) as avg_duration,
        SUM(total_volume_kg) as total_volume,
        AVG(average_rpe) as avg_rpe,
        MIN(started_at) as first_workout,
        MAX(started_at) as last_workout
      FROM workout_sessions
      WHERE user_id = ${userId}
        AND started_at >= ${startDate.toISOString()}
        AND started_at <= ${endDate.toISOString()}
    `;

    reportData.sections.workouts = {
      summary: (workoutStats as any[])[0] || {},
      trends: await getWorkoutTrends(sql, userId, startDate, endDate)
    };
  }

  // Get progress metrics
  if (sections.includes('progress') || sections.includes('all')) {
    const progressData = await sql`
      SELECT 
        e.name,
        e.name_es,
        MIN(ws.weight_kg) as starting_weight,
        MAX(ws.weight_kg) as current_weight,
        COUNT(DISTINCT DATE(wse.started_at)) as days_trained
      FROM workout_sets ws
      JOIN workout_sessions wse ON ws.workout_session_id = wse.id
      JOIN exercises e ON ws.exercise_id = e.id
      WHERE wse.user_id = ${userId}
        AND wse.completed_at IS NOT NULL
        AND wse.started_at >= ${startDate.toISOString()}
        AND wse.started_at <= ${endDate.toISOString()}
      GROUP BY e.id, e.name, e.name_es
      HAVING COUNT(*) >= 3
      ORDER BY (MAX(ws.weight_kg) - MIN(ws.weight_kg)) DESC
      LIMIT 10
    `;

    reportData.sections.progress = {
      topExercises: progressData as any[],
      totalImprovement: calculateTotalImprovement(progressData as any[])
    };
  }

  // Get volume analysis
  if (sections.includes('volume') || sections.includes('all')) {
    const volumeData = await sql`
      SELECT 
        DATE(wse.started_at) as workout_date,
        SUM(ws.reps * ws.weight_kg) as daily_volume,
        COUNT(DISTINCT ws.exercise_id) as exercises_count
      FROM workout_sets ws
      JOIN workout_sessions wse ON ws.workout_session_id = wse.id
      WHERE wse.user_id = ${userId}
        AND wse.completed_at IS NOT NULL
        AND wse.started_at >= ${startDate.toISOString()}
        AND wse.started_at <= ${endDate.toISOString()}
      GROUP BY DATE(wse.started_at)
      ORDER BY workout_date
    `;

    reportData.sections.volume = {
      dailyVolume: volumeData as any[],
      averageVolume: calculateAverageVolume(volumeData as any[]),
      peakVolume: Math.max(...(volumeData as any[]).map((d: any) => parseFloat(d.daily_volume) || 0))
    };
  }

  return reportData;
}

// Helper functions
async function getWorkoutTrends(sql: any, userId: string, startDate: Date, endDate: Date) {
  return await sql`
    SELECT 
      DATE_TRUNC('week', started_at) as week,
      COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed,
      AVG(duration_minutes) as avg_duration
    FROM workout_sessions
    WHERE user_id = ${userId}
      AND started_at >= ${startDate.toISOString()}
      AND started_at <= ${endDate.toISOString()}
    GROUP BY DATE_TRUNC('week', started_at)
    ORDER BY week
  `;
}

function calculateTotalImprovement(exercises: any[]): number {
  return exercises.reduce((total, exercise) => {
    const improvement = (parseFloat(exercise.current_weight) || 0) - (parseFloat(exercise.starting_weight) || 0);
    return total + Math.max(improvement, 0);
  }, 0);
}

function calculateAverageVolume(volumeData: any[]): number {
  if (volumeData.length === 0) return 0;
  const totalVolume = volumeData.reduce((sum, day) => sum + (parseFloat(day.daily_volume) || 0), 0);
  return totalVolume / volumeData.length;
}

export default analytics;
