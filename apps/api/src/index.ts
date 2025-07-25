import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
// Import custom middleware
import { loggingMiddleware } from "./lib/logger";
// Import Clerk middleware
import { clerkAuth, requireAuth } from "./middleware/clerk-auth";
import { smartAuth } from "./middleware/auth-helper";
import {
  cloudflareProtectionMiddleware,
  ddosProtectionMiddleware,
  rateLimitMiddleware,
} from "./middleware/rate-limit";
import aiRoutes from "./routes/ai";
import analyticsRoutes from "./routes/analytics";
import docsRoutes from "./routes/docs";
import exerciseRoutes from "./routes/exercises";
import { SQLOptimizer } from "./lib/sql-optimizer";
import healthRoutes from "./routes/health";
import paymentRoutes from "./routes/payments";
import premiumAiRoutes from "./routes/premium-ai";
import routineRoutes from "./routes/routines";
import socialRoutes from "./routes/social";
// Import routes
import userRoutes from "./routes/users";
import { createDatabaseClient } from "./db/database";
import webhookRoutes from "./routes/webhooks";
import workoutRoutes from "./routes/workouts";
import authDevRoutes from "./routes/auth-dev";
import { handleQueue, handleScheduled, triggerManualJob, getJobStatus } from "./lib/queue-handler";

// Types for Cloudflare Workers environment
type Bindings = {
  CACHE: KVNamespace;
  FITAI_QUEUE: Queue;
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
    role: "user" | "admin";
    plan: "free" | "premium" | "pro";
  };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Security and performance middleware
app.use("*", ddosProtectionMiddleware());
app.use("*", cloudflareProtectionMiddleware());
app.use("*", loggingMiddleware);
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:8081",
      "https://app.fitai.cl",
      "http://localhost:3000",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

// Global rate limiting
app.use("/api/*", rateLimitMiddleware());

// Health check
app.get("/", (c) => {
  return c.json({
    name: "FitAI API",
    version: "1.3.2",
    status: "healthy",
    deployment: "wrangler-toml-config-deploy",
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || "development",
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Database optimization endpoint (admin only)
app.post("/api/v1/admin/optimize-db", smartAuth(), async (c) => {
  const user = c.var.user;
  if (user?.role !== 'admin') {
    return c.json({ error: "Unauthorized - Admin access required" }, 403);
  }

  try {
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    const optimizer = new SQLOptimizer(sql);
    
    // Create optimal indexes
    await optimizer.createOptimalIndexes();
    
    // Perform maintenance
    await optimizer.performMaintenance();
    
    return c.json({
      success: true,
      message: "Database optimization completed successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database optimization error:", error);
    return c.json({
      error: "Database optimization failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Public Routes (no authentication required)
app.route("/api-docs", docsRoutes); // API Documentation
app.route("/api/v1/webhooks", webhookRoutes);
app.route("/api/v1/exercises", exerciseRoutes); // Public exercise catalog
app.route("/api/v1/health", healthRoutes); // Public health check

// Development-only auth endpoints
app.route("/api/v1/auth/dev", authDevRoutes);

// Protected Routes (authentication required)
app.use("/api/v1/users/*", smartAuth());
app.route("/api/v1/users", userRoutes);

app.use("/api/v1/workouts/*", smartAuth());
app.route("/api/v1/workouts", workoutRoutes);

app.use("/api/v1/routines/*", smartAuth());
app.route("/api/v1/routines", routineRoutes);

app.use("/api/v1/ai/*", smartAuth());
app.route("/api/v1/ai", aiRoutes);

app.use("/api/v1/payments/*", smartAuth());
app.route("/api/v1/payments", paymentRoutes);

app.use("/api/v1/social/*", smartAuth());
app.route("/api/v1/social", socialRoutes);

// Premium Routes (premium/pro plan required)
app.use("/api/v1/premium-ai/*", smartAuth());
app.route("/api/v1/premium-ai", premiumAiRoutes);

// Analytics Routes (authenticated users)
app.use("/api/v1/analytics/*", smartAuth());
app.route("/api/v1/analytics", analyticsRoutes);

// Background Jobs Management (admin only)
app.post("/api/v1/admin/jobs/trigger", smartAuth(), async (c) => {
  const user = c.var.user;
  if (user?.role !== 'admin') {
    return c.json({ error: "Unauthorized - Admin access required" }, 403);
  }

  try {
    const { jobType, data } = await c.req.json();
    const result = await triggerManualJob(jobType, data, c.env);
    
    return c.json(result);
  } catch (error) {
    console.error("Manual job trigger error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/v1/admin/jobs/:jobId/status", smartAuth(), async (c) => {
  const user = c.var.user;
  if (user?.role !== 'admin') {
    return c.json({ error: "Unauthorized - Admin access required" }, 403);
  }

  try {
    const jobId = c.req.param("jobId");
    const status = await getJobStatus(jobId, c.env);
    
    return c.json({
      success: true,
      jobId,
      ...status
    });
  } catch (error) {
    console.error("Job status check error:", error);
    return c.json({
      error: "Failed to check job status",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: "Not Found",
      message: "The requested endpoint does not exist",
      path: c.req.path,
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json(
    {
      error: "Internal Server Error",
      message: err.message || "Something went wrong",
    },
    500
  );
});

export default app;
