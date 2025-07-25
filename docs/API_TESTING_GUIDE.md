# Guía para Probar APIs de FitAI

Esta guía te ayudará a obtener tokens JWT y probar los endpoints de la API de FitAI.

## 🔑 Métodos para Obtener JWT Token

### Método 1: Desde la Aplicación Web (Más fácil)

1. **Abre la aplicación web**: [tu-dominio-vercel.app]
2. **Inicia sesión** con Clerk
3. **Abre las Developer Tools**:
   - Chrome/Edge: `F12` o `Ctrl+Shift+I`
   - Firefox: `F12` o `Ctrl+Shift+K`
   - Safari: `Cmd+Option+I`

4. **Obtén el token desde el navegador**:
   ```javascript
   // En la consola del navegador, ejecuta:
   window.Clerk.session.getToken().then(token => {
     console.log('JWT Token:', token);
     // Copiar el token desde aquí
   });
   ```

5. **Copia el token** que aparece en la consola

### Método 2: Desde el Local Storage

1. **En Developer Tools**, ve a la pestaña **Application** (Chrome) o **Storage** (Firefox)
2. **Busca en Local Storage** o **Session Storage**
3. **Busca claves relacionadas con Clerk** (pueden tener nombres como `clerk-db-jwt` o similar)

### Método 3: Interceptar Requests (Método avanzado)

1. **Abre Developer Tools** → pestaña **Network**
2. **Inicia sesión** en la aplicación
3. **Busca requests** que contengan headers `Authorization`
4. **Copia el valor** del header `Authorization: Bearer <token>`

## 🧪 Probar los Endpoints de la API

### Base URL
```
https://api.getfitia.com/api/v1
```

### Headers Requeridos
```bash
Authorization: Bearer <tu-jwt-token>
Content-Type: application/json
```

## 📋 Endpoints Disponibles

### 1. Authentication & Users

#### Obtener perfil del usuario
```bash
curl -X GET "https://api.getfitia.com/api/v1/users/profile" \
  -H "Authorization: Bearer <tu-jwt-token>" \
  -H "Content-Type: application/json"
```

#### Actualizar perfil
```bash
curl -X PUT "https://api.getfitia.com/api/v1/users/profile" \
  -H "Authorization: Bearer <tu-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Tu Nombre",
    "lastName": "Tu Apellido",
    "preferences": {
      "fitnessGoals": ["muscle_gain", "strength"],
      "experienceLevel": "intermediate"
    }
  }'
```

### 2. Workouts & Routines

#### Listar entrenamientos del usuario
```bash
curl -X GET "https://api.getfitia.com/api/v1/workouts" \
  -H "Authorization: Bearer <tu-jwt-token>"
```

#### Crear nuevo entrenamiento
```bash
curl -X POST "https://api.getfitia.com/api/v1/workouts" \
  -H "Authorization: Bearer <tu-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "routineId": "routine-id-here",
    "startedAt": "2025-01-24T10:00:00Z",
    "exercises": [
      {
        "exerciseId": "push-ups",
        "sets": [
          {"reps": 10, "weight": null, "duration": null},
          {"reps": 12, "weight": null, "duration": null}
        ]
      }
    ]
  }'
```

#### Listar rutinas
```bash
curl -X GET "https://api.getfitia.com/api/v1/routines" \
  -H "Authorization: Bearer <tu-jwt-token>"
```

### 3. AI Features

#### Generar rutina con IA
```bash
curl -X POST "https://api.getfitia.com/api/v1/ai/generate-routine" \
  -H "Authorization: Bearer <tu-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "goals": ["muscle_gain", "strength"],
    "experienceLevel": "intermediate",
    "availableTime": 60,
    "equipment": ["dumbbells", "barbell"],
    "muscleGroups": ["chest", "back", "legs"]
  }'
```

#### Chat con IA Coach
```bash
curl -X POST "https://api.getfitia.com/api/v1/ai/chat" \
  -H "Authorization: Bearer <tu-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Qué ejercicios me recomiendas para ganar masa muscular?",
    "context": {
      "userGoals": ["muscle_gain"],
      "experienceLevel": "intermediate"
    }
  }'
```

### 4. Premium AI (Requiere suscripción premium)

