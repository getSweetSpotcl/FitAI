// Health data types for Apple Health integration

export type HealthMetricType =
  | "steps"
  | "calories"
  | "heart_rate"
  | "distance"
  | "floors_climbed"
  | "active_energy"
  | "resting_heart_rate"
  | "blood_pressure_systolic"
  | "blood_pressure_diastolic"
  | "body_weight"
  | "body_fat_percentage"
  | "vo2_max";

export type HealthMetricUnit =
  | "count"
  | "kcal"
  | "bpm"
  | "km"
  | "miles"
  | "kg"
  | "lbs"
  | "mmHg"
  | "percent"
  | "ml/kg/min";

export interface HealthMetric {
  id: string;
  userId: string;
  metricType: HealthMetricType;
  value: number;
  unit: HealthMetricUnit;
  sourceApp: string;
  recordedAt: Date;
  syncedAt: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface HRVData {
  id: string;
  userId: string;
  rmssdMs: number; // Root Mean Square of Successive Differences
  sdnnMs: number; // Standard Deviation of NN intervals
  stressScore: number; // 0-100
  recoveryScore: number; // 0-100
  recordedAt: Date;
  syncedAt: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface SleepData {
  id: string;
  userId: string;
  sleepStart: Date;
  sleepEnd: Date;
  totalSleepMinutes: number;
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  lightSleepMinutes?: number;
  awakeMinutes?: number;
  sleepEfficiency?: number; // Percentage
  sleepQualityScore?: number; // 1-10
  recordedAt: Date;
  syncedAt: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

export type AppleWorkoutType =
  | "running"
  | "cycling"
  | "swimming"
  | "walking"
  | "hiking"
  | "yoga"
  | "strength_training"
  | "functional_strength_training"
  | "cross_training"
  | "elliptical"
  | "rowing"
  | "stairs"
  | "other";

export interface HealthWorkout {
  id: string;
  userId: string;
  appleHealthUuid?: string;
  workoutType: AppleWorkoutType;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  caloriesBurned?: number;
  distanceKm?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  sourceApp: string;
  syncedAt: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

export type SyncStatus = "success" | "partial" | "failed";
export type HealthDataType = "metrics" | "workouts" | "sleep" | "hrv";

export interface HealthSyncStatus {
  id: string;
  userId: string;
  dataType: HealthDataType;
  lastSyncAt: Date;
  syncStatus: SyncStatus;
  recordsSynced: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TrainingReadiness = "high" | "moderate" | "low" | "rest";
export type RecommendedIntensity =
  | "high"
  | "moderate"
  | "low"
  | "active_recovery";

export interface RecoveryRecommendation {
  id: string;
  userId: string;
  recommendationDate: Date;
  recoveryScore: number; // 0-100
  trainingReadiness: TrainingReadiness;
  recommendedIntensity?: RecommendedIntensity;
  recommendations: string[];
  factorsAnalyzed: string[];
  aiGenerated: boolean;
  createdAt: Date;
}

// Request/Response types for API endpoints

export interface SyncHealthDataRequest {
  dataType: HealthDataType;
  data: {
    metrics?: Omit<HealthMetric, "id" | "userId" | "syncedAt" | "createdAt">[];
    workouts?: Omit<
      HealthWorkout,
      "id" | "userId" | "syncedAt" | "createdAt"
    >[];
    sleep?: Omit<SleepData, "id" | "userId" | "syncedAt" | "createdAt">[];
    hrv?: Omit<HRVData, "id" | "userId" | "syncedAt" | "createdAt">[];
  };
  lastSyncAt?: Date;
}

export interface SyncHealthDataResponse {
  success: boolean;
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  recordsSkipped: number;
  syncStatus: SyncStatus;
  errorMessage?: string;
  nextSyncRecommendedAt?: Date;
}

export interface HealthMetricsQuery {
  metricTypes?: HealthMetricType[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  aggregation?: "raw" | "daily" | "weekly" | "monthly";
}

export interface HealthMetricsResponse {
  success: boolean;
  data: {
    metrics: HealthMetric[];
    aggregated?: {
      [key in HealthMetricType]?: {
        average: number;
        min: number;
        max: number;
        total: number;
        unit: HealthMetricUnit;
      };
    };
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface RecoveryAnalysis {
  currentScore: number;
  trend: "improving" | "stable" | "declining";
  factorsInfluencing: {
    sleep: "positive" | "negative" | "neutral";
    hrv: "positive" | "negative" | "neutral";
    workloadBalance: "positive" | "negative" | "neutral";
    consistency: "positive" | "negative" | "neutral";
  };
  recommendations: string[];
  nextRecommendationDate: Date;
}

// Apple Health specific data structures
export interface AppleHealthSample {
  uuid: string;
  quantityType: string;
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  sourceRevision?: {
    source: {
      name: string;
      bundleIdentifier: string;
    };
  };
  metadata?: Record<string, any>;
}

export interface AppleWorkoutSample {
  uuid: string;
  workoutActivityType: string;
  startDate: string;
  endDate: string;
  duration: number;
  totalEnergyBurned?: number;
  totalDistance?: number;
  metadata?: Record<string, any>;
  heartRateSamples?: AppleHealthSample[];
}

// Permission types for health data access
export interface HealthPermissions {
  read: HealthMetricType[];
  write: HealthMetricType[];
  granted: boolean;
  grantedAt?: Date;
  lastUpdated: Date;
}

// Extended HealthKit integration types

// User health profile with HealthKit settings
export interface UserHealthProfile {
  id: string;
  userId: string;

  // Basic health info
  birthDate?: Date;
  biologicalSex?: "male" | "female" | "other" | "not_set";
  bloodType?:
    | "A+"
    | "A-"
    | "B+"
    | "B-"
    | "AB+"
    | "AB-"
    | "O+"
    | "O-"
    | "not_set";
  heightCm?: number;
  weightKg?: number;

  // HealthKit integration
  healthkitEnabled: boolean;
  healthkitPermissions: HealthKitPermissions;
  appleWatchConnected: boolean;

  // Privacy settings
  shareHealthData: boolean;
  shareWorkoutData: boolean;
  shareHeartRate: boolean;

  // Sync settings
  autoSyncWorkouts: boolean;
  syncFrequency: "real_time" | "hourly" | "daily";
  lastSyncAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// Enhanced HealthKit permissions
export interface HealthKitPermissions {
  read: HealthKitDataType[];
  write: HealthKitDataType[];
  share: HealthKitDataType[];
}

export type HealthKitDataType =
  | "heart_rate"
  | "workout"
  | "step_count"
  | "distance_walking"
  | "active_energy"
  | "basal_energy"
  | "body_mass"
  | "height"
  | "blood_pressure"
  | "body_fat_percentage"
  | "respiratory_rate"
  | "oxygen_saturation"
  | "sleep_analysis"
  | "flights_climbed"
  | "exercise_time"
  | "heart_rate_variability";

// Heart rate data with enhanced context
export interface HeartRateData {
  id: string;
  userId: string;

  // Heart rate measurement
  heartRateBpm: number;
  heartRateContext?: "resting" | "active" | "workout" | "recovery";

  // Workout association
  workoutSessionId?: string;

  // Data source
  dataSource: "apple_watch" | "chest_strap" | "manual";
  sourceDevice?: string;
  healthkitUuid?: string;

  // Timing
  recordedAt: Date;
  syncedAt: Date;

  // Quality
  confidenceLevel: number;
  motionContext?: "stationary" | "walking" | "running" | "cycling";

  createdAt: Date;
}

// Apple Watch workout data
export interface AppleWatchWorkout {
  id: string;
  userId: string;

  // HealthKit identifiers
  healthkitUuid: string;
  workoutType: string;

  // Timing
  startTime: Date;
  endTime: Date;
  durationSeconds: number;

  // Metrics
  totalEnergyBurnedKcal?: number;
  activeEnergyBurnedKcal?: number;
  totalDistanceMeters?: number;

  // Heart rate
  avgHeartRateBpm?: number;
  maxHeartRateBpm?: number;
  minHeartRateBpm?: number;
  heartRateZones?: HeartRateZones;

  // Context
  sourceDevice?: string;
  workoutLocation?: "indoor" | "outdoor" | "unknown";

  // Sync status
  syncedToFitai: boolean;
  fitaiWorkoutSessionId?: string;
  syncConflicts?: SyncConflict[];

  // Raw data
  metadata: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

// Heart rate zones data
export interface HeartRateZones {
  zone1TimeSeconds: number; // Very light (50-60% max HR)
  zone2TimeSeconds: number; // Light (60-70% max HR)
  zone3TimeSeconds: number; // Moderate (70-80% max HR)
  zone4TimeSeconds: number; // Hard (80-90% max HR)
  zone5TimeSeconds: number; // Maximum (90-100% max HR)
}

// Sync conflict information
export interface SyncConflict {
  conflictType:
    | "duration_mismatch"
    | "calorie_difference"
    | "workout_type"
    | "timing_overlap";
  description: string;
  healthkitValue: any;
  fitaiValue: any;
  resolution?: "use_healthkit" | "use_fitai" | "manual_review";
}

// Daily activity summary
export interface DailyActivitySummary {
  id: string;
  userId: string;

  // Date
  activityDate: Date;

  // Steps and movement
  stepCount: number;
  distanceWalkedMeters: number;
  flightsClimbed: number;

  // Energy
  activeEnergyKcal: number;
  basalEnergyKcal: number;
  totalEnergyKcal: number;

  // Goals and achievements
  exerciseMinutes: number;
  standHours: number;
  moveGoalKcal?: number;
  exerciseGoalMinutes: number;
  standGoalHours: number;

  // Goal status
  moveGoalAchieved: boolean;
  exerciseGoalAchieved: boolean;
  standGoalAchieved: boolean;

  // Data quality
  dataComplete: boolean;
  missingDataTypes: string[];

  // Sync status
  healthkitSynced: boolean;
  lastUpdatedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

// Health insights
export interface HealthInsight {
  id: string;
  userId: string;

  // Insight details
  insightType: "trend" | "recommendation" | "alert" | "achievement";
  insightCategory: string;

  title: string;
  description: string;

  // Analysis
  insightData: Record<string, any>;
  confidenceScore: number;
  importanceLevel: "low" | "medium" | "high" | "critical";

  // Actions
  actionable: boolean;
  recommendedActions?: RecommendedAction[];

  // Timing
  detectedAt: Date;
  expiresAt?: Date;

  // User interaction
  isRead: boolean;
  isDismissed: boolean;
  userFeedback?: "helpful" | "not_helpful" | "irrelevant";

  // Sources
  dataSources: string[];
  analysisPeriodStart?: Date;
  analysisPeriodEnd?: Date;

  createdAt: Date;
}

// Recommended action
export interface RecommendedAction {
  actionType: "workout" | "rest" | "nutrition" | "medical" | "lifestyle";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedImpact?: string;
  actionData?: Record<string, any>;
}

// HealthKit sync log
export interface HealthKitSyncLog {
  id: string;
  userId: string;

  // Sync details
  syncType: string;
  syncStatus: "pending" | "processing" | "completed" | "failed";

  // Progress
  dataPointsSynced: number;
  syncStartTime: Date;
  syncEndTime?: Date;

  // Error handling
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: Date;

  // Device info
  deviceInfo?: DeviceInfo;
  healthkitVersion?: string;

  createdAt: Date;
}

// Device information
export interface DeviceInfo {
  deviceType: "iPhone" | "Apple Watch" | "iPad";
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  hardwareIdentifier?: string;
}

// API Request types for new functionality

export interface UpdateHealthProfileRequest {
  birthDate?: Date;
  biologicalSex?: "male" | "female" | "other" | "not_set";
  bloodType?:
    | "A+"
    | "A-"
    | "B+"
    | "B-"
    | "AB+"
    | "AB-"
    | "O+"
    | "O-"
    | "not_set";
  heightCm?: number;
  weightKg?: number;
  shareHealthData?: boolean;
  shareWorkoutData?: boolean;
  shareHeartRate?: boolean;
  autoSyncWorkouts?: boolean;
  syncFrequency?: "real_time" | "hourly" | "daily";
}

export interface HealthKitPermissionRequest {
  permissions: {
    read: HealthKitDataType[];
    write: HealthKitDataType[];
    share: HealthKitDataType[];
  };
}

export interface SyncHealthKitDataRequest {
  dataTypes: HealthKitDataType[];
  startDate?: Date;
  endDate?: Date;
  forceResync?: boolean;
}

export interface AddHealthMetricRequest {
  metricType: string;
  metricValue: number;
  metricUnit: string;
  recordedAt?: Date;
  notes?: string;
  sourceDevice?: string;
}

export interface HealthDashboardQuery {
  period: "week" | "month" | "quarter" | "year";
  metrics?: string[];
  includeInsights?: boolean;
  includeGoals?: boolean;
}

export interface HeartRateAnalysisQuery {
  startDate: Date;
  endDate: Date;
  context?: "resting" | "active" | "workout" | "recovery";
  includeWorkouts?: boolean;
}

// Response types

export interface HealthResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface HealthDashboardResponse {
  summary: {
    totalWorkouts: number;
    avgHeartRate: number;
    totalActiveCalories: number;
    avgStepsPerDay: number;
    sleepHoursAvg: number;
  };
  trends: {
    heartRateTrend: TrendData;
    weightTrend: TrendData;
    activityTrend: TrendData;
  };
  recentMetrics: HealthMetric[];
  activeInsights: HealthInsight[];
  goalProgress: GoalProgress[];
}

export interface TrendData {
  metric: string;
  period: string;
  dataPoints: Array<{
    date: Date;
    value: number;
    change?: number;
  }>;
  trendDirection: "up" | "down" | "stable";
  trendStrength: number; // 0-1
}

export interface GoalProgress {
  goalType: string;
  currentValue: number;
  goalValue: number;
  unit: string;
  progress: number; // 0-1
  status: "on_track" | "behind" | "exceeded";
  daysRemaining?: number;
}
