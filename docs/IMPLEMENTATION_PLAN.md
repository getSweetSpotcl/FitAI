# Plan Detallado de Implementación - FitAI
*Entrenador Personal Inteligente con IA*

**Fecha de creación:** Enero 2025  
**Versión:** 1.0  
**Duración estimada:** 22 semanas (5.5 meses)  
**Estado:** Listo para implementación  

---

## Resumen Ejecutivo

FitAI es una aplicación móvil de entrenamiento personal que utiliza inteligencia artificial para crear, adaptar y optimizar rutinas de gimnasio de forma personalizada. Este documento describe el plan completo de implementación dividido en 6 fases principales, desde la arquitectura base hasta el lanzamiento en app stores.

### Stack Tecnológico Principal
- **Frontend Mobile:** React Native + Expo SDK 52+ (New Architecture)
- **Backend:** Cloudflare Workers + Hono.js (Edge Computing)
- **Database:** Neon PostgreSQL (Serverless) + Upstash Redis (Cache)
- **Admin Panel:** Next.js 15 + App Router + Tailwind CSS v4
- **Monorepo:** Turborepo con Biome para linting
- **IA:** OpenAI GPT-3.5-turbo/GPT-4 con sistema de control de costos

---

## Fase 1: Setup del Proyecto y Arquitectura Base
**Duración:** Semanas 1-2  
**Objetivo:** Establecer la infraestructura completa y arquitectura del sistema

### 1.1 Configuración del Monorepo
#### Estructura del Proyecto
```
fitai/
├── apps/
│   ├── mobile/          # React Native + Expo
│   ├── admin/           # Next.js Admin Panel  
│   └── api/             # Cloudflare Workers API
├── packages/
│   ├── ui/              # Shared UI components
│   ├── types/           # TypeScript types
│   └── config/          # Shared configs
├── tools/
│   └── biome-config/    # Linting configuration
└── turbo.json
```

#### Configuración Inicial
- **Turborepo Setup:** Workspace configuration con build pipelines
- **Biome Integration:** Reemplaza ESLint + Prettier para mejor performance
- **TypeScript:** Configs compartidos para type safety across workspaces
- **Scripts de desarrollo:** Hot reload y development servers coordinados

### 1.2 Aplicación Móvil (React Native + Expo)
#### Tech Stack Mobile
```json
{
  "expo": "~52.0.0",
  "react-native": "0.76.x",
  "expo-router": "~4.0.0",
  "zustand": "^4.4.0",
  "@tamagui/core": "^1.x",
  "@gluestack-ui/themed": "^1.x", 
  "nativewind": "^4.0.0",
  "react-native-reanimated": "~3.15.0"
}
```

#### Configuración Clave
- **New Architecture:** Bridgeless mode para mejor performance
- **File-based Routing:** Expo Router para navegación type-safe
- **State Management:** Zustand para simplicity y performance
- **UI Framework:** Tamagui + Gluestack para componentes nativos
- **Styling:** NativeWind v4 para Tailwind-like classes

#### Analytics y Monitoring
- **Sentry:** Error tracking y performance monitoring
- **Mixpanel:** User analytics y event tracking
- **Expo Updates:** OTA updates para quick fixes

### 1.3 Backend API (Cloudflare Workers + Hono.js)
#### Arquitectura Edge
```typescript
// worker.ts structure
import { Hono } from 'hono'
import { cors, logger } from 'hono/middleware'

const app = new Hono()

app.use('*', cors(), logger())
app.route('/auth', authRoutes)
app.route('/users', userRoutes)  
app.route('/workouts', workoutRoutes)
app.route('/ai', aiRoutes)

export default app
```

#### Servicios Core
- **Neon PostgreSQL:** Serverless Postgres con connection pooling
- **Upstash Redis:** Edge cache con sub-millisecond latency
- **Cloudflare R2:** File storage para images y exports
- **Trigger.dev:** Background jobs para AI processing

