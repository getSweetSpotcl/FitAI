# Cloudflare Deployment Guide for FitAI Monorepo

## Overview

This guide explains how to deploy the FitAI monorepo to Cloudflare, with the API on Cloudflare Workers and the web frontend on Cloudflare Pages.

## Project Structure

```
FitAI/
├── apps/
│   ├── api/        → Backend API (Cloudflare Workers)
│   └── web/        → Frontend (Cloudflare Pages)
├── packages/       → Shared code
├── package.json    → Monorepo scripts
└── turbo.json      → Turborepo configuration
```

## Part 1: API Deployment (Cloudflare Workers)

### Status: ✅ Already Deployed
- **URL**: https://fitai-api.sweetspot-627.workers.dev
- **Health Check**: https://fitai-api.sweetspot-627.workers.dev/health

### Initial Setup for API

1. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

2. **Create KV Namespaces**
   ```bash
   cd apps/api
   
   # Development namespace
   wrangler kv namespace create CACHE
   # Copy the ID and add to wrangler.toml
   
   # Production namespace
   wrangler kv namespace create CACHE --env production
   # Copy the ID and add to wrangler.toml under [env.production]
   ```

3. **Configure Secrets**
   
   For development:
   ```bash
   # Database URL (PostgreSQL)
   wrangler secret put DATABASE_URL
   # Example: postgresql://user:password@host.neon.tech/database?sslmode=require
   
   # JWT Secret (generate a secure random string)
   wrangler secret put JWT_SECRET
   # Example: use https://randomkeygen.com/
   
   # OpenAI API Key
   wrangler secret put OPENAI_API_KEY
   # Get from: https://platform.openai.com/api-keys
   
   # MercadoPago Access Token
   wrangler secret put MERCADOPAGO_ACCESS_TOKEN
   # Get from: https://www.mercadopago.com/developers/
   ```
   
   For production (add `--env production` to each command):
   ```bash
   wrangler secret put DATABASE_URL --env production
   wrangler secret put JWT_SECRET --env production
   wrangler secret put OPENAI_API_KEY --env production
   wrangler secret put MERCADOPAGO_ACCESS_TOKEN --env production
   ```

4. **Deploy the API**
   ```bash
   # Development
   wrangler deploy
   
   # Production
   wrangler deploy --env production
   ```

### API Configuration File (wrangler.toml)

The API uses this configuration:

```toml
name = "fitai-api"
main = "src/index.ts"
compatibility_date = "2024-12-30"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "development"

# KV Namespace for caching
[[kv_namespaces]]
binding = "CACHE"
id = "7a248575697e448b8e2a008734bdc6d3"
preview_id = "7a248575697e448b8e2a008734bdc6d3"

[env.production]
name = "fitai-api-production"

[env.production.vars]
ENVIRONMENT = "production"

# Production KV namespace
[[env.production.kv_namespaces]]
binding = "CACHE"
id = "49fe0605b32d4013b8897040197cf3ad"
```

### To Update the API:
```bash
cd apps/api
wrangler deploy
```

### To Deploy to Production:
```bash
cd apps/api
wrangler deploy --env production
```

### Monitoring & Logs

View real-time logs:
```bash
cd apps/api
wrangler tail
```

View production logs:
```bash
cd apps/api
wrangler tail --env production
```

## Part 2: Web Frontend Deployment (Cloudflare Pages)

### Step 1: Delete Existing Project (if created via CLI)
If you created `fitai-web` using wrangler CLI, you need to delete it first:
1. Go to Cloudflare Dashboard > Workers & Pages
2. Click on `fitai-web`
3. Go to Settings
4. Scroll down and click "Delete project"

### Step 2: Create New Project with GitHub Integration

1. **Navigate to Cloudflare Pages**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Click on "Workers & Pages"
   - Click the "Create" button (blue button)

