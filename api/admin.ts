"use server";

import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';
import { createClient } from '@/utils/supabase/server';

import { AdminHomeDashboard, AdminSchoolDash, Admin } from '@/types/domain';
import { createServerLogger } from '@/utils/serverLogger';

import { AdminService } from './service/admin';
import { UserContextResolver } from './core/user-context';
import { AdminStudentDashboardData } from '@/app/dataClasses';

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

export async function getAdminStudentDataWithTimeframe(
  schoolId: number, 
  studentId: number, 
  timeframeId: number | null
): Promise<AdminStudentDashboardData | null> {
  const logger = createServerLogger({ 
    component: 'AdminAPI', 
    action: 'getAdminStudentDataWithTimeframe', 
    schoolId,
    studentId,
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

    // Get student basic info
    const { data: student, error: studentError } = await serviceClient
      .from('student')
      .select(`
        id,
        first_name,
        last_name,
        grade,
        school_id
      `)
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .single();

    if (studentError || !student) {
      logger.error('Student not found', { studentId, schoolId, studentError });
      throw new Error('Student not found');
    }

    // Get student points within timeframe
    let pointQuery = serviceClient
      .from('student_point')
      .select(`
        point_value,
        input_score,
        point_event!inner(
          id,
          name,
          date,
          max_input,
          point_template!inner(
            id,
            name,
            point_group!inner(
              id,
              name,
              color
            )
          ),
          student_group!inner(
            id,
            name,
            school_id
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('point_event.student_group.school_id', schoolId);

    // Add timeframe filtering if timeframe is specified
    if (timeframeStart && timeframeEnd) {
      pointQuery = pointQuery
        .gte('point_event.date', timeframeStart)
        .lte('point_event.date', timeframeEnd);
    }

    const { data: pointData, error: pointError } = await pointQuery;

    if (pointError) {
      logger.error('Error fetching student points', { studentId, pointError });
      throw new Error('Failed to load student points');
    }

    // Calculate total points
    const totalPoints = pointData?.reduce((sum, record) => sum + (record.point_value || 0), 0) || 0;

    // Group points by point group
    const pointsByPointGroup = new Map();
    pointData?.forEach(record => {
      const pointGroupId = record.point_event.point_template.point_group.id;
      if (!pointsByPointGroup.has(pointGroupId)) {
        pointsByPointGroup.set(pointGroupId, {
          groupId: pointGroupId,
          name: record.point_event.point_template.point_group.name,
          color: record.point_event.point_template.point_group.color,
          points: 0,
          rank: -1,
          outOf: 0
        });
      }
      pointsByPointGroup.get(pointGroupId).points += record.point_value || 0;
    });

    // Get rankings for point groups
    const pointGroupRanks = await Promise.all(
      Array.from(pointsByPointGroup.values()).map(async (pointGroup) => {
        // Get all students' points for this point group in the timeframe
        let rankQuery = serviceClient
          .from('student_point')
          .select(`
            student_id,
            point_value,
            point_event!inner(
              date,
              point_template!inner(
                point_group_id
              ),
              student_group!inner(
                school_id
              )
            )
          `)
          .eq('point_event.point_template.point_group_id', pointGroup.groupId)
          .eq('point_event.student_group.school_id', schoolId);

        if (timeframeStart && timeframeEnd) {
          rankQuery = rankQuery
            .gte('point_event.date', timeframeStart)
            .lte('point_event.date', timeframeEnd);
        }

        const { data: rankData } = await rankQuery;
        
        // Calculate total points per student for this point group
        const studentTotals = new Map();
        rankData?.forEach(record => {
          const studentId = record.student_id;
          studentTotals.set(studentId, (studentTotals.get(studentId) || 0) + (record.point_value || 0));
        });

        // Sort students by points and find rank
        const sortedStudents = Array.from(studentTotals.entries())
          .sort(([, a], [, b]) => b - a);
        
        const rank = sortedStudents.findIndex(([id]) => id === studentId) + 1;
        const outOf = sortedStudents.length;

        return {
          ...pointGroup,
          rank: rank > 0 ? rank : -1,
          outOf
        };
      })
    );

    // Get grade ranking
    const { data: gradeStudents } = await serviceClient
      .from('student')
      .select('id, grade')
      .eq('school_id', schoolId)
      .eq('grade', student.grade);

    // Calculate grade ranking based on total points
    const gradeStudentIds = gradeStudents?.map(s => s.id) || [];
    let gradeRankQuery = serviceClient
      .from('student_point')
      .select(`
        student_id,
        point_value,
        point_event!inner(
          date,
          student_group!inner(
            school_id
          )
        )
      `)
      .in('student_id', gradeStudentIds)
      .eq('point_event.student_group.school_id', schoolId);

    if (timeframeStart && timeframeEnd) {
      gradeRankQuery = gradeRankQuery
        .gte('point_event.date', timeframeStart)
        .lte('point_event.date', timeframeEnd);
    }

    const { data: gradePointData } = await gradeRankQuery;
    
    // Calculate total points per student in grade
    const gradeStudentTotals = new Map();
    gradePointData?.forEach(record => {
      const studentId = record.student_id;
      gradeStudentTotals.set(studentId, (gradeStudentTotals.get(studentId) || 0) + (record.point_value || 0));
    });

    // Sort grade students by points and find rank
    const sortedGradeStudents = Array.from(gradeStudentTotals.entries())
      .sort(([, a], [, b]) => b - a);
    
    const gradeRank = sortedGradeStudents.findIndex(([id]) => id === studentId) + 1;
    const gradeOutOf = sortedGradeStudents.length;

    // Get student groups and calculate rankings within each group
    const { data: studentGroups } = await serviceClient
      .from('student_group')
      .select(`
        id,
        name,
        student!inner(
          id
        )
      `)
      .eq('school_id', schoolId);

    const studentGroupRanks = await Promise.all(
      studentGroups?.map(async (studentGroup) => {
        const studentIds = studentGroup.student.map(s => s.id);
        
        if (!studentIds.includes(studentId)) {
          return null;
        }

        // Calculate total points for each student in this group within the timeframe
        let groupRankQuery = serviceClient
          .from('student_point')
          .select(`
            student_id,
            point_value,
            point_event!inner(
              date,
              student_group!inner(
                school_id
              )
            )
          `)
          .in('student_id', studentIds)
          .eq('point_event.student_group.school_id', schoolId);

        if (timeframeStart && timeframeEnd) {
          groupRankQuery = groupRankQuery
            .gte('point_event.date', timeframeStart)
            .lte('point_event.date', timeframeEnd);
        }

        const { data: groupPointData } = await groupRankQuery;
        
        // Calculate total points per student in this group
        const groupStudentTotals = new Map();
        groupPointData?.forEach(record => {
          const studentId = record.student_id;
          groupStudentTotals.set(studentId, (groupStudentTotals.get(studentId) || 0) + (record.point_value || 0));
        });

        // Sort students by points and find rank
        const sortedGroupStudents = Array.from(groupStudentTotals.entries())
          .sort(([, a], [, b]) => b - a);
        
        const groupRank = sortedGroupStudents.findIndex(([id]) => id === studentId) + 1;
        const groupOutOf = sortedGroupStudents.length;

        return {
          groupId: studentGroup.id,
          name: studentGroup.name,
          rank: groupRank > 0 ? groupRank : -1,
          outOf: groupOutOf
        };
      }) || []
    );

    const validStudentGroupRanks = studentGroupRanks.filter((item): item is { groupId: number; name: string; rank: number; outOf: number } => item !== null);

    // Format point events with rankings
    const pointEventsWithRanks = await Promise.all(
      pointData?.map(async (record) => {
        // Get all students' scores for this specific point event
        const { data: eventScores } = await serviceClient
          .from('student_point')
          .select(`
            student_id,
            input_score,
            point_value
          `)
          .eq('point_event_id', record.point_event.id);

        // Calculate rank for this student in this event
        let rank = -1;
        let outOf = 0;
        
        if (eventScores && eventScores.length > 0) {
          // Sort by points earned (descending), then by input score (descending) for ties
          const sortedScores = eventScores
            .map(score => ({
              studentId: score.student_id,
              inputScore: score.input_score || 0,
              pointValue: score.point_value || 0
            }))
            .sort((a, b) => {
              if (b.pointValue !== a.pointValue) {
                return b.pointValue - a.pointValue;
              }
              return b.inputScore - a.inputScore;
            });

          // Assign ranks (tied students get same rank)
          let currentRank = 1;
          let currentScore = sortedScores[0]?.pointValue;
          let currentInput = sortedScores[0]?.inputScore;
          
          for (let i = 0; i < sortedScores.length; i++) {
            const score = sortedScores[i];
            
            // If score is different from previous, increment rank
            if (score.pointValue !== currentScore || score.inputScore !== currentInput) {
              currentRank = i + 1;
              currentScore = score.pointValue;
              currentInput = score.inputScore;
            }
            
            // If this is our student, record their rank
            if (score.studentId === studentId) {
              rank = currentRank;
            }
          }
          
          outOf = sortedScores.length;
        }

        return {
          id: record.point_event.id,
          name: record.point_event.name || '',
          date: record.point_event.date || '',
          pointGroup: {
            id: record.point_event.point_template.point_group.id,
            name: record.point_event.point_template.point_group.name,
            color: record.point_event.point_template.point_group.color
          },
          pointTemplate: {
            id: record.point_event.point_template.id,
            name: record.point_event.point_template.name || '',
          },
          maxInput: record.point_event.max_input || 0,
          pointsEarned: {
            input: record.input_score || 0,
            value: record.point_value || 0
          },
          rank,
          outOf
        };
      }) || []
    );

    pointEventsWithRanks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate overall ranking
    const { data: allStudents } = await serviceClient
      .from('student')
      .select('id')
      .eq('school_id', schoolId);

    const allStudentIds = allStudents?.map(s => s.id) || [];
    let overallRankQuery = serviceClient
      .from('student_point')
      .select(`
        student_id,
        point_value,
        point_event!inner(
          date,
          student_group!inner(
            school_id
          )
        )
      `)
      .in('student_id', allStudentIds)
      .eq('point_event.student_group.school_id', schoolId);

    if (timeframeStart && timeframeEnd) {
      overallRankQuery = overallRankQuery
        .gte('point_event.date', timeframeStart)
        .lte('point_event.date', timeframeEnd);
    }

    const { data: overallPointData } = await overallRankQuery;
    
    // Calculate total points per student
    const overallStudentTotals = new Map();
    overallPointData?.forEach(record => {
      const studentId = record.student_id;
      overallStudentTotals.set(studentId, (overallStudentTotals.get(studentId) || 0) + (record.point_value || 0));
    });

    // Sort all students by points and find rank
    const sortedAllStudents = Array.from(overallStudentTotals.entries())
      .sort(([, a], [, b]) => b - a);
    
    const overallRank = sortedAllStudents.findIndex(([id]) => id === studentId) + 1;
    const overallOutOf = sortedAllStudents.length;

    const result: AdminStudentDashboardData = {
      student: {
        id: student.id,
        name: `${student.last_name}, ${student.first_name}`,
        grade: student.grade,
        totalPoints,
        rank: overallRank > 0 ? overallRank : -1,
        outOf: overallOutOf,
        rankByPointGroup: pointGroupRanks,
        rankByGrade: {
          grade: student.grade,
          rank: gradeRank > 0 ? gradeRank : -1,
          outOf: gradeOutOf
        },
        rankByRankingGroup: validStudentGroupRanks
      },
      pointEvents: pointEventsWithRanks
    };

    logger.info('Admin student data retrieved successfully', { 
      schoolId, 
      studentId,
      timeframeId,
      totalPoints,
      pointEventCount: pointEventsWithRanks.length
    });

    return result;
  } catch (error) {
    logger.error('Failed to load admin student data', { 
      schoolId, 
      studentId,
      timeframeId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load admin student data');
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