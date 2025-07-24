/**
 * Production Monitoring and Analytics
 * Cloudflare Workers integration with logging and error tracking
 */

export interface MonitoringEvent {
  event: string;
  timestamp: string;
  environment: string;
  userId?: string;
  metadata?: Record<string, any>;
  duration?: number;
  error?: string;
}

export class ProductionMonitoring {
  private environment: string;

  constructor(environment: string = "production") {
    this.environment = environment;
  }

  /**
   * Track API endpoint performance
   */
  async trackApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    userId?: string,
    error?: string
  ) {
    const event: MonitoringEvent = {
      event: "api_call",
      timestamp: new Date().toISOString(),
      environment: this.environment,
      userId,
      duration,
      error,
      metadata: {
        endpoint,
        method,
        statusCode,
      },
    };

    await this.sendEvent(event);
  }

  /**
   * Track AI service usage and costs
   */
  async trackAiUsage(
    userId: string,
    promptTokens: number,
    completionTokens: number,
    model: string,
    cost: number
  ) {
    const event: MonitoringEvent = {
      event: "ai_usage",
      timestamp: new Date().toISOString(),
      environment: this.environment,
      userId,
      metadata: {
        promptTokens,
        completionTokens,
        model,
        cost,
      },
    };

    await this.sendEvent(event);
  }

  /**
   * Track database query performance
   */
  async trackDatabaseQuery(
    query: string,
    duration: number,
    success: boolean,
    error?: string
  ) {
    const event: MonitoringEvent = {
      event: "db_query",
      timestamp: new Date().toISOString(),
      environment: this.environment,
      duration,
      error,
      metadata: {
        query: query.substring(0, 100), // Truncate for privacy
        success,
      },
    };

    await this.sendEvent(event);
  }

  /**
   * Track cache hit/miss rates
   */
  async trackCacheOperation(
    operation: "hit" | "miss" | "set" | "delete",
    key: string,
    duration?: number
  ) {
    const event: MonitoringEvent = {
      event: "cache_operation",
      timestamp: new Date().toISOString(),
      environment: this.environment,
      duration,
      metadata: {
        operation,
        key: key.substring(0, 50), // Truncate for privacy
      },
    };

    await this.sendEvent(event);
  }

  /**
   * Track user actions and feature usage
   */
  async trackUserAction(
    userId: string,
    action: string,
    metadata?: Record<string, any>
  ) {
    const event: MonitoringEvent = {
      event: "user_action",
      timestamp: new Date().toISOString(),
      environment: this.environment,
      userId,
      metadata: {
        action,
        ...metadata,
      },
    };

    await this.sendEvent(event);
  }

  /**
   * Track payment events
   */
  async trackPayment(
    userId: string,
    amount: number,
    currency: string,
    status: string,
    paymentMethod: string
  ) {
    const event: MonitoringEvent = {
      event: "payment",
      timestamp: new Date().toISOString(),
      environment: this.environment,
      userId,
      metadata: {
        amount,
        currency,
        status,
        paymentMethod,
      },
    };

    await this.sendEvent(event);
  }

  /**
   * Send monitoring event to analytics service
   */
  private async sendEvent(event: MonitoringEvent) {
    try {
      // In production, this would send to your analytics service
      // For now, we'll use Cloudflare Analytics and console logging

      if (this.environment === "production") {
        // Send to external analytics service (e.g., Mixpanel, Amplitude)
        // await this.sendToAnalytics(event);

        // Log to Cloudflare Workers logs
        console.log("ANALYTICS_EVENT", JSON.stringify(event));
      } else {
        // Development/staging logging
        console.log("MONITORING_EVENT", event);
      }
    } catch (error) {
      // Never let monitoring break the main application
      console.error("Failed to send monitoring event:", error);
    }
  }

  /**
   * Health check for monitoring system
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.trackApiCall("/health", "GET", 200, 10);
      return true;
    } catch (error) {
      console.error("Monitoring health check failed:", error);
      return false;
    }
  }
}

/**
 * Performance middleware for Hono.js
 */
export function createMonitoringMiddleware(monitoring: ProductionMonitoring) {
  return async (c: any, next: any) => {
    const start = Date.now();
    const { method, url } = c.req;
    const endpoint = new URL(url).pathname;

    try {
      await next();

      const duration = Date.now() - start;
      const statusCode = c.res.status;
      const userId = c.get("userId"); // Assuming user ID is set in context

      await monitoring.trackApiCall(
        endpoint,
        method,
        statusCode,
        duration,
        userId
      );
    } catch (error) {
      const duration = Date.now() - start;
      const userId = c.get("userId");

      await monitoring.trackApiCall(
        endpoint,
        method,
        500,
        duration,
        userId,
        error instanceof Error ? error.message : "Unknown error"
      );

      throw error; // Re-throw to maintain error handling flow
    }
  };
}

/**
 * Custom error handler with monitoring
 */
export function createErrorHandler(monitoring: ProductionMonitoring) {
  return async (error: Error, c: any) => {
    const { method, url } = c.req;
    const endpoint = new URL(url).pathname;
    const userId = c.get("userId");

    await monitoring.trackApiCall(
      endpoint,
      method,
      500,
      0,
      userId,
      error.message
    );

    // Return appropriate error response
    return c.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred",
        timestamp: new Date().toISOString(),
      },
      500
    );
  };
}
