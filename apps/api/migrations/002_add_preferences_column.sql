-- Migration: Add preferences column to user_profiles
-- Date: 2025-01-23
-- Description: Add JSONB preferences column for storing user preferences

BEGIN;

-- Add preferences column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Create index for better JSONB query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences 
ON user_profiles USING gin(preferences);

COMMIT;