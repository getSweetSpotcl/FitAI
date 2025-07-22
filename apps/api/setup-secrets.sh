#!/bin/bash

echo "🔐 FitAI API - Cloudflare Workers Secret Setup"
echo "============================================="
echo ""

# Function to set a secret
set_secret() {
    local secret_name=$1
    local description=$2
    local example=$3
    
    echo "📝 $description"
    echo "   Example: $example"
    echo ""
    
    # Development
    echo "Setting for development environment..."
    wrangler secret put $secret_name
    
    # Production
    read -p "Do you want to set this secret for production too? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Setting for production environment..."
        wrangler secret put $secret_name --env production
    fi
    
    echo ""
    echo "✅ $secret_name configured"
    echo "----------------------------------------"
    echo ""
}

# Check if we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ Error: wrangler.toml not found. Please run this script from the apps/api directory."
    exit 1
fi

echo "This script will help you set up the required secrets for FitAI API."
echo "Make sure you have the following information ready:"
echo "- Database connection string (PostgreSQL)"
echo "- JWT secret key"
echo "- OpenAI API key"
echo "- MercadoPago access token"
echo ""

read -p "Press any key to continue..." -n 1 -r
echo ""
echo ""

# Set up each secret
set_secret "DATABASE_URL" "PostgreSQL Database URL" "postgresql://user:password@host.neon.tech/database?sslmode=require"
set_secret "JWT_SECRET" "JWT Secret Key (use a strong random string)" "your-very-secure-jwt-secret-key-here"
set_secret "OPENAI_API_KEY" "OpenAI API Key" "sk-..."
set_secret "MERCADOPAGO_ACCESS_TOKEN" "MercadoPago Access Token" "APP_USR-..."

echo ""
echo "🎉 Secret setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy to development: npm run deploy"
echo "2. Deploy to production: wrangler deploy --env production"
echo "3. Test the API: curl https://fitai-api.workers.dev/health"
echo ""