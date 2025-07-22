# FitAI API Deployment Guide - Cloudflare Workers

## Prerequisites

1. Cloudflare account with Workers enabled
2. Wrangler CLI installed (`npm install -g wrangler`)
3. Database setup (Neon PostgreSQL or Cloudflare D1)

## Setup Steps

### 1. Login to Cloudflare

```bash
wrangler login
```

### 2. Create KV Namespaces

```bash
# Development KV namespace
wrangler kv:namespace create "CACHE" --preview

# Production KV namespace
wrangler kv:namespace create "CACHE" --env production

# Staging KV namespace
wrangler kv:namespace create "CACHE" --env staging
```

Copy the IDs from the output and update `wrangler.toml`.

### 3. Set Environment Secrets

```bash
# Database URL (required)
wrangler secret put DATABASE_URL
# Enter: postgresql://user:password@host/database

# JWT Secret (required)
wrangler secret put JWT_SECRET
# Enter: your-secure-jwt-secret

# OpenAI API Key (required for AI features)
wrangler secret put OPENAI_API_KEY
# Enter: sk-...

# MercadoPago Access Token (required for payments)
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
# Enter: APP_USR-...

# Redis URL (optional - for advanced caching)
wrangler secret put REDIS_URL
# Enter: redis://...
```

For production environment:
```bash
wrangler secret put DATABASE_URL --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put MERCADOPAGO_ACCESS_TOKEN --env production
```

### 4. Deploy

#### Development Deploy
```bash
npm run deploy
```

#### Production Deploy
```bash
wrangler deploy --env production
```

#### Staging Deploy
```bash
wrangler deploy --env staging
```

### 5. Test the Deployment

```bash
# Test health endpoint
curl https://fitai-api.workers.dev/health

# Test main endpoint
curl https://fitai-api.workers.dev/
```

## Custom Domain Setup

1. Go to Cloudflare Dashboard > Workers & Pages
2. Select your worker
3. Go to "Custom Domains" tab
4. Add your domain (e.g., `api.fitai.cl`)
5. Follow DNS configuration instructions

## Database Options

### Option 1: Neon PostgreSQL (Recommended)
- Create account at https://neon.tech
- Create a new project
- Copy the connection string
- Set as DATABASE_URL secret

### Option 2: Cloudflare D1 (Beta)
```bash
# Create D1 database
wrangler d1 create fitai-db

# Update wrangler.toml with the database_id
# Run migrations
wrangler d1 execute fitai-db --file=./src/db/schema.sql
```

## Monitoring

1. View logs:
```bash
wrangler tail
```

2. View metrics in Cloudflare Dashboard:
- Go to Workers & Pages > Analytics
- Monitor requests, errors, and performance

## Troubleshooting

### Common Issues

1. **KV namespace not found**
   - Ensure you've created the namespaces and updated the IDs in wrangler.toml

2. **Database connection errors**
   - Verify DATABASE_URL is set correctly
   - Check if database allows connections from Cloudflare IPs

3. **JWT errors**
   - Ensure JWT_SECRET is set and matches across environments

4. **CORS issues**
   - Update allowed origins in src/index.ts

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| JWT_SECRET | Yes | Secret for JWT token signing |
| OPENAI_API_KEY | Yes | OpenAI API key for AI features |
| MERCADOPAGO_ACCESS_TOKEN | Yes | MercadoPago access token |
| REDIS_URL | No | Redis connection for caching |
| ENVIRONMENT | Auto | Set by wrangler.toml |