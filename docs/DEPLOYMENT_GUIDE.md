# FitAI - Guía Completa de Configuración y Despliegue

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Servicios Externos](#configuración-de-servicios-externos)
3. [Configuración del Backend](#configuración-del-backend)
4. [Configuración de la App Móvil](#configuración-de-la-app-móvil)
5. [Variables de Entorno](#variables-de-entorno)
6. [Despliegue en Cloudflare](#despliegue-en-cloudflare)
7. [Configuración de Base de Datos](#configuración-de-base-de-datos)
8. [Testing y Validación](#testing-y-validación)
9. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)

## 🔧 Requisitos Previos

### Herramientas de Desarrollo
```bash
# Node.js (versión 18+)
node --version # debe ser 18.x o superior
npm --version

# Expo CLI
npm install -g @expo/cli

# Wrangler CLI para Cloudflare
npm install -g wrangler

# Git
git --version
```

### Cuentas y Servicios Necesarios
- [ ] **GitHub Account**: Para el código fuente
- [ ] **Apple Developer Account**: $99/año para iOS
- [ ] **Cloudflare Account**: Para backend y CDN
- [ ] **Neon Database Account**: Para PostgreSQL
- [ ] **Upstash Account**: Para Redis
- [ ] **OpenAI Account**: Para funciones de IA
- [ ] **MercadoPago Developer Account**: Para pagos en Chile
- [ ] **App Store Connect Account**: Para publicación iOS

## ⚙️ Configuración de Servicios Externos

### 1. Neon Database (PostgreSQL)

#### Paso 1: Crear cuenta y proyecto
```bash
# 1. Ir a https://neon.tech
# 2. Crear cuenta gratuita
# 3. Crear nuevo proyecto "FitAI"
# 4. Seleccionar región más cercana (us-east-1 recomendado)
```

#### Paso 2: Configurar base de datos
```sql
-- Ejecutar estos comandos en la consola SQL de Neon:

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear tabla de usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de ejercicios
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  muscle_groups TEXT[] NOT NULL,
  equipment TEXT[] DEFAULT '{}',
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 10),
  category VARCHAR(50),
  instructions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de rutinas
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de entrenamientos
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES routines(id),
  name VARCHAR(200) NOT NULL,
  exercises JSONB NOT NULL,
  duration INTEGER, -- en minutos
  notes TEXT,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para rendimiento
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_routines_user_id ON routines(user_id);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_completed_at ON workouts(completed_at);

-- Insertar datos de ejemplo de ejercicios
INSERT INTO exercises (name, description, muscle_groups, equipment, difficulty, category, instructions) VALUES
('Press de Banca', 'Ejercicio compuesto para pecho, hombros y tríceps', ARRAY['chest', 'shoulders', 'triceps'], ARRAY['barbell', 'bench'], 6, 'strength', ARRAY['Acuéstate en el banco', 'Agarra la barra con las manos separadas', 'Baja controladamente al pecho', 'Empuja hacia arriba explosivamente']),
('Sentadilla', 'Ejercicio fundamental para piernas y glúteos', ARRAY['legs', 'glutes'], ARRAY['barbell', 'rack'], 7, 'strength', ARRAY['Posiciona la barra en la espalda alta', 'Separa los pies al ancho de hombros', 'Baja manteniendo la espalda recta', 'Sube empujando con los talones']),
('Peso Muerto', 'Ejercicio compuesto para cadena posterior', ARRAY['back', 'legs', 'glutes'], ARRAY['barbell'], 8, 'strength', ARRAY['Posiciona los pies al ancho de cadera', 'Agarra la barra con las manos separadas', 'Mantén la espalda recta y pecho arriba', 'Levanta empujando con las piernas']);
```

#### Paso 3: Obtener string de conexión
```bash
# En el dashboard de Neon, ir a "Connection Details"
# Copiar la "Connection string" que se ve así:
# postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 2. Upstash Redis

#### Paso 1: Crear cuenta y base de datos
```bash
# 1. Ir a https://upstash.com
# 2. Crear cuenta gratuita
# 3. Crear nueva base de datos Redis
# 4. Seleccionar región más cercana (us-east-1)
# 5. Nombrar como "fitai-cache"
```

#### Paso 2: Obtener credenciales
```bash
# En el dashboard de Upstash, copiar:
# UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
# UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### 3. OpenAI API

#### Configuración
```bash
# 1. Ir a https://platform.openai.com
# 2. Crear cuenta y agregar método de pago
# 3. Ir a "API Keys" y crear nueva key
# 4. Configurar límites de uso mensual (recomendado: $50/mes inicial)
```

### 4. MercadoPago (Pagos Chile)

#### Paso 1: Crear cuenta de desarrollador
```bash
# 1. Ir a https://www.mercadopago.cl/developers
# 2. Crear cuenta de desarrollador
# 3. Crear nueva aplicación "FitAI"
# 4. Configurar dominios permitidos
```

#### Paso 2: Obtener credenciales
```bash
# En el dashboard de MercadoPago, obtener:
# - Public Key (pk_test_xxx para testing)
# - Access Token (TEST-xxx para testing)
# - Para producción: usar las credenciales live
```

### 5. Cloudflare Workers

#### Paso 1: Configurar cuenta
```bash
# 1. Crear cuenta en https://cloudflare.com
# 2. Ir a Workers & Pages
# 3. Configurar subdominio workers (ej: fitai.your-username.workers.dev)
```

#### Paso 2: Configurar CLI
```bash
# Instalar Wrangler CLI
npm install -g wrangler

# Login a Cloudflare
wrangler login

# Verificar configuración
wrangler whoami
```

## 🖥️ Configuración del Backend

### Paso 1: Preparar el proyecto
```bash
# Clonar repositorio
git clone <your-repo-url>
cd FitAI

# Instalar dependencias
npm install

# Navegar al backend
cd apps/api
```

### Paso 2: Configurar wrangler.toml
```toml
# apps/api/wrangler.toml
name = "fitai-api"
main = "src/index.ts"
compatibility_date = "2024-01-15"

[vars]
ENVIRONMENT = "production"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"

[env.development]
name = "fitai-api-dev"
vars = { ENVIRONMENT = "development" }

[env.staging]
name = "fitai-api-staging"
vars = { ENVIRONMENT = "staging" }
```

### Paso 3: Configurar variables de entorno
```bash
# Configurar secretos en Cloudflare Workers
wrangler secret put DATABASE_URL
# Pegar la URL de conexión de Neon

wrangler secret put REDIS_URL
# Pegar la URL de Upstash Redis

wrangler secret put OPENAI_API_KEY
# Pegar la API key de OpenAI

wrangler secret put JWT_SECRET
# Generar un JWT secret fuerte: openssl rand -base64 32

wrangler secret put MERCADOPAGO_ACCESS_TOKEN
# Pegar el access token de MercadoPago
```

### Paso 4: Crear KV Namespace
```bash
# Crear namespace para cache
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "CACHE" --preview

# Actualizar wrangler.toml con los IDs generados
```

### Paso 5: Desplegar backend
```bash
# Desarrollo
wrangler deploy --env development

# Staging
wrangler deploy --env staging

# Producción
wrangler deploy
```

## 📱 Configuración de la App Móvil

### Paso 1: Configurar proyecto Expo
```bash
# Navegar a la app móvil
cd ../mobile

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
```

### Paso 2: Configurar .env.local
```bash
# apps/mobile/.env.local
EXPO_PUBLIC_API_URL=https://fitai-api.your-username.workers.dev
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_APP_NAME=FitAI
```

### Paso 3: Configurar app.json
```json
{
  "expo": {
    "name": "FitAI",
    "slug": "fitai-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "fitai",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#111827"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "cl.fitai.app",
      "buildNumber": "1",
      "infoPlist": {
        "NSHealthShareUsageDescription": "FitAI usa HealthKit para sincronizar tus datos de entrenamiento y salud.",
        "NSHealthUpdateUsageDescription": "FitAI puede actualizar tus datos de actividad física en HealthKit."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#111827"
      },
      "package": "cl.fitai.app"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-apple-authentication",
      [
        "expo-build-properties",
        {
          "ios": {
            "newArchEnabled": true
          }
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### Paso 4: Configurar Apple Developer
```bash
# 1. Tener Apple Developer Account activa
# 2. Configurar Bundle ID: cl.fitai.app
# 3. Habilitar HealthKit capability
# 4. Crear App Store Connect app
```

## 🔑 Variables de Entorno Completas

### Backend (Cloudflare Workers)
```bash
# Base de datos
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# Cache Redis
REDIS_URL=https://xxx.upstash.io
REDIS_TOKEN=your-upstash-token

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# JWT
JWT_SECRET=your-super-secret-jwt-key

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=TEST-your-mp-token

# Environment
ENVIRONMENT=production
```

### Frontend (React Native)
```bash
# API
EXPO_PUBLIC_API_URL=https://fitai-api.your-username.workers.dev

# App Config
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_APP_NAME=FitAI
EXPO_PUBLIC_VERSION=1.0.0
```

## 🚀 Despliegue en Cloudflare

### Configuración Avanzada

#### Custom Domain (Opcional)
```bash
# Si tienes un dominio propio (ej: api.fitai.cl)
# 1. Agregar dominio a Cloudflare
# 2. Configurar DNS records
# 3. Configurar Workers Custom Domain
wrangler deploy --route api.fitai.cl/*
```

#### Configurar CORS
```typescript
// Ya configurado en src/index.ts
app.use('*', cors({
  origin: ['http://localhost:8081', 'https://app.fitai.cl'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
```

#### Rate Limiting
```typescript
// Configurar en Cloudflare Dashboard:
// 1. Ir a Security > WAF
// 2. Crear reglas de rate limiting
// 3. Límite: 1000 requests/10 minutos por IP
```

## 🗄️ Configuración Avanzada de Base de Datos

### Connection Pooling
```sql
-- Configurar en Neon Dashboard:
-- 1. Ir a Settings > Compute
-- 2. Habilitar connection pooling
-- 3. Usar pooled connection string para mejor performance
```

### Backup y Recovery
```sql
-- Configurar backups automáticos:
-- 1. Neon hace backups automáticos diarios
-- 2. Configurar retención: 7 días (plan gratuito)
-- 3. Para backups manuales: usar pg_dump
pg_dump $DATABASE_URL > backup.sql
```

### Monitoring
```sql
-- Queries para monitorear performance:
SELECT schemaname,tablename,n_tup_ins,n_tup_upd,n_tup_del 
FROM pg_stat_user_tables 
ORDER BY n_tup_ins+n_tup_upd+n_tup_del DESC;
```

## ✅ Testing y Validación

### Backend Testing
```bash
cd apps/api

# Test local con wrangler
wrangler dev

# Test endpoints
curl http://localhost:8787/health
curl http://localhost:8787/api/v1/auth/register -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password123","displayName":"Test User"}'
```

### Mobile Testing
```bash
cd apps/mobile

# Start development server
npx expo start

# Test en simulador iOS
npx expo run:ios

# Test en dispositivo físico
# Escanear QR code con Expo Go
```

### End-to-End Testing
```bash
# Flujo completo de pruebas:
# 1. Registro de usuario ✅
# 2. Login ✅  
# 3. Generación de rutina con IA ✅
# 4. Log de workout ✅
# 5. Visualización de progreso ✅
# 6. Upgrade a premium ✅
```

## 📊 Monitoreo y Mantenimiento

### Cloudflare Analytics
```bash
# Ver métricas en tiempo real:
# 1. Cloudflare Dashboard > Analytics & Logs
# 2. Configurar alertas para:
#    - Error rate > 5%
#    - Response time > 1s
#    - Request volume anomalías
```

### Database Monitoring
```sql
-- Queries útiles para monitorear:

-- Conexiones activas
SELECT count(*) FROM pg_stat_activity;

-- Queries más lentas  
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Tamaño de tablas
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Alertas y Notificaciones
```bash
# Configurar en Cloudflare:
# 1. Workers > your-worker > Settings > Alerts
# 2. Configurar alertas para:
#    - CPU usage > 80%
#    - Memory usage > 90%
#    - Error rate > 5%
#    - Request duration > 10s
```

## 🔒 Seguridad y Compliance

### SSL/TLS
```bash
# Cloudflare Workers incluye SSL automático
# Verificar certificado:
curl -I https://fitai-api.your-username.workers.dev
```

### Secrets Management
```bash
# Rotar secrets regularmente:
wrangler secret put JWT_SECRET # cada 90 días
wrangler secret put OPENAI_API_KEY # cuando sea necesario
```

### GDPR Compliance
```typescript
// Implementado en el código:
// - Consentimiento explícito para datos
// - Derecho al olvido (delete user)
// - Portabilidad de datos (export user data)
// - Minimización de datos
```

## 🚨 Solución de Problemas Comunes

### Error: "Module not found"
```bash
# Verificar node_modules
rm -rf node_modules package-lock.json
npm install
```

### Error: "Wrangler login failed"
```bash
# Re-autenticar
wrangler logout
wrangler login
```

### Error: "Database connection failed"
```bash
# Verificar string de conexión
echo $DATABASE_URL
# Verificar desde otro cliente
psql $DATABASE_URL -c "SELECT NOW();"
```

### Error: "Expo build failed"
```bash
# Limpiar cache
npx expo install --fix
npx expo start -c
```

### Performance Issues
```bash
# Check worker analytics
wrangler tail

# Check database performance
# En Neon dashboard: Monitoring > Query performance
```

## 📞 Soporte y Recursos

### Documentación Oficial
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Neon Database](https://neon.tech/docs)
- [Upstash Redis](https://docs.upstash.com/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/docs/getting-started)

### Comunidad y Support
- **Cloudflare Discord**: Para soporte técnico Workers
- **Expo Discord**: Para dudas sobre React Native/Expo
- **GitHub Issues**: Para bugs del proyecto específico

### Escalación de Issues
1. **P0 (Critical)**: Sistema down - Respuesta inmediata
2. **P1 (High)**: Feature crítica no funciona - 4 horas
3. **P2 (Medium)**: Bug menor - 24 horas  
4. **P3 (Low)**: Mejora o feature request - 1 semana

---

## ✅ Checklist Final de Despliegue

### Pre-Deploy
- [ ] Todos los servicios externos configurados
- [ ] Variables de entorno configuradas
- [ ] Base de datos con datos iniciales
- [ ] Tests pasando localmente

### Deploy
- [ ] Backend desplegado en Cloudflare Workers
- [ ] Base de datos Neon funcionando
- [ ] Redis cache funcionando  
- [ ] API endpoints respondiendo correctamente

### Post-Deploy
- [ ] Monitoreo configurado
- [ ] Alertas configuradas
- [ ] Backup strategy implementada
- [ ] Team notificado de go-live

### App Store
- [ ] Build de producción generado
- [ ] Metadata completada en App Store Connect
- [ ] Screenshots y assets subidos
- [ ] App submitted for review

**¡FitAI está listo para conquistar el mercado chileno! 🚀💪**