# 🚀 FitAI API - Inicio Rápido

## 📦 ¿Qué tienes disponible?

✅ **Documentación completa** de la API en `/docs/API_DOCUMENTATION.md`  
✅ **Colección Postman** con 50+ endpoints y ejemplos  
✅ **Entornos configurados** para local y producción  
✅ **Ejemplos de request/response** para cada endpoint  

## ⚡ Empezar en 3 pasos

### 1. Importa en Postman
Arrastra estos archivos a Postman:
- `FitAI_API_Collection.json` 
- `Local_Environment.json`
- `Production_Environment.json`

### 2. Configura tu token
En el entorno que uses, actualiza:
```
auth_token = tu_jwt_token_de_clerk
```

### 3. ¡Prueba los endpoints!
Comienza con:
- `GET /api/v1/health/status` (sin auth)
- `GET /api/v1/exercises` (sin auth)  
- `GET /api/v1/users/me` (con auth)

## 🎯 Endpoints más usados

### Sin autenticación
- `GET /api/v1/exercises` - Listar ejercicios
- `GET /api/v1/exercises/search/{query}` - Buscar ejercicios
- `GET /api/v1/payments/plans` - Ver planes de suscripción

### Con autenticación
- `GET /api/v1/users/me` - Perfil del usuario
- `POST /api/v1/ai/generate-routine` - Generar rutina con IA
- `POST /api/v1/workouts/sessions` - Iniciar entrenamiento
- `POST /api/v1/health/sync` - Sincronizar Apple Health

## 🔄 Flujo típico de uso

1. **Autenticación** → Obtener token JWT
2. **Perfil** → `GET /users/me` 
3. **Ejercicios** → `GET /exercises` con filtros
4. **Rutina IA** → `POST /ai/generate-routine`
5. **Entrenamiento** → `POST /workouts/sessions`
6. **Logging** → `POST /workouts/sessions/{id}/exercises/{id}/sets`
7. **Completar** → `POST /workouts/sessions/{id}/complete`

## 📊 Módulos disponibles

| Módulo | Endpoints | Función Principal |
|--------|-----------|-------------------|
| 👤 Users | 5 | Gestión de perfil y progreso |
| 🏋️ Exercises | 6 | Catálogo de ejercicios |
| 📋 Routines | 5 | Rutinas personalizadas |
| 💪 Workouts | 6 | Sesiones de entrenamiento |
| 🤖 AI | 3 | Generación con IA y consejos |
| 💳 Payments | 3 | Suscripciones MercadoPago |
| 🏥 Health | 12 | Apple Health y HealthKit |
| 👥 Social | 4 | Feed social y leaderboards |

## 🔧 Variables útiles

En tus entornos tienes estas variables:
- `{{base_url}}` - URL base de la API
- `{{auth_token}}` - Token JWT para autenticación
- `{{user_id}}` - ID del usuario actual
- `{{exercise_id}}` - ID de ejercicio para testing
- `{{routine_id}}` - ID de rutina para testing
- `{{session_id}}` - ID de sesión activa

## ⚠️ Importantes

1. **Autenticación**: La mayoría de endpoints requieren token JWT
2. **Rate Limiting**: Respeta los límites de la API
3. **Errores**: Revisa el formato de respuesta de errores
4. **CORS**: Configurado para desarrollo local
5. **Mercado chileno**: Precios en CLP, español como idioma principal

## 🆘 ¿Problemas?

- **401 Unauthorized**: Token expirado, actualízalo
- **404 Not Found**: Verifica la URL y el método HTTP
- **400 Bad Request**: Revisa el formato del JSON
- **500 Server Error**: Problema en el servidor, revisa logs

---

¡Listo para testear la API! 🎉