/**
 * Centralized exports for the Phoenix System logging utilities
 */

// Core logging functionality
export {
  Logger,
  logger,
  createLogger,
  logError,
  logApiCall,
  logUserAction,
  logDatabaseOperation,
  createDevelopmentLogger,
  createProductionLogger,
} from '../logger';

// Types from core logger
export type {
  LogLevel,
  LogContext,
  LogEntry,
  LoggerConfig,
} from '../logger';

// React hooks for component logging
export {
  useLogger,
  useComponentLogger,
  useUserLogger,
  useApiLogger,
  useDatabaseLogger,
} from '../useLogger';

// Types from React hooks
export type {
  UseLoggerOptions,
  LoggerHook,
} from '../useLogger';

// Server-side logging utilities
export {
  ServerLogger,
  serverLogger,
  createServerLogger,
  logApiRequest,
  logDatabaseQuery,
  logServerError,
  logAuthEvent,
  logSecurityEvent,
  createLoggingMiddleware,
} from '../serverLogger';

// Types from server logger
export type {
  ServerLogContext,
  ServerLoggerConfig,
} from '../serverLogger';

// Configuration management
export {
  defaultLoggingConfig,
  getLoggingConfig,
  getGeneralConfig,
  getServerConfig,
  getFeatureFlags,
  getCurrentEnvironment,
  isDevelopment,
  isProduction,
  isTest,
  validateConfig,
  currentConfig,
} from '../loggingConfig';

// Types from configuration
export type {
  LoggingConfig,
} from '../loggingConfig';

// Re-export commonly used types with aliases
export type {
  LogContext as LoggerContext,
} from '../logger';

export type {
  ServerLogContext as ServerContext,
} from '../serverLogger'; 