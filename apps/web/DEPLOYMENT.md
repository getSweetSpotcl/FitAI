# FitAI Web Frontend - Cloudflare Pages Deployment

## Prerequisites

1. Cloudflare account
2. GitHub repository connected (https://github.com/getSweetSpotcl/FitAI)
3. API deployed to Cloudflare Workers

## Deployment Methods

### Method 1: GitHub Integration (Recommended)

1. **Go to Cloudflare Dashboard**
   - Navigate to Workers & Pages > Create application > Pages
   - Connect to Git

2. **Connect GitHub Repository**
   - Select GitHub account: getSweetSpotcl
   - Select repository: FitAI
   - Click "Begin setup"

3. **Configure Build Settings**
   - **Production branch**: main
   - **Build command**: `cd apps/web && npm install && npm run build`
   - **Build output directory**: `apps/web/.next`
   - **Root directory**: `/`
   - **Environment variables**:
     ```
     NEXT_PUBLIC_API_URL = https://fitai-api.sweetspot-627.workers.dev
     NODE_VERSION = 18.17.0
     ```

4. **Deploy**
   - Click "Save and Deploy"
   - Wait for build to complete (3-5 minutes)

### Method 2: Direct Upload with Wrangler

1. **Build Locally**
   ```bash
   cd apps/web
   npm install
   npm run build
   ```

2. **Deploy with Wrangler**
   ```bash
   npx wrangler pages deploy .next --project-name=fitai-web
   ```

### Method 3: Using Cloudflare Pages CLI

1. **Install Dependencies**
   ```bash
   cd apps/web
   npm install
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Deploy**
   ```bash
   npx wrangler pages deploy .next \
     --project-name fitai-web \
     --branch main \
     --commit-message "Deploy FitAI Web"
   ```

## Environment Variables

Set these in Cloudflare Pages dashboard:

| Variable | Value | Description |
|----------|-------|-------------|
| NEXT_PUBLIC_API_URL | https://fitai-api.sweetspot-627.workers.dev | API endpoint |
| NODE_VERSION | 18.17.0 | Node.js version |

## Custom Domain Setup

1. **Add Custom Domain**
   - Go to your Pages project > Custom domains
   - Add domain: `fitai.cl` or `app.fitai.cl`
   - Follow DNS instructions

2. **SSL Certificate**
   - Cloudflare provides automatic SSL
   - Wait 5-10 minutes for activation

## Build Configuration

The project uses:
- **Next.js 15.4.2** with App Router
- **React 19.1.0**
- **Tailwind CSS v4**
- **TypeScript**

## Troubleshooting

### Build Failures

1. **Node Version Issues**
   - Ensure NODE_VERSION=18.17.0 is set
   - Check .node-version file exists

2. **Module Resolution**
   - Clear cache: Settings > Caches > Purge Everything
   - Redeploy

3. **API Connection Issues**
   - Verify NEXT_PUBLIC_API_URL is correct
   - Check CORS settings in API

### Performance Optimization

1. **Enable Caching**
   - Go to Speed > Optimization
   - Enable Auto Minify
   - Enable Brotli compression

2. **Page Rules**
   - Cache static assets: `*.js`, `*.css`, `*.png`
   - Cache Level: Standard
   - Edge Cache TTL: 1 month

## Monitoring

1. **Analytics**
   - View in Cloudflare Pages > Analytics
   - Monitor Core Web Vitals

2. **Real User Monitoring**
   - Enable Web Analytics
   - Add tracking script to app

## Rollback

To rollback to a previous deployment:
1. Go to Deployments tab
2. Find previous successful deployment
3. Click "Rollback to this deployment"

## CI/CD Pipeline

The project automatically deploys on:
- Push to `main` branch (production)
- Pull requests (preview deployments)

Preview URLs format: `https://<hash>.fitai-web.pages.dev`