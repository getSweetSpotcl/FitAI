// Social Features Types for FitAI

// Basic social profile information
export interface UserSocialProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  
  // Privacy settings
  profilePublic: boolean;
  showWorkouts: boolean;
  showStats: boolean;
  showAchievements: boolean;
  allowFollowers: boolean;
  allowChallenges: boolean;
  
  // Social stats
  followersCount: number;
  followingCount: number;
  sharedRoutinesCount: number;
  likesReceived: number;
  
  // Fitness info
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsTraining?: number;
  preferredWorkoutTypes: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

// Social connections between users
export interface SocialConnection {
  id: string;
  followerId: string;
  followingId: string;
  status: 'pending' | 'accepted' | 'blocked';
  connectionType: 'follow' | 'friend' | 'mentor';
  createdAt: Date;
  updatedAt: Date;
}

// Extended connection info with user details
export interface SocialConnectionWithUser extends SocialConnection {
  followerProfile?: UserSocialProfile;
  followingProfile?: UserSocialProfile;
}

// Shared workout routines
export interface SharedRoutine {
  id: string;
  userId: string;
  routineId?: string;
  
  name: string;
  description?: string;
  difficulty: number; // 1-10
  estimatedDuration?: number; // minutes
  category?: string;
  tags: string[];
  
  // Routine structure
  exercises: SharedExercise[];
  
  // Visibility
  isPublic: boolean;
  allowModifications: boolean;
  featured: boolean;
  
  // Social metrics
  likesCount: number;
  savesCount: number;
  sharesCount: number;
  downloadsCount: number;
  ratingAverage: number;
  ratingCount: number;
  
  // Creator info
  creator?: UserSocialProfile;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedExercise {
  id?: string;
  name: string;
  sets: number;
  reps: string; // Can be range like "8-12" or specific number
  weight?: number;
  rest: number; // seconds
  notes?: string;
  muscleGroups: string[];
  equipment?: string;
  instructions?: string;
}

// Routine interactions (likes, saves, ratings)
export interface RoutineInteraction {
  id: string;
  userId: string;
  routineId: string;
  interactionType: 'like' | 'save' | 'share' | 'rate';
  rating?: number; // 1-5 for ratings
  createdAt: Date;
}

// Social workout posts
export interface WorkoutPost {
  id: string;
  userId: string;
  workoutSessionId?: string;
  
  caption?: string;
  workoutData?: any; // Workout snapshot
  mediaUrls: string[];
  
  postType: 'workout' | 'achievement' | 'progress' | 'milestone';
  visibility: 'public' | 'followers' | 'private';
  
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  
  // User info
  author?: UserSocialProfile;
  
  createdAt: Date;
  updatedAt: Date;
}

// Post interactions (likes, comments, shares)
export interface PostInteraction {
  id: string;
  userId: string;
  postId: string;
  interactionType: 'like' | 'comment' | 'share';
  content?: string; // For comments
  createdAt: Date;
  updatedAt: Date;
  
  // User info for display
  user?: UserSocialProfile;
}

// Challenge system
export interface Challenge {
  id: string;
  creatorId?: string;
  
  name: string;
  description: string;
  challengeType: 'individual' | 'team' | 'global';
  category: 'strength' | 'endurance' | 'consistency' | 'volume' | 'special';
  
  startDate: Date;
  endDate: Date;
  registrationEndDate?: Date;
  
  rules: ChallengeRule[];
  entryRequirements: Record<string, any>;
  rewards: ChallengeReward[];
  
  maxParticipants?: number;
  teamSize?: number;
  isPublic: boolean;
  featured: boolean;
  
  participantsCount: number;
  teamsCount: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  
  // Creator info
  creator?: UserSocialProfile;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ChallengeRule {
  parameter: string; // What to measure (e.g., 'workout_days', 'total_volume')
  condition: 'min' | 'max' | 'exact'; // How to evaluate
  target: number; // Target value
  unit: string; // Unit of measurement
  description?: string;
}

export interface ChallengeReward {
  position: 'winner' | 'top3' | 'top10' | 'top50' | 'participant';
  type: 'achievement' | 'premium_time' | 'discount' | 'badge' | 'points';
  value: string;
  description?: string;
}

// Challenge participation
export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  teamId?: string;
  
