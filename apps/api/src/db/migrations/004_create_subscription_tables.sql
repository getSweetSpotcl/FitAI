-- Migration: Create subscription and payment tables
-- Description: Tables for managing MercadoPago subscriptions and payment history

-- Subscription intents table (tracks payment preferences before completion)
CREATE TABLE IF NOT EXISTS subscription_intents (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  preference_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Active subscriptions table
CREATE TABLE IF NOT EXISTS payment_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused', 'expired')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(5) DEFAULT 'CLP',
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  started_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Payment history table (tracks all payments)
CREATE TABLE IF NOT EXISTS payment_history (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  subscription_id VARCHAR(255),
  mp_payment_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(5) DEFAULT 'CLP',
  status VARCHAR(50) NOT NULL,
  payment_method VARCHAR(100),
  external_reference VARCHAR(255),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES payment_subscriptions(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_intents_user_id ON subscription_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_intents_status ON subscription_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_subscriptions_user_id ON payment_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_subscriptions_status ON payment_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_mp_payment_id ON payment_history(mp_payment_id);

-- Add plan column to users table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'plan') THEN
    ALTER TABLE users ADD COLUMN plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'pro'));
  END IF;
END $$;