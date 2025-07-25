/**
 * Advanced Production Monitoring and Observability
 * Comprehensive monitoring with metrics, tracing, alerts, and analytics
 */

export interface MonitoringEvent {
  event: string;
  timestamp: string;
  environment: string;
  userId?: string;
  metadata?: Record<string, any>;
  duration?: number;
  error?: string;
  traceId?: string;
  spanId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: string;
  details?: Record<string, any>;
  error?: string;
}

export interface MetricSnapshot {
  name: string;
  value: number;
  timestamp: string;
  tags: Record<string, string>;
  unit?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export class ProductionMonitoring {
  private environment: string;
  private metrics: Map<string, MetricSnapshot[]> = new Map();
  private healthChecks: Map<string, HealthCheckResult> = new Map();
  private alertRules: AlertRule[] = [];
  private currentTraceId?: string;
  
  constructor(
    environment: string = "production",
    private redis?: any,
    private database?: any
  ) {
    this.environment = environment;
    this.initializeDefaultAlerts();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlerts(): void {
    this.alertRules = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        metric: 'http.request.error_rate',
        threshold: 0.05, // 5%
        operator: 'gt',
        severity: 'high',
        enabled: true
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        metric: 'http.request.duration.avg',
        threshold: 2000, // 2 seconds
        operator: 'gt',
        severity: 'medium',
        enabled: true
      },
      {
        id: 'database_errors',
        name: 'Database Connection Issues',
        metric: 'database.error_rate',
        threshold: 0.01, // 1%
        operator: 'gt',
        severity: 'critical',
        enabled: true
      },
      {
        id: 'ai_cost_spike',
        name: 'AI Cost Spike',
        metric: 'ai.cost.hourly',
        threshold: 10, // $10/hour
        operator: 'gt',
        severity: 'medium',
        enabled: true
      }
    ];
  }

