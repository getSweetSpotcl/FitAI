export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}

export class Logger {
  private readonly service: string;
  private readonly environment: string;

  constructor(service: string, environment: string = 'development') {
    this.service = service;
    this.environment = environment;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const log = {
      timestamp,
      level,
      service: this.service,
      environment: this.environment,
      message,
      ...context,
      error: context?.error ? {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack,
      } : undefined,
    };

    return JSON.stringify(log);
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log info and above
    if (this.environment === 'production') {
      const levels: LogLevel[] = ['info', 'warn', 'error', 'fatal'];
      return levels.includes(level);
    }
    // In development, log everything
    return true;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatLog('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatLog('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', message, context));
    }
  }

  fatal(message: string, context?: LogContext): void {
    if (this.shouldLog('fatal')) {
      console.error(this.formatLog('fatal', message, context));
    }
  }

  // Log HTTP request
  logRequest(method: string, path: string, userId?: string, requestId?: string): void {
    this.info('HTTP Request', {
      method,
      path,
      userId,
      requestId,
    });
  }

  // Log HTTP response
  logResponse(method: string, path: string, statusCode: number, duration: number, userId?: string, requestId?: string): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    this[level]('HTTP Response', {
      method,
      path,
      statusCode,
      duration,
      userId,
      requestId,
    });
  }

  // Log database query
  logQuery(query: string, duration: number, params?: any[]): void {
    this.debug('Database Query', {
      metadata: {
        query,
        params,
        duration,
      },
    });
  }

  // Log cache operation
  logCache(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, duration?: number): void {
    this.debug(`Cache ${operation}`, {
      metadata: {
        operation,
        key,
        duration,
      },
    });
  }

  // Log external API call
  logApiCall(service: string, endpoint: string, statusCode: number, duration: number): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'debug';
    
    this[level]('External API Call', {
      metadata: {
        service,
        endpoint,
        statusCode,
        duration,
      },
    });
  }

  // Create child logger with additional context
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.service, this.environment);
    
    // Override methods to include parent context
    const methods: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    methods.forEach(method => {
      const original = childLogger[method].bind(childLogger);
      childLogger[method] = (message: string, childContext?: LogContext) => {
        original(message, { ...context, ...childContext });
      };
    });

    return childLogger;
  }
}

// Create singleton logger instance
let loggerInstance: Logger;

export function createLogger(service: string, environment?: string): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(service, environment);
  }
  return loggerInstance;
}

// Logging middleware for Hono
import { Context, Next } from 'hono';

export async function loggingMiddleware(c: Context, next: Next) {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  const logger = createLogger('fitai-api', c.env?.ENVIRONMENT || 'development');
  
  // Add logger and requestId to context
  c.set('logger', logger);
  c.set('requestId', requestId);
  
  // Log request
  const userId = c.get('user')?.userId;
  logger.logRequest(c.req.method, c.req.path, userId, requestId);
  
  try {
    await next();
    
    // Log response
    const duration = Date.now() - start;
    logger.logResponse(c.req.method, c.req.path, c.res.status, duration, userId, requestId);
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Request failed', {
      method: c.req.method,
      path: c.req.path,
      userId,
      requestId,
      duration,
      error: error as Error,
    });
    throw error;
  }
}