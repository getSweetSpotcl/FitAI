# Guía de Deployment a Vercel - FitAI Web

Esta guía detalla paso a paso cómo configurar el deployment automático de la aplicación web de FitAI desde GitHub a Vercel.

## Prerrequisitos

- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [GitHub](https://github.com) con el repositorio
- Cuenta en [Clerk](https://clerk.com) para autenticación

## Paso 1: Preparar el Repositorio en GitHub

### 1.1 Verificar la estructura del proyecto
Asegúrate de que tu repositorio tenga la siguiente estructura:
```
FitAI/
├── apps/
│   ├── api/         # (Se mantiene en Cloudflare Workers)
│   └── web/         # (Se desplegará en Vercel)
│       ├── package.json
│       ├── vercel.json
│       └── ...
```

### 1.2 Hacer push de los cambios recientes
```bash
git add .
git commit -m "Configure web app for Vercel deployment"
git push origin main
```

## Paso 2: Configurar Vercel

### 2.1 Crear cuenta o iniciar sesión
1. Ve a [https://vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta de GitHub (recomendado)

### 2.2 Importar el proyecto
1. Click en **"Add New..."** → **"Project"**
2. Busca tu repositorio **"FitAI"**
3. Click en **"Import"**

### 2.3 Configurar el proyecto

#### Framework Preset
- **Framework Preset**: `Next.js` (debería detectarse automáticamente)

#### Root Directory
- **Root Directory**: `apps/web` (MUY IMPORTANTE)
- Click en **"Edit"** junto a Root Directory
- Escribe: `apps/web`

#### Build and Output Settings
- **Build Command**: `npm run build` (ya configurado en vercel.json)
- **Output Directory**: `.next` (dejar por defecto)
- **Install Command**: `npm install` (ya configurado en vercel.json)

#### Node.js Version
- Selecciona: **20.x** (o la más reciente LTS)

## Paso 3: Configurar Variables de Entorno

### 3.1 Variables requeridas
En la sección **"Environment Variables"**, agrega las siguientes:

| Variable | Descripción | Valor |
|----------|-------------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clave pública de Clerk | `pk_test_...` o `pk_live_...` |
| `CLERK_SECRET_KEY` | Clave secreta de Clerk | `sk_test_...` o `sk_live_...` |
| `NEXT_PUBLIC_API_URL` | URL de tu API en Cloudflare | `https://api.getfitia.com` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Ruta de login | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Ruta de registro | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Ruta después de login | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Ruta después de registro | `/dashboard` |

### 3.2 Obtener las claves de Clerk
1. Ve a [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Selecciona tu aplicación o crea una nueva
3. En **"API Keys"**, copia:
   - `Publishable key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `Secret key` → `CLERK_SECRET_KEY`

### 3.3 Configurar las variables
1. Para cada variable:
   - Escribe el nombre en **"Key"**
   - Pega el valor en **"Value"**
   - Selecciona los entornos: `Production`, `Preview`, `Development`
2. Click en **"Add"** para cada variable

## Paso 4: Deploy Inicial

1. Una vez configuradas todas las variables, click en **"Deploy"**
2. Vercel comenzará el proceso de build
3. Espera a que termine (generalmente 2-3 minutos)

## Paso 5: Configurar el Dominio (Opcional)

### 5.1 Dominio de Vercel
- Tu app estará disponible en: `https://fitai-[tu-usuario].vercel.app`

### 5.2 Dominio personalizado
1. Ve a **"Settings"** → **"Domains"**
2. Agrega tu dominio: `www.fitai.cl` o `app.fitai.cl`
3. Sigue las instrucciones de DNS

## Paso 6: Configurar Deployments Automáticos

### 6.1 Configuración de Git
Vercel automáticamente configurará:
- **Production Branch**: `main` → Despliega a producción
- **Preview Branches**: Todas las demás → Despliega previews

### 6.2 Configurar protección de branches en GitHub (Opcional)
1. Ve a tu repositorio en GitHub
2. Settings → Branches
3. Add rule para `main`:
   - Require pull request reviews
   - Require status checks (Vercel)

## Paso 7: Configurar Clerk para Producción

### 7.1 URLs de producción en Clerk
1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. En tu aplicación → **"Paths"**
3. Configura:
   - **Home URL**: `https://tu-dominio.com`
   - **Sign in URL**: `https://tu-dominio.com/sign-in`
   - **Sign up URL**: `https://tu-dominio.com/sign-up`
   - **After sign in URL**: `https://tu-dominio.com/dashboard`
   - **After sign up URL**: `https://tu-dominio.com/dashboard`

### 7.2 Dominios permitidos
1. En Clerk → **"Domains"**
2. Agrega:
   - `tu-dominio.com`
   - `*.vercel.app` (para previews)

## Verificación Final

### ✅ Checklist de verificación:
- [ ] El build de Vercel completó exitosamente
- [ ] La aplicación carga en el dominio de Vercel
- [ ] La autenticación con Clerk funciona
- [ ] Las llamadas a la API (`https://api.getfitia.com`) funcionan
- [ ] Los deployments automáticos funcionan al hacer push

## Troubleshooting

### Error: "Module not found"
- Verifica que el Root Directory sea `apps/web`
- Asegúrate de que `package-lock.json` esté actualizado

### Error: "Clerk is not defined"
- Verifica las variables de entorno en Vercel
- Asegúrate de que las claves de Clerk sean correctas

### Error: "API calls failing"
- Verifica que `NEXT_PUBLIC_API_URL` apunte a tu API en Cloudflare
- Revisa CORS en tu API para permitir el dominio de Vercel

## Comandos Útiles

### Deploy manual desde CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# En la carpeta apps/web
cd apps/web

# Deploy preview
vercel

# Deploy a producción
vercel --prod
```

### Ver logs
```bash
vercel logs [url-del-deployment]
```

## Soporte

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Clerk](https://clerk.com/docs)

---

**Nota**: Mantén tu API en Cloudflare Workers para mejor rendimiento y costos. Esta guía solo cubre el deployment del frontend web.