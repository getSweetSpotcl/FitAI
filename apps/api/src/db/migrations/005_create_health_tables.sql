-- Migration: Create health data tables for Apple Health integration
-- Description: Tables for storing health metrics, workouts, and recovery data from Apple Health

-- Health metrics table (steps, calories, heart rate, etc.)
CREATE TABLE IF NOT EXISTS health_metrics (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  metric_type VARCHAR(100) NOT NULL, -- 'steps', 'calories', 'heart_rate', 'distance', etc.
  value DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- 'count', 'kcal', 'bpm', 'km', etc.
  source_app VARCHAR(100) DEFAULT 'apple_health',
  recorded_at TIMESTAMP NOT NULL, -- When the metric was recorded in Apple Health
  synced_at TIMESTAMP DEFAULT NOW(), -- When it was synced to FitAI
  metadata JSONB DEFAULT '{}', -- Additional data from Apple Health
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Heart Rate Variability (HRV) specific table
CREATE TABLE IF NOT EXISTS health_hrv_data (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  rmssd_ms DECIMAL(8, 2), -- Root Mean Square of Successive Differences
  sdnn_ms DECIMAL(8, 2), -- Standard Deviation of NN intervals
  stress_score INTEGER, -- Calculated stress score (0-100)
  recovery_score INTEGER, -- Recovery readiness score (0-100)
  recorded_at TIMESTAMP NOT NULL,
  synced_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sleep data table
CREATE TABLE IF NOT EXISTS health_sleep_data (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  sleep_start TIMESTAMP NOT NULL,
  sleep_end TIMESTAMP NOT NULL,
  total_sleep_minutes INTEGER NOT NULL,
  deep_sleep_minutes INTEGER,
  rem_sleep_minutes INTEGER,
  light_sleep_minutes INTEGER,
  awake_minutes INTEGER,
  sleep_efficiency DECIMAL(5, 2), -- Percentage
  sleep_quality_score INTEGER, -- 1-10 scale
  recorded_at TIMESTAMP NOT NULL,
  synced_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Apple Health workouts table (imported from Health app)
CREATE TABLE IF NOT EXISTS health_workouts (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  apple_health_uuid VARCHAR(255), -- UUID from Apple Health
  workout_type VARCHAR(100) NOT NULL, -- 'running', 'cycling', 'strength_training', etc.
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL,
  calories_burned INTEGER,
  distance_km DECIMAL(8, 2),
  average_heart_rate INTEGER,
  max_heart_rate INTEGER,
  source_app VARCHAR(100) DEFAULT 'apple_health',
  synced_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}', -- Raw Apple Health data
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, apple_health_uuid) -- Prevent duplicates
);

-- Health sync status table (track sync operations)
CREATE TABLE IF NOT EXISTS health_sync_status (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  data_type VARCHAR(100) NOT NULL, -- 'metrics', 'workouts', 'sleep', 'hrv'
  last_sync_at TIMESTAMP NOT NULL,
  sync_status VARCHAR(50) DEFAULT 'success', -- 'success', 'partial', 'failed'
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, data_type) -- One status per data type per user
);

-- Recovery recommendations table
CREATE TABLE IF NOT EXISTS health_recovery_recommendations (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  recommendation_date DATE NOT NULL,
  recovery_score INTEGER NOT NULL, -- 0-100
  training_readiness VARCHAR(50) NOT NULL, -- 'high', 'moderate', 'low', 'rest'
  recommended_intensity VARCHAR(50), -- 'high', 'moderate', 'low', 'active_recovery'
  recommendations TEXT[], -- Array of text recommendations
  factors_analyzed TEXT[], -- HRV, sleep, previous workouts, etc.
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, recommendation_date) -- One recommendation per day
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_type ON health_metrics(user_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded_at ON health_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_health_hrv_user_recorded ON health_hrv_data(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_health_sleep_user_date ON health_sleep_data(user_id, sleep_start);
CREATE INDEX IF NOT EXISTS idx_health_workouts_user_start ON health_workouts(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_health_workouts_apple_uuid ON health_workouts(apple_health_uuid);
CREATE INDEX IF NOT EXISTS idx_health_sync_user_type ON health_sync_status(user_id, data_type);
CREATE INDEX IF NOT EXISTS idx_health_recovery_user_date ON health_recovery_recommendations(user_id, recommendation_date);

-- Add health permissions tracking to user profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user_profiles' AND column_name = 'health_permissions') THEN
    ALTER TABLE user_profiles ADD COLUMN health_permissions JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user_profiles' AND column_name = 'health_sync_enabled') THEN
    ALTER TABLE user_profiles ADD COLUMN health_sync_enabled BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user_profiles' AND column_name = 'last_health_sync') THEN
    ALTER TABLE user_profiles ADD COLUMN last_health_sync TIMESTAMP NULL;
  END IF;
END $$;