  status: 'active' | 'completed' | 'dropped_out' | 'disqualified';
  
  currentProgress: Record<string, any>;
  bestResult?: number;
  finalPosition?: number;
  rewardsEarned: ChallengeReward[];
  
  joinedAt: Date;
  completedAt?: Date;
  updatedAt: Date;
  
  // User info
  participant?: UserSocialProfile;
}

// Challenge teams
export interface ChallengeTeam {
  id: string;
  challengeId: string;
  captainId: string;
  
  name: string;
  description?: string;
  teamColor?: string;
  
  membersCount: number;
  totalProgress: number;
  teamRanking?: number;
  
  // Members info
  captain?: UserSocialProfile;
  members?: UserSocialProfile[];
  
  createdAt: Date;
  updatedAt: Date;
}

// Community groups
export interface CommunityGroup {
  id: string;
  creatorId: string;
  
  name: string;
  description?: string;
  groupType: 'public' | 'private' | 'premium_only';
  category?: string;
  
  requiresApproval: boolean;
  allowPosts: boolean;
  allowMedia: boolean;
  
  membersCount: number;
  postsCount: number;
  
  moderators: string[]; // User IDs
  rules?: string;
  
  // Creator info
  creator?: UserSocialProfile;
  
  createdAt: Date;
  updatedAt: Date;
}

// Group membership
export interface GroupMembership {
  id: string;
  groupId: string;
  userId: string;
  
  role: 'member' | 'moderator' | 'admin';
  status: 'pending' | 'active' | 'banned';
  
  joinedAt: Date;
  updatedAt: Date;
  
  // User and group info
  user?: UserSocialProfile;
  group?: CommunityGroup;
}

// Group posts/discussions
export interface GroupPost {
  id: string;
  groupId: string;
  userId: string;
  parentPostId?: string; // For replies
  
  title?: string;
  content: string;
  postType: 'discussion' | 'question' | 'announcement' | 'workout';
  
  mediaUrls: string[];
  
  likesCount: number;
  repliesCount: number;
  
  isPinned: boolean;
  isLocked: boolean;
  isHidden: boolean;
  
  // User and group info
  author?: UserSocialProfile;
  group?: CommunityGroup;
  replies?: GroupPost[];
  
  createdAt: Date;
  updatedAt: Date;
}

// Social notifications
export interface SocialNotification {
  id: string;
  userId: string; // Recipient
  senderId?: string; // Who triggered it
  
  notificationType: string;
  title: string;
  message?: string;
  
  relatedEntityType?: string; // post, routine, challenge, group
  relatedEntityId?: string;
  
  isRead: boolean;
  isDismissed: boolean;
  
  actionData: Record<string, any>; // Data for interactive notifications
  
  // Sender info
  sender?: UserSocialProfile;
  
  createdAt: Date;
  readAt?: Date;
}

// Leaderboards
export interface Leaderboard {
  id: string;
  boardType: 'global' | 'challenge' | 'group' | 'friends';
  category: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  
  data: LeaderboardEntry[];
  totalParticipants: number;
  
  lastUpdated: Date;
  validUntil?: Date;
  createdAt: Date;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  user?: UserSocialProfile;
  value: number;
  unit?: string;
  change?: string; // Position change from previous period
  
  // Additional data for specific contexts
  teamId?: string;
  team?: ChallengeTeam;
}

// User badges and achievements
export interface UserBadge {
  id: string;
  userId: string;
  
  badgeType: string;
  badgeName: string;
  badgeDescription?: string;
  badgeIcon?: string;
  
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category?: string;
  pointsAwarded: number;
  
  achievementData: Record<string, any>;
  progressCurrent?: number;
  progressTarget?: number;
  
