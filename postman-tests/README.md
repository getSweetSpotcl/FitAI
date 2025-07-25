# FitAI Postman Collection

Esta colección incluye todos los endpoints de la API de FitAI con ejemplos completos y entornos configurados para desarrollo local y producción.

## 📋 Contenido

### **Colecciones**
- **FitAI_API_Collection.json**: Colección original con endpoints básicos
- **FitAI_Complete_Collection_v2.json**: ⭐ **RECOMENDADA** - Suite completa con:
  - Tests automatizados y validaciones
  - Scripts de configuración automática
  - Ejemplos completos para todos los endpoints
  - Flujo de quick start para pruebas rápidas

### **Entornos**
- **Local_Environment.json**: Desarrollo local (localhost:8787)
- **Workers_Dev_Environment.json**: ⭐ **USAR ESTE** - Endpoint temporal mientras propaga DNS
- **Staging_Environment.json**: Entorno de staging (api-staging.getfitia.com)
- **Production_Environment.json**: Entorno de producción (api.getfitia.com)
- **README.md**: Este archivo con instrucciones de uso

## 🚀 Importar en Postman

### 1. Importar la Colección
1. Abre Postman
2. Haz clic en "Import" en la esquina superior izquierda
3. Selecciona o arrastra el archivo `FitAI_API_Collection.json`
4. La colección aparecerá en tu sidebar izquierdo

### 2. Importar los Entornos
1. Ve a "Environments" en Postman (ícono de engranaje)
2. Haz clic en "Import" 
3. Selecciona ambos archivos de entorno:
   - `Local_Environment.json`
   - `Production_Environment.json`

### 3. Configurar el Entorno
1. Selecciona el entorno que quieras usar (Local o Production)
2. Actualiza las variables necesarias:
   - `auth_token`: Tu token JWT de Clerk
   - `base_url`: URL base de tu API (ya configurada)
   - Variables de ID para testing

## 🔐 Autenticación

La mayoría de endpoints requieren autenticación. Tienes **dos opciones**:

### Opción 1: Token de Desarrollo (Recomendado para Testing)
1. **Usa el endpoint de desarrollo** (solo funciona cuando `ENVIRONMENT=development`):
   ```
   POST {{base_url}}/api/v1/auth/dev/login
   {
     "email": "test@example.com",
     "password": "cualquier-password"
   }
   ```
2. **El token se guarda automáticamente** en la variable `auth_token`
3. **⚠️ Solo para desarrollo** - No usar en producción

### Opción 2: Token Real de Clerk (Producción)
1. **Obtén tu token JWT de Clerk**:
   - Inicia sesión en tu aplicación web
   - Abre Developer Tools (F12)
   - En Console ejecuta: `window.Clerk.session.getToken().then(t => console.log(t))`
   
2. **Actualiza la variable `auth_token`**:
   - Ve al entorno activo
   - Pega tu token en la variable `auth_token`
   - Guarda los cambios

3. **La autenticación está configurada a nivel de colección**, así que automáticamente se aplicará a todos los requests que la requieran.

## 📊 Módulos Incluidos

### 👤 Users
- Obtener perfil actual
- Actualizar perfil
- Ver progreso
- Actualizar preferencias
- Eliminar cuenta

### 🏋️ Exercises  
- Listar ejercicios con filtros
- Buscar ejercicios
- Obtener ejercicio específico
- Metadatos (categorías, grupos musculares, equipos)

### 📋 Routines
- Listar rutinas del usuario
- Crear rutina personalizada
- Obtener detalles de rutina
- Actualizar rutina

### 💪 Workouts
- Listar sesiones de entrenamiento
- Iniciar nuevo entrenamiento
- Registrar sets de ejercicios
- Completar entrenamiento

### 🤖 AI
- Generar rutina con IA
- Obtener consejos de entrenamiento
- Análisis de rendimiento

### 💳 Payments
- Ver planes de suscripción
- Crear preferencia de pago MercadoPago
- Webhooks de pagos

### 🏥 Health
- Sincronizar datos de Apple Health
- Métricas de salud
- Estado de HealthKit
- Dashboard de salud
- Análisis de frecuencia cardíaca

### 👥 Social
- Feed social
- Crear publicaciones
- Tabla de posiciones
- Interacciones sociales

## 🛠️ Variables de Entorno

### Local Development
- `base_url`: `http://localhost:8787`
- `auth_token`: Tu token JWT local
- Variables de IDs para testing

### Production
- `base_url`: `https://fitai-api.your-domain.com`
- `auth_token`: Tu token JWT de producción
- Variables de IDs de producción

## 📝 Ejemplos de Uso

### 0. Autenticación de Desarrollo (Nuevo)
```
POST {{base_url}}/api/v1/auth/dev/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### 1. Obtener Perfil de Usuario
```
GET {{base_url}}/api/v1/users/me
Authorization: Bearer {{auth_token}}
```

### 2. Buscar Ejercicios
```
GET {{base_url}}/api/v1/exercises/search/press banca?limit=10
```

### 3. Generar Rutina con IA
```
POST {{base_url}}/api/v1/ai/generate-routine
Content-Type: application/json
Authorization: Bearer {{auth_token}}

{
  "goals": ["muscle_gain"],
  "experienceLevel": "intermediate",
  "availableDays": 4,
  "equipment": ["dumbbell", "barbell"]
}
```

### 4. Sincronizar Datos de Apple Health
```
POST {{base_url}}/api/v1/health/sync
Content-Type: application/json
Authorization: Bearer {{auth_token}}

{
  "dataType": "workouts",
  "data": {
    "workouts": [...]
  }
}
```

## ⚡ Tips de Uso

1. **Usa variables**: Aprovecha las variables `{{user_id}}`, `{{exercise_id}}`, etc. para testing
2. **Guarda respuestas**: Algunos requests devuelven IDs que puedes usar en requests posteriores
3. **Tests automáticos**: Considera agregar tests en la pestaña "Tests" de cada request
4. **Organización**: Los requests están organizados por módulos para facilitar navegación

## 🐛 Solución de Problemas

### Token Expirado
Si recibes errores 401, actualiza tu `auth_token` con un token válido.

### URL Incorrecta
Verifica que el entorno seleccionado tenga la URL correcta en `base_url`.

### Variables Faltantes
Asegúrate de que las variables de entorno estén configuradas correctamente.

## 📞 Soporte

Para problemas o mejoras de la API:
1. Revisa la documentación completa en `/docs/API_DOCUMENTATION.md`
2. Verifica los códigos de estado HTTP
3. Consulta los logs del servidor para debugging

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2024  
**Compatibilidad**: FitAI API v1