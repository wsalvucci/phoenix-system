/**
 * React hook for logging with automatic context management
 */

import { useCallback, useRef } from 'react';
import { logger, createLogger, LogContext, LogLevel } from './logger';

export interface UseLoggerOptions {
  component?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  action?: string;
  additionalContext?: Record<string, any>;
}

export interface LoggerHook {
  error: (message: string, error?: Error, data?: any) => void;
  warn: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
  trace: (message: string, data?: any) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
  group: (label: string) => void;
  groupEnd: () => void;
  setContext: (context: Partial<LogContext>) => void;
}

export const useLogger = (options: UseLoggerOptions = {}): LoggerHook => {
  const {
    component,
    userId,
    sessionId,
    requestId,
    additionalContext = {},
  } = options;

  const contextRef = useRef<LogContext>({
    component,
    userId,
    sessionId,
    requestId,
    ...additionalContext,
  });

  const loggerInstance = useRef(createLogger(contextRef.current));

  const setContext = useCallback((context: Partial<LogContext>) => {
    contextRef.current = { ...contextRef.current, ...context };
    loggerInstance.current = createLogger(contextRef.current);
  }, []);

  const error = useCallback((message: string, error?: Error, data?: any) => {
    loggerInstance.current.error(message, contextRef.current, error, data);
  }, []);

  const warn = useCallback((message: string, data?: any) => {
    loggerInstance.current.warn(message, contextRef.current, data);
  }, []);

  const info = useCallback((message: string, data?: any) => {
    loggerInstance.current.info(message, contextRef.current, data);
  }, []);

  const debug = useCallback((message: string, data?: any) => {
    loggerInstance.current.debug(message, contextRef.current, data);
  }, []);

  const trace = useCallback((message: string, data?: any) => {
    loggerInstance.current.trace(message, contextRef.current, data);
  }, []);

  const time = useCallback((label: string) => {
    loggerInstance.current.time(label);
  }, []);

  const timeEnd = useCallback((label: string) => {
    loggerInstance.current.timeEnd(label);
  }, []);

  const group = useCallback((label: string) => {
    loggerInstance.current.group(label);
  }, []);

  const groupEnd = useCallback(() => {
    loggerInstance.current.groupEnd();
  }, []);

  return {
    error,
    warn,
    info,
    debug,
    trace,
    time,
    timeEnd,
    group,
    groupEnd,
    setContext,
  };
};

// Specialized hooks for different contexts
export const useComponentLogger = (componentName: string, additionalContext?: Record<string, any>) => {
  return useLogger({ component: componentName, ...additionalContext });
};

export const useUserLogger = (userId: string, additionalContext?: Record<string, any>) => {
  return useLogger({ userId, ...additionalContext });
};

export const useApiLogger = (endpoint: string, additionalContext?: Record<string, any>) => {
  return useLogger({ component: 'API', action: endpoint, ...additionalContext });
};

export const useDatabaseLogger = (table: string, additionalContext?: Record<string, any>) => {
  return useLogger({ component: 'Database', action: table, ...additionalContext });
}; 