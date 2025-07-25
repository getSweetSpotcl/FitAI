export const API_CONFIG = {
  BASE_URL: 'https://api.getfitia.com',
  VERSION: '/api/v1',
  TIMEOUT: 30000,
};

export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  
  // Users
  USER_PROFILE: '/users/profile',
  UPDATE_PROFILE: '/users/profile',
  
  // Workouts
  WORKOUTS: '/workouts',
  WORKOUT_DETAIL: (id: string) => `/workouts/${id}`,
  
  // Routines
  ROUTINES: '/routines',
  ROUTINE_DETAIL: (id: string) => `/routines/${id}`,
  
  // AI
  GENERATE_ROUTINE: '/ai/generate-routine',
  AI_CHAT: '/ai/chat',
  
  // Analytics
  USER_STATS: '/analytics/user-stats',
  
  // Health
  SYNC_HEALTH: '/health/sync',
  
  // Social
  SOCIAL_FEED: '/social/feed',
  SHARE_WORKOUT: '/social/share-workout',
} as const;