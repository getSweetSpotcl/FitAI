import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Import routes
import authRoutes from './routes/auth';
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

// Types for Cloudflare Workers environment
type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  REDIS_URL: string;
  OPENAI_API_KEY: string;
  JWT_SECRET: string;
  MERCADOPAGO_ACCESS_TOKEN: string;
  ENVIRONMENT: string;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: 'free' | 'premium' | 'pro';
  };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:8081', 'https://app.fitai.cl'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'FitAI API',
    version: '1.2.1',
    status: 'healthy',
    deployment: 'wrangler-explicit-entry-deploy',
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

// API Routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/workouts', workoutRoutes);
app.route('/api/v1/exercises', exerciseRoutes);
app.route('/api/v1/routines', routineRoutes);
app.route('/api/v1/ai', aiRoutes);
app.route('/api/v1/payments', paymentRoutes);
app.route('/api/v1/premium-ai', premiumAiRoutes);
app.route('/api/v1/health', healthRoutes);
app.route('/api/v1/analytics', analyticsRoutes);
app.route('/api/v1/social', socialRoutes);

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