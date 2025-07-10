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
    // Get current user from regular client
    const supabase = createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !supabaseUser) {
      logger.error('User not authenticated', { authError });
      throw new Error('User not authenticated');
    }

    // Use service client for database operations
    const serviceClient = await supabaseServiceClient();
    
    // Get user data and verify admin access
    const { data: userData, error: userError } = await serviceClient
      .from('user')
      .select(`
        id,
        admin_id,
        admin (
          admin_school_pair (
            school_id
          )
        )
      `)
      .eq('supabase_id', supabaseUser.id)
      .single();

    if (userError || !userData) {
      logger.error('Error fetching user data', { userId: supabaseUser.id }, new Error(userError?.message || 'User not found'));
      throw new Error('Failed to load user data');
    }

    if (!userData.admin_id) {
      logger.error('User is not an admin', { userId: supabaseUser.id });
      throw new Error('Access denied - admin role required');
    }

    // Verify admin has access to this school
    const adminSchools = userData.admin?.admin_school_pair || [];
    const hasAccess = adminSchools.some(pair => pair.school_id === schoolId);
    
    if (!hasAccess) {
      logger.error('Access denied - admin does not have access to this school', { 
        adminId: userData.admin_id, 
        schoolId,
        adminSchools: adminSchools.map(p => p.school_id)
      });
      throw new Error('Access denied - admin does not have access to this school');
    }

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

    // Get students with their total points
    const { data: students, error: studentsError } = await serviceClient
      .from('student')
      .select(`
        id,
        first_name,
        last_name,
        grade,
        student_point (
          point_value
        )
      `)
      .eq('school_id', schoolId);

    if (studentsError) {
      logger.error('Error fetching students', { schoolId, studentsError });
      throw new Error('Failed to load students');
    }

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

    // Calculate total points for each student by summing their point_value
    const studentsWithPoints = students?.map(student => {
      const totalPoints = student.student_point?.reduce((acc, point) => acc + (point.point_value || 0), 0) || 0;
      
      return {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        grade: student.grade,
        totalPoints: totalPoints
      };
    }) || [];

    logger.info('Admin school dashboard data retrieved successfully', { 
      schoolId, 
      studentCount: studentsWithPoints.length,
      groupCount: studentGroups?.length || 0,
      pointGroupCount: pointGroups?.length || 0,
      totalPointsCalculated: studentsWithPoints.reduce((acc, student) => acc + student.totalPoints, 0)
    });

    return {
      school: {
        id: school.id,
        name: school.name
      },
      students: studentsWithPoints,
      studentGroups: studentGroups?.map(group => ({
        id: group.id,
        name: group.name,
        parentId: group.parent_id
      })) || [],
      pointTypes: pointGroups?.map(group => ({
        id: group.id,
        name: group.name,
        color: group.color || '#000000'
      })) || []
    };
  } catch (error) {
    logger.error('Failed to load school dashboard', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load school dashboard');
  }
}

export async function getAdminHomeDashboard(): Promise<AdminHomeDashboard> {
  const logger = createServerLogger({ component: 'AdminAPI', action: 'getAdminHomeDashboard' });
  
  try {
    // Get current user from regular client
    const supabase = createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !supabaseUser) {
      logger.error('User not authenticated', { authError });
      throw new Error('User not authenticated');
    }

    // Use service client for database operations
    const serviceClient = await supabaseServiceClient();
    
    // Get user data and verify admin access
    const { data: userData, error: userError } = await serviceClient
      .from('user')
      .select(`
        id,
        admin_id
      `)
      .eq('supabase_id', supabaseUser.id)
      .single();

    if (userError || !userData) {
      logger.error('Error fetching user data', { userId: supabaseUser.id }, new Error(userError?.message || 'User not found'));
      throw new Error('Failed to load user data');
    }

    if (!userData.admin_id) {
      logger.error('User is not an admin', { userId: supabaseUser.id });
      throw new Error('Access denied - admin role required');
    }

    // Get the admin's schools from the admin_school_pair table
    const { data: adminSchoolPairs, error: pairsError } = await serviceClient
      .from('admin_school_pair')
      .select(`
        school_id,
        school (
          id,
          name
        )
      `)
      .eq('admin_id', userData.admin_id);

    if (pairsError) {
      logger.error('Error fetching admin school pairs', { 
        adminId: userData.admin_id, 
        pairsError 
      });
      throw new Error('Failed to load admin schools');
    }
    
    if (!adminSchoolPairs || adminSchoolPairs.length === 0) {
      logger.warn('No schools found for admin', { adminId: userData.admin_id });
    }
    
    // Transform the data to match the expected format
    const schools = adminSchoolPairs?.map(pair => ({
      id: pair.school?.id || 0,
      name: pair.school?.name || 'Unknown School'
    })).filter(school => school.id !== 0) || [];

    logger.info('Admin home dashboard data retrieved successfully', { 
      adminId: userData.admin_id, 
      schoolCount: schools.length 
    });

    return {
      id: userData.admin_id,
      schools: schools
    };
  } catch (error) {
    logger.error('Failed to load admin dashboard', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load admin dashboard');
  }
} 

