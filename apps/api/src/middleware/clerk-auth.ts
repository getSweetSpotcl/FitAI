import { verifyToken } from "@clerk/backend";
import type { MiddlewareHandler } from "hono";

// Types for Clerk user data
export interface ClerkUser {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "user" | "admin";
  plan: "free" | "premium" | "pro";
}

// Environment bindings for Clerk
interface ClerkBindings {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY?: string;
}

/**
 * Middleware to verify Clerk authentication tokens in Cloudflare Workers
 * Sets the user data in context variables for downstream handlers
 */
export const clerkAuth = (): MiddlewareHandler<{
  Bindings: ClerkBindings;
  Variables: {
    user?: ClerkUser;
  };
}> => {
  return async (c, next) => {
    try {
      // Extract Authorization header
      const authHeader = c.req.header("Authorization");

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json(
          { error: "Unauthorized - Missing or invalid Authorization header" },
          401
        );
      }

      const token = authHeader.replace("Bearer ", "");

      if (!token) {
        return c.json({ error: "Unauthorized - No token provided" }, 401);
      }

      // Verify token with Clerk
      const { sessionClaims } = await verifyToken(token, {
        secretKey: c.env.CLERK_SECRET_KEY,
      });

      if (!sessionClaims) {
        return c.json({ error: "Unauthorized - Invalid token" }, 401);
      }

      // Extract user information from session claims
      const userId = (sessionClaims as any).sub;
      const email = (sessionClaims as any)?.email || "";
      const firstName = (sessionClaims as any)?.given_name || "";
      const lastName = (sessionClaims as any)?.family_name || "";

      // Extract role from metadata (default to 'user')
      const userRole =
        (sessionClaims as any)?.metadata?.role ||
        (sessionClaims as any)?.publicMetadata?.role ||
        "user";

      // Extract plan from metadata (default to 'free')
      const userPlan =
        (sessionClaims as any)?.metadata?.plan ||
        (sessionClaims as any)?.publicMetadata?.plan ||
        "free";

      // Set user data in context
      const user: ClerkUser = {
        userId,
        email,
        firstName,
        lastName,
        role: userRole as "user" | "admin",
        plan: userPlan as "free" | "premium" | "pro",
      };

      c.set("user", user);

      // Continue to next middleware/handler
      await next();
    } catch (error) {
      console.error("Clerk auth error:", error);
      return c.json(
        {
          error: "Unauthorized - Token verification failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        401
      );
    }
  };
};

/**
 * Middleware to require authentication
 * Must be used after clerkAuth middleware
 */
export const requireAuth = (): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized - Authentication required" }, 401);
    }

    await next();
  };
};

/**
 * Middleware to require admin role
 * Must be used after clerkAuth middleware
 */
export const requireAdmin = (): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized - Authentication required" }, 401);
    }

    if (user.role !== "admin") {
      return c.json({ error: "Forbidden - Admin access required" }, 403);
    }

    await next();
  };
};

/**
 * Middleware to require premium or pro plan
 * Must be used after clerkAuth middleware
 */
export const requirePremium = (): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized - Authentication required" }, 401);
    }

    if (user.plan === "free") {
      return c.json(
        {
          error: "Upgrade Required - Premium plan required for this feature",
          upgradeUrl: "/api/v1/payments/plans",
        },
        402
      );
    }

    await next();
  };
};
