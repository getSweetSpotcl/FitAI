import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: ['http://localhost:8081', 'https://app.fitai.cl'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'FitAI API Test',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Simple auth endpoints for testing
app.post('/api/v1/auth/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    // Mock response
    return c.json({
      user: {
        id: 'test-user-123',
        email,
        name,
        plan: 'free'
      },
      token: 'mock-jwt-token-123'
    }, 201);
  } catch (error) {
    return c.json({ error: 'Registration failed', message: error.message }, 500);
  }
});

app.post('/api/v1/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Mock response
    return c.json({
      user: {
        id: 'test-user-123',
        email,
        name: 'Test User',
        plan: 'free'
      },
      token: 'mock-jwt-token-123'
    }, 200);
  } catch (error) {
    return c.json({ error: 'Login failed', message: error.message }, 500);
  }
});

export default app;