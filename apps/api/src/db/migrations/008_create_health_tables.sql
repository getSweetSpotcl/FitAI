-- Migration: Create health and HealthKit integration tables
-- Description: Tables for health data synchronization, Apple Watch integration, and health metrics

-- User health profiles and settings
CREATE TABLE IF NOT EXISTS user_health_profiles (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  
  -- Basic health info
  birth_date DATE,
  biological_sex VARCHAR(10), -- male, female, other, not_set
  blood_type VARCHAR(10), -- A+, A-, B+, B-, AB+, AB-, O+, O-, not_set
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  
  -- HealthKit permissions
  healthkit_enabled BOOLEAN DEFAULT FALSE,
  healthkit_permissions JSONB DEFAULT '{}', -- Specific permissions granted
  apple_watch_connected BOOLEAN DEFAULT FALSE,
  
  -- Privacy settings
  share_health_data BOOLEAN DEFAULT FALSE,
  share_workout_data BOOLEAN DEFAULT TRUE,
  share_heart_rate BOOLEAN DEFAULT FALSE,
  
  -- Sync settings
  auto_sync_workouts BOOLEAN DEFAULT TRUE,
  sync_frequency VARCHAR(20) DEFAULT 'real_time', -- real_time, hourly, daily
  last_sync_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- HealthKit data synchronization logs
CREATE TABLE IF NOT EXISTS healthkit_sync_logs (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  
  sync_type VARCHAR(30) NOT NULL, -- workout, heart_rate, body_mass, steps, etc.
  sync_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  
  -- Sync details
  data_points_synced INTEGER DEFAULT 0,
  sync_start_time TIMESTAMP DEFAULT NOW(),
  sync_end_time TIMESTAMP,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  
  -- Metadata
  device_info JSONB, -- Apple Watch, iPhone model, etc.
  healthkit_version VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Health metrics and measurements
CREATE TABLE IF NOT EXISTS health_metrics (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  
  -- Metric details
  metric_type VARCHAR(50) NOT NULL, -- weight, heart_rate, blood_pressure, body_fat, etc.
  metric_value DECIMAL(10,4) NOT NULL,
  metric_unit VARCHAR(20) NOT NULL, -- kg, bpm, mmHg, %, etc.
  
  -- Data source
  data_source VARCHAR(30) DEFAULT 'manual', -- manual, healthkit, apple_watch, third_party
  source_device VARCHAR(100), -- Device name or app name
  healthkit_uuid VARCHAR(255), -- HealthKit sample UUID for deduplication
  
  -- Timing
  recorded_at TIMESTAMP NOT NULL, -- When the measurement was taken
  synced_at TIMESTAMP DEFAULT NOW(), -- When it was synced to our system
  
  -- Quality and confidence
  confidence_level DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
  is_user_entered BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}', -- Additional device-specific data
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_health_metrics_user_type (user_id, metric_type),
  INDEX idx_health_metrics_recorded (recorded_at),
  UNIQUE(user_id, healthkit_uuid) -- Prevent duplicate HealthKit entries
);

-- Heart rate data (specialized table for frequent data)
CREATE TABLE IF NOT EXISTS heart_rate_data (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  
  -- Heart rate measurements
  heart_rate_bpm INTEGER NOT NULL,
  heart_rate_context VARCHAR(30), -- resting, active, workout, recovery
  
  -- Workout association
  workout_session_id VARCHAR(255), -- Link to workout if during exercise
  
  -- Data source
  data_source VARCHAR(30) DEFAULT 'apple_watch', -- apple_watch, chest_strap, manual
  source_device VARCHAR(100),
  healthkit_uuid VARCHAR(255),
  
  -- Timing
  recorded_at TIMESTAMP NOT NULL,
  synced_at TIMESTAMP DEFAULT NOW(),
  
  -- Quality indicators
  confidence_level DECIMAL(3,2) DEFAULT 1.0,
  motion_context VARCHAR(20), -- stationary, walking, running, etc.
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE SET NULL,
  INDEX idx_heart_rate_user_time (user_id, recorded_at),
  INDEX idx_heart_rate_workout (workout_session_id),
  UNIQUE(user_id, healthkit_uuid)
);

-- Apple Watch workout data
CREATE TABLE IF NOT EXISTS apple_watch_workouts (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  
  -- HealthKit workout identifiers
  healthkit_uuid VARCHAR(255) NOT NULL,
  workout_type VARCHAR(50) NOT NULL, -- running, cycling, strength_training, etc.
  
  -- Workout timing
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration_seconds INTEGER NOT NULL,
  
  -- Workout metrics
  total_energy_burned_kcal DECIMAL(8,2),
  active_energy_burned_kcal DECIMAL(8,2),
  total_distance_meters DECIMAL(10,2),
  
  -- Heart rate data
  avg_heart_rate_bpm INTEGER,
  max_heart_rate_bpm INTEGER,
  min_heart_rate_bpm INTEGER,
  heart_rate_zones JSONB, -- Time in each HR zone
  
  -- Device and quality
  source_device VARCHAR(100),
  workout_location VARCHAR(20), -- indoor, outdoor, unknown
  
  -- Sync status
  synced_to_fitai BOOLEAN DEFAULT FALSE,
  fitai_workout_session_id VARCHAR(255), -- Link to our workout session
  sync_conflicts JSONB, -- Any conflicts during sync
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Raw HealthKit data
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (fitai_workout_session_id) REFERENCES workout_sessions(id) ON DELETE SET NULL,
  INDEX idx_watch_workouts_user (user_id, start_time),
  INDEX idx_watch_workouts_type (workout_type),
  UNIQUE(user_id, healthkit_uuid)
);

-- Daily activity summaries (steps, calories, etc.)
CREATE TABLE IF NOT EXISTS daily_activity_summaries (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  
  -- Date for the summary
  activity_date DATE NOT NULL,
  
  -- Steps and movement
  step_count INTEGER DEFAULT 0,
  distance_walked_meters DECIMAL(10,2) DEFAULT 0,
  flights_climbed INTEGER DEFAULT 0,
  
  -- Energy and calories
  active_energy_kcal DECIMAL(8,2) DEFAULT 0,
  basal_energy_kcal DECIMAL(8,2) DEFAULT 0,
  total_energy_kcal DECIMAL(8,2) DEFAULT 0,
  
  -- Exercise and movement goals
  exercise_minutes INTEGER DEFAULT 0,
  stand_hours INTEGER DEFAULT 0,
  move_goal_kcal DECIMAL(8,2),
  exercise_goal_minutes INTEGER DEFAULT 30,
  stand_goal_hours INTEGER DEFAULT 12,
  
  -- Goal achievements
  move_goal_achieved BOOLEAN DEFAULT FALSE,
  exercise_goal_achieved BOOLEAN DEFAULT FALSE,
  stand_goal_achieved BOOLEAN DEFAULT FALSE,
  
  -- Data completeness
  data_complete BOOLEAN DEFAULT FALSE,
  missing_data_types TEXT[], -- Array of missing data types
  
  -- Sync info
  healthkit_synced BOOLEAN DEFAULT FALSE,
  last_updated_at TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_activity_summaries_user_date (user_id, activity_date),
  UNIQUE(user_id, activity_date)
);

-- Health insights and recommendations based on health data
CREATE TABLE IF NOT EXISTS health_insights (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  
  -- Insight details
  insight_type VARCHAR(50) NOT NULL, -- trend, recommendation, alert, achievement
  insight_category VARCHAR(30) NOT NULL, -- heart_rate, activity, sleep, recovery, etc.
  
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  -- Insight data and confidence
  insight_data JSONB NOT NULL, -- Structured data supporting the insight
  confidence_score DECIMAL(3,2) DEFAULT 1.0, -- Algorithm confidence 0.0-1.0
  importance_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  
  -- Actionable recommendations
  actionable BOOLEAN DEFAULT FALSE,
  recommended_actions JSONB, -- Array of suggested actions
  
  -- Timing and relevance
  detected_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- When this insight becomes irrelevant
  
  -- User interaction
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  user_feedback VARCHAR(20), -- helpful, not_helpful, irrelevant
  
  -- Data sources
  data_sources TEXT[], -- Which health metrics contributed to this insight
  analysis_period_start TIMESTAMP,
  analysis_period_end TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_health_insights_user (user_id, detected_at),
  INDEX idx_health_insights_category (insight_category, importance_level)
);

-- Health data sharing and privacy logs
CREATE TABLE IF NOT EXISTS health_data_sharing_logs (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  
  -- Sharing event details
  sharing_event VARCHAR(30) NOT NULL, -- permission_granted, permission_revoked, data_shared, data_request
  data_type VARCHAR(50) NOT NULL, -- heart_rate, workouts, weight, etc.
  
  -- Sharing context
  shared_with VARCHAR(100), -- coach, trainer, doctor, research, etc.
  sharing_purpose TEXT,
  
  -- Data scope
  data_range_start TIMESTAMP,
  data_range_end TIMESTAMP,
  data_points_shared INTEGER,
  
  -- Privacy and consent
  explicit_consent BOOLEAN DEFAULT TRUE,
  consent_version VARCHAR(10), -- Version of privacy policy
  can_revoke BOOLEAN DEFAULT TRUE,
  
  -- Audit trail
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sharing_logs_user (user_id, created_at)
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_health_profiles_sync ON user_health_profiles(last_sync_at) WHERE healthkit_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON healthkit_sync_logs(sync_status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_type ON healthkit_sync_logs(user_id, sync_type, created_at);
CREATE INDEX IF NOT EXISTS idx_health_metrics_source ON health_metrics(data_source, metric_type);
CREATE INDEX IF NOT EXISTS idx_heart_rate_context ON heart_rate_data(heart_rate_context, recorded_at);
CREATE INDEX IF NOT EXISTS idx_watch_workouts_sync ON apple_watch_workouts(synced_to_fitai, created_at) WHERE synced_to_fitai = FALSE;
CREATE INDEX IF NOT EXISTS idx_activity_summaries_goals ON daily_activity_summaries(activity_date) WHERE move_goal_achieved = TRUE;
CREATE INDEX IF NOT EXISTS idx_health_insights_active ON health_insights(user_id, importance_level, created_at) WHERE is_dismissed = FALSE;