#### Análisis avanzado de progreso
```bash
curl -X POST "https://api.getfitia.com/api/v1/premium-ai/analyze-progress" \
  -H "Authorization: Bearer <tu-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "timeframe": "month",
    "metrics": ["strength", "volume", "consistency"]
  }'
```

### 5. Health Data (Apple HealthKit)

#### Sincronizar datos de salud
```bash
curl -X POST "https://api.getfitia.com/api/v1/health/sync" \
  -H "Authorization: Bearer <tu-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "healthData": {
      "heartRate": 75,
      "steps": 8500,
      "caloriesBurned": 320,
      "activeMinutes": 45
    },
    "source": "apple_health"
  }'
```

### 6. Analytics

#### Obtener estadísticas del usuario
```bash
curl -X GET "https://api.getfitia.com/api/v1/analytics/user-stats" \
  -H "Authorization: Bearer <tu-jwt-token>"
```

### 7. Social Features

#### Obtener feed social
```bash
curl -X GET "https://api.getfitia.com/api/v1/social/feed" \
  -H "Authorization: Bearer <tu-jwt-token>"
```

#### Compartir entrenamiento
```bash
curl -X POST "https://api.getfitia.com/api/v1/social/share-workout" \
  -H "Authorization: Bearer <tu-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutId": "workout-id-here",
    "message": "¡Completé mi rutina de hoy! 💪",
    "visibility": "public"
  }'
```

## 🛠️ Herramientas Recomendadas

### 1. Postman
- Importa la colección desde: `/docs/postman/FitAI-API.postman_collection.json`
- Configura la variable `{{baseUrl}}` como `https://api.getfitia.com/api/v1`
- Configura la variable `{{jwt_token}}` con tu token

### 2. Insomnia
- Importa el archivo: `/docs/insomnia/FitAI-API.json`

### 3. curl (Línea de comandos)
- Reemplaza `<tu-jwt-token>` con el token real en todos los ejemplos

### 4. Extensión REST Client para VS Code
Crea un archivo `.http`:

```http
### Variables
@baseUrl = https://api.getfitia.com/api/v1
@jwt_token = tu-jwt-token-aqui

### Get User Profile
GET {{baseUrl}}/users/profile
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

### Generate AI Routine
POST {{baseUrl}}/ai/generate-routine
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "goals": ["muscle_gain", "strength"],
  "experienceLevel": "intermediate",
  "availableTime": 60,
  "equipment": ["dumbbells", "barbell"],
  "muscleGroups": ["chest", "back", "legs"]
}
```

## 🔍 Códigos de Respuesta

- `200` - OK: Operación exitosa
- `201` - Created: Recurso creado exitosamente
- `400` - Bad Request: Error en la solicitud
- `401` - Unauthorized: Token inválido o faltante
- `403` - Forbidden: Sin permisos para el recurso
- `404` - Not Found: Recurso no encontrado
- `429` - Too Many Requests: Rate limit excedido
- `500` - Internal Server Error: Error del servidor

## 🚨 Troubleshooting

### Token Expirado
```json
{
  "error": "Token expired",
  "code": "EXPIRED_TOKEN",
  "message": "Your session has expired. Please log in again."
}
```
**Solución**: Obtén un nuevo token siguiendo los pasos del Método 1.

### Token Inválido
```json
{
  "error": "Invalid token",
  "code": "INVALID_TOKEN"
}
```
**Solución**: Verifica que el token esté bien copiado y incluya el prefijo `Bearer `.

### Rate Limiting
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT",
  "retryAfter": 60
}
```
**Solución**: Espera 60 segundos antes de hacer otra solicitud.

## 📝 Notas Importantes

1. **Los tokens JWT expiran**: Generalmente duran 1 hora. Obtén uno nuevo si recibes errores 401.

2. **Rate Limiting**: La API tiene límites de requests por minuto. Ve despacio al probar.

3. **Datos de Prueba**: Puedes crear datos de prueba usando los endpoints POST.

4. **Ambiente de Desarrollo**: Si necesitas probar localmente, cambia la baseUrl a `http://localhost:8787/api/v1`.

5. **Logs**: Revisa los logs de Cloudflare Workers si algo no funciona como esperado.

---

¿Necesitas ayuda con algún endpoint específico o tienes problemas obteniendo el token? ¡Avísame!