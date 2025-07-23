-- Migration: Create advanced analytics and reporting tables
-- Description: Tables for storing analytics data, reports, and benchmarks

-- User analytics snapshots (weekly/monthly aggregations)
CREATE TABLE IF NOT EXISTS user_analytics_snapshots (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Workout metrics
  total_workouts INTEGER DEFAULT 0,
  total_workout_minutes INTEGER DEFAULT 0,
  total_volume_kg DECIMAL(10, 2) DEFAULT 0,
  avg_workout_intensity DECIMAL(3, 1) DEFAULT 0,
  total_calories_burned INTEGER DEFAULT 0,
  total_distance_km DECIMAL(8, 2) DEFAULT 0,
  
  -- Performance metrics
  strength_pr_count INTEGER DEFAULT 0, -- Personal records achieved
  endurance_improvements INTEGER DEFAULT 0,
  consistency_score DECIMAL(5, 2) DEFAULT 0, -- 0-100 scale
  
  -- Health metrics
  avg_recovery_score DECIMAL(5, 2) DEFAULT 0,
  avg_sleep_hours DECIMAL(4, 2) DEFAULT 0,
  avg_sleep_efficiency DECIMAL(5, 2) DEFAULT 0,
  avg_hrv_score DECIMAL(5, 2) DEFAULT 0,
  avg_resting_hr INTEGER DEFAULT 0,
  
  -- Body composition
  weight_change_kg DECIMAL(5, 2) DEFAULT 0,
  body_fat_change DECIMAL(5, 2) DEFAULT 0,
  muscle_mass_change DECIMAL(5, 2) DEFAULT 0,
  
  -- Goals progress
  goals_achieved INTEGER DEFAULT 0,
  goals_total INTEGER DEFAULT 0,
  goal_completion_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- Calculated scores
  overall_fitness_score DECIMAL(5, 2) DEFAULT 0, -- 0-100 composite score
  progress_velocity DECIMAL(8, 4) DEFAULT 0, -- Rate of improvement
  adherence_score DECIMAL(5, 2) DEFAULT 0, -- Plan adherence %
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, period_type, period_start)
);

-- Progress predictions table
CREATE TABLE IF NOT EXISTS progress_predictions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  prediction_type VARCHAR(50) NOT NULL, -- 'strength', 'endurance', 'weight_loss', 'body_composition'
  prediction_date DATE NOT NULL,
  predicted_value DECIMAL(10, 2) NOT NULL,
  confidence_score DECIMAL(5, 2) NOT NULL, -- 0-100
  actual_value DECIMAL(10, 2), -- Filled when achieved
  accuracy_score DECIMAL(5, 2), -- Calculated after actual vs predicted
  
  -- Model info
  model_version VARCHAR(20),
  input_data_points INTEGER,
  prediction_horizon_days INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  achieved_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Benchmark data for comparisons
CREATE TABLE IF NOT EXISTS fitness_benchmarks (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL, -- 'strength', 'endurance', 'flexibility'
  subcategory VARCHAR(100) NOT NULL, -- 'bench_press', '5k_run', 'squat'
  demographic VARCHAR(100) NOT NULL, -- 'male_25_35', 'female_18_30', etc.
  experience_level VARCHAR(20) NOT NULL, -- 'beginner', 'intermediate', 'advanced'
  
  -- Benchmark values (percentiles)
  p10_value DECIMAL(10, 2),
  p25_value DECIMAL(10, 2),
  p50_value DECIMAL(10, 2), -- Median
  p75_value DECIMAL(10, 2),
  p90_value DECIMAL(10, 2),
  p95_value DECIMAL(10, 2),
  p99_value DECIMAL(10, 2),
  
  unit VARCHAR(20), -- 'kg', 'minutes', 'reps', etc.
  sample_size INTEGER,
  last_updated DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category, subcategory, demographic, experience_level)
);