#### API Structure
```
/api/
├── auth/
│   ├── login.ts
│   ├── register.ts  
│   └── refresh.ts
├── users/
│   ├── profile.ts
│   ├── update.ts
│   └── preferences.ts
├── workouts/
│   ├── create.ts
│   ├── list.ts
│   └── stats.ts
├── exercises/
│   ├── search.ts
│   └── details.ts
└── ai/
    ├── generate-routine.ts
    ├── analyze-progress.ts
    └── coaching-tips.ts
```

### 1.4 Panel de Administración (Next.js 15)
#### Admin Tech Stack
- **Next.js 15:** App Router con React Server Components
- **Tailwind CSS v4:** Utility-first styling con performance optimizations
- **shadcn/ui:** High-quality React components
- **Tremor:** Dashboard components y charts
- **Clerk/Supabase:** Authentication y user management

#### Core Features
- Dashboard de métricas en tiempo real
- Monitor de costos de IA
- Gestión de usuarios y suscripciones  
- Analytics de retención y conversión
- Panel de revenue y billing

---

## Fase 2: Core Features MVP
**Duración:** Semanas 3-6  
**Objetivo:** Implementar funcionalidades básicas para el MVP

### 2.1 Sistema de Autenticación

#### Mobile Authentication Flow
```typescript
// auth/AuthContext.tsx
interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => void
}
```

#### Features de Auth
- **Email/Password:** Registro y login tradicional
- **Social Auth:** Google, Apple, Facebook integration
- **JWT Tokens:** Access tokens con refresh mechanism
- **Biometric Auth:** Touch ID / Face ID para quick access
- **Session Management:** Automatic token refresh

### 2.2 Onboarding y Perfil de Usuario

#### Onboarding Wizard (3-4 pantallas)
1. **Objetivos:** Pérdida de peso, ganancia muscular, fuerza, resistencia
2. **Experiencia:** Principiante, intermedio, avanzado
3. **Disponibilidad:** Días por semana, duración sesiones
4. **Limitaciones:** Lesiones, equipamiento disponible

#### Database Schema
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  goals TEXT[], -- ['muscle_gain', 'strength', etc.]
  experience_level VARCHAR(50),
  available_days INTEGER,
  injuries TEXT[],
  height DECIMAL,
  weight DECIMAL,
  age INTEGER
);
```

### 2.3 Sistema de Ejercicios Base

#### Exercise Database Structure
```sql
CREATE TABLE exercises (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- 'compound', 'isolation'
  muscle_groups TEXT[], -- ['chest', 'shoulders', 'triceps']
  equipment VARCHAR(100), -- 'barbell', 'dumbbell', 'bodyweight'
  instructions TEXT,
  difficulty_level VARCHAR(50)
);

CREATE TABLE exercise_variations (
  id UUID PRIMARY KEY,
  base_exercise_id UUID REFERENCES exercises(id),
  variation_name VARCHAR(255),
  modifications TEXT
);
```

#### Exercise Features
- **Search y Filtros:** Por grupo muscular, equipamiento, dificultad
- **Instructions:** Step-by-step guidance
- **Variations:** Alternative exercises para equipment limitations
- **Muscle Group Mapping:** Visual representation de muscles worked

### 2.4 Registro Básico de Entrenamientos

#### Workout Logging Interface
```typescript
interface WorkoutSession {
  id: string
  userId: string
  routineId: string
  startedAt: Date
  completedAt?: Date
  exercises: WorkoutExercise[]
}

interface WorkoutExercise {
  exerciseId: string
  sets: ExerciseSet[]
  notes?: string
}

interface ExerciseSet {
  reps: number
  weight: number
  restTime?: number
  rpe?: number // Rate of Perceived Exertion
  completed: boolean
}
```

#### Core Features
- **Real-time Logging:** Sets, reps, weight con validation
- **Rest Timer:** Automatic y manual con notifications
- **Quick Notes:** Voice-to-text para observations
- **History Access:** Previous sessions para reference
- **PR Tracking:** Personal records con celebrations

---

## Fase 3: IA y Generación de Rutinas  
**Duración:** Semanas 7-10  
**Objetivo:** Implementar el sistema de IA con control de costos

### 3.1 Sistema de Control de Costos IA

#### Arquitectura Multi-Capa
```typescript
// ai-cost-control.ts
interface CacheStrategy {
  routineTemplates: {
    ttl: number // 7 days
    key: (user: UserProfile) => string
  }
  exerciseAdvice: {
    ttl: number // 24 hours  
    key: (exercise: string) => string
  }
  commonQuestions: {
    ttl: number // 30 days
    key: (question: string) => string
  }
}