2. **Select Pages → Connect to Git**
   - Choose "Connect to Git" option
   - Authorize Cloudflare to access your GitHub account

3. **Select Repository**
   - Find and select: `getSweetSpotcl/FitAI`
   - Click to continue

4. **Configure Build Settings for Monorepo**

   Use these **exact** values:

   | Setting | Value |
   |---------|-------|
   | **Project name** | `fitai-web` |
   | **Production branch** | `main` |
   | **Framework preset** | `None` (manual configuration) |
   | **Build command** | `npm install && npm run build:web` |
   | **Build output directory** | `apps/web/.next` |
   | **Root directory** | `/` (leave empty or use `/`) |

5. **Add Environment Variables**

   Click "Add variable" and add these:

   | Variable Name | Value |
   |--------------|-------|
   | `NODE_VERSION` | `18.17.0` |
   | `NEXT_PUBLIC_API_URL` | `https://fitai-api.sweetspot-627.workers.dev` |

6. **Deploy**
   - Click "Save and Deploy"
   - Wait for the build to complete (3-5 minutes)

## Important Notes for Monorepo

### Why These Settings Work

1. **Build Command**: `npm install && npm run build:web`
   - `npm install` installs all dependencies including workspace packages
   - `npm run build:web` runs `turbo build --filter=@fitai/web` which only builds the web app

2. **Root Directory**: `/`
   - We use the repository root because npm workspaces need to be installed from the root
   - The build command handles navigation to the correct app

3. **Output Directory**: `apps/web/.next`
   - This is where Next.js outputs the built files
   - Cloudflare needs the full path from the repository root

### Monorepo Scripts

The root `package.json` includes these scripts:

```json
{
  "scripts": {
    "build": "turbo build",
    "build:api": "turbo build --filter=@fitai/api",
    "build:web": "turbo build --filter=@fitai/web",
    "dev": "turbo dev",
    "dev:api": "turbo dev --filter=@fitai/api",
    "dev:web": "turbo dev --filter=@fitai/web"
  }
}
```

## Automatic Deployments

### Web Frontend (Cloudflare Pages)
Once configured:
- **Main branch**: Every push triggers a production deployment
- **Pull Requests**: Get preview deployments with unique URLs
- **Preview URL format**: `https://<hash>.fitai-web.pages.dev`

### API Backend (GitHub Actions)
The API deploys automatically via GitHub Actions:
- **Trigger**: Push to main branch with changes in `apps/api/**`
- **Configuration**: See [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)
- **Required**: GitHub secrets must be configured

To enable API auto-deployment:
1. Set up GitHub secrets (see documentation)
2. Create KV namespaces and update wrangler.toml
3. Push changes to trigger deployment

## Custom Domain Setup

### For the API (api.fitai.cl):
1. Go to Workers & Pages > fitai-api > Custom Domains
2. Add domain: `api.fitai.cl`
3. Update DNS records as instructed

### For the Web App (app.fitai.cl or fitai.cl):
1. Go to Workers & Pages > fitai-web > Custom Domains
2. Add domain: `app.fitai.cl` or `fitai.cl`
3. Update DNS records as instructed

## Troubleshooting

### Build Fails
- Check that `NODE_VERSION=18.17.0` is set
- Verify the build command is exactly: `npm install && npm run build:web`
- Check build logs for specific errors

### 404 Errors After Deployment
- Ensure build output directory is: `apps/web/.next`
- Check that the build completed successfully

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings in the API (`apps/api/src/index.ts`)

## Local Development

To run the entire monorepo locally:
```bash
npm install
npm run dev
```

To run only the web frontend:
```bash
npm run dev:web
```

To run only the API:
```bash
npm run dev:api
```

## Support

For issues:
1. Check build logs in Cloudflare Dashboard
2. Review the [Cloudflare Pages docs](https://developers.cloudflare.com/pages/)
3. Check the repository issues: https://github.com/getSweetSpotcl/FitAI/issues