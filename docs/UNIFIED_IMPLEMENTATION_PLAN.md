# Plan Unificado de Implementación - FitAI Backend & Dashboard
*Monorepo optimizado: Solo Dashboard Web + APIs*

**Fecha de creación:** Enero 2025  
**Versión:** 2.0 (Unificada)  
**Estado:** En ejecución - Fase 2

---

## 📋 Nueva Arquitectura (Post React Native Separation)

**Actual Monorepo** incluye únicamente:
- ✅ **Dashboard Web** (Next.js 15) - Para administradores únicamente
- ✅ **API Backend** (Cloudflare Workers + Hono.js) - APIs para consumo
- ✅ **Base de datos** (Neon PostgreSQL + Upstash Redis)

**Separado y futuro**:
- 📱 **App React Native** - Proyecto independiente que consumirá las APIs

---

## 🎯 Estado Actual vs Plan Futuro

### ✅ **YA COMPLETADO (Fase 1: Semanas 1-2)**
- Monorepo con Turborepo configurado
- Dashboard Next.js funcionando con Clerk
- API Backend desplegada en Cloudflare Workers
- Autenticación Clerk básica implementada en web dashboard
- Dashboard admin con toggle usuario/admin
- Middleware Clerk funcionando correctamente

### 🚀 **ACTUAL: Completar Backend & APIs (Fase 2: Semanas 3-6)**

#### **2.1 Completar Migración Clerk en API Backend** ⏳
- Implementar middleware Clerk en Hono.js
- Eliminar sistema JWT custom completamente
- Configurar webhooks para sincronización automática
- Actualizar todas las rutas protegidas

#### **2.2 Sistema de Base de Datos**
- Actualizar schema PostgreSQL para Clerk
- Implementar user sync via webhooks
- Crear servicios de datos para app móvil futura

#### **2.3 APIs Core para App Móvil**
- `/api/v1/auth/*` - Endpoints de autenticación
- `/api/v1/users/*` - Perfil y configuraciones
- `/api/v1/exercises/*` - Catálogo de ejercicios  
- `/api/v1/workouts/*` - Logging de entrenamientos
- `/api/v1/routines/*` - Rutinas personalizadas

### 🔮 **FASE 3: APIs Avanzadas (Semanas 7-10)**

#### **3.1 Sistema de IA con Control de Costos**
- Implementar cache Redis para respuestas IA
- Sistema de créditos por plan de usuario
- Cost control layers (cache → rules → AI)
- Rate limiting inteligente

#### **3.2 APIs Premium**
- Sistema de suscripciones (MercadoPago)
- Features premium diferenciadas
- Analytics avanzados para admin

#### **3.3 APIs de Analytics**
- Métricas de usuario para dashboard admin
- Progress tracking endpoints
- Sistema de achievements

### 🔮 **FASE 4: Funciones Premium y Monetización (Semanas 11-14)**

#### **4.1 Sistema de Suscripciones - MercadoPago Chile**
- Payment integration completa
- Plan tiers: Free, Premium ($7,990 CLP), Pro ($14,990 CLP)
- Webhooks para subscription management
- Dunning management para failed payments

#### **4.2 Premium Features Implementation**
- Advanced AI features con limits por plan
- Enhanced analytics para premium users
- Export features (PDF reports, CSV data)
- Priority support system

### 🔮 **FASE 5: Análisis Avanzado y Optimizaciones (Semanas 15-18)**

#### **5.1 Advanced Analytics Engine**
- Machine learning models para plateau detection
- Fatigue management system
- Optimal volume calculation
- Injury risk assessment

#### **5.2 Performance Optimizations**
- Database query optimization
- Multi-level caching strategy
- API rate limiting protection
- Edge computing optimization

### 🔮 **FASE 6: Preparación para Expansión (Semanas 19-22)**

#### **6.1 API Documentation & SDK**
- OpenAPI/Swagger documentation completa
- SDK para React Native app
- Developer portal para third-party integrations

#### **6.2 Monitoring & Observability**
- Comprehensive error tracking
- Performance monitoring
- User analytics dashboard
- Cost monitoring para IA usage

---

## 📁 Estructura de Archivos Final

