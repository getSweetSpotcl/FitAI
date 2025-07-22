// Environment Configuration
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || "http://localhost:8787",
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  VERSION: "v1",
};

// Database Configuration
export const DATABASE_CONFIG = {
  NEON_URL: process.env.DATABASE_URL || "",
  REDIS_URL: process.env.REDIS_URL || "",
  CONNECTION_POOL_SIZE: 10,
};

// AI Configuration
export const AI_CONFIG = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  DEFAULT_MODEL: "gpt-3.5-turbo",
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7,
  COST_LIMITS: {
    free: 0.5, // $0.5 per month
    premium: 5.0, // $5 per month
    pro: -1, // unlimited
  },
};

// Cache Configuration
export const CACHE_CONFIG = {
  TTL: {
    ROUTINE_TEMPLATES: 7 * 24 * 60 * 60, // 7 days
    EXERCISE_ADVICE: 24 * 60 * 60, // 24 hours
    COMMON_QUESTIONS: 30 * 24 * 60 * 60, // 30 days
    USER_SESSION: 60 * 60, // 1 hour
  },
};

// Mercado Pago Configuration
export const MERCADO_PAGO_CONFIG = {
  ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || "",
  PUBLIC_KEY: process.env.MP_PUBLIC_KEY || "",
  WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET || "",
  SUCCESS_URL: process.env.MP_SUCCESS_URL || "https://app.fitai.cl/subscription/success",
  FAILURE_URL: process.env.MP_FAILURE_URL || "https://app.fitai.cl/subscription/failure",
  PENDING_URL: process.env.MP_PENDING_URL || "https://app.fitai.cl/subscription/pending",
};

// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    price: 0,
    currency: "CLP",
    features: {
      routineGeneration: 1,
      exerciseAdvice: 5,
      progressAnalysis: 2,
      historyDays: 30,
      activeRoutines: 2,
    },
  },
  premium: {
    name: "Premium",
    price: 7990,
    priceAnnual: 71910, // 10% discount
    currency: "CLP",
    features: {
      routineGeneration: 10,
      exerciseAdvice: 50,
      progressAnalysis: 20,
      historyDays: -1, // unlimited
      activeRoutines: -1, // unlimited
      wearableIntegration: true,
      advancedAnalytics: true,
    },
  },
  pro: {
    name: "Pro",
    price: 14990,
    priceAnnual: 134910, // 10% discount
    currency: "CLP",
    features: {
      routineGeneration: -1, // unlimited
      exerciseAdvice: -1, // unlimited
      progressAnalysis: -1, // unlimited
      historyDays: -1, // unlimited
      activeRoutines: -1, // unlimited
      wearableIntegration: true,
      advancedAnalytics: true,
      gpt4Access: true,
      apiAccess: true,
      prioritySupport: true,
      exportFeatures: true,
    },
  },
};

// App Constants
export const APP_CONFIG = {
  NAME: "FitAI",
  VERSION: "1.0.0",
  BUNDLE_ID: "cl.fitai.app",
  DEEP_LINK_PREFIX: "fitai://",
  APP_STORE_URL: "https://apps.apple.com/app/fitai",
  GOOGLE_PLAY_URL: "https://play.google.com/store/apps/details?id=cl.fitai.app",
};

// Exercise Constants
export const EXERCISE_CONFIG = {
  DEFAULT_REST_TIME: {
    compound: 180, // 3 minutes
    isolation: 90, // 1.5 minutes
    cardio: 60, // 1 minute
  },
  RPE_SCALE: {
    MIN: 1,
    MAX: 10,
    DEFAULT: 7,
  },
  WEIGHT_INCREMENTS: {
    barbell: 2.5, // kg
    dumbbell: 2.5, // kg
    machine: 5, // kg
    bodyweight: 0, // no weight
  },
};

// Notification Types
export const NOTIFICATION_TYPES = {
  WORKOUT_REMINDER: "workout_reminder",
  REST_TIMER: "rest_timer",
  ACHIEVEMENT: "achievement",
  AI_INSIGHT: "ai_insight",
  SUBSCRIPTION_REMINDER: "subscription_reminder",
};

// Analytics Events
export const ANALYTICS_EVENTS = {
  // User Events
  USER_REGISTERED: "user_registered",
  USER_LOGGED_IN: "user_logged_in",
  ONBOARDING_COMPLETED: "onboarding_completed",
  
  // Workout Events
  WORKOUT_STARTED: "workout_started",
  WORKOUT_COMPLETED: "workout_completed",
  SET_COMPLETED: "set_completed",
  PR_ACHIEVED: "pr_achieved",
  
  // AI Events
  ROUTINE_GENERATED: "routine_generated",
  AI_ADVICE_REQUESTED: "ai_advice_requested",
  AI_INSIGHT_VIEWED: "ai_insight_viewed",
  
  // Subscription Events
  SUBSCRIPTION_STARTED: "subscription_started",
  SUBSCRIPTION_CANCELED: "subscription_canceled",
  PAYMENT_COMPLETED: "payment_completed",
  
  // Feature Usage
  WEARABLE_CONNECTED: "wearable_connected",
  DATA_EXPORTED: "data_exported",
  ROUTINE_SHARED: "routine_shared",
};

// Error Codes
export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  UNAUTHORIZED: "UNAUTHORIZED",
  
  // User
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS",
  
  // Subscription
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  CREDITS_EXHAUSTED: "CREDITS_EXHAUSTED",
  
  // AI
  AI_SERVICE_UNAVAILABLE: "AI_SERVICE_UNAVAILABLE",
  AI_QUOTA_EXCEEDED: "AI_QUOTA_EXCEEDED",
  
  // General
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
};

export default {
  ENV,
  API_CONFIG,
  DATABASE_CONFIG,
  AI_CONFIG,
  CACHE_CONFIG,
  MERCADO_PAGO_CONFIG,
  SUBSCRIPTION_PLANS,
  APP_CONFIG,
  EXERCISE_CONFIG,
  NOTIFICATION_TYPES,
  ANALYTICS_EVENTS,
  ERROR_CODES,
};