  isDisplayed: boolean;
  earnedAt: Date;
}

// Social feed items
export interface SocialFeedItem {
  id: string;
  userId: string;
  
  contentType: string; // post, routine, achievement, challenge, etc.
  contentId: string;
  contentData?: any; // Cached content
  
  priorityScore: number;
  relevanceScore: number;
  
  createdAt: Date;
  expiresAt: Date;
}

// API Request/Response types
export interface CreateSharedRoutineRequest {
  name: string;
  description?: string;
  difficulty: number;
  estimatedDuration?: number;
  category?: string;
  tags: string[];
  exercises: SharedExercise[];
  isPublic: boolean;
  allowModifications: boolean;
}

export interface CreateWorkoutPostRequest {
  caption?: string;
  workoutSessionId?: string;
  workoutData?: any;
  mediaUrls?: string[];
  postType: 'workout' | 'achievement' | 'progress' | 'milestone';
  visibility: 'public' | 'followers' | 'private';
}

export interface UpdateSocialProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsTraining?: number;
  preferredWorkoutTypes?: string[];
  privacy?: {
    profilePublic?: boolean;
    showWorkouts?: boolean;
    showStats?: boolean;
    showAchievements?: boolean;
    allowFollowers?: boolean;
    allowChallenges?: boolean;
  };
}

export interface CreateChallengeRequest {
  name: string;
  description: string;
  challengeType: 'individual' | 'team' | 'global';
  category: 'strength' | 'endurance' | 'consistency' | 'volume' | 'special';
  startDate: Date;
  endDate: Date;
  registrationEndDate?: Date;
  rules: ChallengeRule[];
  entryRequirements?: Record<string, any>;
  rewards: ChallengeReward[];
  maxParticipants?: number;
  teamSize?: number;
  isPublic: boolean;
}

export interface CreateCommunityGroupRequest {
  name: string;
  description?: string;
  groupType: 'public' | 'private' | 'premium_only';
  category?: string;
  requiresApproval: boolean;
  allowPosts: boolean;
  allowMedia: boolean;
  rules?: string;
}

export interface CreateGroupPostRequest {
  title?: string;
  content: string;
  postType: 'discussion' | 'question' | 'announcement' | 'workout';
  mediaUrls?: string[];
  parentPostId?: string; // For replies
}

// Query parameters for various endpoints
export interface SocialFeedQuery {
  page?: number;
  limit?: number;
  feedType?: 'all' | 'following' | 'groups' | 'challenges';
  contentTypes?: string[]; // Filter by content types
}

export interface SharedRoutinesQuery {
  page?: number;
  limit?: number;
  category?: string;
  difficulty?: number;
  tags?: string[];
  sortBy?: 'recent' | 'popular' | 'rating';
  userId?: string; // Filter by specific user
}

export interface ChallengesQuery {
  page?: number;
  limit?: number;
  status?: 'active' | 'upcoming' | 'completed';
  category?: string;
  challengeType?: 'individual' | 'team' | 'global';
  participating?: boolean; // Show only challenges user is participating in
}

export interface LeaderboardQuery {
  boardType?: 'global' | 'challenge' | 'group' | 'friends';
  category: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  challengeId?: string; // For challenge-specific leaderboards
  groupId?: string; // For group-specific leaderboards
  limit?: number;
}

// Response wrapper types
export interface SocialResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedSocialResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message?: string;
}

// Social stats aggregation
export interface SocialStats {
  totalUsers: number;
  activeUsers: number; // Last 30 days
  totalConnections: number;
  totalSharedRoutines: number;
  totalWorkoutPosts: number;
  activeChallenges: number;
  totalCommunityGroups: number;
  
  // Engagement metrics
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  avgSavesPerRoutine: number;
  
  // Growth metrics
  newUsersThisWeek: number;
  newConnectionsThisWeek: number;
  newPostsThisWeek: number;
}

// All types are already exported inline above