  /**
   * Start distributed tracing for a request
   */
  startTrace(): string {
    this.currentTraceId = crypto.randomUUID();
    return this.currentTraceId;
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, tags: Record<string, string> = {}, unit?: string): void {
    const metric: MetricSnapshot = {
      name,
      value,
      timestamp: new Date().toISOString(),
      tags: {
        environment: this.environment,
        ...tags
      },
      unit
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(metric);

    // Keep only last 1000 values per metric
    if (values.length > 1000) {
      values.shift();
    }

    // Check alert rules
    this.checkAlertRules(name, value);

    // Send to external monitoring
    this.sendMetricToExternal(metric);
  }

  /**
   * Track API endpoint performance with enhanced metrics
   */
  async trackApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    userId?: string,
    error?: string
  ) {
    const isError = statusCode >= 400;
    const spanId = crypto.randomUUID();

    const event: MonitoringEvent = {
      event: "api_call",
      timestamp: new Date().toISOString(),
      environment: this.environment,
      userId,
      duration,
      error,
      traceId: this.currentTraceId,
      spanId,
      severity: isError ? (statusCode >= 500 ? 'high' : 'medium') : 'low',
      metadata: {
        endpoint,
        method,
        statusCode,
        isError,
        userType: userId ? 'authenticated' : 'anonymous'
      },
    };

    // Record detailed metrics
    this.recordMetric('http.request.duration', duration, {
      method,
      endpoint: this.sanitizeEndpoint(endpoint),
      status: statusCode.toString(),
      error: isError.toString()
    }, 'milliseconds');

    this.recordMetric('http.request.count', 1, {
      method,
      endpoint: this.sanitizeEndpoint(endpoint),
      status: statusCode.toString()
    });

    if (isError) {
      this.recordMetric('http.request.errors', 1, {
        method,
        endpoint: this.sanitizeEndpoint(endpoint),
        status: statusCode.toString(),
        error_type: error || 'unknown'
      });
    }

    // Track user-specific metrics
    if (userId) {
      this.recordMetric('user.api.calls', 1, { userId, endpoint: this.sanitizeEndpoint(endpoint) });
    }

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
   * Comprehensive health check for all services
   */
  async performHealthChecks(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {};

    // Database health check
    if (this.database) {
      results.database = await this.checkDatabaseHealth();
    }

    // Redis health check
    if (this.redis) {
      results.redis = await this.checkRedisHealth();
    }

    // API health check
    results.api = await this.checkApiHealth();

    // Store health check results
    for (const [service, result] of Object.entries(results)) {
      this.healthChecks.set(service, result);
      
      // Record health metrics
      this.recordMetric('health.service.status', result.status === 'healthy' ? 1 : 0, {
        service,
        status: result.status
      });

      this.recordMetric('health.service.response_time', result.responseTime, {
        service
      }, 'milliseconds');
    }

    return results;
  }

  /**
   * Get metrics dashboard data
   */
  getMetricsDashboard(timeframe: number = 3600000): any {
    const cutoff = new Date(Date.now() - timeframe);
    const dashboard = {
      timestamp: new Date().toISOString(),
      timeframe_ms: timeframe,
      overview: {
        total_requests: 0,
        error_rate: 0,
        avg_response_time: 0,
        active_users: new Set<string>()
      },
      metrics: {} as any,
      alerts: {
        active: 0,
        critical: 0
      },
      services: Object.fromEntries(this.healthChecks.entries())
    };

    // Calculate overview metrics
    for (const [name, values] of this.metrics.entries()) {
      const recentValues = values.filter(v => new Date(v.timestamp) >= cutoff);
      
      if (recentValues.length > 0) {
        const nums = recentValues.map(v => v.value);
        dashboard.metrics[name] = {
          count: recentValues.length,
          sum: nums.reduce((a, b) => a + b, 0),
          avg: nums.reduce((a, b) => a + b, 0) / nums.length,
          min: Math.min(...nums),
          max: Math.max(...nums),
          latest: recentValues[recentValues.length - 1].value,
          unit: recentValues[0].unit
        };

        // Calculate overview stats
        if (name === 'http.request.count') {
          dashboard.overview.total_requests += dashboard.metrics[name].sum;
        }
        if (name === 'http.request.duration') {
          dashboard.overview.avg_response_time = dashboard.metrics[name].avg;
        }
      }
    }

    // Calculate error rate
    const totalRequests = dashboard.overview.total_requests;
    const totalErrors = dashboard.metrics['http.request.errors']?.sum || 0;
    dashboard.overview.error_rate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return dashboard;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];
    const now = Date.now();

    for (const [name, values] of this.metrics.entries()) {
      if (values.length === 0) continue;

      const latest = values[values.length - 1];
      const metricName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      
      lines.push(`# HELP ${metricName} FitAI application metric`);
      lines.push(`# TYPE ${metricName} gauge`);
      
      const tags = Object.entries(latest.tags)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      
      lines.push(`${metricName}{${tags}} ${latest.value} ${now}`);
    }

    return lines.join('\n');
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

  // Private helper methods

  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (this.database) {
        await this.database`SELECT 1 as health_check`;
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'database',
        status: responseTime > 5000 ? 'degraded' : 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        details: { connection: 'active' }
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkRedisHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (this.redis) {
        await this.redis.ping();
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'redis',
        status: responseTime > 2000 ? 'degraded' : 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        details: { connection: 'active' }
      };
    } catch (error) {
      return {
        service: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkApiHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    return {
      service: 'api',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      details: { 
        version: '1.0.0',
        environment: this.environment 
      }
    };
  }

  private checkAlertRules(metricName: string, value: number): void {
    for (const rule of this.alertRules) {
      if (!rule.enabled || rule.metric !== metricName) continue;

      let shouldAlert = false;
      
      switch (rule.operator) {
        case 'gt': shouldAlert = value > rule.threshold; break;
        case 'gte': shouldAlert = value >= rule.threshold; break;
        case 'lt': shouldAlert = value < rule.threshold; break;
        case 'lte': shouldAlert = value <= rule.threshold; break;
        case 'eq': shouldAlert = value === rule.threshold; break;
      }

      if (shouldAlert) {
        this.triggerAlert(rule, value);
      }
    }
  }

  private triggerAlert(rule: AlertRule, currentValue: number): void {
    const alert = {
      id: crypto.randomUUID(),
      rule_id: rule.id,
      rule_name: rule.name,
      metric: rule.metric,
      threshold: rule.threshold,
      current_value: currentValue,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      environment: this.environment
    };

    console.warn(`🚨 ALERT: ${rule.name} - ${rule.metric} ${rule.operator} ${rule.threshold}, current: ${currentValue}`);

    // Send alert to external systems
    if (this.redis) {
      try {
        this.redis.lpush('alerts_queue', JSON.stringify(alert));
      } catch (error) {
        console.error('Failed to queue alert:', error);
      }
    }
  }

  private sanitizeEndpoint(endpoint: string): string {
    // Replace dynamic segments with placeholders
    return endpoint
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:uuid')
      .replace(/\/\w{20,}/g, '/:token');
  }

  private sendMetricToExternal(metric: MetricSnapshot): void {
    if (this.redis) {
      try {
        this.redis.lpush('metrics_queue', JSON.stringify(metric));
      } catch (error) {
        console.warn('Failed to send metric to external monitoring:', error);
      }
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
