/**
 * Dashboard Filter Configuration
 * 
 * This file contains filter configurations for different dashboard types.
 * These filters control privacy settings and data visibility for each dashboard.
 */

export interface DashboardFilterConfig {
  numStudentsOverall: number | null;
  numStudentsPerPointGroup: number | null;
  ratioStudentsPerGrade: number | null;
  description: string;
}

/**
 * Filter configurations for different dashboard types
 */
export const DASHBOARD_FILTERS: Record<string, DashboardFilterConfig> = {
  /**
   * Global Dashboard - Shows all data without privacy restrictions
   * Used for admin-level dashboards where full data visibility is required
   */
  GLOBAL: {
    numStudentsOverall: null,
    numStudentsPerPointGroup: null,
    ratioStudentsPerGrade: null,
    description: "No privacy filters - shows all data"
  },

  /**
   * Featured Dashboard - Moderate privacy filtering
   * Shows top performers across different categories for public display
   */
  FEATURED: {
    numStudentsOverall: 20,
    numStudentsPerPointGroup: 5,
    ratioStudentsPerGrade: 0.33,
    description: "Shows top 20 overall, top 5 per point group, top 33% per grade"
  },

  /**
   * Mobile Dashboard - Light privacy filtering
   * Similar to global but with some limits for mobile performance
   */
  MOBILE: {
    numStudentsOverall: 50,
    numStudentsPerPointGroup: 10,
    ratioStudentsPerGrade: 0.5,
    description: "Shows top 50 overall, top 10 per point group, top 50% per grade"
  },

  /**
   * Admin Dashboard - Full access for administrators
   * Same as global but explicitly for admin use
   */
  ADMIN: {
    numStudentsOverall: null,
    numStudentsPerPointGroup: null,
    ratioStudentsPerGrade: null,
    description: "No privacy filters - full admin access"
  },

  /**
   * Student Dashboard - Restrictive privacy filtering
   * Only shows nearby students and top performers for student view
   */
  STUDENT: {
    numStudentsOverall: 10,
    numStudentsPerPointGroup: 3,
    ratioStudentsPerGrade: 0.2,
    description: "Shows top 10 overall, top 3 per point group, top 20% per grade"
  },

  /**
   * Teacher Dashboard - Moderate privacy filtering
   * Shows more data than student view but less than admin
   */
  TEACHER: {
    numStudentsOverall: 30,
    numStudentsPerPointGroup: 8,
    ratioStudentsPerGrade: 0.4,
    description: "Shows top 30 overall, top 8 per point group, top 40% per grade"
  }
};

/**
 * Get filter configuration for a specific dashboard type
 * @param dashboardType - The type of dashboard
 * @returns DashboardFilterConfig object
 */
export function getDashboardFilters(dashboardType: string): DashboardFilterConfig {
  const config = DASHBOARD_FILTERS[dashboardType.toUpperCase()];
  if (!config) {
    console.warn(`Unknown dashboard type: ${dashboardType}. Using FEATURED as default.`);
    return DASHBOARD_FILTERS.FEATURED;
  }
  return config;
}

/**
 * Get all available dashboard types
 * @returns Array of dashboard type names
 */
export function getAvailableDashboardTypes(): string[] {
  return Object.keys(DASHBOARD_FILTERS);
}

/**
 * Validate a filter configuration
 * @param config - The filter configuration to validate
 * @returns true if valid, false otherwise
 */
export function validateFilterConfig(config: DashboardFilterConfig): boolean {
  if (config.numStudentsOverall !== null && config.numStudentsOverall < 0) return false;
  if (config.numStudentsPerPointGroup !== null && config.numStudentsPerPointGroup < 0) return false;
  if (config.ratioStudentsPerGrade !== null && (config.ratioStudentsPerGrade < 0 || config.ratioStudentsPerGrade > 1)) return false;
  return true;
}

/**
 * Update filter configuration for a specific dashboard type
 * @param dashboardType - The type of dashboard to update
 * @param updates - Partial configuration updates
 * @returns true if successful, false if validation fails
 */
export function updateDashboardFilters(
  dashboardType: string, 
  updates: Partial<DashboardFilterConfig>
): boolean {
  const config = DASHBOARD_FILTERS[dashboardType.toUpperCase()];
  if (!config) {
    console.error(`Unknown dashboard type: ${dashboardType}`);
    return false;
  }

  const updatedConfig = { ...config, ...updates };
  
  if (!validateFilterConfig(updatedConfig)) {
    console.error(`Invalid filter configuration for ${dashboardType}:`, updatedConfig);
    return false;
  }

  DASHBOARD_FILTERS[dashboardType.toUpperCase()] = updatedConfig;
  console.log(`Updated ${dashboardType} dashboard filters:`, updatedConfig);
  return true;
}

/**
 * Reset all dashboard filters to their default values
 */
export function resetDashboardFilters(): void {
  // Reset to default values
  DASHBOARD_FILTERS.GLOBAL = {
    numStudentsOverall: null,
    numStudentsPerPointGroup: null,
    ratioStudentsPerGrade: null,
    description: "No privacy filters - shows all data"
  };

  DASHBOARD_FILTERS.FEATURED = {
    numStudentsOverall: 20,
    numStudentsPerPointGroup: 5,
    ratioStudentsPerGrade: 0.33,
    description: "Shows top 20 overall, top 5 per point group, top 33% per grade"
  };

  DASHBOARD_FILTERS.MOBILE = {
    numStudentsOverall: 50,
    numStudentsPerPointGroup: 10,
    ratioStudentsPerGrade: 0.5,
    description: "Shows top 50 overall, top 10 per point group, top 50% per grade"
  };

  DASHBOARD_FILTERS.ADMIN = {
    numStudentsOverall: null,
    numStudentsPerPointGroup: null,
    ratioStudentsPerGrade: null,
    description: "No privacy filters - full admin access"
  };

  DASHBOARD_FILTERS.STUDENT = {
    numStudentsOverall: 10,
    numStudentsPerPointGroup: 3,
    ratioStudentsPerGrade: 0.2,
    description: "Shows top 10 overall, top 3 per point group, top 20% per grade"
  };

  DASHBOARD_FILTERS.TEACHER = {
    numStudentsOverall: 30,
    numStudentsPerPointGroup: 8,
    ratioStudentsPerGrade: 0.4,
    description: "Shows top 30 overall, top 8 per point group, top 40% per grade"
  };

  console.log("Reset all dashboard filters to default values");
}
