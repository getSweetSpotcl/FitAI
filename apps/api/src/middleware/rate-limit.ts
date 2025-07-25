import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { createRedisClient, MockRedis } from "../lib/redis-helper";

export interface RateLimitConfig {
  requests: number;
  window: "1s" | "10s" | "1m" | "10m" | "1h" | "1d";
  prefix?: string;
}

// Default rate limits by plan
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: { requests: 100, window: "1h" },
  premium: { requests: 1000, window: "1h" },
  pro: { requests: 5000, window: "1h" },
  public: { requests: 50, window: "10m" }, // For unauthenticated endpoints
};

// Specific endpoint limits
export const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  "/api/v1/ai/generate-routine": {
    requests: 10,
    window: "1h",
    prefix: "ai-routine",
  },
  "/api/v1/ai/workout-advice": {
    requests: 30,
    window: "1h",
    prefix: "ai-advice",
  },
  "/api/v1/payments/create-preference": {
    requests: 5,
    window: "10m",
    prefix: "payment",
  },
  "/api/v1/health/sync": {
    requests: 100,
    window: "10m",
    prefix: "health-sync",
  },
};

export function createRateLimiter(redis: Redis, config: RateLimitConfig) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: config.prefix || "fitai-rl",
  });
}

export function rateLimitMiddleware(
  config?: RateLimitConfig | ((c: Context) => RateLimitConfig)
) {
  return async (c: Context, next: Next) => {
    // Skip rate limiting in test environment
    if (c.env?.ENVIRONMENT === "test") {
      return next();
    }

    // Try to create Redis client
    const redisClient = createRedisClient(c.env);
    
    // Skip rate limiting if Redis is not available
    if (!redisClient) {
      if (c.env?.ENVIRONMENT === "development") {
        // In development, just warn and continue
        console.warn("Rate limiting disabled: Redis not configured");
        return next();
      } else {
        // In production, this is an error
        console.error("Redis not configured in production!");
        throw new HTTPException(500, {
          message: "Service configuration error",
        });
      }
    }

    const redis = redisClient as Redis;

    // Determine rate limit config
    let limitConfig: RateLimitConfig;

    if (typeof config === "function") {
      limitConfig = config(c);
    } else if (config) {
      limitConfig = config;
    } else {
      // Default based on user plan or public limit
      const user = c.get("user");
      limitConfig = user
        ? RATE_LIMITS[user.plan] || RATE_LIMITS.free
        : RATE_LIMITS.public;
    }

    // Check for specific endpoint limits
    const path = c.req.path;
    const endpointLimit = ENDPOINT_LIMITS[path];
    if (endpointLimit) {
      limitConfig = endpointLimit;
    }

    // Create rate limiter
    const limiter = createRateLimiter(redis, limitConfig);

    // Generate identifier
    const user = c.get("user");
    const identifier =
      user?.userId || c.req.header("cf-connecting-ip") || "anonymous";

    // Check rate limit
    const { success, limit, reset, remaining } =
      await limiter.limit(identifier);

    // Add rate limit headers
    c.header("X-RateLimit-Limit", limit.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());
    c.header("X-RateLimit-Reset", new Date(reset).toISOString());

    if (!success) {
      const logger = c.get("logger");
      logger?.warn("Rate limit exceeded", {
        userId: user?.userId,
        path: c.req.path,
        identifier,
        metadata: { limit, remaining: 0 },
      });

      throw new HTTPException(429, {
        message: "Demasiadas solicitudes. Por favor, intenta más tarde.",
        res: c.json(
          {
            success: false,
            error: "RATE_LIMIT_EXCEEDED",
            message: "Demasiadas solicitudes. Por favor, intenta más tarde.",
            retryAfter: new Date(reset).toISOString(),
          },
          429
        ),
      });
    }

    await next();
  };
}

// DDoS protection middleware
export function ddosProtectionMiddleware() {
  return async (c: Context, next: Next) => {
    // Check for suspicious patterns
    const userAgent = c.req.header("user-agent") || "";
    const _referer = c.req.header("referer") || "";

    // Block requests without user agent
    if (!userAgent) {
      throw new HTTPException(403, {
        message: "Forbidden",
      });
    }

    // Block known bad user agents
    const badAgents = ["bot", "crawler", "spider", "scraper"];
    if (badAgents.some((agent) => userAgent.toLowerCase().includes(agent))) {
      throw new HTTPException(403, {
        message: "Forbidden",
      });
    }

    // Check request size for POST/PUT requests
    if (["POST", "PUT", "PATCH"].includes(c.req.method)) {
      const contentLength = c.req.header("content-length");
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (contentLength && parseInt(contentLength) > maxSize) {
        throw new HTTPException(413, {
          message: "Payload too large",
        });
      }
    }

    // Add security headers
    c.header("X-Frame-Options", "DENY");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-XSS-Protection", "1; mode=block");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    await next();
  };
}

// IP-based blocking for severe abuse
export function ipBlockingMiddleware(blockedIPs: Set<string>) {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for") ||
      "unknown";

    if (blockedIPs.has(ip)) {
      throw new HTTPException(403, {
        message: "Forbidden",
      });
    }

    await next();
  };
}

// Cloudflare-specific protections
export function cloudflareProtectionMiddleware() {
  return async (c: Context, next: Next) => {
    // Check Cloudflare headers
    const cfRay = c.req.header("cf-ray");
    const cfCountry = c.req.header("cf-ipcountry");

    // Block requests from certain countries if needed
    const blockedCountries = ["XX"]; // Example: block unknown countries
    if (cfCountry && blockedCountries.includes(cfCountry)) {
      throw new HTTPException(403, {
        message: "Service not available in your region",
      });
    }

    // Log Cloudflare Ray ID for debugging
    const logger = c.get("logger");
    if (cfRay && logger) {
      logger.debug("Cloudflare request", {
        metadata: {
          cfRay,
          cfCountry,
        },
      });
    }

    await next();
  };
}
