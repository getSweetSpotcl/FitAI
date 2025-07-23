-- Migration: Update exercises table with Spanish names and additional fields
-- Date: 2025-01-23
-- Description: Add Spanish name column and other missing fields to exercises table

BEGIN;

-- Add Spanish name column
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS name_es VARCHAR(255);

-- Add additional instruction columns
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS instructions_es TEXT;

-- Update instructions column to be an array
ALTER TABLE exercises 
ALTER COLUMN instructions TYPE TEXT[] USING ARRAY[instructions];

-- Add tips and common mistakes columns
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS tips TEXT[],
ADD COLUMN IF NOT EXISTS tips_es TEXT[],
ADD COLUMN IF NOT EXISTS common_mistakes TEXT[],
ADD COLUMN IF NOT EXISTS common_mistakes_es TEXT[],
ADD COLUMN IF NOT EXISTS is_compound BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS calories_per_minute DECIMAL(5,2);

-- Change image_url to image_urls array
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Migrate existing image_url data if any
UPDATE exercises 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND image_urls IS NULL;

-- Drop the old image_url column
ALTER TABLE exercises 
DROP COLUMN IF EXISTS image_url;

-- Create exercise_categories table
CREATE TABLE IF NOT EXISTS exercise_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_es VARCHAR(100) NOT NULL,
  description TEXT,
  description_es TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default categories
INSERT INTO exercise_categories (id, name, name_es, description, description_es) VALUES
  (gen_random_uuid(), 'Strength', 'Fuerza', 'Exercises focused on building strength', 'Ejercicios enfocados en desarrollar fuerza'),
  (gen_random_uuid(), 'Hypertrophy', 'Hipertrofia', 'Exercises for muscle growth', 'Ejercicios para crecimiento muscular'),
  (gen_random_uuid(), 'Endurance', 'Resistencia', 'Exercises for muscular endurance', 'Ejercicios para resistencia muscular'),
  (gen_random_uuid(), 'Cardio', 'Cardio', 'Cardiovascular exercises', 'Ejercicios cardiovasculares'),
  (gen_random_uuid(), 'Flexibility', 'Flexibilidad', 'Stretching and mobility exercises', 'Ejercicios de estiramiento y movilidad'),
  (gen_random_uuid(), 'Power', 'Potencia', 'Explosive power exercises', 'Ejercicios de potencia explosiva')
ON CONFLICT DO NOTHING;

-- Update exercises to use category_id instead of category string
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES exercise_categories(id);

-- Create indices for Spanish name searching
CREATE INDEX IF NOT EXISTS idx_exercises_name_es ON exercises(name_es);
CREATE INDEX IF NOT EXISTS idx_exercises_name_lower ON exercises(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_exercises_name_es_lower ON exercises(LOWER(name_es));

COMMIT;