```
fitai-backend/
├── apps/
│   ├── web/                    # Next.js Admin Dashboard
│   │   ├── app/
│   │   │   ├── (auth)/         # ✅ Clerk auth pages
│   │   │   ├── (dashboard)/    # ✅ Admin dashboard
│   │   │   └── layout.tsx      # ✅ ClerkProvider
│   │   └── middleware.ts       # ✅ Clerk middleware
│   │
│   └── api/                    # Cloudflare Workers
│       ├── src/
│       │   ├── middleware/
│       │   │   └── clerk-auth.ts     # 🔄 NUEVO: Clerk middleware
│       │   ├── routes/
│       │   │   ├── webhooks.ts       # 🔄 NUEVO: Clerk webhooks
│       │   │   ├── auth.ts           # ❌ ELIMINAR: JWT system
│       │   │   ├── users.ts          # 🔄 UPDATE: Para app móvil
│       │   │   ├── exercises.ts      # 🔄 NEW: Catálogo ejercicios
│       │   │   ├── workouts.ts       # 🔄 NEW: Logging workouts
│       │   │   ├── routines.ts       # 🔄 NEW: IA routines
│       │   │   ├── payments.ts       # 🔄 NEW: MercadoPago integration
│       │   │   └── admin.ts          # ✅ Admin endpoints
│       │   ├── db/
│       │   │   ├── user-service.ts   # 🔄 UPDATE: Clerk integration
│       │   │   ├── workout-service.ts # 🔄 NEW: Workout data
│       │   │   └── exercise-service.ts # 🔄 NEW: Exercise data
│       │   ├── lib/
│       │   │   ├── ai-service.ts     # 🔄 NEW: OpenAI integration
│       │   │   ├── cache-service.ts  # 🔄 NEW: Redis caching
│       │   │   └── payment-service.ts # 🔄 NEW: MercadoPago
│       │   └── index.ts              # 🔄 UPDATE: Clerk middleware
│       └── wrangler.toml
│
├── packages/
│   ├── types/                  # Shared TypeScript types
│   │   ├── api.ts             # API response types
│   │   ├── user.ts            # User data types
│   │   ├── workout.ts         # Workout data types
│   │   └── payment.ts         # Payment types
│   └── config/                 # Shared configs
│       ├── database.ts        # DB connection configs
│       └── api.ts             # API route configs
└── docs/
    └── UNIFIED_IMPLEMENTATION_PLAN.md  # 🆕 Este documento
```

---

## 🔧 Próximos Pasos Técnicos

### **Inmediato (Esta semana) - Fase 2.1**
1. **Completar middleware Clerk en API** ⏳
   - Instalar `@clerk/backend` en Cloudflare Workers
   - Implementar verificación de tokens JWT
   - Configurar webhooks endpoint

2. **Limpiar sistema JWT legacy**
   - Eliminar `src/routes/auth.ts`
   - Remover middleware JWT custom
   - Actualizar todas las rutas protegidas

3. **Database schema update**
   - Agregar `clerk_user_id` a tabla users
   - Implementar sincronización automática via webhooks

### **Medio plazo (Próximas 2-3 semanas) - Fase 2.2-2.3**
4. **APIs para app móvil futura**
   - Endpoints completos de usuarios, ejercicios, workouts
   - Sistema de cache con Redis
   - Rate limiting por usuario

5. **Sistema IA con control de costos**
   - Cache inteligente para respuestas IA
   - Credit system por plan de usuario
   - Cost monitoring en dashboard admin

---

## 🌐 Stack Tecnológico Final

### **Frontend (Dashboard Web)**
- **Framework**: Next.js 15 + App Router
- **Styling**: Tailwind CSS v4
- **Auth**: Clerk (admin only)
- **State**: React Server Components + Client Components
- **UI Components**: Headless UI + Custom components

### **Backend (API)**
- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js 4.8+
- **Auth**: Clerk token verification
- **Database**: Neon PostgreSQL (serverless)
- **Cache**: Upstash Redis (edge)
- **AI**: OpenAI GPT-3.5-turbo/GPT-4 con cost control

