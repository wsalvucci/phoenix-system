# Phoenix System Logging Documentation

This document provides comprehensive guidance on using the logging system throughout the Phoenix System application.

## Overview

The logging system provides a unified, configurable logging solution that supports:
- Multiple log levels (ERROR, WARN, INFO, DEBUG, TRACE)
- Environment-specific configurations
- Structured logging with context
- React hooks for component logging
- Server-side logging for API routes and database operations
- Performance monitoring
- Security event logging

## Quick Start

### Basic Usage

```typescript
import { logger } from '@/utils/logger';

// Simple logging
logger.info('User logged in successfully');
logger.error('Database connection failed', { userId: '123' }, error);

// With context
logger.debug('Processing request', { 
  component: 'UserService', 
  action: 'createUser',
  userId: '123' 
});
```

### React Component Logging

```typescript
import { useLogger } from '@/utils/useLogger';

function UserProfile({ userId }: { userId: string }) {
  const log = useLogger({ 
    component: 'UserProfile', 
    userId 
  });

  useEffect(() => {
    log.info('User profile component mounted');
    
    return () => {
      log.debug('User profile component unmounted');
    };
  }, [log]);

  const handleSave = async () => {
    log.time('saveProfile');
    try {
      await saveUserProfile(userId, data);
      log.info('Profile saved successfully');
    } catch (error) {
      log.error('Failed to save profile', error);
    } finally {
      log.timeEnd('saveProfile');
    }
  };

  return <div>...</div>;
}
```

### Server-Side Logging

```typescript
import { createServerLogger, logApiRequest } from '@/utils/serverLogger';

// In API routes or server actions
export async function GET(request: Request) {
  const startTime = Date.now();
  const logger = createServerLogger({ 
    component: 'UserAPI', 
    route: '/api/users' 
  });
  
  try {
    const data = await fetchUserData();
    
    logApiRequest('GET', '/api/users', 200, Date.now() - startTime, {
      userId: '123'
    });
    
    logger.info('User data fetched successfully', { recordCount: data.length });
    return Response.json(data);
  } catch (error) {
    logApiRequest('GET', '/api/users', 500, Date.now() - startTime, {
      userId: '123'
    });
    logger.error('Failed to fetch user data', { userId: '123' }, error as Error);
    throw error;
  }
}
```

## Core Components

### 1. Logger (`utils/logger.ts`)

**Note**: This is the base logger class. For server-side code, use `createServerLogger` instead of `createLogger` to avoid React hook dependencies.

The main logging class that handles all logging operations.

**Features:**
- Multiple log levels
- Structured logging with context
- Environment-aware formatting
- Child loggers with inherited context
- Performance timing utilities

**Methods:**
```typescript
logger.error(message, context?, error?, data?)
logger.warn(message, context?, data?)
logger.info(message, context?, data?)
logger.debug(message, context?, data?)
logger.trace(message, context?, data?)

// Performance logging
logger.time(label)
logger.timeEnd(label)

// Grouped logging
logger.group(label)
logger.groupEnd()

// Configuration
logger.setLevel(level)
logger.setConfig(config)

// Child loggers
const childLogger = logger.child({ component: 'UserService' })
```

### 2. React Hook (`utils/useLogger.ts`)

Provides logging functionality for React components with automatic context management.

**Hooks:**
```typescript
// Basic hook
const log = useLogger({ component: 'MyComponent', userId: '123' });

// Specialized hooks
const log = useComponentLogger('UserProfile');
const log = useUserLogger('user123');
const log = useApiLogger('/api/users');
const log = useDatabaseLogger('users');
```

### 3. Server Logger (`utils/serverLogger.ts`)

Specialized logging for server-side operations. **Use this for server actions, API routes, and any server-side code.**

**Important**: Use `createServerLogger()` instead of `createLogger()` in server-side code to avoid React hook dependencies.

