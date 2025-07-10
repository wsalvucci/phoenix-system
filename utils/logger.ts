/**
 * Comprehensive logging utility for the Phoenix System
 * Supports different log levels, environments, and structured logging
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  data?: any;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile?: boolean;
  filePath?: string;
  enableRemote?: boolean;
  remoteEndpoint?: string;
  format: 'json' | 'text';
  includeTimestamp: boolean;
  includeContext: boolean;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
}

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor(config?: Partial<LoggerConfig>) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';

    this.config = {
      level: this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      format: this.isDevelopment ? 'text' : 'json',
      includeTimestamp: true,
      includeContext: true,
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, message, context, error, data } = entry;
    
    if (this.config.format === 'json') {
      return JSON.stringify({
        timestamp: this.config.includeTimestamp ? timestamp : undefined,
        level: LogLevel[level],
        message,
        context: this.config.includeContext ? context : undefined,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
        data,
      }, null, 2);
    }

    // Text format
    let formatted = `[${LogLevel[level]}] ${message}`;
    
    if (this.config.includeTimestamp) {
      formatted = `[${timestamp}] ${formatted}`;
    }
    
    if (context && this.config.includeContext) {
      formatted += ` | Context: ${JSON.stringify(context)}`;
    }
    
    if (error) {
      formatted += ` | Error: ${error.name}: ${error.message}`;
      if (this.isDevelopment) {
        formatted += `\nStack: ${error.stack}`;
      }
    }
    
    if (data) {
      formatted += ` | Data: ${JSON.stringify(data)}`;
    }
    
    return formatted;
  }

  public log(level: LogLevel, message: string, context?: LogContext, error?: Error, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      data,
    };

    const formattedMessage = this.formatMessage(entry);

    if (this.config.enableConsole) {
      this.writeToConsole(level, formattedMessage, entry);
    }

    if (this.config.enableFile) {
      this.writeToFile(formattedMessage);
    }

    if (this.config.enableRemote) {
      this.sendToRemote(entry);
    }
  }

  private writeToConsole(level: LogLevel, message: string, entry: LogEntry): void {
    const consoleMethod = this.getConsoleMethod(level);
    
    if (level === LogLevel.ERROR) {
      consoleMethod(message, entry.error || '');
    } else {
      consoleMethod(message);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.ERROR:
        return console.error;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.TRACE:
        return console.trace;
      default:
        return console.log;
    }
  }

  private writeToFile(message: string): void {
    // In a browser environment, we can't write to files directly
    // This would need to be implemented on the server side
    if (typeof window !== 'undefined') {
      return;
    }

    // Server-side file logging implementation would go here
    // For now, we'll just console.log it
    console.log(`[FILE] ${message}`);
  }

  private sendToRemote(entry: LogEntry): void {
    if (!this.config.remoteEndpoint) return;

    // In a browser environment, we can send to a remote logging service
    if (typeof window !== 'undefined') {
      this.sendToRemoteClient(entry);
    } else {
      // Server-side remote logging implementation would go here
      this.sendToRemoteServer(entry);
    }
  }

  private sendToRemoteClient(entry: LogEntry): void {
    // Send to remote logging service (e.g., Sentry, LogRocket, etc.)
    // This is a placeholder implementation
    fetch(this.config.remoteEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    }).catch(error => {
      // Silently fail to avoid infinite loops
      console.warn('Failed to send log to remote service:', error);
    });
  }

  private sendToRemoteServer(entry: LogEntry): void {
    // Server-side implementation for sending logs to remote services
    // This could use HTTP clients like axios, node-fetch, etc.
    console.log(`[REMOTE] ${JSON.stringify(entry)}`);
  }

  // Public logging methods
  error(message: string, context?: LogContext, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, context, error, data);
  }

  warn(message: string, context?: LogContext, data?: any): void {
    this.log(LogLevel.WARN, message, context, undefined, data);
  }

  info(message: string, context?: LogContext, data?: any): void {
    this.log(LogLevel.INFO, message, context, undefined, data);
  }

  debug(message: string, context?: LogContext, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, undefined, data);
  }

  trace(message: string, context?: LogContext, data?: any): void {
    this.log(LogLevel.TRACE, message, context, undefined, data);
  }

  // Utility methods
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Create a child logger with additional context
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.config);
    const originalLog = childLogger.log.bind(childLogger);
    
    childLogger.log = (level: LogLevel, message: string, childContext?: LogContext, error?: Error, data?: any) => {
      const mergedContext = { ...context, ...childContext };
      originalLog(level, message, mergedContext, error, data);
    };

    return childLogger;
  }

  // Performance logging
  time(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label);
    }
  }

  // Group logging
  group(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd();
    }
  }
}

// Create default logger instance
export const logger = new Logger();

// Create specialized loggers for different parts of the application
export const createLogger = (context?: LogContext) => {
  return context ? logger.child(context) : logger;
};

// Export the Logger class for custom instances
export { Logger };

// Utility functions for common logging patterns
export const logError = (error: Error, context?: LogContext, data?: any) => {
  logger.error(error.message, context, error, data);
};

export const logApiCall = (endpoint: string, method: string, status: number, duration: number, context?: LogContext) => {
  const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
  const message = `${method} ${endpoint} - ${status} (${duration}ms)`;
  logger.log(level, message, context);
};

export const logUserAction = (action: string, userId: string, data?: any) => {
  logger.info(`User action: ${action}`, { userId, action }, data);
};

export const logDatabaseOperation = (operation: string, table: string, duration: number, context?: LogContext) => {
  logger.debug(`DB ${operation} on ${table} (${duration}ms)`, context);
};

// Environment-specific logger configurations
export const createDevelopmentLogger = () => {
  return new Logger({
    level: LogLevel.DEBUG,
    enableConsole: true,
    format: 'text',
    includeTimestamp: true,
    includeContext: true,
  });
};

export const createProductionLogger = () => {
  return new Logger({
    level: LogLevel.INFO,
    enableConsole: false,
    enableFile: true,
    format: 'json',
    includeTimestamp: true,
    includeContext: true,
    enableRemote: true,
    remoteEndpoint: process.env.LOGGING_ENDPOINT,
  });
}; 