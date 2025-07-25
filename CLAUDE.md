# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FitAI is an AI-powered fitness application built as a monorepo using React Native (mobile app) and Cloudflare Workers (backend API). The app is designed for the Chilean market with integrated MercadoPago payments and Spanish localization.

## Architecture

- **Monorepo**: Uses Turborepo for task orchestration and npm workspaces
- **Frontend**: React Native app with Expo SDK 53+ (latest: SDK 53), TypeScript 5.8+, Expo Router, Zustand 4.5+ for state management
- **Backend**: Cloudflare Workers with Hono.js 4.8+ framework, TypeScript 5.8+ end-to-end
- **Database**: Neon PostgreSQL (serverless) with Upstash Redis for caching
- **AI**: OpenAI GPT-4o-mini integration for workout routine generation
- **Payments**: MercadoPago integration for Chilean market
- **Health**: Apple HealthKit and Apple Watch integration

## Common Commands

```bash
# Development - run from project root
npm run dev                    # Start all apps in development mode
npm run build                  # Build all apps
npm run lint                  # Lint all code with Biome
npm run type-check            # TypeScript checking across all apps
npm run clean                 # Clean all build artifacts

# Mobile app specific (apps/mobile/)
cd apps/mobile
npx expo start                # Start Expo development server
npx expo start --ios         # Start with iOS simulator
npx expo start --android     # Start with Android emulator
npx expo build               # Export for production
npm run type-check            # TypeScript checking
npm run lint                  # Biome linting

# API specific (apps/api/)
cd apps/api
wrangler dev                  # Start Cloudflare Workers development server
wrangler deploy               # Deploy to Cloudflare Workers
npm run build                 # TypeScript compilation
npm run type-check            # TypeScript checking
npm run lint                  # Biome linting
```

## Key Directories

- `apps/mobile/`: React Native app with Expo
  - `app/`: Expo Router pages and navigation structure
  - `src/components/`: Reusable React Native components
  - `src/store/`: Zustand state management stores
  - `src/hooks/`: Custom React hooks
  - `src/services/`: API and external service integrations
- `apps/api/`: Cloudflare Workers backend
  - `src/routes/`: API route handlers organized by domain
  - `src/lib/`: Business logic and utility functions
  - `src/middleware/`: Authentication and request middleware
  - `src/db/`: Database schema and migrations
- `apps/web/`: Next.js admin panel (future feature)
- `docs/`: Comprehensive project documentation

## Technology Stack

- **Language**: TypeScript 5.8+ throughout
- **Mobile**: React Native 0.80+ + Expo SDK 53+
- **Backend**: Hono.js 4.8+ on Cloudflare Workers
- **State Management**: Zustand 4.5+ (mobile), native Hono context (API)
- **Navigation**: Expo Router (file-based routing)
- **Styling**: React Native StyleSheet (no external styling library)
- **Database**: Neon PostgreSQL + Upstash Redis
- **AI**: OpenAI GPT-4o-mini
- **Payments**: MercadoPago SDK
- **Health**: Apple HealthKit integration
- **Linting/Formatting**: Biome 2.0+ (configured in biome.json)

## Development Workflow

1. **Environment Setup**: Copy `.env.example` files in both `apps/mobile/` and `apps/api/` to `.env.local`
2. **Dependencies**: Run `npm install` from project root (handles all workspaces)
3. **Development**: Use `npm run dev` from root or start individual apps
4. **Code Quality**: All commits should pass `npm run lint` and `npm run type-check`
5. **Testing**: Individual apps have their own test configurations

## API Architecture

The API follows a modular route structure:

- `/api/v1/auth` - Authentication and user session management
- `/api/v1/users` - User profile and settings management
- `/api/v1/workouts` - Workout tracking and logging
- `/api/v1/routines` - Workout routine management
- `/api/v1/ai` - AI-powered workout generation
- `/api/v1/premium-ai` - Premium AI features for paid users
- `/api/v1/payments` - MercadoPago payment processing
- `/api/v1/health` - HealthKit data integration
- `/api/v1/analytics` - User analytics and progress tracking
- `/api/v1/social` - Social features and community

## Mobile App Structure

Uses Expo Router for file-based routing:

- `(tabs)/` - Bottom tab navigation (main app screens)
- `auth/` - Authentication screens (login/register)
- `ai/` - AI coach and routine generation screens
- `premium/` - Premium feature screens
- `health/` - Health data setup and management
- `workout/` - Active workout and workout selection
- `social/` - Community and social features

## Environment Variables

Required for development (check `.env.example` files):

- **API**: `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `JWT_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`
- **Mobile**: API endpoint URLs and any client-side configuration

## Code Style Guidelines

- **Formatting**: Handled by Biome 2.0+ with 2-space indentation
- **Import Organization**: Biome auto-organizes imports
- **TypeScript**: Strict mode enabled with TypeScript 5.8+, avoid `any` types
- **File Naming**: kebab-case for files, PascalCase for React components
- **API Routes**: RESTful conventions with proper HTTP status codes
- **Error Handling**: Consistent error responses with proper HTTP status codes
- **Never use MOCK Data**: Never use fake or mock data in the app. Always query the database.

## Best Practices and Version Updates (2025)

### Update Status (July 2025):

Successfully updated core dependencies:

- ✅ **TypeScript**: Updated from 5.3.0 to 5.8.3 across all workspaces
- ✅ **Hono.js**: Updated from 4.6.11 to 4.8.5 for performance improvements
- ✅ **Expo SDK**: Downgraded from 53 to 52.0.0 for better stability
- ✅ **React Native**: Using 0.76.9 (compatible with Expo SDK 52)
- ✅ **React**: Using 18.3.1 (stable version, compatible with RN 0.76.9)
- ✅ **Biome**: Already at 2.1.2 (current with Biome 2.0+)
- ✅ **Zustand**: Already at 4.5.0 (compatible with React 18)
- ✅ **AsyncStorage**: Using 1.23.1 (compatible with Expo SDK 52)

**Important**: Downgraded to Expo SDK 52 due to stability issues with SDK 53 and React Native 0.79.x on iOS with Hermes engine. SDK 52 provides better stability with React Native 0.76.x and React 18.

**Note**: After TypeScript update, the API package has errors related to stricter type checking with the Neon database client that need to be addressed.

## Cloudflare Workers Specifics

- **Runtime**: Node.js compatibility enabled in `wrangler.toml`
- **Environment**: Uses Cloudflare environment bindings (KV, secrets)
- **Development**: `wrangler dev` provides local development server
- **Deployment**: `wrangler deploy` handles production deployment
- **Bindings**: KV namespace for caching, environment variables for secrets

## AI and API Development Guidelines

- **Data Usage**: 
  - nunca uses datos mock n en la api ni en la web