class AIResourceManager {
  async checkAndConsume(userId: string, action: AIAction): Promise<boolean>
  async getCachedResponse(key: string): Promise<any>
  async cacheResponse(key: string, data: any, ttl: number): Promise<void>
}
```

#### Cost Control Layers
1. **Redis Cache Layer:** Intelligent caching con variable TTL
2. **Rule Engine Layer:** Logic-based responses para simple queries
3. **Credit System Layer:** Monthly limits por user tier
4. **Model Router Layer:** Optimal model selection based on complexity

#### Credit System por Plan
```typescript
const PLAN_LIMITS = {
  free: {
    routineGeneration: 1,
    exerciseAdvice: 5, 
    progressAnalysis: 2
  },
  premium: {
    routineGeneration: 10,
    exerciseAdvice: 50,
    progressAnalysis: 20
  },
  pro: {
    routineGeneration: 'unlimited',
    exerciseAdvice: 'unlimited', 
    progressAnalysis: 'unlimited'
  }
}
```

### 3.2 Generación de Rutinas con IA

#### Prompt Engineering
```typescript
const ROUTINE_PROMPTS = {
  systemPrompt: `You are an expert personal trainer. Generate workout routines in JSON format.
    Format: {exercises: [{name, sets, reps, rest, notes}]}
    Maximum 6 exercises per session. Be concise and specific.`,
  
  buildUserPrompt: (profile: UserProfile) => `
    Experience: ${profile.experienceLevel}
    Goals: ${profile.goals.join(', ')}  
    Available days: ${profile.availableDays}
    Equipment: ${profile.availableEquipment}
    Limitations: ${profile.injuries || 'None'}
    
    Generate a weekly routine.`
}
```

#### Template System
- **Push/Pull/Legs:** 3-6 day split
- **Upper/Lower:** 2-4 day split  
- **Full Body:** 2-3 day split
- **Hybrid:** Gym + sport-specific training
- **Custom:** AI-generated based on unique requirements

### 3.3 Análisis Básico y Progreso

#### Progress Analytics
```typescript
interface ProgressMetrics {
  volumeProgression: WeeklyVolume[]
  strengthGains: PRProgression[]
  consistencyMetrics: WorkoutFrequency
  muscleGroupBalance: MuscleGroupVolume[]
}

class ProgressAnalyzer {
  calculateVolumeProgression(workouts: Workout[]): WeeklyVolume[]
  detectPlateaus(exerciseHistory: ExerciseHistory): PlateauAnalysis
  generateInsights(metrics: ProgressMetrics): AIInsight[]
}
```

#### Chart Library Integration
- **Victory Native:** Para mobile charts con animations
- **Recharts:** Para admin dashboard
- **Custom Indicators:** Progress bars, streak counters, PR celebrations

---

## Fase 4: Funciones Premium y Monetización
**Duración:** Semanas 11-14  
**Objetivo:** Implementar sistema de pagos y features premium

### 4.1 Sistema de Suscripciones - Mercado Pago Chile

#### Payment Integration
```typescript
// payments/mercadopago.ts
import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 }
})

