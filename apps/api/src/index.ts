import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';

// Import custom middleware
import { loggingMiddleware, createLogger } from './lib/logger';
import { rateLimitMiddleware, ddosProtectionMiddleware, cloudflareProtectionMiddleware } from './middleware/rate-limit';
import { cacheMiddleware } from './lib/cache';

// Import routes
import userRoutes from './routes/users';
import workoutRoutes from './routes/workouts';
import exerciseRoutes from './routes/exercises';
import routineRoutes from './routes/routines';
import aiRoutes from './routes/ai';
import paymentRoutes from './routes/payments';
import premiumAiRoutes from './routes/premium-ai';
import healthRoutes from './routes/health';
import analyticsRoutes from './routes/analytics';
import socialRoutes from './routes/social';
import webhookRoutes from './routes/webhooks';

// Import Clerk middleware
import { clerkAuth, requireAuth, requireAdmin } from './middleware/clerk-auth';

// Types for Cloudflare Workers environment
type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  REDIS_URL: string;
  UPSTASH_REDIS_URL: string;
  UPSTASH_REDIS_TOKEN: string;
  OPENAI_API_KEY: string;
  CLERK_SECRET_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  MERCADOPAGO_ACCESS_TOKEN: string;
  ENVIRONMENT: string;
};

type Variables = {
  user?: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'user' | 'admin';
    plan: 'free' | 'premium' | 'pro';
  };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Security and performance middleware
app.use('*', ddosProtectionMiddleware());
app.use('*', cloudflareProtectionMiddleware());
app.use('*', loggingMiddleware);
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:8081', 'https://app.fitai.cl', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// Global rate limiting
app.use('/api/*', rateLimitMiddleware());

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'FitAI API',
    version: '1.3.2',
    status: 'healthy',
    deployment: 'wrangler-toml-config-deploy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development'
  });
});

app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// Public Routes (no authentication required)
app.route('/api/v1/webhooks', webhookRoutes);
app.route('/api/v1/exercises', exerciseRoutes); // Public exercise catalog
app.route('/api/v1/health', healthRoutes); // Public health check

// Protected Routes (authentication required)
app.use('/api/v1/users/*', clerkAuth(), requireAuth());
app.route('/api/v1/users', userRoutes);

app.use('/api/v1/workouts/*', clerkAuth(), requireAuth());
app.route('/api/v1/workouts', workoutRoutes);

app.use('/api/v1/routines/*', clerkAuth(), requireAuth());
app.route('/api/v1/routines', routineRoutes);

app.use('/api/v1/ai/*', clerkAuth(), requireAuth());
app.route('/api/v1/ai', aiRoutes);

app.use('/api/v1/payments/*', clerkAuth(), requireAuth());
app.route('/api/v1/payments', paymentRoutes);

app.use('/api/v1/social/*', clerkAuth(), requireAuth());
app.route('/api/v1/social', socialRoutes);

// Premium Routes (premium/pro plan required)
app.use('/api/v1/premium-ai/*', clerkAuth(), requireAuth());
app.route('/api/v1/premium-ai', premiumAiRoutes);

// Analytics Routes (authenticated users)
app.use('/api/v1/analytics/*', clerkAuth(), requireAuth());
app.route('/api/v1/analytics', analyticsRoutes);


// 404 handler
app.notFound((c) => {
  return c.json({ 
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: c.req.path
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ 
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  }, 500);
});

export default app;