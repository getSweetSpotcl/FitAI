// Advanced Analytics Types for FitAI

export type PeriodType = "weekly" | "monthly" | "quarterly" | "yearly";
export type ReportFormat = "pdf" | "csv" | "json";
export type ReportStatus = "pending" | "generating" | "completed" | "failed";
export type TrendDirection =
  | "improving"
  | "declining"
  | "plateauing"
  | "volatile";
export type InsightType =
  | "pattern"
  | "anomaly"
  | "recommendation"
  | "achievement";
export type AchievementType = "milestone" | "streak" | "pr" | "goal_completion";
export type ComparisonType = "peer_group" | "benchmark" | "historical";

// User Analytics Snapshot
export interface UserAnalyticsSnapshot {
  id: string;
  userId: string;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;

  // Workout metrics
  totalWorkouts: number;
  totalWorkoutMinutes: number;
  totalVolumeKg: number;
  avgWorkoutIntensity: number;
  totalCaloriesBurned: number;
  totalDistanceKm: number;

  // Performance metrics
  strengthPrCount: number;
  enduranceImprovements: number;
  consistencyScore: number;

  // Health metrics
  avgRecoveryScore: number;
  avgSleepHours: number;
  avgSleepEfficiency: number;
  avgHrvScore: number;
  avgRestingHr: number;

  // Body composition
  weightChangeKg: number;
  bodyFatChange: number;
  muscleMassChange: number;

  // Goals progress
  goalsAchieved: number;
  goalsTotal: number;
  goalCompletionRate: number;

  // Calculated scores
  overallFitnessScore: number;
  progressVelocity: number;
  adherenceScore: number;

  createdAt: Date;
  updatedAt: Date;
}

// Progress Prediction
export interface ProgressPrediction {
  id: string;
  userId: string;
  predictionType: string;
  predictionDate: Date;
  predictedValue: number;
  confidenceScore: number;
  actualValue?: number;
  accuracyScore?: number;

  modelVersion?: string;
  inputDataPoints: number;
  predictionHorizonDays: number;

  createdAt: Date;
  achievedAt?: Date;
}

// Fitness Benchmark
export interface FitnessBenchmark {
  id: string;
  category: string;
  subcategory: string;
  demographic: string;
  experienceLevel: string;

  p10Value?: number;
  p25Value?: number;
  p50Value?: number; // Median
  p75Value?: number;
  p90Value?: number;
  p95Value?: number;
  p99Value?: number;

  unit: string;
  sampleSize: number;
  lastUpdated: Date;
  createdAt: Date;
}

// User Report
export interface UserReport {
  id: string;
  userId: string;
  reportType: string;
  reportFormat: ReportFormat;

  startDate: Date;
  endDate: Date;
  sections: Record<string, any>;

  fileUrl?: string;
  fileSizeMb?: number;
  generationDurationMs?: number;

  status: ReportStatus;
  errorMessage?: string;

  generatedAt?: Date;
  expiresAt?: Date;
  downloadCount: number;
  lastDownloadedAt?: Date;

  createdAt: Date;
}

// Workout Insight
export interface WorkoutInsight {
  id: string;
  userId: string;
  insightType: InsightType;
  insightCategory: string;

  title: string;
  description: string;
  insightData: Record<string, any>;

  importanceScore: number;
  confidenceScore: number;
  actionable: boolean;

  isRead: boolean;
  isDismissed: boolean;
  userFeedback?: "helpful" | "not_helpful" | "irrelevant";

  detectedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
}

// Performance Trend
export interface PerformanceTrend {
  id: string;
  userId: string;
  metricName: string;
  metricCategory: string;

  // Last 12 weeks data
  weeklyValues: (number | null)[];

  trendDirection: TrendDirection;
  trendStrength: number;
  improvementRate: number;

  meanValue: number;
  stdDeviation: number;
  minValue: number;
  maxValue: number;

  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User Achievement
export interface UserAchievement {
  id: string;
  userId: string;
  achievementType: AchievementType;
  category: string;

  name: string;
  description?: string;
  iconName?: string;
  badgeColor?: string;

