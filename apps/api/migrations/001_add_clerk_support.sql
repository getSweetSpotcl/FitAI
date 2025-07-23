-- Migration: Add Clerk support to users table
-- Date: 2025-01-22
-- Description: Add clerk_user_id and update schema for Clerk integration

BEGIN;

-- Add new columns for Clerk integration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS user_role VARCHAR(50) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'clerk',
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(user_role);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Update existing users to have default auth_provider if not set
UPDATE users 
SET auth_provider = 'jwt' 
WHERE auth_provider IS NULL OR auth_provider = '';

-- Add constraint to ensure clerk_user_id is unique when not null
-- (PostgreSQL allows multiple NULL values in UNIQUE columns)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id_unique 
ON users(clerk_user_id) 
WHERE clerk_user_id IS NOT NULL;

-- Create user_profiles table if it doesn't exist (for fitness data)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  goals TEXT[],
  experience_level VARCHAR(50),
  available_days INTEGER,
  injuries TEXT[],
  height DECIMAL(5,2), -- cm
  weight DECIMAL(5,2), -- kg
  age INTEGER,
  equipment_access TEXT[], -- Available equipment
  workout_location VARCHAR(100), -- 'home', 'gym', 'outdoor'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Create exercises table if it doesn't exist
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- 'compound', 'isolation', 'cardio'
  muscle_groups TEXT[], -- ['chest', 'shoulders', 'triceps']
  equipment VARCHAR(100), -- 'barbell', 'dumbbell', 'bodyweight', 'machine'
  instructions TEXT,
  difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  video_url VARCHAR(500), -- Optional demo video
  image_url VARCHAR(500), -- Optional exercise image
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indices for exercises
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);

-- Create workout_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  routine_id UUID, -- Reference to routine that generated this workout
  name VARCHAR(255), -- Workout name
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_minutes INTEGER, -- Calculated from start/end time
  exercises JSONB, -- Array of exercises with sets/reps/weight
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- User rating of workout
  calories_burned INTEGER,
  heart_rate_avg INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indices for workout_sessions
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started_at ON workout_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_at ON workout_sessions(completed_at);

-- Create routines table if it doesn't exist
CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  routine_data JSONB, -- Complete routine structure with exercises
  is_ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT, -- Original prompt used for AI generation
  difficulty_level VARCHAR(50),
  estimated_duration INTEGER, -- Minutes
  target_muscle_groups TEXT[],
  equipment_needed TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false, -- For sharing routines
  usage_count INTEGER DEFAULT 0, -- How many times used
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indices for routines
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routines_is_ai_generated ON routines(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_routines_is_public ON routines(is_public);
CREATE INDEX IF NOT EXISTS idx_routines_last_used_at ON routines(last_used_at);

-- Create ai_usage_tracking table for cost control
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(100), -- 'generate_routine', 'coaching_advice', etc.
  tokens_used INTEGER,
  cost_usd DECIMAL(8,4), -- Cost in USD cents
  model_used VARCHAR(50), -- 'gpt-3.5-turbo', 'gpt-4', etc.
  request_data JSONB, -- Request parameters for debugging
  response_data JSONB, -- Response data for caching
  cache_hit BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indices for ai_usage_tracking
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_endpoint ON ai_usage_tracking(endpoint);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_cost ON ai_usage_tracking(cost_usd);

COMMIT;