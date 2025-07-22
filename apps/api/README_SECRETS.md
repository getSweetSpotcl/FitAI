# FitAI API - Quick Secret Setup

## Required Secrets

Run these commands to set up the required secrets:

### 1. Database URL
```bash
wrangler secret put DATABASE_URL
```
Enter your PostgreSQL connection string (e.g., from Neon.tech)

### 2. JWT Secret
```bash
wrangler secret put JWT_SECRET
```
Enter a secure random string (you can generate one at https://randomkeygen.com/)

### 3. OpenAI API Key
```bash
wrangler secret put OPENAI_API_KEY
```
Enter your OpenAI API key from https://platform.openai.com/api-keys

### 4. MercadoPago Access Token
```bash
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
```
Enter your MercadoPago access token from https://www.mercadopago.com/developers/

## For Production

Add `--env production` to each command:
```bash
wrangler secret put DATABASE_URL --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put MERCADOPAGO_ACCESS_TOKEN --env production
```

## Test Values for Development

If you want to test the deployment without real services:

1. **DATABASE_URL**: Use a test PostgreSQL URL or set up a free database at https://neon.tech
2. **JWT_SECRET**: Use any random string like "test-jwt-secret-123"
3. **OPENAI_API_KEY**: Use "sk-test-key" (AI features won't work)
4. **MERCADOPAGO_ACCESS_TOKEN**: Use "TEST-token" (payments won't work)