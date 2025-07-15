"use server";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { Timeframe } from "@/types/domain";
import { SimpleDashboardData } from "./service/dashboard";
import { createServerLogger, logDatabaseQuery } from "@/utils/serverLogger";
import { DashboardService } from "./service/dashboard";

/**
 * Fetches timeframe data either by ID or gets the active timeframe for a school
 * @param schoolId - The school ID to get the active timeframe for (when timeframeId is null)
 * @param timeframeId - The specific timeframe ID to fetch, or null to get active timeframe
 * @returns Promise<{ id: number, name: string, starts_at: string, ends_at: string, active: boolean, school_id: number }>
 */
// This function is currently unused but may be needed in the future
/*
async function getTimeframeData(schoolId: number, timeframeId: number | null): Promise<Timeframe[]> {
    const startTime = Date.now();
    const logger = createServerLogger({ 
        component: 'DashboardAPI', 
        action: 'getTimeframeData',
        schoolId: schoolId.toString(),
        timeframeId: timeframeId?.toString() || 'active'
    });

    logger.debug('Fetching timeframe data', { schoolId, timeframeId });
    
    try {
        const supabase = await supabaseServiceClient();
        const dashboardService = new DashboardService(supabase);
        const timeframeData = await dashboardService.getTimeframeData(schoolId, timeframeId);

        const duration = Date.now() - startTime;
        logDatabaseQuery('SELECT', 'school_timeframes', duration, 
            timeframeId === null ? 'SELECT * FROM school_timeframes WHERE school_id = $1' : 'SELECT * FROM school_timeframes WHERE id = $1',
            timeframeId === null ? { schoolId } : { timeframeId }
        );

        logger.info('Timeframe data fetched successfully', { 
            schoolId, 
            timeframeId, 
            duration,
            timeframeCount: timeframeData.length 
        });

        return timeframeData;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Failed to fetch timeframe data', { 
            schoolId, 
            timeframeId, 
            duration 
        }, error as Error);
        throw error;
    }
}
*/

export async function checkSchoolAccess(schoolId: number): Promise<boolean> {
    const startTime = Date.now();
    const logger = createServerLogger({ 
        component: 'DashboardAPI', 
        action: 'checkSchoolAccess',
        schoolId: schoolId.toString()
    });

    logger.debug('Checking school access', { schoolId });
    
    try {
        const supabase = await supabaseServiceClient();
        const dashboardService = new DashboardService(supabase);
        const hasAccess = await dashboardService.checkSchoolAccess(schoolId);

        const duration = Date.now() - startTime;
        if (hasAccess) {
            logger.info('User has access to school', { 
                schoolId, 
                duration 
            });
        } else {
            logger.warn('User denied access to school', { 
                schoolId, 
                duration
            });
        }

        return hasAccess;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Error checking school access', { 
            schoolId, 
            duration 
        }, error as Error);
        return false;
    }
}

export async function getTopScrollingDashboard(
    schoolId: number,
    timeframeId: number | null
): Promise<SimpleDashboardData> {
    const startTime = Date.now();
    const logger = createServerLogger({ 
        component: 'DashboardAPI', 
        action: 'getTopScrollingDashboard',
        schoolId: schoolId.toString(),
        timeframeId: timeframeId?.toString() || 'active'
    });

    logger.info('Starting top scrolling dashboard request', { schoolId, timeframeId });
    
    try {
        const supabase = await supabaseServiceClient();
        const dashboardService = new DashboardService(supabase);
        const dashboardData = await dashboardService.getTopScrollingDashboard(schoolId, timeframeId);

        const duration = Date.now() - startTime;
        logger.info('Top scrolling dashboard retrieved successfully', { 
            schoolId, 
            timeframeId,
            duration,
            studentCount: dashboardData.students.length
        });

        return dashboardData;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Failed to get top scrolling dashboard', { 
            schoolId, 
            timeframeId,
            duration 
        }, error as Error);
        throw error;
    }
}

