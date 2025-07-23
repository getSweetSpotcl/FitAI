-- Migration: Create social features and community tables
-- Description: Tables for social connections, shared content, challenges, and community features

-- User social profiles with extended information
CREATE TABLE IF NOT EXISTS user_social_profiles (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url VARCHAR(500),
  
  -- Privacy settings
  profile_public BOOLEAN DEFAULT TRUE,
  show_workouts BOOLEAN DEFAULT TRUE,
  show_stats BOOLEAN DEFAULT TRUE,
  show_achievements BOOLEAN DEFAULT TRUE,
  allow_followers BOOLEAN DEFAULT TRUE,
  allow_challenges BOOLEAN DEFAULT TRUE,
  
  -- Social stats
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  shared_routines_count INTEGER DEFAULT 0,
  likes_received INTEGER DEFAULT 0,
  
  -- Fitness level and experience
  fitness_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced, expert
  years_training DECIMAL(3,1),
  preferred_workout_types JSONB DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- Social connections (followers/following)
CREATE TABLE IF NOT EXISTS social_connections (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id VARCHAR(255) NOT NULL,
  following_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'accepted', -- pending, accepted, blocked
  connection_type VARCHAR(20) DEFAULT 'follow', -- follow, friend, mentor
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(follower_id, following_id)
);

-- Shared routines and workouts
CREATE TABLE IF NOT EXISTS shared_routines (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  routine_id VARCHAR(255), -- Reference to original routine if shared from personal collection
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
  estimated_duration INTEGER, -- minutes
  category VARCHAR(50), -- strength, cardio, flexibility, mixed
  tags JSONB DEFAULT '[]',
  
  -- Routine structure
  exercises JSONB NOT NULL, -- Array of exercise objects
  
  -- Visibility and sharing
  is_public BOOLEAN DEFAULT TRUE,
  allow_modifications BOOLEAN DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE,
  
  -- Social metrics
  likes_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Routine interactions (likes, saves, ratings)
CREATE TABLE IF NOT EXISTS routine_interactions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  routine_id VARCHAR(255) NOT NULL,
  interaction_type VARCHAR(20) NOT NULL, -- like, save, share, rate
  rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- Only for rate interactions
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (routine_id) REFERENCES shared_routines(id) ON DELETE CASCADE,
  UNIQUE(user_id, routine_id, interaction_type)
);

-- Social workout posts/shares
CREATE TABLE IF NOT EXISTS workout_posts (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  workout_session_id VARCHAR(255), -- Optional reference to completed workout
  
  -- Post content
  caption TEXT,
  workout_data JSONB, -- Snapshot of workout data for post
  media_urls JSONB DEFAULT '[]', -- Array of image/video URLs
  
  -- Post metadata
  post_type VARCHAR(20) DEFAULT 'workout', -- workout, achievement, progress, milestone
  visibility VARCHAR(20) DEFAULT 'public', -- public, followers, private
  
  -- Engagement metrics
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Post interactions (likes, comments)
CREATE TABLE IF NOT EXISTS post_interactions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  post_id VARCHAR(255) NOT NULL,
  interaction_type VARCHAR(20) NOT NULL, -- like, comment, share
  content TEXT, -- For comments
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES workout_posts(id) ON DELETE CASCADE
);

-- Challenges system
CREATE TABLE IF NOT EXISTS challenges (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id VARCHAR(255), -- NULL for system/official challenges
  
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  challenge_type VARCHAR(20) NOT NULL, -- individual, team, global
  category VARCHAR(50) NOT NULL, -- strength, endurance, consistency, volume, special
  
  -- Challenge period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  registration_end_date DATE,
  
  -- Challenge rules and requirements
  rules JSONB NOT NULL, -- Array of rule objects
  entry_requirements JSONB DEFAULT '{}', -- Minimum level, plan requirements, etc.
  
  -- Rewards and incentives
  rewards JSONB DEFAULT '[]', -- Array of reward objects
  
  -- Challenge settings
  max_participants INTEGER,
  team_size INTEGER, -- For team challenges
  is_public BOOLEAN DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE,
  
  -- Metrics
  participants_count INTEGER DEFAULT 0,
  teams_count INTEGER DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, completed, cancelled
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Challenge participation
CREATE TABLE IF NOT EXISTS challenge_participants (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  team_id VARCHAR(255), -- For team challenges
  
  -- Participation status
  status VARCHAR(20) DEFAULT 'active', -- active, completed, dropped_out, disqualified
  
  -- Progress tracking
  current_progress JSONB DEFAULT '{}', -- Current metrics/progress
  best_result DECIMAL(12,4),
  final_position INTEGER,
  
  -- Rewards earned
  rewards_earned JSONB DEFAULT '[]',
  
  joined_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(challenge_id, user_id)
);

-- Teams for team challenges
CREATE TABLE IF NOT EXISTS challenge_teams (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id VARCHAR(255) NOT NULL,
  captain_id VARCHAR(255) NOT NULL,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  team_color VARCHAR(7), -- Hex color code
  
  -- Team stats
  members_count INTEGER DEFAULT 1,
  total_progress DECIMAL(12,4) DEFAULT 0,
  team_ranking INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
  FOREIGN KEY (captain_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Community groups/forums
CREATE TABLE IF NOT EXISTS community_groups (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id VARCHAR(255) NOT NULL,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  group_type VARCHAR(20) DEFAULT 'public', -- public, private, premium_only
  category VARCHAR(50), -- general, strength, cardio, nutrition, beginners, etc.
  
  -- Group settings
  requires_approval BOOLEAN DEFAULT FALSE,
  allow_posts BOOLEAN DEFAULT TRUE,
  allow_media BOOLEAN DEFAULT TRUE,
  
  -- Group stats
  members_count INTEGER DEFAULT 1,
  posts_count INTEGER DEFAULT 0,
  
  -- Moderation
  moderators JSONB DEFAULT '[]', -- Array of user IDs
  rules TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Group membership
CREATE TABLE IF NOT EXISTS group_memberships (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  
  role VARCHAR(20) DEFAULT 'member', -- member, moderator, admin
  status VARCHAR(20) DEFAULT 'active', -- pending, active, banned
  
  joined_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (group_id) REFERENCES community_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(group_id, user_id)
);

-- Group posts/discussions
CREATE TABLE IF NOT EXISTS group_posts (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  parent_post_id VARCHAR(255), -- For replies/comments
  
  title VARCHAR(200),
  content TEXT NOT NULL,
  post_type VARCHAR(20) DEFAULT 'discussion', -- discussion, question, announcement, workout
  
  -- Media attachments
  media_urls JSONB DEFAULT '[]',
  
  -- Engagement
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  
  -- Moderation
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (group_id) REFERENCES community_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_post_id) REFERENCES group_posts(id) ON DELETE CASCADE
);

-- Social notifications
CREATE TABLE IF NOT EXISTS social_notifications (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- Recipient
  sender_id VARCHAR(255), -- Who triggered the notification
  
  notification_type VARCHAR(30) NOT NULL, -- follow, like, comment, challenge_invite, etc.
  title VARCHAR(200) NOT NULL,
  message TEXT,
  
  -- Related entities
  related_entity_type VARCHAR(30), -- post, routine, challenge, group
  related_entity_id VARCHAR(255),
  
  -- Notification status
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  
  -- Action data for interactive notifications
  action_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Leaderboards and rankings
CREATE TABLE IF NOT EXISTS leaderboards (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  
  board_type VARCHAR(30) NOT NULL, -- global, challenge, group, friends
  category VARCHAR(50) NOT NULL, -- volume, strength, consistency, etc.
  period VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly, all_time
  
  -- Leaderboard data
  data JSONB NOT NULL, -- Array of ranked entries
  
  -- Metadata
  total_participants INTEGER,
  last_updated TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(board_type, category, period)
);

-- Gamification: User badges and achievements
CREATE TABLE IF NOT EXISTS user_badges (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  
  badge_type VARCHAR(50) NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  badge_description TEXT,
  badge_icon VARCHAR(100),
  
  -- Badge properties
  rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  category VARCHAR(50), -- strength, endurance, social, special, etc.
  points_awarded INTEGER DEFAULT 0,
  
  -- Achievement data
  achievement_data JSONB DEFAULT '{}',
  progress_current DECIMAL(10,2),
  progress_target DECIMAL(10,2),
  
  is_displayed BOOLEAN DEFAULT TRUE,
  earned_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Social feed for personalized content
CREATE TABLE IF NOT EXISTS social_feed_items (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- Owner of the feed
  
  -- Content reference
  content_type VARCHAR(30) NOT NULL, -- post, routine, achievement, challenge, etc.
  content_id VARCHAR(255) NOT NULL,
  content_data JSONB, -- Cached content for faster loading
  
  -- Feed metadata
  priority_score DECIMAL(5,2) DEFAULT 1.0,
  relevance_score DECIMAL(5,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- TTL for feed items
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_feed_user_priority (user_id, priority_score DESC, created_at DESC)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_profiles_display_name ON user_social_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_social_connections_follower ON social_connections(follower_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_following ON social_connections(following_id);
CREATE INDEX IF NOT EXISTS idx_shared_routines_user ON shared_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_routines_public ON shared_routines(is_public, created_at DESC) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_shared_routines_featured ON shared_routines(featured, likes_count DESC) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_routine_interactions_routine ON routine_interactions(routine_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_workout_posts_user ON workout_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_posts_visibility ON workout_posts(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_interactions_post ON post_interactions(post_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status, start_date);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category, status);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id, status);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON group_memberships(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_posts_group ON group_posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_posts_parent ON group_posts(parent_post_id) WHERE parent_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_notifications_user ON social_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id, category);
CREATE INDEX IF NOT EXISTS idx_leaderboards_type_category ON leaderboards(board_type, category, period);