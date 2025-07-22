# Configure GitHub Secrets for Automatic Deployment

## Step 1: Create Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template
4. Copy the token (save it securely!)

## Step 2: Configure GitHub Repository Secrets

Go to: https://github.com/getSweetSpotcl/FitAI/settings/secrets/actions

Add these secrets one by one:

### 1. CLOUDFLARE_API_TOKEN
- **Value**: Your Cloudflare API token from step 1

### 2. DATABASE_URL
- **Value**: Your PostgreSQL connection string
- **Example**: `postgresql://user:password@host.neon.tech/database?sslmode=require`
- **Get from**: Neon.tech, Supabase, or your PostgreSQL provider

### 3. JWT_SECRET
- **Value**: A secure random string
- **Generate**: Use https://randomkeygen.com/ (Fort Knox Passwords)
- **Example**: `kJ8n2mP9qR7sT4vW6xY8zA1bC3dE5fG7hI9jK0lM2nO4pQ6rS8tU0vW2xY4zA6b`

### 4. OPENAI_API_KEY
- **Value**: Your OpenAI API key
- **Get from**: https://platform.openai.com/api-keys
- **Format**: `sk-...`

### 5. MERCADOPAGO_ACCESS_TOKEN
- **Value**: Your MercadoPago access token
- **Get from**: https://www.mercadopago.com/developers/
- **Format**: `APP_USR-...`

## Step 3: Test the Deployment

After adding all secrets:

1. Go to the Actions tab: https://github.com/getSweetSpotcl/FitAI/actions
2. You should see a workflow run for your recent push
3. If it failed due to missing secrets, click "Re-run all jobs" after adding them

## Step 4: Manual Test (if needed)

You can trigger a manual deployment:

1. Go to Actions tab
2. Select "Deploy FitAI Monorepo"
3. Click "Run workflow"
4. Select the main branch
5. Click "Run workflow"

## Next Push Will Deploy Automatically!

Once secrets are configured, every push to main will:
- ✅ Deploy API automatically if `apps/api/` changes
- ✅ Deploy Web automatically via Cloudflare Pages (already configured)

## Verify Deployment

After successful deployment:
- **API**: Will be available at a new Cloudflare Workers URL
- **Web**: Already available at Cloudflare Pages URL

Check the Actions tab for deployment URLs in the logs.

---

## Need Help?

If you encounter issues:
1. Check the Actions tab for error logs
2. Verify all secrets are added correctly (no extra spaces)
3. Make sure the Cloudflare API token has proper permissions