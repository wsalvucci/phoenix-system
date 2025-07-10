"use server";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { createClient } from "@/utils/supabase/server";
import { ApiService } from "../core/api-service";
import { UserContextResolver } from "../core/user-context";
import { QueryFilters } from "../core/types";
import { createServerLogger } from "@/utils/serverLogger";

/**
 * Gets comprehensive data for students in a group leader's managed groups
 */
export async function getGroupLeaderDashboard(schoolId: number, timeframeId?: number) {
  const logger = createServerLogger({
    component: 'GroupLeaderAPI',
    action: 'getGroupLeaderDashboard',
    schoolId: schoolId.toString()
  });

  try {
    const authClient = createClient();
    const supabase = await supabaseServiceClient();
    
    // Resolve user context
    const contextResolver = new UserContextResolver(authClient, supabase);
    const userContext = await contextResolver.resolveUserContext();
    
    if (!userContext) {
      logger.warn('No user context found for group leader dashboard request');
      throw new Error('Authentication required');
    }

    // Validate that user is a group leader
    if (userContext.role !== 'groupLeader') {
      logger.warn('User is not a group leader', { 
        userId: userContext.userId,
        role: userContext.role
      });
      throw new Error('Access denied - group leader role required');
    }

    // Validate school access
    const hasAccess = await contextResolver.validateSchoolAccess(schoolId);
    if (!hasAccess) {
      logger.warn('Group leader denied access to school', { 
        userId: userContext.userId,
        schoolId: schoolId.toString()
      });
      throw new Error('Access denied to this school');
    }

    // Create API service
    const apiService = new ApiService(supabase, userContext);

    // Build query filters
    const filters: QueryFilters = {
      schoolId,
      timeframeId
    };

    // Get dashboard data (will be filtered to only group leader's groups)
    const dashboardData = await apiService.getDashboardData(filters);

    logger.info('Group leader dashboard data retrieved successfully', {
      schoolId: schoolId.toString(),
      userId: userContext.userId,
      managedGroupIds: userContext.managedGroupIds,
      studentCount: (dashboardData as any).students?.length || 0
    });

    return dashboardData;
  } catch (error) {
    logger.error('Failed to get group leader dashboard data', { schoolId }, error as Error);
    throw error;
  }
}

/**
 * Gets detailed student information for a specific student in the group leader's groups
 */
export async function getGroupLeaderStudentDetails(
  schoolId: number, 
  studentId: number, 
  timeframeId?: number
) {
  const logger = createServerLogger({
    component: 'GroupLeaderAPI',
    action: 'getGroupLeaderStudentDetails',
    schoolId: schoolId.toString(),
    studentId: studentId.toString()
  });

  try {
    const authClient = createClient();
    const supabase = await supabaseServiceClient();
    
    // Resolve user context
    const contextResolver = new UserContextResolver(authClient, supabase);
    const userContext = await contextResolver.resolveUserContext();
    
    if (!userContext) {
      logger.warn('No user context found for group leader student details request');
      throw new Error('Authentication required');
    }

    // Validate that user is a group leader
    if (userContext.role !== 'groupLeader') {
      logger.warn('User is not a group leader', { 
        userId: userContext.userId,
        role: userContext.role
      });
      throw new Error('Access denied - group leader role required');
    }

    // Validate school access
    const hasAccess = await contextResolver.validateSchoolAccess(schoolId);
    if (!hasAccess) {
      logger.warn('Group leader denied access to school', { 
        userId: userContext.userId,
        schoolId: schoolId.toString()
      });
      throw new Error('Access denied to this school');
    }

    // Validate that the student is in one of the group leader's groups
    if (userContext.managedGroupIds && userContext.managedGroupIds.length > 0) {
      const { data: studentGroups, error } = await supabase
        .from('student_group_pair')
        .select('student_group_id')
        .eq('student_id', studentId)
        .in('student_group_id', userContext.managedGroupIds);

      if (error || !studentGroups || studentGroups.length === 0) {
        logger.warn('Student not found in group leader\'s managed groups', {
          userId: userContext.userId,
          studentId,
          managedGroupIds: userContext.managedGroupIds
        });
        throw new Error('Student not found in your managed groups');
      }
    }

    // Create API service
    const apiService = new ApiService(supabase, userContext);

    // Build query filters
    const filters: QueryFilters = {
      schoolId,
      timeframeId
    };

    // Get student points with ranking (will be filtered to only group leader's groups)
    const studentData = await apiService.getStudentPointsWithRanking(filters, 'group');

    // Find the specific student
    const targetStudent = studentData.students.find(student => student.studentId === studentId);

    if (!targetStudent) {
      throw new Error('Student data not found');
    }

    logger.info('Group leader student details retrieved successfully', {
      schoolId: schoolId.toString(),
      userId: userContext.userId,
      studentId,
      studentRank: targetStudent.rank
    });

    return targetStudent;
  } catch (error) {
    logger.error('Failed to get group leader student details', { schoolId, studentId }, error as Error);
    throw error;
  }
}

