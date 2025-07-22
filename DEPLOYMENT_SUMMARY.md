# FitAI Deployment Summary

## ✅ Completed Deployments

### 1. API Backend (Cloudflare Workers)
- **Status**: ✅ Successfully deployed
- **URL**: https://fitai-api.sweetspot-627.workers.dev
- **Health Check**: https://fitai-api.sweetspot-627.workers.dev/health
- **Environment**: Development (with test secrets)

### 2. Web Frontend (Cloudflare Pages)
- **Status**: 🚧 Project created, pending GitHub integration
- **Project Name**: fitai-web
- **Expected URL**: https://fitai-web.pages.dev

## 📋 Next Steps

### 1. Complete Frontend Deployment via GitHub

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** > **fitai-web**
3. Click **Settings** > **Builds & deployments**
4. Connect GitHub repository:
   - Repository: `getSweetSpotcl/FitAI`
   - Branch: `main`
   - Build command: `cd apps/web && npm install && npm run build`
   - Build output directory: `apps/web/.next`

### 2. Configure Production Secrets for API

Run these commands to set real production values:

```bash
cd apps/api

# Set real database URL
wrangler secret put DATABASE_URL --env production

# Set secure JWT secret
wrangler secret put JWT_SECRET --env production

# Set OpenAI API key
wrangler secret put OPENAI_API_KEY --env production

# Set MercadoPago token
wrangler secret put MERCADOPAGO_ACCESS_TOKEN --env production
```

### 3. Configure Custom Domains

#### For API (api.fitai.cl):
1. Go to Workers & Pages > fitai-api > Custom Domains
2. Add domain: `api.fitai.cl`
3. Update DNS records in your domain provider

#### For Web (app.fitai.cl or fitai.cl):
1. Go to Workers & Pages > fitai-web > Custom Domains
2. Add domain: `app.fitai.cl` or `fitai.cl`
3. Update DNS records

### 4. Update Environment Variables

In Cloudflare Pages (fitai-web):
1. Go to Settings > Environment variables
2. Add: `NEXT_PUBLIC_API_URL = https://api.fitai.cl` (once domain is configured)

### 5. Deploy to Production

For API:
```bash
cd apps/api
wrangler deploy --env production
```

## 🔗 Important URLs

- **GitHub Repository**: https://github.com/getSweetSpotcl/FitAI
- **API Development**: https://fitai-api.sweetspot-627.workers.dev
- **API Health Check**: https://fitai-api.sweetspot-627.workers.dev/health
- **Cloudflare Dashboard**: https://dash.cloudflare.com

## 📊 Current Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Cloudflare    │     │   Cloudflare    │
│     Pages       │     │    Workers      │
│                 │     │                 │
│  Next.js Web    │────▶│   Hono.js API   │
│   Frontend      │     │    Backend      │
└─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
    Static Assets           KV Storage
    HTML/CSS/JS            Cache/Sessions
                                 │
                                 ▼
                          External Services
                          - PostgreSQL (Neon)
                          - OpenAI API
                          - MercadoPago

```

## 🛠️ Maintenance Commands

### View API Logs
```bash
cd apps/api
wrangler tail
```

### Update API
```bash
cd apps/api
# Make changes
wrangler deploy
```

### Update Web Frontend
```bash
# Just push to GitHub - it auto-deploys!
git push origin main
```

## 📝 Notes

- API is currently using test secrets - update before going to production
- Frontend deployment via GitHub is recommended for automatic CI/CD
- Both services are on the free tier of Cloudflare (generous limits)
- SSL certificates are automatically provisioned by Cloudflare