/**
 * Server-side logging utility for API routes, server actions, and database operations
 */

import { Logger, LogLevel, LogContext, createLogger } from './logger';

export interface ServerLogContext extends LogContext {
  route?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  operation?: string;
  table?: string;
  query?: string;
  params?: any;
}

export interface ServerLoggerConfig {
  enableRequestLogging: boolean;
  enableDatabaseLogging: boolean;
  enableErrorLogging: boolean;
  logSlowQueries: boolean;
  slowQueryThreshold: number; // in milliseconds
  logRequestBodies: boolean;
  logResponseBodies: boolean;
  maskSensitiveFields: string[];
}

class ServerLogger extends Logger {
  private serverConfig: ServerLoggerConfig;

  constructor(config?: Partial<ServerLoggerConfig>) {
    super();
    
    this.serverConfig = {
      enableRequestLogging: true,
      enableDatabaseLogging: true,
      enableErrorLogging: true,
      logSlowQueries: true,
      slowQueryThreshold: 1000, // 1 second
      logRequestBodies: false,
      logResponseBodies: false,
      maskSensitiveFields: ['password', 'token', 'secret', 'key'],
      ...config,
    };
  }

  // Request logging
  logRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    context?: Partial<ServerLogContext>,
    requestBody?: any,
    responseBody?: any
  ): void {
    if (!this.serverConfig.enableRequestLogging) return;

    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `${method} ${route} - ${statusCode} (${duration}ms)`;

    const logContext: ServerLogContext = {
      route,
      method,
      statusCode,
      duration,
      ...context,
    };

    let data: any = {};
    
    if (this.serverConfig.logRequestBodies && requestBody) {
      data.requestBody = this.maskSensitiveData(requestBody);
    }
    
    if (this.serverConfig.logResponseBodies && responseBody) {
      data.responseBody = this.maskSensitiveData(responseBody);
    }

    this.log(level, message, logContext, undefined, Object.keys(data).length > 0 ? data : undefined);
  }

  // Database operation logging
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    query?: string,
    params?: any,
    context?: Partial<ServerLogContext>
  ): void {
    if (!this.serverConfig.enableDatabaseLogging) return;

    const level = duration > this.serverConfig.slowQueryThreshold ? LogLevel.WARN : LogLevel.DEBUG;
    const message = `DB ${operation} on ${table} (${duration}ms)`;

    const logContext: ServerLogContext = {
      operation,
      table,
      duration,
      query,
      params: this.maskSensitiveData(params),
      ...context,
    };

    this.log(level, message, logContext);
  }

  // Error logging with stack traces
  logServerError(
    error: Error,
    context?: Partial<ServerLogContext>,
    requestData?: any
  ): void {
    if (!this.serverConfig.enableErrorLogging) return;

    const message = `Server error: ${error.message}`;
    const logContext: ServerLogContext = {
      ...context,
    };

    let data: any = {};
    if (requestData) {
      data.requestData = this.maskSensitiveData(requestData);
    }

    this.error(message, logContext, error, Object.keys(data).length > 0 ? data : undefined);
  }

  // Authentication logging
  logAuthEvent(
    event: 'login' | 'logout' | 'register' | 'password_reset' | 'token_refresh',
    userId: string,
    success: boolean,
    context?: Partial<ServerLogContext>,
    details?: any
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `Auth ${event} ${success ? 'successful' : 'failed'} for user ${userId}`;

    const logContext: ServerLogContext = {
      userId,
      action: event,
      ...context,
    };

    this.log(level, message, logContext, undefined, details);
  }

  // Performance logging
  logPerformance(
    operation: string,
    duration: number,
    threshold: number,
    context?: Partial<ServerLogContext>,
    details?: any
  ): void {
    const level = duration > threshold ? LogLevel.WARN : LogLevel.DEBUG;
    const message = `Performance: ${operation} took ${duration}ms`;

    const logContext: ServerLogContext = {
      operation,
      duration,
      ...context,
    };

    this.log(level, message, logContext, undefined, details);
  }

  // Security event logging
  logSecurityEvent(
    event: 'unauthorized_access' | 'rate_limit_exceeded' | 'suspicious_activity' | 'data_access',
    details: string,
    context?: Partial<ServerLogContext>,
    data?: any
  ): void {
    const message = `Security event: ${event} - ${details}`;
    const logContext: ServerLogContext = {
      action: event,
      ...context,
    };

    this.warn(message, logContext, data);
  }

  // Utility method to mask sensitive data
  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const masked = { ...data };
    
    for (const field of this.serverConfig.maskSensitiveFields) {
      if (masked[field]) {
        masked[field] = '[MASKED]';
      }
    }

    return masked;
  }

  // Create a child logger with server context (server-safe version)
  createServerChild(context: ServerLogContext): ServerLogger {
    const childLogger = new ServerLogger(this.serverConfig);
    const originalLog = childLogger.log.bind(childLogger);
    
    childLogger.log = (level: LogLevel, message: string, childContext?: LogContext, error?: Error, data?: any) => {
      const mergedContext = { ...context, ...childContext };
      originalLog(level, message, mergedContext, error, data);
    };

    return childLogger;
  }
}

// Create default server logger instance
export const serverLogger = new ServerLogger();

// Server-safe logger creation function (doesn't use React hooks)
export const createServerLogger = (context?: ServerLogContext): ServerLogger => {
  if (context) {
    return serverLogger.createServerChild(context);
  }
  return serverLogger;
};

// Utility functions for common server logging patterns
export const logApiRequest = (
  method: string,
  route: string,
  statusCode: number,
  duration: number,
  context?: Partial<ServerLogContext>
) => {
  serverLogger.logRequest(method, route, statusCode, duration, context);
};

export const logDatabaseQuery = (
  operation: string,
  table: string,
  duration: number,
  query?: string,
  params?: any,
  context?: Partial<ServerLogContext>
) => {
  serverLogger.logDatabaseOperation(operation, table, duration, query, params, context);
};

export const logServerError = (
  error: Error,
  context?: Partial<ServerLogContext>,
  requestData?: any
) => {
  serverLogger.logServerError(error, context, requestData);
};

export const logAuthEvent = (
  event: 'login' | 'logout' | 'register' | 'password_reset' | 'token_refresh',
  userId: string,
  success: boolean,
  context?: Partial<ServerLogContext>,
  details?: any
) => {
  serverLogger.logAuthEvent(event, userId, success, context, details);
};

export const logSecurityEvent = (
  event: 'unauthorized_access' | 'rate_limit_exceeded' | 'suspicious_activity' | 'data_access',
  details: string,
  context?: Partial<ServerLogContext>,
  data?: any
) => {
  serverLogger.logSecurityEvent(event, details, context, data);
};

// Middleware for Express/Next.js API routes
export const createLoggingMiddleware = (logger: ServerLogger = serverLogger) => {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to response headers
    res.setHeader('x-request-id', requestId);

    // Log request start
    logger.debug(`Request started: ${req.method} ${req.path}`, {
      route: req.path,
      method: req.method,
      requestId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: any) {
      const duration = Date.now() - startTime;
      
      logger.logRequest(
        req.method,
        req.path,
        res.statusCode,
        duration,
        {
          requestId,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        }
      );

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

// Export the ServerLogger class
export { ServerLogger }; 