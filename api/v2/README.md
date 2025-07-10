# Modular API System v2

This new API system provides a modular, efficient, and secure way to access student data with proper access controls and caching.

## Architecture Overview

The system consists of several core components:

### 1. Core Types (`api/core/types.ts`)
- Defines user roles, access levels, and query parameters
- Provides type safety for all API operations

### 2. Access Control (`api/core/access-control.ts`)
- Enforces data sensitivity rules based on user roles
- Defines what each user type can see and access
- Handles field-level filtering

### 3. Query Builder (`api/core/query-builder.ts`)
- Builds complex SQL queries with proper joins
- Handles different access levels and filtering
- Optimizes queries for performance

### 4. Cache Manager (`api/core/cache-manager.ts`)
- Provides intelligent caching for expensive queries
- Tracks query performance and statistics
- Automatically invalidates stale data

### 5. User Context Resolver (`api/core/user-context.ts`)
- Determines user roles and access levels
- Validates school access permissions
- Provides user context for API operations

### 6. API Service (`api/core/api-service.ts`)
- Orchestrates all components
- Provides unified interface for data access
- Handles logging and error management

## Usage Examples

### Getting Dashboard Data

```typescript
import { getDashboardData } from '@/api/v2/dashboard';

// Get dashboard data for a school
const dashboardData = await getDashboardData(schoolId, timeframeId);

// The system automatically:
// - Validates user access to the school
// - Applies role-based data filtering
// - Caches the result for future requests
// - Logs the operation for monitoring
```

### Getting Top Students

```typescript
import { getTopStudents } from '@/api/v2/dashboard';

// Get top 10 students
const topStudents = await getTopStudents(schoolId, 10);

// Get top students filtered by point group
const topStudentsByGroup = await getTopStudents(schoolId, 10, pointGroupId);

// Get top students for a specific timeframe
const topStudentsInTimeframe = await getTopStudents(schoolId, 10, undefined, undefined, timeframeId);
```

### Getting Nearby Ranking

```typescript
import { getNearbyRanking } from '@/api/v2/dashboard';

// Get students within 2 ranks of a specific student
const nearbyRanking = await getNearbyRanking(schoolId, studentId, 2);

// Get nearby ranking filtered by point group
const nearbyByGroup = await getNearbyRanking(schoolId, studentId, 2, pointGroupId);
```

### Group Leader Specific APIs

```typescript
import { 
  getGroupLeaderDashboard, 
  getGroupLeaderStudentDetails,
  getGroupLeaderNearbyRanking,
  getGroupLeaderTopStudents 
} from '@/api/v2/group-leader';

// Get comprehensive dashboard for group leader's managed groups
const groupLeaderDashboard = await getGroupLeaderDashboard(schoolId, timeframeId);

// Get detailed information about a specific student in leader's groups
const studentDetails = await getGroupLeaderStudentDetails(schoolId, studentId, timeframeId);

// Get nearby ranking within leader's groups
const nearbyInGroups = await getGroupLeaderNearbyRanking(schoolId, studentId, 3);

// Get top students within leader's groups
const topInGroups = await getGroupLeaderTopStudents(schoolId, 20, pointGroupId);
```

## Access Control Rules

### Admin Access
- **Full access** to all data
- Can see all students, points, and events
- No restrictions on query limits

### Teacher Access
- **Group access** to students in their managed groups
- **Top access** to see top students (max 20)
- Can see student names, grades, points, and ranks
- Cannot see detailed point events for students outside their groups

### Group Leader Access
- **Group access** to students in their managed groups (max 100 students)
- **Top access** to see top students (max 30)
- Can see comprehensive student information including birthdate, gender, points, and events
- Has the most detailed access to students within their groups
- Can see all point events and group-specific data

### Student Access
- **Own access** to their own data
- **Nearby access** to see students within 5 ranks (configurable)
- **Top access** to see top 10 students
- Cannot see other students' detailed information

### Parent Access
- **Own access** to their child's data
- **Nearby access** to see students within 3 ranks
- **Top access** to see top 5 students
- More restricted than student access

## Caching Strategy

The system uses intelligent caching with different TTL values:

- **Dashboard data**: 2 minutes
- **Ranking data**: 1 minute
- **Top students**: 3 minutes
- **Student data**: 5 minutes

Cache keys are generated based on:
- Query parameters
- User role
- Access level
- School ID

## Performance Benefits

1. **Single Query Execution**: Complex joins are done once and cached
2. **Role-Based Filtering**: Data is filtered at the API level, not in multiple queries
3. **Intelligent Caching**: Frequently accessed data is cached with appropriate TTL
4. **Query Optimization**: The QueryBuilder optimizes SQL queries for performance

## Security Features

1. **Access Validation**: Every request validates user access to the school
2. **Role-Based Restrictions**: Data access is restricted based on user role
3. **Field-Level Filtering**: Only allowed fields are returned based on access level
4. **Audit Logging**: All operations are logged for security monitoring

## Migration from Old API

To migrate from the old API system:

1. Replace direct database queries with API service calls
2. Update components to use the new endpoint functions
3. Remove manual access control checks (handled by the new system)
4. Update error handling to use the new error format

## Monitoring and Debugging

### Cache Statistics
```typescript
import { getCacheStats } from '@/api/v2/dashboard';

const stats = await getCacheStats();
console.log('Cache hit rate:', stats.hitRate);
console.log('Average execution time:', stats.averageExecutionTime);
```

### Logging
All operations are logged with structured data including:
- User ID and role
- School ID
- Query parameters
- Execution time
- Result counts

## Next Steps

1. **Fix Type Issues**: Resolve the remaining TypeScript errors in the dashboard API
2. **Add More Endpoints**: Create additional endpoints for specific use cases
3. **Database Optimization**: Add indexes for frequently queried fields
4. **Testing**: Add comprehensive tests for all access control scenarios
5. **Documentation**: Add JSDoc comments to all public methods
6. **Performance Monitoring**: Add metrics collection for query performance

## Example Implementation

Here's how to implement a student dashboard component using the new API:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getDashboardData, getNearbyRanking } from '@/api/v2/dashboard';

export function StudentDashboard({ schoolId, studentId }: { schoolId: number; studentId: number }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [nearbyRanking, setNearbyRanking] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Load dashboard data
        const dashboard = await getDashboardData(schoolId);
        setDashboardData(dashboard);

        // Load nearby ranking for the student
        const nearby = await getNearbyRanking(schoolId, studentId, 2);
        setNearbyRanking(nearby);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    }

    loadData();
  }, [schoolId, studentId]);

  // Render dashboard with the data
  return (
    <div>
      {/* Dashboard content */}
    </div>
  );
}
```

### Group Leader Dashboard Example

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getGroupLeaderDashboard, getGroupLeaderTopStudents } from '@/api/v2/group-leader';

export function GroupLeaderDashboard({ schoolId }: { schoolId: number }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [topStudents, setTopStudents] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Load comprehensive dashboard for managed groups
        const dashboard = await getGroupLeaderDashboard(schoolId);
        setDashboardData(dashboard);

        // Load top students within managed groups
        const top = await getGroupLeaderTopStudents(schoolId, 20);
        setTopStudents(top);
      } catch (error) {
        console.error('Failed to load group leader dashboard data:', error);
      }
    }

    loadData();
  }, [schoolId]);

  // Render group leader dashboard with the data
  return (
    <div>
      {/* Group leader dashboard content */}
    </div>
  );
}
```

This new system provides a solid foundation for efficient, secure, and maintainable data access in your application. 