-- User reports generation table
CREATE TABLE IF NOT EXISTS user_reports (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- 'monthly', 'quarterly', 'annual', 'custom'
  report_format VARCHAR(20) NOT NULL, -- 'pdf', 'csv', 'json'
  
  -- Report parameters
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sections JSONB DEFAULT '{}', -- Which sections to include
  
  -- Generated content
  file_url VARCHAR(500), -- S3/Cloudflare R2 URL
  file_size_mb DECIMAL(8, 2),
  generation_duration_ms INTEGER,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  error_message TEXT,
  
  -- Metadata
  generated_at TIMESTAMP,
  expires_at TIMESTAMP, -- Auto-delete after X days
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Workout insights and patterns
CREATE TABLE IF NOT EXISTS workout_insights (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  insight_type VARCHAR(100) NOT NULL, -- 'pattern', 'anomaly', 'recommendation', 'achievement'
  insight_category VARCHAR(50) NOT NULL, -- 'performance', 'consistency', 'recovery', 'safety'
  
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  insight_data JSONB DEFAULT '{}', -- Supporting data and metrics
  
  -- Scoring
  importance_score INTEGER DEFAULT 50, -- 1-100, how important this insight is
  confidence_score INTEGER DEFAULT 50, -- 1-100, how confident we are
  actionable BOOLEAN DEFAULT FALSE, -- Can user act on this?
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  user_feedback VARCHAR(20), -- 'helpful', 'not_helpful', 'irrelevant'
  
  -- Timing
  detected_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- When this insight becomes stale
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance trends tracking
CREATE TABLE IF NOT EXISTS performance_trends (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  metric_name VARCHAR(100) NOT NULL, -- 'bench_press_1rm', 'squat_volume', '5k_time'
  metric_category VARCHAR(50) NOT NULL, -- 'strength', 'endurance', 'flexibility'
  
  -- Time series data (last 12 weeks)
  week_1_value DECIMAL(10, 2),
  week_2_value DECIMAL(10, 2),
  week_3_value DECIMAL(10, 2),
  week_4_value DECIMAL(10, 2),
  week_5_value DECIMAL(10, 2),
  week_6_value DECIMAL(10, 2),
  week_7_value DECIMAL(10, 2),
  week_8_value DECIMAL(10, 2),
  week_9_value DECIMAL(10, 2),
  week_10_value DECIMAL(10, 2),
  week_11_value DECIMAL(10, 2),
  week_12_value DECIMAL(10, 2),
  
  -- Trend analysis
  trend_direction VARCHAR(20), -- 'improving', 'declining', 'plateauing', 'volatile'
  trend_strength DECIMAL(5, 2), -- 0-1 correlation coefficient
  improvement_rate DECIMAL(8, 4), -- Units per week
  
  -- Statistical measures
  mean_value DECIMAL(10, 2),
  std_deviation DECIMAL(10, 2),
  min_value DECIMAL(10, 2),
  max_value DECIMAL(10, 2),
  
  last_calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, metric_name)
);

-- User achievements and milestones
CREATE TABLE IF NOT EXISTS user_achievements (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  achievement_type VARCHAR(50) NOT NULL, -- 'milestone', 'streak', 'pr', 'goal_completion'
  category VARCHAR(50) NOT NULL, -- 'strength', 'endurance', 'consistency', 'health'
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  icon_name VARCHAR(50),
  badge_color VARCHAR(20),
  
  -- Achievement data
  value_achieved DECIMAL(10, 2),
  unit VARCHAR(20),
  previous_best DECIMAL(10, 2),
  improvement_percent DECIMAL(8, 2),
  
  -- Metadata
  difficulty_level INTEGER DEFAULT 1, -- 1-5 stars
  rarity_score INTEGER DEFAULT 50, -- 1-100, how rare this achievement is
  points_awarded INTEGER DEFAULT 0,
  
  achieved_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comparative analysis results
CREATE TABLE IF NOT EXISTS user_comparisons (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  comparison_type VARCHAR(50) NOT NULL, -- 'peer_group', 'benchmark', 'historical'
  metric_name VARCHAR(100) NOT NULL,
  
  user_value DECIMAL(10, 2) NOT NULL,
  comparison_value DECIMAL(10, 2) NOT NULL,
  percentile_rank DECIMAL(5, 2), -- Where user ranks (0-100)
  
  -- Context
  comparison_group VARCHAR(100), -- 'similar_users', 'age_group', 'experience_level'
  sample_size INTEGER,
  
  calculated_at TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP, -- When this comparison expires
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_snapshots_user_period ON user_analytics_snapshots(user_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_progress_predictions_user_type ON progress_predictions(user_id, prediction_type);
CREATE INDEX IF NOT EXISTS idx_progress_predictions_date ON progress_predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_fitness_benchmarks_category ON fitness_benchmarks(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_user_reports_user_status ON user_reports(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_workout_insights_user_type ON workout_insights(user_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_workout_insights_importance ON workout_insights(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_performance_trends_user_metric ON performance_trends(user_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_achieved ON user_achievements(user_id, achieved_at);
CREATE INDEX IF NOT EXISTS idx_user_comparisons_user_metric ON user_comparisons(user_id, metric_name);