export async function getTopStudents(
    schoolId: number,
    limit: number,
    pointGroupId?: number,
    studentGroupId?: number,
    timeframeId?: number
) {
    const startTime = Date.now();
    const logger = createServerLogger({ 
        component: 'DashboardAPI', 
        action: 'getTopStudents',
        schoolId: schoolId.toString()
    });

    logger.info('Starting top students request', { schoolId, limit, pointGroupId, studentGroupId, timeframeId });
    
    try {
        const supabase = await supabaseServiceClient();
        const dashboardService = new DashboardService(supabase);
        const topStudents = await dashboardService.getTopStudents(schoolId, limit, pointGroupId, studentGroupId, timeframeId);

        const duration = Date.now() - startTime;
        logger.info('Top students retrieved successfully', { 
            schoolId, 
            limit,
            duration,
            studentCount: topStudents.students.length
        });

        return topStudents;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Failed to get top students', { 
            schoolId, 
            limit,
            duration 
        }, error as Error);
        throw error;
    }
}

export async function getNearbyRanking(
    schoolId: number,
    studentId: number,
    rankWindow: number,
    pointGroupId?: number,
    studentGroupId?: number,
    timeframeId?: number
) {
    const startTime = Date.now();
    const logger = createServerLogger({ 
        component: 'DashboardAPI', 
        action: 'getNearbyRanking',
        schoolId: schoolId.toString(),
        studentId: studentId.toString()
    });

    logger.info('Starting nearby ranking request', { schoolId, studentId, rankWindow, pointGroupId, studentGroupId, timeframeId });
    
    try {
        const supabase = await supabaseServiceClient();
        const dashboardService = new DashboardService(supabase);
        const nearbyRanking = await dashboardService.getNearbyRanking(schoolId, studentId, rankWindow, pointGroupId, studentGroupId, timeframeId);

        const duration = Date.now() - startTime;
        logger.info('Nearby ranking retrieved successfully', { 
            schoolId, 
            studentId,
            rankWindow,
            duration,
            nearbyStudentCount: nearbyRanking.nearbyStudents.length
        });

        return nearbyRanking;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Failed to get nearby ranking', { 
            schoolId, 
            studentId,
            rankWindow,
            duration 
        }, error as Error);
        throw error;
    }
}

export async function getStudentPointsWithRanking(
    schoolId: number,
    timeframeId?: number,
    pointGroupId?: number,
    studentGroupId?: number,
    grade?: number,
    limit?: number,
    offset?: number,
    accessLevel: 'full' | 'nearby' | 'top' | 'own' | 'group' = 'full'
) {
    const startTime = Date.now();
    const logger = createServerLogger({ 
        component: 'DashboardAPI', 
        action: 'getStudentPointsWithRanking',
        schoolId: schoolId.toString()
    });

    logger.info('Starting student points with ranking request', { 
        schoolId, 
        timeframeId, 
        pointGroupId, 
        studentGroupId, 
        grade, 
        limit, 
        offset, 
        accessLevel 
    });
    
    try {
        const supabase = await supabaseServiceClient();
        const dashboardService = new DashboardService(supabase);
        const studentPoints = await dashboardService.getStudentPointsWithRanking(
            schoolId, 
            timeframeId, 
            pointGroupId, 
            studentGroupId, 
            grade, 
            limit, 
            offset, 
            accessLevel
        );

        const duration = Date.now() - startTime;
        logger.info('Student points with ranking retrieved successfully', { 
            schoolId, 
            duration,
            studentCount: studentPoints.students.length
        });

        return studentPoints;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Failed to get student points with ranking', { 
            schoolId, 
            duration 
        }, error as Error);
        throw error;
    }
}

/**
 * Invalidates cache for a school
 */
export async function invalidateSchoolCache(schoolId: number): Promise<void> {
    const logger = createServerLogger({ 
        component: 'DashboardAPI', 
        action: 'invalidateSchoolCache',
        schoolId: schoolId.toString()
    });

    try {
        const supabase = await supabaseServiceClient();
        const dashboardService = new DashboardService(supabase);
        dashboardService.invalidateSchoolCache(schoolId);

        logger.info('School cache invalidated successfully', { schoolId });
    } catch (error) {
        logger.error('Failed to invalidate school cache', { schoolId }, error as Error);
        throw error;
    }
}

/**
 * Gets cache statistics
 */
export async function getCacheStats() {
    const logger = createServerLogger({ 
        component: 'DashboardAPI', 
        action: 'getCacheStats'
    });

    try {
        const supabase = await supabaseServiceClient();
        const dashboardService = new DashboardService(supabase);
        const stats = dashboardService.getCacheStats();

        logger.info('Cache statistics retrieved successfully', { stats });
        return stats;
    } catch (error) {
        logger.error('Failed to get cache statistics', {}, error as Error);
        throw error;
    }
}