### **Database Schema**
```sql
-- Users table (extends Clerk users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  user_role VARCHAR(50) DEFAULT 'user',
  subscription_plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User profiles (fitness data)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  goals TEXT[],
  experience_level VARCHAR(50),
  available_days INTEGER,
  injuries TEXT[],
  height DECIMAL,
  weight DECIMAL,
  age INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exercises database
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  muscle_groups TEXT[],
  equipment VARCHAR(100),
  instructions TEXT,
  difficulty_level VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workout sessions
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  exercises JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 APIs Resultantes

### **Públicas (Sin Auth)**
```
GET  /                          # Health check
GET  /api/v1/exercises          # Catálogo de ejercicios
GET  /api/v1/health            # Métricas públicas
POST /api/v1/webhooks/clerk    # Webhook de sincronización
```

### **Protegidas (Token Clerk Requerido)**
```
GET  /api/v1/users/profile     # Perfil del usuario
POST /api/v1/users/profile     # Actualizar perfil
GET  /api/v1/workouts          # Entrenamientos del usuario
POST /api/v1/workouts          # Crear workout session
GET  /api/v1/routines          # Rutinas del usuario
POST /api/v1/ai/generate       # Generar rutina con IA
POST /api/v1/payments/create   # Crear suscripción
```

### **Admin Only (Role = "admin")**
```
GET  /api/v1/admin/users       # Gestionar usuarios
GET  /api/v1/admin/analytics   # Analytics globales
GET  /api/v1/admin/costs       # Monitoring de costos IA
POST /api/v1/admin/content     # Gestionar contenido
```

---

## 📊 Métricas de Éxito

### **Technical KPIs**
- **API Performance**: < 200ms p95 response time
- **Uptime**: > 99.9% availability
- **AI Cost Efficiency**: < $0.50 USD per user per month
- **Database Performance**: < 100ms query response time

### **Product KPIs (para futura app móvil)**
- **API Reliability**: > 99.5% success rate
- **Token Refresh**: < 1% failure rate
- **Webhook Processing**: > 99% success rate
- **Data Sync**: < 30s latency

### **Business KPIs**
- **API Usage**: Growing monthly API calls
- **Cost Control**: IA costs within budget
- **Admin Efficiency**: Dashboard usage metrics
- **System Scalability**: Handle growing user base

---

## 🚀 Beneficios de esta Arquitectura

✅ **Backend API-first**: App móvil puede desarrollarse independientemente  
✅ **Clerk unificado**: Mismos usuarios en web y móvil futuro  
✅ **Escalable**: Cloudflare Workers + Edge computing  
✅ **Maintainable**: Un solo sistema de auth para todo  
✅ **Cost-efficient**: IA con control de costos automático  
✅ **Developer-friendly**: APIs documentadas y consistentes  
✅ **Admin-ready**: Dashboard completo para gestión  
✅ **Future-proof**: Preparado para expansión y nuevas features

---

## 📦 **FASE 9: Testing y Optimización (COMPLETADA) ✅**

### **9.1 Framework de Testing Completo**
- ✅ Vitest configurado para API y Web
- ✅ Testing Library para componentes React
- ✅ Tests unitarios para servicios críticos (21 tests total)
- ✅ Tests de integración para endpoints
- ✅ Coverage reports configurados

### **9.2 Sistema de Logging y Monitoreo**
- ✅ Logger estructurado con niveles configurables
- ✅ Logging de HTTP requests/responses
- ✅ Logging de database queries y cache operations
- ✅ Contextual logging con metadatos

### **9.3 Seguridad y Performance**
- ✅ Rate limiting por plan de usuario (Free: 100/h, Premium: 1000/h, Pro: 5000/h)
- ✅ Protección DDoS y headers de seguridad
- ✅ Validación y sanitización de inputs
- ✅ Sistema de caché Redis con TTL configurado
- ✅ Middleware de validación robusto

---

## 🚀 **FASE 10: Deployment y Producción (REVISADO)**

### **10.1 Configuración de Dominio getfitia.com (Semana 1)**
- **Migrar API** de `fitai-api.sweetspot-627.workers.dev` → `api.getfitia.com`
- **Configurar Web** en `getfitia.com` usando Cloudflare Workers (no Pages)
- **DNS Setup** completo con subdominios
- **SSL Certificates** automáticos de Cloudflare

### **10.2 Environment Setup de Producción (Semana 1-2)**
- **Staging Environment**: `staging.getfitia.com` y `api-staging.getfitia.com`
- **Production Environment**: `getfitia.com` y `api.getfitia.com`
- **Variables de entorno** para producción configuradas
- **Health checks** y monitoring avanzado
- **Database backup** automático configurado

### **10.3 CI/CD Pipeline Completo (Semana 2)**
- **GitHub Actions** para deployment automático
- **Pre-deployment testing** automático
- **Rollback automático** en caso de fallos
- **Deployment notifications** via Slack/email
- **Branch protection** rules configuradas

### **10.4 Performance y Seguridad Avanzada (Semana 2-3)**
- **Cloudflare Pro** features activadas (Brotli, Polish, etc.)
- **Web Application Firewall (WAF)** configurado
- **Global rate limiting** de Cloudflare
- **CDN optimization** y cache tuning
- **DDoS protection** enterprise level

### **10.5 Monitoring y Analytics (Semana 3)**
- **Cloudflare Analytics** configurado
- **Error tracking** con Sentry integration
- **Real-time dashboards** para monitoring
- **Automated alerts** para downtime/errores
- **Performance metrics** tracking

### **10.6 Documentation y Operations (Semana 4)**
- **Deployment documentation** completa
- **Incident response** runbooks
- **Team training** para operations
- **Disaster recovery** procedures
- **Performance tuning** guides

---

## 📋 **Configuración Actual vs Target**

### **Current State** (Enero 2025):
```bash
# API
https://fitai-api.sweetspot-627.workers.dev

# Web (configurado para Pages)
Cloudflare Pages deployment ready

# Domain
Usando subdominios .workers.dev temporales
```

### **Target State** (Post Fase 10):
```bash
# API
https://api.getfitia.com

# Web  
https://getfitia.com

# Staging
https://api-staging.getfitia.com
https://staging.getfitia.com

# Features
- Custom domain con SSL
- WAF protection
- Global CDN
- Automated deployments
- Comprehensive monitoring
```

---

## 🎯 Siguiente Acción Inmediata

**INICIAR FASE 10**: Deployment y Producción con dominio getfitia.com
1. **Domain setup** en Cloudflare con getfitia.com
2. **API migration** a custom domain
3. **Web deployment** a Cloudflare Workers
4. **CI/CD pipeline** implementation

---

*Documento actualizado: Julio 2025*  
*Estado: Fase 9 Completada → Iniciando Fase 10*  
*Próxima revisión: Semanal*