export async function createSubscription(userId: string, plan: PlanType) {
  const preference = new Preference(client)
  
  const subscriptionData = {
    items: [{
      title: `FitAI Premium - ${plan}`,
      unit_price: plan === 'monthly' ? 7990 : 71910,
      quantity: 1,
      currency_id: 'CLP'
    }],
    back_urls: {
      success: 'https://app.fitai.cl/subscription/success',
      failure: 'https://app.fitai.cl/subscription/failure'
    },
    external_reference: userId
  }
  
  return await preference.create({ body: subscriptionData })
}
```

#### Subscription Management
- **Plan Tiers:** Free, Premium ($7,990 CLP), Pro ($14,990 CLP)
- **Billing Cycle:** Monthly/Annual con 25% discount anual
- **Payment Methods:** Credit/debit cards, bank transfers
- **Webhooks:** Automatic subscription status updates
- **Dunning Management:** Failed payment recovery

### 4.2 Premium Features Implementation

#### Advanced AI Features
```typescript
interface PremiumAIFeatures {
  unlimitedRoutineGeneration: boolean
  advancedProgressAnalysis: boolean
  predictiveLoadManagement: boolean
  exerciseFormFeedback: boolean
  personalizedRecoveryAdvice: boolean
}

class PremiumAIService extends BaseAIService {
  async generateAdvancedRoutine(profile: UserProfile): Promise<AdvancedRoutine>
  async analyzeFatiguePatterns(workoutHistory: Workout[]): Promise<FatigueAnalysis>
  async predictOptimalLoadProgression(exerciseHistory: ExerciseHistory): Promise<LoadRecommendation>
}
```

#### Premium UI Components
- **Enhanced Dashboards:** Advanced charts y analytics
- **AI Coaching Chat:** Real-time conversation interface
- **Export Features:** PDF reports, CSV data
- **Priority Support:** In-app chat y email

### 4.3 Wearables Integration (Apple Watch MVP)

#### HealthKit Integration
```typescript
// health/HealthKitManager.ts
import HealthKit from '@react-native-community/healthkit'

class HealthKitManager {
  async requestPermissions(): Promise<boolean>
  async readHeartRate(startDate: Date, endDate: Date): Promise<HeartRateData[]>
  async readActiveEnergyBurned(date: Date): Promise<number>
  async writeWorkout(workout: WorkoutSession): Promise<void>
}
```

#### Apple Watch Features
- **Heart Rate Monitoring:** Real-time HR durante workouts
- **Calorie Tracking:** Active energy expenditure
- **Workout Detection:** Automatic exercise recognition
- **Rest Timer:** Complications para quick access

---

## Fase 5: Análisis Avanzado y Optimizaciones
**Duración:** Semanas 15-18  
**Objetivo:** Advanced analytics y performance optimizations

### 5.1 Advanced Analytics Engine

#### Machine Learning Models
```typescript
interface MLPredictionModels {
  plateauDetection: PlateauPredictor
  oneRepMaxEstimation: OneRMPredictor  
  injuryRiskAssessment: InjuryRiskModel
  optimalVolumeCalculation: VolumeOptimizer
}

class AdvancedAnalytics {
  async detectTrainingPlateaus(history: WorkoutHistory): Promise<PlateauPrediction>
  async calculateOptimalVolume(user: UserProfile): Promise<VolumeRecommendation>
  async assessInjuryRisk(patterns: MovementPattern[]): Promise<RiskAssessment>
}
```

#### Fatigue Management System
- **Load Monitoring:** TSS (Training Stress Score) calculation
- **Recovery Tracking:** HRV integration cuando available
- **Deload Recommendations:** Automatic periodization
- **Overtraining Prevention:** Early warning signals

### 5.2 Performance Optimizations

#### Mobile App Optimizations
- **Bundle Size:** Code splitting y lazy loading
- **Memory Usage:** Efficient state management y cleanup
- **Battery Life:** Background processing optimization
- **Offline Support:** Critical features working sin internet

#### Backend Optimizations  
- **Database Query Optimization:** Indexed queries y efficient joins
- **Cache Strategy:** Multi-level caching con intelligent invalidation
- **Edge Computing:** Global distribution para low latency
- **API Rate Limiting:** Protection contra abuse

### 5.3 Advanced Recommendations Engine

#### Personalization Algorithms
```typescript
class RecommendationEngine {
  async generateExerciseSubstitutions(
    originalExercise: Exercise, 
    userConstraints: Constraint[]
  ): Promise<Exercise[]>
  
  async optimizeWorkoutTiming(
    userSchedule: Schedule,
    performanceData: PerformanceHistory
  ): Promise<OptimalSchedule>
  
