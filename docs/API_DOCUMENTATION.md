# FitAI API Documentation

## Base URL
- **Local**: `http://localhost:8787`
- **Production**: `https://fitai-api.your-domain.com`

## Authentication
All protected endpoints require authentication using Clerk JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📱 Users Module

### GET /api/v1/users/me
**Description**: Get current user profile with statistics  
**Auth**: Required  
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "clerkUserId": "clerk_abc",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "premium",
    "role": "user",
    "profile": {
      "goals": ["muscle_gain", "strength"],
      "experienceLevel": "intermediate",
      "availableDays": 4,
      "height": 175,
      "weight": 70,
      "age": 25,
      "equipment": ["dumbbell", "barbell"],
      "workoutLocation": "gym",
      "injuries": []
    },
    "stats": {
      "workoutsCompleted": 45,
      "currentStreak": 7,
      "prsSet": 12
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

### PUT /api/v1/users/me
**Description**: Update user profile  
**Auth**: Required  
**Request Body**:
```json
{
  "name": "John Doe Updated",
  "profile": {
    "goals": ["muscle_gain"],
    "experienceLevel": "advanced",
    "availableDays": 5,
    "height": 175,
    "weight": 72,
    "age": 26,
    "equipment": ["dumbbell", "barbell", "kettlebell"],
    "workoutLocation": "home",
    "injuries": ["lower_back"]
  }
}
```

### GET /api/v1/users/me/progress
**Description**: Get progress metrics  
**Auth**: Required  
**Query Parameters**:
- `period`: `last_7_days` | `last_30_days` | `last_90_days`  
**Response**:
```json
{
  "success": true,
  "data": {
    "period": "last_30_days",
    "metrics": {
      "totalWorkouts": 12,
      "avgWorkoutDuration": 65,
      "totalVolume": 8500,
      "avgRPE": "7.2",
      "consistencyScore": 85
    },
    "personalRecords": [
      {
        "exerciseId": "ex_123",
        "exerciseName": "Bench Press",
        "category": "strength",
        "recordType": "max_weight",
        "value": 100,
        "unit": "kg",
        "achievedAt": "2024-01-10T10:00:00Z"
      }
    ],
    "weeklyFrequency": {
      "target": 4,
      "actual": "3.5",
      "days": [false, true, false, true, true, false, true]
    }
  }
}
```

### PUT /api/v1/users/me/preferences
**Description**: Update user preferences  
**Auth**: Required  
**Request Body**:
```json
{
  "language": "es",
  "units": "metric",
  "notifications": {
    "workouts": true,
    "achievements": true,
    "social": false
  },
  "privacy": {
    "profileVisibility": "friends",
    "shareWorkouts": true
  }
}
```

### DELETE /api/v1/users/me
**Description**: Soft delete user account  
**Auth**: Required  

---

## 🏋️ Exercises Module

### GET /api/v1/exercises
**Description**: Get all exercises with filtering  
**Auth**: None (public)  
**Query Parameters**:
- `category`: Exercise category
- `muscle_group`: Target muscle group
- `equipment`: Required equipment
- `difficulty`: Exercise difficulty
- `limit`: Max results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "ex_123",
      "name": "Bench Press",
      "name_es": "Press de Banca",
      "category": "strength",
      "muscle_groups": ["chest", "triceps"],
      "equipment": ["barbell"],
      "difficulty": "intermediate",
      "instructions": "...",
      "instructions_es": "..."
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 250
  }
}
```

### GET /api/v1/exercises/:id
**Description**: Get specific exercise by ID  
**Auth**: None (public)

### GET /api/v1/exercises/search/:query
**Description**: Search exercises by name  
**Auth**: None (public)  
**Query Parameters**:
- `limit`: Max results (default: 20)

### GET /api/v1/exercises/meta/categories
**Description**: Get exercise categories  
**Auth**: None (public)

### GET /api/v1/exercises/meta/muscle-groups
**Description**: Get muscle groups  
**Auth**: None (public)

### GET /api/v1/exercises/meta/equipment
**Description**: Get equipment types  
**Auth**: None (public)

---

## 📋 Routines Module

### GET /api/v1/routines
**Description**: Get user's routines  
**Auth**: Required

### GET /api/v1/routines/:id
**Description**: Get specific routine with details  
**Auth**: Required

### POST /api/v1/routines
**Description**: Create new routine  
**Auth**: Required  
**Request Body**:
```json
{
  "name": "Upper Body Strength",
  "description": "Focus on chest, back, and arms",
  "difficulty": "intermediate",
  "estimatedDuration": 60,
  "targetMuscleGroups": ["chest", "back", "arms"],
  "equipmentNeeded": ["barbell", "dumbbell"],
  "isAiGenerated": false,
  "routineData": {
    "exercises": [
      {
        "exerciseId": "ex_123",
        "sets": 3,
        "reps": "8-10",
        "restSeconds": 120
      }
    ]
  }
}
```

### PUT /api/v1/routines/:id
**Description**: Update routine  
**Auth**: Required

### DELETE /api/v1/routines/:id
**Description**: Delete routine  
**Auth**: Required

---

## 💪 Workouts Module

### GET /api/v1/workouts/sessions
**Description**: Get user's workout sessions  
**Auth**: Required  
**Query Parameters**:
- `status`: `active` | `completed` | `paused`
- `limit`: Max results
- `offset`: Pagination offset

### POST /api/v1/workouts/sessions
**Description**: Start new workout session  
**Auth**: Required  
**Request Body**:
```json
{
  "routineId": "routine_123",
  "plannedExercises": [
    {
      "exerciseId": "ex_123",
      "plannedSets": 3,
      "plannedReps": 10,
      "plannedWeight": 50
    }
  ]
}
```

### GET /api/v1/workouts/sessions/:id
**Description**: Get specific workout session  
**Auth**: Required

### PUT /api/v1/workouts/sessions/:id
**Description**: Update workout session  
**Auth**: Required

### POST /api/v1/workouts/sessions/:id/complete
**Description**: Complete workout session  
**Auth**: Required

### POST /api/v1/workouts/sessions/:id/exercises/:exerciseId/sets
**Description**: Log exercise set  
**Auth**: Required  
**Request Body**:
```json
{
  "reps": 10,
  "weight": 50,
  "rpe": 8,
  "notes": "Felt strong today"
}
```

---

## 🤖 AI Module

### POST /api/v1/ai/generate-routine
**Description**: Generate AI routine  
**Auth**: Required  
**Request Body**:
```json
{
  "goals": ["muscle_gain"],
  "experienceLevel": "intermediate",
  "availableDays": 4,
  "sessionDuration": 60,
  "equipment": ["dumbbell", "barbell"],
  "targetMuscleGroups": ["chest", "back"],
  "preferences": {
    "workoutStyle": "strength",
    "intensity": "moderate"
  }
}
```

### POST /api/v1/ai/workout-advice
**Description**: Get workout coaching advice  
**Auth**: Required  
**Request Body**:
```json
{
  "workoutSessionId": "session_123",
  "context": "Need help with form on bench press"
}
```

---

## 💳 Payments Module

### GET /api/v1/payments/plans
**Description**: Get available subscription plans  
**Auth**: None (public)

### POST /api/v1/payments/create-preference
**Description**: Create MercadoPago payment preference  
**Auth**: Required  
**Request Body**:
```json
{
  "planId": "premium_monthly",
  "currency": "CLP"
}
```

### POST /api/v1/payments/webhook
**Description**: MercadoPago webhook handler  
**Auth**: None (webhook)

---

## 🏥 Health Module

### GET /api/v1/health/status
**Description**: Health check endpoint  
**Auth**: None (public)

### POST /api/v1/health/sync
**Description**: Sync health data from Apple Health  
**Auth**: Required  
**Request Body**:
```json
{
  "dataType": "workouts",
  "data": {
    "workouts": [
      {
        "appleHealthUuid": "uuid_123",
        "workoutType": "running",
        "startTime": "2024-01-15T08:00:00Z",
        "endTime": "2024-01-15T08:30:00Z",
        "durationMinutes": 30,
        "caloriesBurned": 250,
        "distanceKm": 5.0,
        "averageHeartRate": 150,
        "maxHeartRate": 175,
        "sourceApp": "Apple Watch",
        "metadata": {}
      }
    ]
  }
}
```

### GET /api/v1/health/metrics
**Description**: Get health metrics  
**Auth**: Required  
**Query Parameters**:
- `metricTypes`: Comma-separated metric types
- `startDate`: ISO date string
- `endDate`: ISO date string
- `limit`: Max results
- `aggregation`: `raw` | `daily` | `weekly` | `monthly`

### GET /api/v1/health/recovery
**Description**: Get recovery analysis  
**Auth**: Required

### GET /api/v1/health/healthkit/status
**Description**: Get HealthKit integration status  
**Auth**: Required

### POST /api/v1/health/healthkit/permissions
**Description**: Update HealthKit permissions  
**Auth**: Required  
**Request Body**:
```json
{
  "permissions": {
    "read": ["heart_rate", "workout", "step_count"],
    "write": ["workout"],
    "share": ["workout"]
  }
}
```

### GET /api/v1/health/dashboard/comprehensive
**Description**: Get comprehensive health dashboard  
**Auth**: Required  
**Query Parameters**:
- `period`: `week` | `month` | `quarter` | `year`
- `includeInsights`: boolean
- `includeGoals`: boolean

---

## 👥 Social Module

### GET /api/v1/social/feed
**Description**: Get social feed  
**Auth**: Required  
**Query Parameters**:
- `limit`: Max posts
- `offset`: Pagination offset

### POST /api/v1/social/posts
**Description**: Create social post  
**Auth**: Required  
**Request Body**:
```json
{
  "content": "Great workout today! 💪",
  "postType": "workout",
  "workoutSessionId": "session_123",
  "mediaUrls": ["https://example.com/image.jpg"],
  "visibility": "public"
}
```

### GET /api/v1/social/leaderboard
**Description**: Get leaderboard  
**Auth**: Required  
**Query Parameters**:
- `period`: `week` | `month` | `all_time`
- `metric`: `workouts` | `volume` | `streak`

---

## 📊 Analytics Module

### GET /api/v1/analytics/dashboard
**Description**: Get analytics dashboard  
**Auth**: Required (Admin only)

### GET /api/v1/analytics/users
**Description**: Get user analytics  
**Auth**: Required (Admin only)

---

## Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

## Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```