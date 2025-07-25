import type { Context } from "hono";
import { clerkAuth, requireAuth } from "./clerk-auth";
import { devAuth, requireDevAuth } from "./dev-auth";

// Helper function to choose the right auth middleware based on environment
export function getAuthMiddleware(c: Context) {
  const environment = c.env?.ENVIRONMENT;
  
  if (environment === "development") {
    return [devAuth(), requireDevAuth()];
  } else {
    return [clerkAuth(), requireAuth()];
  }
}

// Middleware that automatically chooses between dev and production auth
export function smartAuth() {
  return async (c: Context, next: any) => {
    const environment = c.env?.ENVIRONMENT;
    
    if (environment === "development") {
      // Use development auth
      const devAuthMiddleware = devAuth();
      const requireDevAuthMiddleware = requireDevAuth();
      
      await devAuthMiddleware(c, async () => {
        await requireDevAuthMiddleware(c, next);
      });
    } else {
      // Use production Clerk auth
      const clerkAuthMiddleware = clerkAuth();
      const requireAuthMiddleware = requireAuth();
      
      await clerkAuthMiddleware(c, async () => {
        await requireAuthMiddleware(c, next);
      });
    }
  };
}