import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";

// Development-only authentication middleware
export function devAuth() {
  return async (c: Context, next: Next) => {
    // Only work in development
    if (c.env?.ENVIRONMENT !== "development") {
      throw new HTTPException(404, { message: "Not found" });
    }

    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HTTPException(401, { 
        message: "Authorization header required" 
      });
    }

    const token = authHeader.substring(7);

    try {
      // Verify the JWT token using our JWT_SECRET
      const payload = await verify(token, c.env.JWT_SECRET);
      
      // Set user data from the token payload
      c.set("user", {
        userId: payload.sub as string,
        email: payload.email as string,
        firstName: payload.firstName as string,
        lastName: payload.lastName as string,
        role: (payload.role as "user" | "admin") || "user",
        plan: (payload.plan as "free" | "premium" | "pro") || "free",
      });

      await next();
    } catch (error) {
      console.error("Dev auth error:", error);
      throw new HTTPException(401, { 
        message: "Invalid development token" 
      });
    }
  };
}

// Simple auth requirement (user must be logged in)
export function requireDevAuth() {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { 
        message: "Authentication required" 
      });
    }
    await next();
  };
}