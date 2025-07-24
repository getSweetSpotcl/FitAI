# FitAI API - Guías para Desarrolladores

Esta documentación está diseñada para desarrolladores que necesiten integrar con la API de FitAI, especialmente para el desarrollo de aplicaciones React Native.

## 📚 Índice de Documentación

### 🚀 Primeros Pasos
- [**Guía de Integración React Native**](./react-native-integration.md) - Como integrar la API en tu app React Native
- [**Flujo de Autenticación**](./authentication-flow.md) - Implementación completa de autenticación con Clerk
- [**Configuración Inicial**](./setup-guide.md) - Setup del proyecto y variables de entorno

### 🔧 Implementación
- [**Manejo de Errores**](./error-handling.md) - Best practices para manejo de errores y estados
- [**Cliente HTTP**](./http-client.md) - Configuración de cliente HTTP con autenticación automática
- [**TypeScript Types**](./typescript-types.md) - Tipos TypeScript para toda la API

### 🎯 Funcionalidades Específicas
- [**Sistema AI**](./ai-integration.md) - Integración con funcionalidades de IA
- [**Gestión de Workouts**](./workouts-guide.md) - Implementación de logging de entrenamientos
- [**Pagos y Suscripciones**](./payments-guide.md) - Integración con MercadoPago
- [**Datos de Salud**](./health-integration.md) - Integración con HealthKit
- [**Features Sociales**](./social-features.md) - Implementación de funcionalidades sociales

### 📱 UI/UX
- [**Patrones de UI**](./ui-patterns.md) - Patrones recomendados para componentes
- [**Offline Support**](./offline-support.md) - Implementación de funcionalidades offline
- [**Performance**](./performance.md) - Optimización de rendimiento

### 🔍 Testing y Debugging
- [**Testing Guide**](./testing.md) - Como testear integraciones con la API
- [**Debugging**](./debugging.md) - Tools y técnicas de debugging

## 🏗️ Arquitectura Recomendada

Para aplicaciones React Native que consuman esta API, recomendamos la siguiente arquitectura:

```
src/
├── services/          # HTTP clients y business logic
│   ├── api/           # Configuración base de API
│   ├── auth/          # Servicios de autenticación
│   ├── workouts/      # Servicios de entrenamientos
│   ├── ai/            # Servicios de IA
│   └── payments/      # Servicios de pagos
├── types/             # TypeScript types (compartidos con API)
├── hooks/             # Custom hooks para API calls
├── components/        # UI components
├── screens/           # App screens
└── store/            # State management (Zustand recomendado)
```

## 🔑 Conceptos Clave

### Autenticación
- **Clerk Authentication**: Toda la API usa Clerk para autenticación
- **JWT Tokens**: Se requiere bearer token en la mayoría de endpoints
- **Plan-based Access**: Algunos features requieren suscripciones premium

### Planes de Usuario
- **Free**: Funcionalidades básicas
- **Premium**: IA avanzada, analytics ($7,990 CLP/mes)
- **Pro**: Todas las funcionalidades ($14,990 CLP/mes)

### Rate Limiting
- **Global**: 1000 requests/hora por usuario
- **IA Features**: Límites específicos por plan

## 🌐 URLs de la API

### Producción
- **API Base**: `https://api.getfitia.com`
- **Documentación**: `https://api.getfitia.com/api-docs`

### Development
- **API Base**: `https://fitai-api.sweetspot-627.workers.dev`
- **Documentación**: `https://fitai-api.sweetspot-627.workers.dev/api-docs`

## 📞 Soporte

Para soporte técnico o preguntas sobre la integración:

- 📧 **Email**: support@fitai.cl
- 📚 **Documentación**: Esta guía y la documentación OpenAPI
- 🐛 **Issues**: Reportar problemas específicos de la API

## 🔄 Actualizaciones

Esta documentación se actualiza junto con la API. Revisa regularmente para:
- Nuevos endpoints
- Cambios en autenticación
- Nuevas funcionalidades
- Breaking changes

---

> **Nota**: Esta API está optimizada para el mercado chileno con integración MercadoPago y textos en español. Para otros mercados, pueden requerirse adaptaciones.