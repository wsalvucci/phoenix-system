# Dashboard Filter Configuration

This directory contains the dashboard filter configuration system that allows you to easily adjust privacy settings for different dashboard types.

## Files

- `dashboardFilters.ts` - Contains filter configurations and utility functions
- `universalApi.ts` - Updated to use the filter configurations
- `README.md` - This documentation file

## Usage

### Basic Usage

The filter system is automatically applied when you call the dashboard API functions:

```typescript
import { featuredDashGetGlobalStats, globalDashGetGlobalStats } from "@/app/supaApi/universal/universalApi";

// Featured dashboard with privacy filters
const featuredData = await featuredDashGetGlobalStats(12, null);

// Global dashboard with no privacy filters
const globalData = await globalDashGetGlobalStats(12, null);
```

### Adjusting Filter Values

You can easily adjust filter values by modifying the `DASHBOARD_FILTERS` object in `dashboardFilters.ts`:

```typescript
// Example: Make featured dashboard show more students
DASHBOARD_FILTERS.FEATURED = {
  numStudentsOverall: 50,        // Show top 50 overall (was 20)
  numStudentsPerPointGroup: 10,  // Show top 10 per point group (was 5)
  ratioStudentsPerGrade: 0.5,    // Show top 50% per grade (was 33%)
  description: "Shows top 50 overall, top 10 per point group, top 50% per grade"
};
```

### Using Utility Functions

```typescript
import { updateDashboardFilters, getDashboardFilters, resetDashboardFilters } from "./dashboardFilters";

// Update specific dashboard filters
updateDashboardFilters('FEATURED', {
  numStudentsOverall: 30,
  ratioStudentsPerGrade: 0.4
});

// Get current filter configuration
const filters = getDashboardFilters('FEATURED');
console.log(filters);

// Reset all filters to default values
resetDashboardFilters();
```

## Available Dashboard Types

- `GLOBAL` - No privacy filters (shows all data)
- `FEATURED` - Moderate privacy filtering for public display
- `MOBILE` - Light privacy filtering for mobile performance
- `ADMIN` - Full access for administrators
- `STUDENT` - Restrictive privacy filtering for student view
- `TEACHER` - Moderate privacy filtering for teacher view

## Filter Parameters

- `numStudentsOverall` - Maximum number of students to show overall (null = no limit)
- `numStudentsPerPointGroup` - Maximum number of students to show per point group (null = no limit)
- `ratioStudentsPerGrade` - Ratio of students to show per grade (0.0 to 1.0, null = no limit)

## Privacy Logic

Students are included if they meet ANY of these criteria:
1. They are in the top `numStudentsOverall` students overall
2. They are in the top `numStudentsPerPointGroup` students for at least one point group
3. They are in the top `ratioStudentsPerGrade` percentage of their grade

This ensures that top performers are always visible while maintaining privacy for other students.
