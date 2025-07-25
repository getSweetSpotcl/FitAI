import { Hono } from "hono";
import { sign } from "hono/jwt";

type Bindings = {
  JWT_SECRET: string;
  ENVIRONMENT: string;
};

const authDev = new Hono<{ Bindings: Bindings }>();

// Development-only login endpoint
authDev.post("/login", async (c) => {
  // Only allow in development
  if (c.env.ENVIRONMENT !== "development") {
    return c.json({ error: "Not available in production" }, 404);
  }

  const { email, password } = await c.req.json();

  // Mock authentication - accept any credentials in dev
  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  // Create a mock JWT token
  const payload = {
    sub: "dev-user-123", // Mock user ID
    email: email,
    firstName: "Test",
    lastName: "User",
    role: "user",
    plan: "free",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
  };

  const token = await sign(payload, c.env.JWT_SECRET);

  return c.json({
    success: true,
    token,
    user: {
      id: "dev-user-123",
      email,
      firstName: "Test",
      lastName: "User",
      role: "user",
      plan: "free",
    },
    message: "Development token - DO NOT use in production",
  });
});

// Get mock token info
authDev.get("/token-info", async (c) => {
  if (c.env.ENVIRONMENT !== "development") {
    return c.json({ error: "Not available in production" }, 404);
  }

  return c.json({
    message: "To get a token in development:",
    option1: "Use the web app and get token from Clerk",
    option2: "POST to /api/v1/auth/dev/login with any email/password",
    example: {
      method: "POST",
      url: "/api/v1/auth/dev/login",
      body: {
        email: "test@example.com",
        password: "any-password",
      },
    },
  });
});

export default authDev;