/**
 * Centralized logging configuration for the Phoenix System
 */

import { LogLevel, LoggerConfig } from './logger';
import { ServerLoggerConfig } from './serverLogger';

export interface LoggingConfig {
  // General logging configuration
  general: LoggerConfig;
  
  // Server-specific configuration
  server: ServerLoggerConfig;
  
  // Environment-specific overrides
  environments: {
    development: Partial<LoggingConfig>;
    production: Partial<LoggingConfig>;
    test: Partial<LoggingConfig>;
  };
  
  // Feature flags
  features: {
    enableRequestLogging: boolean;
    enableDatabaseLogging: boolean;
    enableErrorLogging: boolean;
    enablePerformanceLogging: boolean;
    enableSecurityLogging: boolean;
    enableUserActionLogging: boolean;
  };
}

// Default configuration
export const defaultLoggingConfig: LoggingConfig = {
  general: {
    level: LogLevel.INFO,
    enableConsole: true,
    enableFile: false,
    enableRemote: false,
    format: 'text',
    includeTimestamp: true,
    includeContext: true,
  },
  
  server: {
    enableRequestLogging: true,
    enableDatabaseLogging: true,
    enableErrorLogging: true,
    logSlowQueries: true,
    slowQueryThreshold: 1000, // 1 second
    logRequestBodies: false,
    logResponseBodies: false,
    maskSensitiveFields: [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'authorization',
      'cookie',
      'session',
    ],
  },
  
  environments: {
    development: {
      general: {
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableFile: false,
        enableRemote: false,
        format: 'text',
        includeTimestamp: true,
        includeContext: true,
      },
      server: {
        enableRequestLogging: true,
        enableDatabaseLogging: true,
        enableErrorLogging: true,
        logSlowQueries: true,
        slowQueryThreshold: 500, // More sensitive in development
        logRequestBodies: true,
        logResponseBodies: false,
        maskSensitiveFields: [
          'password',
          'token',
          'secret',
          'key',
          'apiKey',
          'authorization',
          'cookie',
          'session',
        ],
      },
      features: {
        enableRequestLogging: true,
        enableDatabaseLogging: true,
        enableErrorLogging: true,
        enablePerformanceLogging: true,
        enableSecurityLogging: true,
        enableUserActionLogging: true,
      },
    },
    
    production: {
      general: {
        level: LogLevel.INFO,
        enableConsole: false,
        enableFile: true,
        enableRemote: true,
        format: 'json',
        includeTimestamp: true,
        includeContext: true,
      },
      server: {
        enableRequestLogging: true,
        enableDatabaseLogging: true,
        enableErrorLogging: true,
        logSlowQueries: true,
        slowQueryThreshold: 2000, // Less sensitive in production
        logRequestBodies: false,
        logResponseBodies: false,
        maskSensitiveFields: [
          'password',
          'token',
          'secret',
          'key',
          'apiKey',
          'authorization',
          'cookie',
          'session',
        ],
      },
      features: {
        enableRequestLogging: true,
        enableDatabaseLogging: true,
        enableErrorLogging: true,
        enablePerformanceLogging: true,
        enableSecurityLogging: true,
        enableUserActionLogging: false, // Disable in production for privacy
      },
    },
    
    test: {
      general: {
        level: LogLevel.ERROR, // Only log errors in tests
        enableConsole: false,
        enableFile: false,
        enableRemote: false,
        format: 'text',
        includeTimestamp: true,
        includeContext: true,
      },
      server: {
        enableRequestLogging: false,
        enableDatabaseLogging: false,
        enableErrorLogging: true,
        logSlowQueries: false,
        slowQueryThreshold: 1000,
        logRequestBodies: false,
        logResponseBodies: false,
        maskSensitiveFields: [
          'password',
          'token',
          'secret',
          'key',
          'apiKey',
          'authorization',
          'cookie',
          'session',
        ],
      },
      features: {
        enableRequestLogging: false,
        enableDatabaseLogging: false,
        enableErrorLogging: true,
        enablePerformanceLogging: false,
        enableSecurityLogging: false,
        enableUserActionLogging: false,
      },
    },
  },
  
  features: {
    enableRequestLogging: true,
    enableDatabaseLogging: true,
    enableErrorLogging: true,
    enablePerformanceLogging: true,
    enableSecurityLogging: true,
    enableUserActionLogging: true,
  },
};

// Get current environment
export const getCurrentEnvironment = (): 'development' | 'production' | 'test' => {
  const env = process.env.NODE_ENV;
  if (env === 'production') return 'production';
  if (env === 'test') return 'test';
  return 'development';
};

// Merge configurations
export const mergeConfig = (base: any, override: any): any => {
  const result = { ...base };
  
  for (const key in override) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = mergeConfig(result[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  
  return result;
};

// Get configuration for current environment
export const getLoggingConfig = (): LoggingConfig => {
  const environment = getCurrentEnvironment();
  const envConfig = defaultLoggingConfig.environments[environment];
  
  return mergeConfig(defaultLoggingConfig, envConfig);
};

// Get specific configuration sections
export const getGeneralConfig = (): LoggerConfig => {
  const config = getLoggingConfig();
  return config.general;
};

export const getServerConfig = (): ServerLoggerConfig => {
  const config = getLoggingConfig();
  return config.server;
};

export const getFeatureFlags = () => {
  const config = getLoggingConfig();
  return config.features;
};

// Environment-specific configuration helpers
export const isDevelopment = (): boolean => {
  return getCurrentEnvironment() === 'development';
};

export const isProduction = (): boolean => {
  return getCurrentEnvironment() === 'production';
};

export const isTest = (): boolean => {
  return getCurrentEnvironment() === 'test';
};

// Configuration validation
export const validateConfig = (config: LoggingConfig): string[] => {
  const errors: string[] = [];
  
  // Validate log level
  if (config.general.level < LogLevel.ERROR || config.general.level > LogLevel.TRACE) {
    errors.push('Invalid log level specified');
  }
  
  // Validate slow query threshold
  if (config.server.slowQueryThreshold < 0) {
    errors.push('Slow query threshold must be positive');
  }
  
  // Validate remote endpoint if enabled
  if (config.general.enableRemote && !config.general.remoteEndpoint) {
    errors.push('Remote logging enabled but no endpoint specified');
  }
  
  return errors;
};

// Export current configuration
export const currentConfig = getLoggingConfig(); 