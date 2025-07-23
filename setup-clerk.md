# Configuración de Clerk para FitAI

## 📋 Pasos de Configuración

### 1. Crear Cuenta y Aplicación en Clerk

1. **Ve a [clerk.com](https://clerk.com)** y crea una cuenta
2. **Crea nueva aplicación**:
   - Nombre: "FitAI"
   - Tipo: Web application
   - Framework: Next.js

3. **Configura métodos de autenticación**:
   - ✅ Email/Password
   - ✅ Google OAuth (recomendado)
   - ❌ Magic links (opcional)
   - ❌ Phone number (opcional)

### 2. Obtener API Keys

Una vez creada la aplicación, ve a **"API Keys"** en el dashboard:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
- `CLERK_SECRET_KEY=sk_test_...`

### 3. Configurar Variables de Entorno

#### Next.js Web App
Copia el archivo de ejemplo y completa las keys:
```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Edita `apps/web/.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_TU_KEY_AQUI
CLERK_SECRET_KEY=sk_test_TU_SECRET_AQUI
NEXT_PUBLIC_API_URL=http://localhost:8787
```

#### Cloudflare Workers API
Copia el archivo de ejemplo:
```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Edita `apps/api/.dev.vars`:
```bash
CLERK_PUBLISHABLE_KEY=pk_test_TU_KEY_AQUI
CLERK_SECRET_KEY=sk_test_TU_SECRET_AQUI
```

### 4. Configurar Webhooks (Después de deployment)

En el dashboard de Clerk:
1. Ve a **"Webhooks"**
2. Crea nuevo webhook:
   - URL: `https://tu-api.workers.dev/api/v1/webhooks/clerk`
   - Eventos: `user.created`, `user.updated`, `user.deleted`
   - Copia el **Webhook Secret**

### 5. Comandos de Configuración

```bash
# Instalar dependencias (ya ejecutado)
npm install @clerk/nextjs --prefix apps/web
npm install @clerk/backend --prefix apps/api

# Configurar secrets en Cloudflare Workers (después de obtener keys)
cd apps/api
echo "CLERK_SECRET_KEY" | wrangler secret put CLERK_SECRET_KEY
echo "CLERK_WEBHOOK_SECRET" | wrangler secret put CLERK_WEBHOOK_SECRET
```

### 6. Verificar Configuración

- [ ] Cuenta Clerk creada
- [ ] Aplicación "FitAI" creada
- [ ] API Keys obtenidas
- [ ] Variables de entorno configuradas
- [ ] Webhooks configurados (post-deployment)

## 🚀 Siguiente Paso

Una vez completados estos pasos, estarás listo para continuar con la **Fase 2: Implementación Next.js Dashboard**.

---

**¿Necesitas ayuda con algún paso?** Avísame cuando tengas las API keys de Clerk para continuar.