  async recommendDeloadWeek(
    fatigueMarkers: FatigueData
  ): Promise<DeloadRecommendation>
}
```

---

## Fase 6: Features Sociales y Lanzamiento  
**Duración:** Semanas 19-22  
**Objetivo:** Social features y preparación para app store launch

### 6.1 Social Features Implementation

#### Social Database Schema
```sql
CREATE TABLE user_connections (
  id UUID PRIMARY KEY,
  follower_id UUID REFERENCES users(id),
  following_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shared_routines (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES users(id),
  routine_data JSONB,
  public BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  achievement_type VARCHAR(100),
  earned_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

#### Social Features
- **Routine Sharing:** Public routine marketplace
- **Achievement System:** Badges y milestones
- **Leaderboards:** Weekly/monthly challenges
- **Friend Challenges:** Private competitions
- **Success Stories:** User testimonials y progress photos

### 6.2 App Store Preparation

#### iOS App Store Optimization
- **App Store Connect:** Complete app metadata
- **Screenshots:** Professional screenshots across device sizes
- **App Preview Video:** Compelling demo video
- **Keywords Optimization:** ASO research y implementation
- **App Store Review:** Preparation para review process

#### Marketing Assets
- **Landing Page:** Conversion-optimized website
- **Press Kit:** Media assets y company information  
- **Influencer Kit:** Partnership materials
- **Launch Campaign:** PR y social media strategy

### 6.3 Launch Readiness

#### Technical Preparation
```typescript
// monitoring/LaunchChecklist.ts
interface LaunchChecklist {
  performanceTesting: {
    loadTesting: boolean
    stressTesting: boolean
    enduranceTesting: boolean
  }
  security: {
    penetrationTesting: boolean
    dataEncryption: boolean
    apiSecurity: boolean
  }
  monitoring: {
    errorTracking: boolean
    performanceMonitoring: boolean
    userAnalytics: boolean
  }
}
```

#### Go-to-Market Strategy
- **Beta Testing:** 500 selected users feedback
- **Soft Launch:** Chile market first
- **PR Campaign:** Tech y fitness media outreach
- **Influencer Partnerships:** Fitness personalities collaboration
- **Paid Acquisition:** Facebook, Instagram, Google Ads

---

## Entregables por Fase

### Fase 1 Entregables
- ✅ Monorepo completamente configurado con Turborepo
- ✅ React Native app con Expo SDK 52+ running
- ✅ Cloudflare Workers API con Hono.js deployed
- ✅ Next.js admin panel con authentication
- ✅ CI/CD pipelines configurados

### Fase 2 Entregables  
- ✅ Sistema de autenticación completo (mobile + backend)
- ✅ Onboarding wizard con user profiling
- ✅ Exercise database con 200+ ejercicios
- ✅ Workout logging interface funcional
- ✅ Basic progress tracking y PRs

### Fase 3 Entregables
- ✅ AI cost control system implementado
- ✅ Routine generation con GPT-3.5-turbo
- ✅ Redis caching layer funcionando
- ✅ Credit system por user tiers
- ✅ Basic progress analytics con charts

### Fase 4 Entregables
- ✅ Mercado Pago integration completa
- ✅ Premium features differentiation
- ✅ Apple Watch integration básica
- ✅ Subscription management system
- ✅ Revenue tracking en admin panel

### Fase 5 Entregables
- ✅ Advanced ML-based analytics
- ✅ Performance optimizations implemented
- ✅ Fatigue management system
- ✅ Advanced recommendation engine
- ✅ Comprehensive testing suite

### Fase 6 Entregables
- ✅ Social features implemented
- ✅ App store assets completed
- ✅ Beta testing completed
- ✅ Launch campaign ready
- ✅ App approved y live en stores

---

## Recursos Necesarios

### Equipo Core
- **Product Manager/Founder:** Project leadership y vision
- **Senior React Native Developer:** Mobile app development
- **Backend Developer:** API y infrastructure
- **UI/UX Designer:** Design iterations y user testing
- **Data Scientist (Part-time):** ML models y analytics
- **Marketing Manager:** Go-to-market y growth

### Infrastructure Budget (Mensual)
- **Cloudflare Workers:** ~$20/month
- **Neon PostgreSQL:** ~$30/month  
- **Upstash Redis:** ~$25/month
- **OpenAI API:** ~$200-500/month (depending on usage)
- **Sentry + Analytics:** ~$50/month
- **Apple Developer + Google Play:** ~$150/year
- **Total:** ~$350-650/month

### Development Tools
- **Expo EAS Build:** Para app builds y distribution
- **Flipper:** Mobile debugging y profiling
- **Postman/Insomnia:** API testing
- **Figma:** Design collaboration
- **Linear/Jira:** Project management
- **Slack:** Team communication

---

## Timeline y Milestones

### Quarter 1 (Semanas 1-12)
- **Weeks 1-2:** Architecture setup
- **Weeks 3-6:** MVP core features
- **Weeks 7-10:** AI integration
- **Weeks 11-12:** Premium features MVP

### Quarter 2 (Semanas 13-22)  
- **Weeks 13-14:** Payments y subscriptions
- **Weeks 15-18:** Advanced analytics
- **Weeks 19-22:** Social features y launch prep

### Key Milestones
- **Week 6:** Internal MVP demo
- **Week 10:** AI features working
- **Week 14:** Payment system live
- **Week 18:** Beta testing starts
- **Week 22:** App store launch

---

## Métricas de Éxito

### Technical KPIs
- **App Performance:** < 2s startup time, < 0.1% crash rate
- **API Response:** < 200ms p95 response time
- **Uptime:** > 99.9% availability
- **AI Cost Efficiency:** < $0.50 USD per user per month

### Product KPIs
- **Onboarding:** > 80% completion rate
- **Retention:** D1 > 70%, D7 > 50%, D30 > 40%
- **Engagement:** > 3 workouts logged per user per week
- **App Store Rating:** > 4.5 stars average

### Business KPIs
- **Downloads:** 10,000 in first month
- **Conversion:** 8% free-to-paid conversion rate
- **Revenue:** $10,000 MRR by month 6
- **User Acquisition Cost:** < $10 USD per user

---

## Gestión de Riesgos

### Technical Risks
| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| AI API costs exceeding budget | Alto | Medio | Multi-layer cost control system |
| App store rejection | Alto | Bajo | Early submission y compliance review |
| Performance issues at scale | Medio | Medio | Load testing y optimization |
| Third-party API dependencies | Medio | Bajo | Fallback mechanisms y monitoring |

### Business Risks  
| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Low user adoption | Alto | Medio | Strong onboarding y value demonstration |
| Competition from established players | Alto | Alto | Focus on AI differentiation y UX |
| Chilean market limitations | Medio | Bajo | Expansion plan to LATAM markets |
| Economic downturn affecting subscriptions | Medio | Medio | Flexible pricing y free tier value |

### Operational Risks
| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Key team member departure | Alto | Bajo | Documentation y knowledge sharing |
| Budget overruns | Medio | Medio | Strict cost monitoring y controls |
| Timeline delays | Medio | Medio | Agile methodology y buffer time |

---

## Conclusión

Este plan de implementación proporciona una roadmap detallada para desarrollar FitAI desde cero hasta el lanzamiento en 22 semanas. La arquitectura basada en Cloudflare Edge computing y React Native asegura escalabilidad global mientras mantiene costos controlados.

El sistema de control de costos de IA es crítico para la viabilidad del modelo freemium, y las 6 fases están diseñadas para permitir validación temprana y ajustes basados en feedback de usuarios.

**Próximos pasos:**
1. ✅ Confirmar equipo y recursos
2. ✅ Setup inicial de repositories y environments  
3. ✅ Comenzar Fase 1: Architecture setup
4. ✅ Establecer ritmo de desarrollo y reviews semanales

---

*Documento actualizado por última vez: Enero 2025*  
*Para preguntas o clarifications, contactar al equipo de desarrollo.*