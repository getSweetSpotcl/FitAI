# Configuración de Dominio getfitia.com en Cloudflare

## 1. Configuración DNS en Cloudflare

### Registros DNS requeridos:

```dns
# Root domain - Web frontend
getfitia.com          A/CNAME    100.0.0.1 (or your Cloudflare IP)

# WWW redirect to root
www.getfitia.com      CNAME      getfitia.com

# API subdomain
api.getfitia.com      CNAME      getfitia.com

# Staging environments  
staging.getfitia.com      CNAME  getfitia.com
api-staging.getfitia.com  CNAME  getfitia.com
```

## 2. Configuración en Cloudflare Dashboard

### A. Workers Routes Configuration

1. **Go to Workers & Pages > Manage Workers**
2. **Configure Custom Domains for each worker:**

**API Production (fitai-api-production):**
- Custom Domain: `api.getfitia.com`
- Route: `api.getfitia.com/*`

**API Staging (fitai-api-staging):**
- Custom Domain: `api-staging.getfitia.com` 
- Route: `api-staging.getfitia.com/*`

**Web Production (fitai-web-production):**
- Custom Domain: `getfitia.com`
- Route: `getfitia.com/*`
- Additional Route: `www.getfitia.com/*` → redirect to `getfitia.com`

**Web Staging (fitai-web-staging):**
- Custom Domain: `staging.getfitia.com`
- Route: `staging.getfitia.com/*`

### B. SSL/TLS Configuration

1. **SSL/TLS tab > Overview**
   - Set encryption mode to "Full (strict)"
   - Enable "Always Use HTTPS"

2. **SSL/TLS tab > Edge Certificates**
   - Enable "Always Use HTTPS"
   - Enable "HTTP Strict Transport Security (HSTS)"
   - Enable "Automatic HTTPS Rewrites"

### C. Page Rules (Optional Performance)

```
# Cache static assets
getfitia.com/_next/static/*
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month

# Cache API responses (selective)
api.getfitia.com/api/v1/exercises
- Cache Level: Cache Everything  
- Edge Cache TTL: 1 hour
```

## 3. Secrets Configuration

### Required Secrets in Cloudflare Workers:

```bash
# Production Environment
wrangler secret put DATABASE_URL --env production
wrangler secret put REDIS_URL --env production
wrangler secret put CLERK_SECRET_KEY --env production
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put MERCADOPAGO_ACCESS_TOKEN --env production

# Staging Environment
wrangler secret put DATABASE_URL --env staging
wrangler secret put REDIS_URL --env staging  
wrangler secret put CLERK_SECRET_KEY --env staging
wrangler secret put OPENAI_API_KEY --env staging
wrangler secret put MERCADOPAGO_ACCESS_TOKEN --env staging
```

## 4. GitHub Secrets for CI/CD

Add these secrets to your GitHub repository:

```
CLOUDFLARE_API_TOKEN     # Cloudflare API token with Workers:Edit permissions
SLACK_WEBHOOK_URL        # Optional: For deployment notifications
```

## 5. Verification Commands

After setup, verify everything works:

```bash
# Test API endpoints
curl https://api.getfitia.com/health
curl https://api-staging.getfitia.com/health

# Test web endpoints  
curl -I https://getfitia.com
curl -I https://staging.getfitia.com

# Test redirects
curl -I https://www.getfitia.com # Should redirect to getfitia.com
```

## 6. Migration from Current Setup

```bash
# 1. Deploy to new domains (keeping old ones active)
cd apps/api && npm run deploy:production
cd apps/web && npm run deploy:production

# 2. Update API URLs in web frontend
# (Already configured in wrangler.toml environment variables)

# 3. Test new domains thoroughly

# 4. Update DNS to point to new workers (if needed)

# 5. Deprecate old .workers.dev endpoints
```

## 7. Monitoring Setup

- **Cloudflare Analytics**: Enabled automatically for custom domains
- **Workers Analytics**: Available in Cloudflare dashboard
- **Uptime Monitoring**: Set up external monitoring for critical endpoints
- **Error Tracking**: Configure Sentry for production error tracking

## 8. Performance Optimization

```toml
# In wrangler.toml - already configured
[env.production]
compatibility_flags = ["nodejs_compat"]
minify = true

# Cache headers for static assets
Cache-Control: public, max-age=31536000, immutable
```

## 9. Security Headers

Will be automatically applied via Cloudflare:
- SSL/TLS encryption
- DDoS protection  
- Bot fight mode
- Security headers (HSTS, etc.)