**Features:**
- Request/response logging
- Database operation logging
- Authentication event logging
- Security event logging
- Performance monitoring
- Sensitive data masking

**Methods:**
```typescript
// Request logging
serverLogger.logRequest(method, route, statusCode, duration, context)

// Database logging
serverLogger.logDatabaseOperation(operation, table, duration, query, params, context)

// Error logging
serverLogger.logServerError(error, context, requestData)

// Auth logging
serverLogger.logAuthEvent('login', userId, true, context, details)

// Security logging
serverLogger.logSecurityEvent('unauthorized_access', 'Invalid token', context)
```

### 4. Configuration (`utils/loggingConfig.ts`)

Centralized configuration management with environment-specific settings.

**Configuration Structure:**
```typescript
{
  general: {
    level: LogLevel.INFO,
    enableConsole: true,
    enableFile: false,
    enableRemote: false,
    format: 'text', // or 'json'
    includeTimestamp: true,
    includeContext: true,
  },
  server: {
    enableRequestLogging: true,
    enableDatabaseLogging: true,
    enableErrorLogging: true,
    logSlowQueries: true,
    slowQueryThreshold: 1000,
    logRequestBodies: false,
    logResponseBodies: false,
    maskSensitiveFields: ['password', 'token', ...],
  },
  features: {
    enableRequestLogging: true,
    enableDatabaseLogging: true,
    enableErrorLogging: true,
    enablePerformanceLogging: true,
    enableSecurityLogging: true,
    enableUserActionLogging: true,
  }
}
```

## Log Levels

1. **ERROR** (0): Critical errors that require immediate attention
2. **WARN** (1): Warning conditions that should be investigated
3. **INFO** (2): General information about application flow
4. **DEBUG** (3): Detailed information for debugging
5. **TRACE** (4): Very detailed information for tracing execution

## Context and Structured Logging

The logging system supports rich context information:

```typescript
interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}
```

**Example:**
```typescript
logger.info('User action completed', {
  userId: '123',
  component: 'UserService',
  action: 'updateProfile',
  requestId: 'req_123456',
  additionalData: { field: 'email' }
});
```

## Environment-Specific Behavior

### Development
- Log level: DEBUG
- Format: Text (human-readable)
- Console logging: Enabled
- Request body logging: Enabled
- User action logging: Enabled

### Production
- Log level: INFO
- Format: JSON (machine-readable)
- Console logging: Disabled
- File logging: Enabled
- Remote logging: Enabled
- User action logging: Disabled (privacy)

### Test
- Log level: ERROR
- Console logging: Disabled
- File logging: Disabled
- Only critical errors logged

## Best Practices

### 1. Use Appropriate Log Levels
```typescript
// ERROR: System failures, exceptions
logger.error('Database connection failed', context, error);

// WARN: Recoverable issues
logger.warn('API rate limit approaching', context);

// INFO: Important business events
logger.info('User registered successfully', { userId });

// DEBUG: Detailed flow information
logger.debug('Processing user data', { userId, step: 'validation' });

// TRACE: Very detailed execution flow
logger.trace('Entering function', { functionName, params });
```

### 2. Include Relevant Context
```typescript
// Good
logger.info('User login', { 
  userId: '123', 
  method: 'email', 
  ip: '192.168.1.1' 
});

// Avoid
logger.info('User login'); // No context
```

### 3. Use Child Loggers for Components
```typescript
// Create a logger with component context
const log = useLogger({ component: 'UserService' });

// All logs will include component context automatically
log.info('Processing user request'); // Includes component: 'UserService'
```

### 4. Handle Sensitive Data
```typescript
// The system automatically masks sensitive fields
logger.info('User data', { 
  userId: '123',
  password: 'secret123', // Will be masked as [MASKED]
  email: 'user@example.com'
});
```

### 5. Performance Logging
```typescript
const log = useLogger({ component: 'DataProcessor' });

log.time('processData');
try {
  const result = await processLargeDataset();
  log.info('Data processing completed', { recordCount: result.length });
} finally {
  log.timeEnd('processData');
}
```

