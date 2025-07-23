#!/bin/bash

# Script to set up production secrets for FitAI API
# Run this script to configure all production environment variables

echo "Setting up production secrets for FitAI API..."

# Database
echo "Setting DATABASE_URL..."
wrangler secret put DATABASE_URL --env production

# Clerk Auth
echo "Setting CLERK_SECRET_KEY..."
wrangler secret put CLERK_SECRET_KEY --env production

echo "Setting CLERK_WEBHOOK_SECRET..."
wrangler secret put CLERK_WEBHOOK_SECRET --env production

# OpenAI
echo "Setting OPENAI_API_KEY..."
wrangler secret put OPENAI_API_KEY --env production

# MercadoPago
echo "Setting MERCADOPAGO_ACCESS_TOKEN..."
wrangler secret put MERCADOPAGO_ACCESS_TOKEN --env production

# Redis
echo "Setting REDIS_URL..."
wrangler secret put REDIS_URL --env production

echo "Setting REDIS_TOKEN..."
wrangler secret put REDIS_TOKEN --env production

echo "All secrets configured! ✅"
echo ""
echo "To verify secrets are set, run:"
echo "wrangler secret list --env production"