/**
 * Gets nearby ranking data for a student within the group leader's groups
 */
export async function getGroupLeaderNearbyRanking(
  schoolId: number,
  studentId: number,
  rankWindow: number = 3,
  pointGroupId?: number,
  studentGroupId?: number,
  timeframeId?: number
) {
  const logger = createServerLogger({
    component: 'GroupLeaderAPI',
    action: 'getGroupLeaderNearbyRanking',
    schoolId: schoolId.toString(),
    studentId: studentId.toString()
  });

  try {
    const authClient = createClient();
    const supabase = await supabaseServiceClient();
    
    // Resolve user context
    const contextResolver = new UserContextResolver(authClient, supabase);
    const userContext = await contextResolver.resolveUserContext();
    
    if (!userContext) {
      logger.warn('No user context found for group leader nearby ranking request');
      throw new Error('Authentication required');
    }

    // Validate that user is a group leader
    if (userContext.role !== 'groupLeader') {
      logger.warn('User is not a group leader', { 
        userId: userContext.userId,
        role: userContext.role
      });
      throw new Error('Access denied - group leader role required');
    }

    // Validate school access
    const hasAccess = await contextResolver.validateSchoolAccess(schoolId);
    if (!hasAccess) {
      logger.warn('Group leader denied access to school', { 
        userId: userContext.userId,
        schoolId: schoolId.toString()
      });
      throw new Error('Access denied to this school');
    }

    // Create API service
    const apiService = new ApiService(supabase, userContext);

    // Build query filters
    const filters: QueryFilters = {
      schoolId,
      timeframeId,
      pointGroupId,
      studentGroupId
    };

    // Get nearby ranking data
    const nearbyRankingData = await apiService.getNearbyRanking(
      { studentId, rankWindow, pointGroupId, studentGroupId },
      filters
    );

    logger.info('Group leader nearby ranking data retrieved successfully', {
      schoolId: schoolId.toString(),
      userId: userContext.userId,
      targetStudentId: studentId,
      rankWindow,
      resultCount: (nearbyRankingData as any).nearbyStudents?.length || 0
    });

    return nearbyRankingData;
  } catch (error) {
    logger.error('Failed to get group leader nearby ranking', { schoolId, studentId }, error as Error);
    throw error;
  }
}

/**
 * Gets top students within the group leader's managed groups
 */
export async function getGroupLeaderTopStudents(
  schoolId: number,
  limit: number = 20,
  pointGroupId?: number,
  studentGroupId?: number,
  timeframeId?: number
) {
  const logger = createServerLogger({
    component: 'GroupLeaderAPI',
    action: 'getGroupLeaderTopStudents',
    schoolId: schoolId.toString()
  });

  try {
    const authClient = createClient();
    const supabase = await supabaseServiceClient();
    
    // Resolve user context
    const contextResolver = new UserContextResolver(authClient, supabase);
    const userContext = await contextResolver.resolveUserContext();
    
    if (!userContext) {
      logger.warn('No user context found for group leader top students request');
      throw new Error('Authentication required');
    }

    // Validate that user is a group leader
    if (userContext.role !== 'groupLeader') {
      logger.warn('User is not a group leader', { 
        userId: userContext.userId,
        role: userContext.role
      });
      throw new Error('Access denied - group leader role required');
    }

    // Validate school access
    const hasAccess = await contextResolver.validateSchoolAccess(schoolId);
    if (!hasAccess) {
      logger.warn('Group leader denied access to school', { 
        userId: userContext.userId,
        schoolId: schoolId.toString()
      });
      throw new Error('Access denied to this school');
    }

    // Create API service
    const apiService = new ApiService(supabase, userContext);

    // Build query filters
    const filters: QueryFilters = {
      schoolId,
      timeframeId,
      pointGroupId,
      studentGroupId
    };

    // Get top students data
    const topStudentsData = await apiService.getTopStudents({ limit }, filters);

    logger.info('Group leader top students data retrieved successfully', {
      schoolId: schoolId.toString(),
      userId: userContext.userId,
      limit,
      resultCount: (topStudentsData as any).students?.length || 0
    });

    return topStudentsData;
  } catch (error) {
    logger.error('Failed to get group leader top students', { schoolId }, error as Error);
    throw error;
  }
} 