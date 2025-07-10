"use server";

import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';
import { createClient } from '@/utils/supabase/server';

import { AdminHomeDashboard, AdminSchoolDash, Admin } from '@/types/domain';
import { createServerLogger } from '@/utils/serverLogger';
import { getSchoolStudents } from './admin/students';
import { getSchoolGroupsWithCounts } from './admin/groups';
import { getSchoolTeachers } from './admin/teachers';
import { getSchoolPointGroups } from './admin/pointGroups';
import { getSchoolRankingGroups } from './admin/rankingGroups';
import { getSchoolTimeframes } from './admin/timeframes';
import { AdminService } from './service/admin';
import { UserContextResolver } from './core/user-context';

export async function getOwnAdminData(): Promise<Admin> {
  const logger = createServerLogger({ component: 'AdminAPI', action: 'getOwnAdminData' });
  
  try {
    logger.debug('Starting getOwnAdminData');
    
    // Get current user from regular client (with cookies)
    const supabase = createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();



    
    logger.debug('Auth getUser result', { 
      hasUser: !!supabaseUser, 
      userId: supabaseUser?.id,
      authError: authError ? authError.message : null 
    });
    
    if (authError || !supabaseUser) {
      logger.error('User not authenticated', { authError });
      throw new Error('User not authenticated');
    }

    // Use service client for database operations
    const serviceClient = await supabaseServiceClient();
    
    // Get user data from database
    const { data: userData, error: userError } = await serviceClient
      .from('user')
      .select(`
        id,
        admin_id,
        admin (
          id,
          admin_school_pair (
            school_id
          )
        )
      `)
      .eq('supabase_id', supabaseUser.id)
      .single();

    logger.debug('Database user query result', { 
      hasUserData: !!userData, 
      userId: userData?.id?.toString(),
      adminId: userData?.admin_id,
      userError: userError ? userError.message : null 
    });

    if (userError) {
      logger.error('Error fetching user data', { userId: supabaseUser.id }, new Error(userError.message));
      throw new Error('Failed to load user data');
    }

    if (!userData) {
      logger.error('User data not found', { userId: supabaseUser.id });
      throw new Error('User data not found');
    }

    if (!userData.admin_id) {
      logger.error('User is not an admin', { userId: supabaseUser.id });
      throw new Error('Access denied - admin role required');
    }

    logger.info('Admin data retrieved successfully', { adminId: userData.admin_id });
    return {
      id: userData.admin_id
    };
  } catch (error) {
    logger.error('Failed to load admin data', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load admin data');
  }
}

export async function getAdminSchoolDash(schoolId: number): Promise<AdminSchoolDash> {
  const logger = createServerLogger({ component: 'AdminAPI', action: 'getAdminSchoolDash', schoolId });
  
  try {
    // Use the robust system
    const authClient = createClient();
    const serviceClient = await supabaseServiceClient();
    const userContextResolver = new UserContextResolver(authClient, serviceClient);
    const userContext = await userContextResolver.resolveUserContext();
    
    if (!userContext) {
      logger.error('User context not found');
      throw new Error('User not authenticated');
    }

    if (userContext.role !== 'admin') {
      logger.error('User is not an admin', { userId: userContext.userId, role: userContext.role });
      throw new Error('Access denied - admin role required');
    }

    // Validate school access
    const hasAccess = await userContextResolver.validateSchoolAccess(schoolId);
    if (!hasAccess) {
      logger.error('Admin does not have access to this school', { 
        adminId: userContext.adminId, 
        schoolId 
      });
      throw new Error('Access denied - admin does not have access to this school');
    }

    // Use the AdminService for data operations
    const adminService = new AdminService(serviceClient, userContext);
    
    // Get school info
    const { data: school, error: schoolError } = await serviceClient
      .from('school')
      .select('id, name')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      logger.error('School not found', { schoolId, schoolError });
      throw new Error('School not found');
    }

    // Get students using the service
    const students = await adminService.getSchoolStudents(schoolId);
    
    // Get student groups
    const { data: studentGroups, error: groupsError } = await serviceClient
      .from('student_group')
      .select(`
        id,
        name,
        parent_id
      `)
      .eq('school_id', schoolId);

    if (groupsError) {
      logger.error('Error fetching student groups', { schoolId, groupsError });
      throw new Error('Failed to load student groups');
    }

    // Get point groups (point types)
    const { data: pointGroups, error: pointGroupsError } = await serviceClient
      .from('point_group')
      .select(`
        id,
        name,
        color
      `)
      .eq('school_id', schoolId);

    if (pointGroupsError) {
      logger.error('Error fetching point groups', { schoolId, pointGroupsError });
      throw new Error('Failed to load point groups');
    }

    // Calculate total points for each student
    const studentsWithPoints = await Promise.all(
      students.map(async (student) => {
        // Get total points for this student
        const { data: pointData, error: pointError } = await serviceClient
          .from('student_point')
          .select('point_value')
          .eq('student_id', student.id);

        if (pointError) {
          logger.warn('Error fetching points for student', { studentId: student.id, pointError });
        }

        const totalPoints = pointData?.reduce((sum, record) => sum + (record.point_value || 0), 0) || 0;

        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          grade: student.grade,
          totalPoints
        };
      })
    );

    const transformedGroups = studentGroups?.map(group => ({
      id: group.id,
      name: group.name,
      parentId: group.parent_id
    })) || [];

    const transformedPointTypes = pointGroups?.map(pointGroup => ({
      id: pointGroup.id,
      name: pointGroup.name,
      color: pointGroup.color
    })) || [];

    const result: AdminSchoolDash = {
      school: {
        id: school.id,
        name: school.name
      },
      students: studentsWithPoints,
      studentGroups: transformedGroups,
      pointTypes: transformedPointTypes
    };

    logger.info('Admin school dashboard data retrieved successfully', { 
      schoolId, 
      studentCount: studentsWithPoints.length,
      groupCount: transformedGroups.length,
      pointTypeCount: transformedPointTypes.length
    });

    return result;
  } catch (error) {
    logger.error('Failed to load admin school dashboard', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load admin school dashboard');
  }
}

