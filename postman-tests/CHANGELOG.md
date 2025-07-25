# Changelog - FitAI Postman Collection

## [v2.1.0] - 2025-07-25

### ✨ Nuevas Funciones
- **Endpoints de Autenticación de Desarrollo**: 
  - `POST /api/v1/auth/dev/login` - Obtener token mock para testing
  - `GET /api/v1/auth/dev/token-info` - Información sobre autenticación de desarrollo
  
- **Quick Start Flow Actualizado**:
  - Agregado paso 2: "Dev Login (Get Token)" para obtener token automáticamente
  - Los tokens se guardan automáticamente en las variables de entorno
  - Mejor flujo para testing end-to-end

### 🔧 Mejoras
- **Scripts de Test Mejorados**:
  - Auto-guardado de tokens JWT en variables de entorno
  - Validaciones más robustas en respuestas de autenticación
  - Logging mejorado para debugging

- **Documentación Actualizada**:
  - README.md expandido con instrucciones de autenticación
  - Ejemplos específicos para desarrollo vs producción
  - Guía clara sobre cuándo usar cada método de autenticación

### ⚠️ Notas Importantes
- Los endpoints de desarrollo **solo funcionan** cuando `ENVIRONMENT=development`
- **Nunca usar** endpoints de desarrollo en producción
- Los tokens de desarrollo expiran en 24 horas

### 🚀 Cómo Usar
1. **Para Development**: Usa `POST /api/v1/auth/dev/login` con cualquier email/password
2. **Para Production**: Obtén token real de Clerk desde la web app
3. **Quick Start**: Ejecuta los requests en orden desde la carpeta "🏃 Quick Start Flow"

### 📋 Estructura de la Colección
```
🏃 Quick Start Flow
├── 1. Health Check
├── 2. Dev Login (Get Token) [NUEVO]
├── 3. Get User Profile
└── 4. Get Exercises Catalog

🔐 Authentication [ACTUALIZADO]
├── Dev Login (Development Only) [NUEVO]
├── Dev Token Info [NUEVO]
└── Webhook - User Created (Clerk)
```

---

## [v2.0.0] - 2025-01-20 (Anterior)

### ✨ Funciones Base
- Suite completa de testing para todos los endpoints
- Autenticación con Clerk JWT
- Tests automatizados y validaciones
- Entornos para desarrollo, staging y producción
- Ejemplos completos para todos los módulos