# GitHub Actions Setup for Automatic Deployment

## Overview

This guide explains how to set up automatic deployment for the FitAI monorepo using GitHub Actions.

## Architecture

- **API (Cloudflare Workers)**: Deployed via GitHub Actions
- **Web (Cloudflare Pages)**: Deployed automatically via Cloudflare's GitHub integration

## Prerequisites

1. Cloudflare account with API token
2. Database setup (PostgreSQL)
3. API keys for external services (OpenAI, MercadoPago)

## Step 1: Create Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template or create custom token with these permissions:
   - Account: `Cloudflare Workers Scripts:Edit`
   - Account: `Account Settings:Read`
   - Zone: `Workers Routes:Edit` (if using custom domains)

4. Copy the token (you'll only see it once!)

## Step 2: Configure GitHub Secrets

Go to your repository settings: https://github.com/getSweetSpotcl/FitAI/settings/secrets/actions

Add these secrets:

### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token | `1234567890abcdef...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Secret for JWT signing | Any secure random string |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago access token | `APP_USR-...` |

### How to Add Secrets

1. Click "New repository secret"
2. Enter the secret name (exactly as shown above)
3. Enter the secret value
4. Click "Add secret"

## Step 3: Re-create API Project in Cloudflare

Since you deleted the API project, you need to create it again:

```bash
cd apps/api

# Login to Cloudflare
wrangler login

# Create KV namespaces
wrangler kv namespace create CACHE
# Save the ID and update wrangler.toml

wrangler kv namespace create CACHE --env production
# Save the ID and update wrangler.toml

# Create the worker (this will be done automatically by GitHub Actions)
# But you can test it locally:
wrangler deploy --dry-run
```

## Step 4: Update wrangler.toml

Make sure your `apps/api/wrangler.toml` has the correct KV namespace IDs:

```toml
name = "fitai-api"
main = "src/index.ts"
compatibility_date = "2024-12-30"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "development"

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_DEV_KV_ID"

[env.production]
name = "fitai-api-production"

[env.production.vars]
ENVIRONMENT = "production"

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "YOUR_PROD_KV_ID"
```

## How It Works

### Automatic Triggers

The deployment runs automatically when:
- You push to the `main` branch
- Changes are detected in relevant directories

### What Gets Deployed

- **API changes**: Deploys to Cloudflare Workers
- **Web changes**: Cloudflare Pages handles this automatically
- **Package changes**: Triggers both deployments

### Manual Deployment

You can also trigger deployments manually:
1. Go to Actions tab in GitHub
2. Select "Deploy FitAI Monorepo"
3. Click "Run workflow"

## Deployment Flow

```mermaid
graph LR
    A[Push to main] --> B{Check changes}
    B --> C[API changed?]
    B --> D[Web changed?]
    C --> E[GitHub Actions deploys API]
    D --> F[Cloudflare Pages auto-deploys]
    E --> G[API live on Workers]
    F --> H[Web live on Pages]
```

## Monitoring Deployments

### GitHub Actions
- Go to the [Actions tab](https://github.com/getSweetSpotcl/FitAI/actions)
- View deployment status and logs

### Cloudflare Dashboard
- **API**: Workers & Pages > fitai-api > Deployments
- **Web**: Workers & Pages > fitai-web > Deployments

## Troubleshooting

### API Deployment Fails

1. **Check GitHub Actions logs**
   - Click on the failed workflow run
   - Expand the failed step

2. **Common issues**:
   - Missing secrets in GitHub
   - Invalid Cloudflare API token
   - KV namespace IDs not updated in wrangler.toml

3. **Test locally**:
   ```bash
   cd apps/api
   wrangler deploy --dry-run
   ```

### Secrets Not Working

- Verify secret names match exactly (case-sensitive)
- Check that secrets don't have extra spaces
- Regenerate Cloudflare API token if needed

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Rotate secrets regularly**
3. **Use different secrets** for development and production
4. **Limit API token permissions** to only what's needed

## Next Steps

1. Push a small change to test the deployment
2. Monitor the Actions tab for the workflow run
3. Verify both API and Web are deployed correctly

## Support

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)