## Integration Examples

### API Route Logging
```typescript
// app/api/users/route.ts
import { serverLogger, logApiRequest } from '@/utils/serverLogger';

export async function GET(request: Request) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    const users = await getUsers();
    
    logApiRequest('GET', '/api/users', 200, Date.now() - startTime, {
      requestId,
      recordCount: users.length
    });
    
    return Response.json(users);
  } catch (error) {
    logApiRequest('GET', '/api/users', 500, Date.now() - startTime, {
      requestId
    });
    serverLogger.logServerError(error, { route: '/api/users', requestId });
    throw error;
  }
}
```

### Database Operation Logging
```typescript
// supabaseServiceClient.ts
import { logDatabaseQuery } from '@/utils/serverLogger';

export async function getUserById(id: string) {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    logDatabaseQuery('SELECT', 'users', Date.now() - startTime, 
      'SELECT * FROM users WHERE id = $1', { id });
    
    return data;
  } catch (error) {
    logDatabaseQuery('SELECT', 'users', Date.now() - startTime, 
      'SELECT * FROM users WHERE id = $1', { id });
    throw error;
  }
}
```

### Component Error Boundary
```typescript
// components/ErrorBoundary.tsx
import { useLogger } from '@/utils/useLogger';

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const log = useLogger({ component: 'ErrorBoundary' });
    log.error('React error boundary caught error', { 
      errorInfo: errorInfo.componentStack 
    }, error);
  }
  
  render() {
    // Error boundary implementation
  }
}
```

## Configuration Management

### Environment Variables
```bash
# .env.local
LOGGING_ENDPOINT=https://logs.example.com/api/logs
LOG_LEVEL=DEBUG
ENABLE_REMOTE_LOGGING=true
```

### Runtime Configuration
```typescript
import { logger, LogLevel } from '@/utils/logger';

// Change log level at runtime
logger.setLevel(LogLevel.DEBUG);

// Update configuration
logger.setConfig({
  enableConsole: false,
  enableRemote: true,
  remoteEndpoint: 'https://logs.example.com/api/logs'
});
```

## Monitoring and Alerting

The logging system can be integrated with monitoring services:

### Sentry Integration
```typescript
import { logger } from '@/utils/logger';

// Configure Sentry
import * as Sentry from '@sentry/nextjs';

logger.setConfig({
  enableRemote: true,
  remoteEndpoint: Sentry.captureException
});
```

### Custom Monitoring
```typescript
// Custom remote logging implementation
logger.setConfig({
  enableRemote: true,
  remoteEndpoint: async (logEntry) => {
    // Send to your monitoring service
    await fetch('/api/logs', {
      method: 'POST',
      body: JSON.stringify(logEntry)
    });
  }
});
```

## Troubleshooting

### Common Issues

1. **Logs not appearing**
   - Check log level configuration
   - Verify environment settings
   - Ensure console logging is enabled

2. **Performance impact**
   - Use appropriate log levels
   - Avoid logging in hot paths
   - Use conditional logging

3. **Sensitive data exposure**
   - Verify maskSensitiveFields configuration
   - Review log output in production
   - Use context carefully

### Debug Mode
```typescript
// Enable debug mode for logging system itself
logger.setConfig({
  level: LogLevel.TRACE,
  enableConsole: true
});
```

## Migration Guide

### From console.log
```typescript
// Before
console.log('User logged in:', userId);

// After
logger.info('User logged in', { userId });
```

### From console.error
```typescript
// Before
console.error('Database error:', error);

// After
logger.error('Database error', { userId }, error);
```

### From console.warn
```typescript
// Before
console.warn('Rate limit approaching');

// After
logger.warn('Rate limit approaching', { userId });
```

This logging system provides a comprehensive, scalable solution for application monitoring and debugging across all environments. 