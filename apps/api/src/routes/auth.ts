import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { createDatabaseClient, getUserByEmail, createUser } from '../db/database';

type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  JWT_SECRET: string;
};

const auth = new Hono<{ Bindings: Bindings }>();

// Register endpoint
auth.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    // Validate input
    if (!email || !password || !name) {
      throw new HTTPException(400, { message: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      throw new HTTPException(400, { message: 'Password must be at least 6 characters' });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Check if user already exists
    const existingUser = await getUserByEmail(sql, email);
    if (existingUser) {
      throw new HTTPException(400, { message: 'User already exists with this email' });
    }

    // TODO: Hash password properly with bcrypt
    // For now, using a simple hash for demo
    const passwordHash = `$2b$10$dummy.hash.${Buffer.from(password).toString('base64')}`;

    // Create user in database
    const newUser = await createUser(sql, {
      email,
      password_hash: passwordHash,
      name,
      plan: 'free',
      last_login_at: new Date().toISOString(),
    });

    // Generate JWT token
    const payload = {
      id: newUser.id,
      email: newUser.email,
      plan: newUser.plan,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
    };

    const token = await sign(payload, c.env.JWT_SECRET || 'default-secret');

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = newUser;

    return c.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
      message: 'Usuario registrado exitosamente',
    }, 201);

  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Registration failed' });
  }
});

// Login endpoint
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    // Validate input
    if (!email || !password) {
      throw new HTTPException(400, { message: 'Email and password are required' });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get user from database
    const user = await getUserByEmail(sql, email);
    if (!user) {
      throw new HTTPException(401, { message: 'Invalid credentials' });
    }

    // TODO: Implement proper password verification with bcrypt
    // For now, doing simple verification for demo
    const expectedHash = `$2b$10$dummy.hash.${Buffer.from(password).toString('base64')}`;
    if (user.password_hash !== expectedHash) {
      throw new HTTPException(401, { message: 'Invalid credentials' });
    }

    // Update last login
    await sql`
      UPDATE users 
      SET last_login_at = NOW() 
      WHERE id = ${user.id}
    `;

    // Generate JWT token
    const payload = {
      id: user.id,
      email: user.email,
      plan: user.plan,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
    };

    const token = await sign(payload, c.env.JWT_SECRET || 'default-secret');

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;

    return c.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
      message: 'Inicio de sesión exitoso',
    });

  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Login failed' });
  }
});

// Token refresh endpoint
auth.post('/refresh', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, c.env.JWT_SECRET || 'default-secret');

    // Generate new token
    const newPayload = {
      id: payload.id,
      email: payload.email,
      plan: payload.plan,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
    };

    const newToken = await sign(newPayload, c.env.JWT_SECRET || 'default-secret');

    return c.json({
      success: true,
      data: {
        token: newToken,
      },
      message: 'Token refreshed successfully',
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }
});

// Logout endpoint (mainly for client-side cleanup)
auth.post('/logout', async (c) => {
  // In a stateless JWT setup, logout is mainly handled client-side
  // In production, you might want to implement token blacklisting
  return c.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default auth;