  valueAchieved: number;
  unit?: string;
  previousBest?: number;
  improvementPercent?: number;

  difficultyLevel: number;
  rarityScore: number;
  pointsAwarded: number;

  achievedAt: Date;
  createdAt: Date;
}

// User Comparison
export interface UserComparison {
  id: string;
  userId: string;
  comparisonType: ComparisonType;
  metricName: string;

  userValue: number;
  comparisonValue: number;
  percentileRank?: number;

  comparisonGroup: string;
  sampleSize?: number;

  calculatedAt: Date;
  validUntil?: Date;
}

// Dashboard Analytics Response
export interface DashboardAnalytics {
  userId: string;
  currentPeriod: UserAnalyticsSnapshot;
  previousPeriod?: UserAnalyticsSnapshot;

  // Key metrics
  keyMetrics: {
    fitnessScore: {
      current: number;
      change: number;
      trend: TrendDirection;
    };
    workoutFrequency: {
      current: number;
      target: number;
      completionRate: number;
    };
    recoveryScore: {
      current: number;
      trend: TrendDirection;
      daysInOptimalRange: number;
    };
    strengthProgress: {
      personalRecords: number;
      totalVolumeIncrease: number;
      topExerciseGains: Array<{
        exercise: string;
        improvement: number;
        unit: string;
      }>;
    };
  };

  // Recent insights
  recentInsights: WorkoutInsight[];

  // Progress predictions
  predictions: ProgressPrediction[];

  // Achievements
  recentAchievements: UserAchievement[];

  // Benchmarking
  benchmarkComparisons: UserComparison[];

  lastUpdated: Date;
}

// Report Generation Request
export interface GenerateReportRequest {
  reportType:
    | "fitness_summary"
    | "progress_analysis"
    | "health_insights"
    | "custom";
  format: ReportFormat;
  period: {
    startDate: Date;
    endDate: Date;
  };
  sections: {
    workoutSummary?: boolean;
    progressCharts?: boolean;
    healthMetrics?: boolean;
    achievements?: boolean;
    insights?: boolean;
    comparisons?: boolean;
    predictions?: boolean;
  };
  includeCharts?: boolean;
  chartStyle?: "minimal" | "detailed";
}

// Analytics Query Parameters
export interface AnalyticsQuery {
  userId: string;
  period?: PeriodType;
  startDate?: Date;
  endDate?: Date;
  metrics?: string[];
  includeComparisons?: boolean;
  includePredictions?: boolean;
  includeInsights?: boolean;
}

// Prediction Model Input
export interface PredictionModelInput {
  userId: string;
  metric: string;
  historicalData: Array<{
    date: Date;
    value: number;
  }>;
  contextualFactors: {
    age?: number;
    experienceLevel?: string;
    currentProgram?: string;
    healthMetrics?: Record<string, number>;
  };
}

// Benchmark Comparison Request
export interface BenchmarkComparisonRequest {
  userId: string;
  metrics: string[];
  demographic?: {
    ageRange?: string;
    gender?: string;
    experienceLevel?: string;
  };
  includePercentiles?: boolean;
}

// Trend Analysis Result
export interface TrendAnalysisResult {
  metric: string;
  trend: TrendDirection;
  confidence: number;
  significantChange: boolean;
  changePercent: number;
  projectedValue: number;
  timeToGoal?: number; // days
  recommendations: string[];
}

// Export types for analytics calculations
export interface AnalyticsCalculationResult {
  snapshots: UserAnalyticsSnapshot[];
  trends: PerformanceTrend[];
  insights: WorkoutInsight[];
  predictions: ProgressPrediction[];
  achievements: UserAchievement[];
  comparisons: UserComparison[];
}

// Chart Data Structure
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
  color?: string;
}

export interface ChartData {
  title: string;
  type: "line" | "bar" | "area" | "scatter";
  data: ChartDataPoint[];
  yAxis: {
    label: string;
    unit: string;
    min?: number;
    max?: number;
  };
  annotations?: Array<{
    date: string;
    text: string;
    type: "milestone" | "goal" | "note";
  }>;
}