/**
 * Get comprehensive school dashboard data using the robust admin APIs
 */
export async function getAdminSchoolDashboardData(schoolId: number): Promise<AdminSchoolDash> {
  const logger = createServerLogger({ component: 'AdminAPI', action: 'getAdminSchoolDashboardData', schoolId });
  
  try {
    // Get current user from regular client
    const supabase = createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !supabaseUser) {
      logger.error('User not authenticated', { authError });
      throw new Error('User not authenticated');
    }

    // Use service client for database operations
    const serviceClient = await supabaseServiceClient();
    
    // Get user data and verify admin access
    const { data: userData, error: userError } = await serviceClient
      .from('user')
      .select(`
        id,
        admin_id,
        admin (
          admin_school_pair (
            school_id
          )
        )
      `)
      .eq('supabase_id', supabaseUser.id)
      .single();

    if (userError || !userData) {
      logger.error('Error fetching user data', { userId: supabaseUser.id }, new Error(userError?.message || 'User not found'));
      throw new Error('Failed to load user data');
    }

    if (!userData.admin_id) {
      logger.error('User is not an admin', { userId: supabaseUser.id });
      throw new Error('Access denied - admin role required');
    }

    // Verify admin has access to this school
    const adminSchools = userData.admin?.admin_school_pair || [];
    const hasAccess = adminSchools.some(pair => pair.school_id === schoolId);
    
    if (!hasAccess) {
      logger.error('Access denied - admin does not have access to this school', { 
        adminId: userData.admin_id, 
        schoolId,
        adminSchools: adminSchools.map(p => p.school_id)
      });
      throw new Error('Access denied - admin does not have access to this school');
    }

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

    // Use the robust admin APIs to get comprehensive data
    const [students, groups, teachers, pointGroups, rankingGroups, timeframes] = await Promise.all([
      getSchoolStudents(schoolId),
      getSchoolGroupsWithCounts(schoolId),
      getSchoolTeachers(schoolId),
      getSchoolPointGroups(schoolId),
      getSchoolRankingGroups(schoolId),
      getSchoolTimeframes(schoolId)
    ]);

    // Get students with their total points using the robust point calculation
    const { data: studentsWithPoints, error: studentsError } = await serviceClient
      .from('student')
      .select(`
        id,
        first_name,
        last_name,
        grade,
        student_point (
          point_value,
          input_score,
          point_event (
            point_template (
              point_conversion_rule_type (
                name
              ),
              conversion_rule_value
            )
          )
        )
      `)
      .eq('school_id', schoolId);

    if (studentsError) {
      logger.error('Error fetching students with points', { schoolId, studentsError });
      throw new Error('Failed to load students with points');
    }

    // Calculate total points for each student using the robust conversion system
    const studentsWithCalculatedPoints = studentsWithPoints?.map(student => {
      const totalPoints = student.student_point?.reduce((acc, point) => {
        // Use the point_value directly as it should already be calculated with conversion rules
        return acc + (point.point_value || 0);
      }, 0) || 0;
      
      return {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        grade: student.grade,
        totalPoints: totalPoints
      };
    }) || [];

    // Transform groups to match the expected format
    const transformedGroups = groups.map(group => ({
      id: group.id,
      name: group.name,
      parentId: group.parentId || null
    }));

    // Transform point groups to match the expected format
    const transformedPointGroups = pointGroups.map(pointGroup => ({
      id: pointGroup.id,
      name: pointGroup.name,
      color: pointGroup.color || '#000000'
    }));

    logger.info('Admin school dashboard data retrieved successfully using robust APIs', { 
      schoolId, 
      studentCount: studentsWithCalculatedPoints.length,
      groupCount: transformedGroups.length,
      pointGroupCount: transformedPointGroups.length,
      teacherCount: teachers.length,
      rankingGroupCount: rankingGroups.length,
      timeframeCount: timeframes.length,
      totalPointsCalculated: studentsWithCalculatedPoints.reduce((acc, student) => acc + student.totalPoints, 0)
    });

    return {
      school: {
        id: school.id,
        name: school.name
      },
      students: studentsWithCalculatedPoints,
      studentGroups: transformedGroups,
      pointTypes: transformedPointGroups
    };
  } catch (error) {
    logger.error('Failed to load school dashboard using robust APIs', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load school dashboard');
  }
} 