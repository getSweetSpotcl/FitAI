import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';

type Bindings = {
  JWT_SECRET: string;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: 'free' | 'premium' | 'pro';
  };
};

export const authMiddleware = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>, 
  next: Next
) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HTTPException(401, { 
        message: 'Missing or invalid authorization header' 
      });
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, c.env.JWT_SECRET || 'default-secret');

    // Set user in context
    c.set('user', {
      id: payload.id as string,
      email: payload.email as string,
      plan: (payload.plan as 'free' | 'premium' | 'pro') || 'free',
    });

    await next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    throw new HTTPException(401, { 
      message: 'Invalid or expired token' 
    });
  }
};