export async function getAdminHomeDashboard(): Promise<AdminHomeDashboard> {
  const logger = createServerLogger({ component: 'AdminAPI', action: 'getAdminHomeDashboard' });
  
  try {
    // Use the robust system
    const authClient = createClient();
    const serviceClient = await supabaseServiceClient();
    const userContextResolver = new UserContextResolver(authClient, serviceClient);
    const userContext = await userContextResolver.resolveUserContext();
    
    if (!userContext) {
      logger.error('User context not found');
      throw new Error('User not authenticated');
    }

    if (userContext.role !== 'admin') {
      logger.error('User is not an admin', { userId: userContext.userId, role: userContext.role });
      throw new Error('Access denied - admin role required');
    }

    // Get all schools the admin has access to
    const schools = await userContextResolver.getUserSchools();

    const result: AdminHomeDashboard = {
      id: userContext.adminId!,
      schools: schools
    };

    logger.info('Admin home dashboard retrieved successfully', { 
      adminId: userContext.adminId,
      schoolCount: schools.length
    });

    return result;
  } catch (error) {
    logger.error('Failed to load admin home dashboard', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load admin home dashboard');
  }
}

export async function getAdminSchoolDashboardData(schoolId: number): Promise<AdminSchoolDash> {
  // This function is now an alias for getAdminSchoolDash for backward compatibility
  return getAdminSchoolDash(schoolId);
}

export async function getAdminSchoolDashWithTimeframe(schoolId: number, timeframeId: number | null): Promise<AdminSchoolDash> {
  const logger = createServerLogger({ 
    component: 'AdminAPI', 
    action: 'getAdminSchoolDashWithTimeframe', 
    schoolId,
    timeframeId: timeframeId?.toString() || 'active'
  });
  
  try {
    // Use the robust system
    const authClient = createClient();
    const serviceClient = await supabaseServiceClient();
    const userContextResolver = new UserContextResolver(authClient, serviceClient);
    const userContext = await userContextResolver.resolveUserContext();
    
    if (!userContext) {
      logger.error('User context not found');
      throw new Error('User not authenticated');
    }

    if (userContext.role !== 'admin') {
      logger.error('User is not an admin', { userId: userContext.userId, role: userContext.role });
      throw new Error('Access denied - admin role required');
    }

    // Validate school access
    const hasAccess = await userContextResolver.validateSchoolAccess(schoolId);
    if (!hasAccess) {
      logger.error('Admin does not have access to this school', { 
        adminId: userContext.adminId, 
        schoolId 
      });
      throw new Error('Access denied - admin does not have access to this school');
    }

    // Use the AdminService for data operations
    const adminService = new AdminService(serviceClient, userContext);
    
    // Get school info
    const { data: school, error: schoolError } = await serviceClient
      .from('school')
      .select('id, name')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      logger.error('School not found', { schoolId, schoolError });
      throw new Error('School not found');
    }

    // Get timeframe data for filtering
    let timeframeStart = null;
    let timeframeEnd = null;
    
    if (timeframeId !== null) {
      const { data: timeframe, error: timeframeError } = await serviceClient
        .from('school_timeframes')
        .select('starts_at, ends_at')
        .eq('id', timeframeId)
        .eq('school_id', schoolId)
        .single();

      if (timeframeError || !timeframe) {
        logger.error('Timeframe not found', { timeframeId, schoolId, timeframeError });
        throw new Error('Timeframe not found');
      }

      timeframeStart = timeframe.starts_at;
      timeframeEnd = timeframe.ends_at;
    } else {
      // Get active timeframe
      const { data: activeTimeframe, error: timeframeError } = await serviceClient
        .from('school_timeframes')
        .select('starts_at, ends_at')
        .eq('school_id', schoolId)
        .eq('active', true)
        .single();

      if (timeframeError || !activeTimeframe) {
        logger.warn('No active timeframe found, using all data', { schoolId, timeframeError });
      } else {
        timeframeStart = activeTimeframe.starts_at;
        timeframeEnd = activeTimeframe.ends_at;
      }
    }

    // Get students using the service
    const students = await adminService.getSchoolStudents(schoolId);
    
    // Get student groups
    const { data: studentGroups, error: groupsError } = await serviceClient
      .from('student_group')
      .select(`
        id,
        name,
        parent_id
      `)
      .eq('school_id', schoolId);

    if (groupsError) {
      logger.error('Error fetching student groups', { schoolId, groupsError });
      throw new Error('Failed to load student groups');
    }

    // Get point groups (point types)
    const { data: pointGroups, error: pointGroupsError } = await serviceClient
      .from('point_group')
      .select(`
        id,
        name,
        color
      `)
      .eq('school_id', schoolId);

    if (pointGroupsError) {
      logger.error('Error fetching point groups', { schoolId, pointGroupsError });
      throw new Error('Failed to load point groups');
    }

    // Calculate total points for each student within the timeframe
    const studentsWithPoints = await Promise.all(
      students.map(async (student) => {
        // Build query for student points
        let pointQuery = serviceClient
          .from('student_point')
          .select(`
            point_value,
            point_event!inner(
              date,
              student_group!inner(school_id)
            )
          `)
          .eq('student_id', student.id)
          .eq('point_event.student_group.school_id', schoolId);

        // Add timeframe filtering if timeframe is specified
        if (timeframeStart && timeframeEnd) {
          pointQuery = pointQuery
            .gte('point_event.date', timeframeStart)
            .lte('point_event.date', timeframeEnd);
        }

        const { data: pointData, error: pointError } = await pointQuery;

        if (pointError) {
          logger.warn('Error fetching points for student', { studentId: student.id, pointError });
        }

        const totalPoints = pointData?.reduce((sum, record) => sum + (record.point_value || 0), 0) || 0;

        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          grade: student.grade,
          totalPoints
        };
      })
    );

    const transformedGroups = studentGroups?.map(group => ({
      id: group.id,
      name: group.name,
      parentId: group.parent_id
    })) || [];

    const transformedPointTypes = pointGroups?.map(pointGroup => ({
      id: pointGroup.id,
      name: pointGroup.name,
      color: pointGroup.color
    })) || [];

    const result: AdminSchoolDash = {
      school: {
        id: school.id,
        name: school.name
      },
      students: studentsWithPoints,
      studentGroups: transformedGroups,
      pointTypes: transformedPointTypes
    };

    logger.info('Admin school dashboard data retrieved successfully', { 
      schoolId, 
      timeframeId,
      studentCount: studentsWithPoints.length,
      groupCount: transformedGroups.length,
      pointTypeCount: transformedPointTypes.length
    });

    return result;
  } catch (error) {
    logger.error('Failed to load admin school dashboard', { 
      schoolId, 
      timeframeId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load admin school dashboard');
  }
}

// Client-side callable version
export async function getAdminDataWithContext(): Promise<Admin> {
  const logger = createServerLogger({ component: 'AdminAPI', action: 'getAdminDataWithContext' });
  
  try {
    logger.debug('Starting getAdminDataWithContext');
    
    // Use the robust system
    const authClient = createClient();
    const serviceClient = await supabaseServiceClient();
    const userContextResolver = new UserContextResolver(authClient, serviceClient);
    const userContext = await userContextResolver.resolveUserContext();
    
    if (!userContext) {
      logger.error('User context not found');
      throw new Error('User not authenticated');
    }

    if (userContext.role !== 'admin') {
      logger.warn('User is not an admin', { role: userContext.role });
      throw new Error('Access denied - admin role required');
    }

    logger.info('Admin data retrieved successfully', { adminId: userContext.adminId });
    return {
      id: userContext.adminId!
    };
  } catch (error) {
    logger.error('Failed to load admin data', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : undefined);
    throw error;
  }
} 