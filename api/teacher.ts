"use server";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { Teacher, TeachingAssistant } from "@/types/domain";
import { getPhoenixUser } from "./user";
import { getOwnStudent } from "@/app/supaApi/server/sessionActor";
import { createServerLogger } from "@/utils/serverLogger";

/**
 * Centralized function to check if a teacher has access to a specific group
 * Handles multi-teacher scenarios where a user might have multiple teacher records
 */
async function checkTeacherGroupAccess(teacher: Teacher, groupId: number): Promise<boolean> {
  const logger = createServerLogger({ component: 'TeacherAPI', action: 'checkTeacherGroupAccess' });
  
  try {
    if (!teacher.linkedUserId) {
      logger.warn('Teacher has no linked user ID');
      return false;
    }

    const supabase = await supabaseServiceClient();
    
    // Get all teacher records for this user
    const { data: allTeachers, error: teachersError } = await supabase
      .from('teacher')
      .select('id')
      .eq('linked_user', teacher.linkedUserId);

    if (teachersError) {
      logger.error('Error fetching teacher records:', { teachersError });
      return false;
    }

    const teacherIds = allTeachers?.map(t => t.id) || [];
    
    // Check if any teacher record has access to this group
    const { data: teacherGroupAccess, error: accessError } = await supabase
      .from('teacher_student_group_pair')
      .select('group_id')
      .in('teacher_id', teacherIds)
      .eq('group_id', groupId)
      .limit(1);

    if (accessError || !teacherGroupAccess || teacherGroupAccess.length === 0) {
      logger.warn('Teacher does not have access to this group', { teacherIds, groupId });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error checking teacher group access', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : undefined);
    return false;
  }
}

/** Every id must be a point event of this group, so a TA grant can never point at another group's events. */
async function assertPointEventsInGroup(pointEventIds: number[], groupId: number): Promise<void> {
  const unique = Array.from(new Set(pointEventIds));
  if (unique.length === 0) return;
  const supabase = await supabaseServiceClient();
  const { data, error } = await supabase
    .from('point_event')
    .select('id')
    .eq('student_group_id', groupId)
    .in('id', unique);
  if (error || (data?.length ?? 0) !== unique.length) {
    throw new Error('Point event is not part of this group');
  }
}

export async function getOwnTeacherData(): Promise<Teacher | null> {
    const logger = createServerLogger({ component: 'TeacherAPI', action: 'getOwnTeacherData' });
    
    try {
        const phoenixUser = await getPhoenixUser();

        if (phoenixUser === null) {
            logger.warn('No Phoenix user found');
            return null;
        }

        const supabase = await supabaseServiceClient();
        const { data: teacherDataArray, error: teacherDataError } = await supabase
            .from('teacher')
            .select('*')
            .eq('linked_user', phoenixUser.id);

        if (teacherDataError !== null) {
            logger.error("Error fetching teacher data:", { teacherDataError });
            return null;
        }

        if (!teacherDataArray || teacherDataArray.length === 0) {
            logger.warn('No teacher records found for user', { userId: phoenixUser.id.toString() });
            return null;
        }

        // If multiple teachers exist, log a warning and use the first one
        if (teacherDataArray.length > 1) {
            logger.warn('Multiple teacher records found for user, using first one', { 
                userId: phoenixUser.id.toString(), 
                teacherCount: teacherDataArray.length,
                teacherIds: teacherDataArray.map(t => t.id)
            });
        }

        const teacherData = teacherDataArray[0]; // Use the first teacher record
        const teacher: Teacher = {
            id: teacherData.id,
            schoolId: teacherData.school_id,
            firstName: teacherData.first_name,
            lastName: teacherData.last_name,
            linkedUserId: teacherData.linked_user,
        };

        logger.info('Teacher data retrieved successfully', { 
            teacherId: teacher.id,
            schoolId: teacher.schoolId,
            teacherName: `${teacher.firstName} ${teacher.lastName}`,
            totalTeacherRecords: teacherDataArray.length
        });

        return teacher;
    } catch (error) {
        logger.error('Failed to get own teacher data', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Gets teacher data using the robust user context system
 */
export async function getTeacherDataWithContext(): Promise<Teacher | null> {
    const logger = createServerLogger({ component: 'TeacherAPI', action: 'getTeacherDataWithContext' });
    
    try {
        // Use the simpler approach that works in getOwnTeacherData
        const phoenixUser = await getPhoenixUser();

        if (phoenixUser === null) {
            logger.warn('No Phoenix user found');
            return null;
        }

        const supabase = await supabaseServiceClient();
        const { data: teacherDataArray, error: teacherDataError } = await supabase
            .from('teacher')
            .select('*')
            .eq('linked_user', phoenixUser.id);

        if (teacherDataError !== null) {
            logger.error("Error fetching teacher data:", { teacherDataError });
            return null;
        }

        if (!teacherDataArray || teacherDataArray.length === 0) {
            logger.warn('No teacher records found for user', { userId: phoenixUser.id.toString() });
            return null;
        }

        // If multiple teachers exist, log a warning and use the first one
        if (teacherDataArray.length > 1) {
            logger.warn('Multiple teacher records found for user, using first one', { 
                userId: phoenixUser.id.toString(), 
                teacherCount: teacherDataArray.length,
                teacherIds: teacherDataArray.map(t => t.id)
            });
        }

        const teacherData = teacherDataArray[0]; // Use the first teacher record
        const teacher: Teacher = {
            id: teacherData.id,
            schoolId: teacherData.school_id,
            firstName: teacherData.first_name,
            lastName: teacherData.last_name,
            linkedUserId: teacherData.linked_user,
        };

        logger.info('Teacher data retrieved successfully using context', { 
            teacherId: teacher.id,
            schoolId: teacher.schoolId,
            teacherName: `${teacher.firstName} ${teacher.lastName}`,
            totalTeacherRecords: teacherDataArray.length
        });

        return teacher;
    } catch (error) {
        logger.error('Failed to get teacher data with context', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Gets teacher's student groups
 */
export async function getTeacherStudentGroups(): Promise<{ id: number; name: string; archived: boolean }[]> {
    const logger = createServerLogger({ component: 'TeacherAPI', action: 'getTeacherStudentGroups' });
    
    try {
        const teacher = await getOwnTeacherData();

        if (teacher === null) {
            logger.warn('No teacher data found');
            return [];
        }

        const supabase = await supabaseServiceClient();
        const { data: groupPairs, error: groupPairsError } = await supabase
            .from('teacher_student_group_pair')
            .select(`
                group_id,
                student_group (
                    id,
                    name,
                    archived
                )
            `)
            .eq('teacher_id', teacher.id);

        if (groupPairsError !== null) {
            logger.error("Error fetching teacher student groups:", { groupPairsError });
            return [];
        }

        const groups = groupPairs
            ?.map(pair => ({
                id: pair.student_group?.id,
                name: pair.student_group?.name,
                archived: pair.student_group?.archived
            }))
            .filter((group): group is { id: number; name: string; archived: boolean } => 
                group.id !== undefined && group.name !== undefined && group.archived !== undefined
            ) || [];

        logger.info('Teacher student groups retrieved successfully', { 
            teacherId: teacher.id,
            groupCount: groups.length
        });

        return groups;
    } catch (error) {
        logger.error('Failed to get teacher student groups', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return [];
    }
}

/**
 * Gets teacher's ranking groups
 */
export async function getTeacherRankingGroups(): Promise<{ id: number; name: string; studentGroups: { id: number; name: string }[] }[]> {
    const logger = createServerLogger({ component: 'TeacherAPI', action: 'getTeacherRankingGroups' });
    
    try {
        const teacher = await getOwnTeacherData();

        if (teacher === null) {
            logger.warn('No teacher data found');
            return [];
        }

        const supabase = await supabaseServiceClient();
        const { data: rankingGroupPairs, error: rankingGroupPairsError } = await supabase
            .from('teacher_ranking_group_pair')
            .select(`
                ranking_group_id,
                ranking_group (
                    id,
                    name,
                    ranking_group_pair (
                        student_group_id,
                        student_group (
                            id,
                            name
                        )
                    )
                )
            `)
            .eq('teacher_id', teacher.id);

        if (rankingGroupPairsError !== null) {
            logger.error("Error fetching teacher ranking groups:", { rankingGroupPairsError });
            return [];
        }

        const rankingGroups = rankingGroupPairs
            ?.map(pair => ({
                id: pair.ranking_group?.id,
                name: pair.ranking_group?.name,
                studentGroups: pair.ranking_group?.ranking_group_pair?.map(groupPair => ({
                    id: groupPair.student_group?.id,
                    name: groupPair.student_group?.name
                })).filter((group): group is { id: number; name: string } => 
                    group.id !== undefined && group.name !== undefined
                ) || []
            }))
            .filter((group): group is { id: number; name: string; studentGroups: { id: number; name: string }[] } => 
                group.id !== undefined && group.name !== undefined
            ) || [];

        logger.info('Teacher ranking groups retrieved successfully', { 
            teacherId: teacher.id,
            rankingGroupCount: rankingGroups.length
        });

        return rankingGroups;
    } catch (error) {
        logger.error('Failed to get teacher ranking groups', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return [];
    }
}

/**
 * Gets all teacher records for the current user
 */
export async function getAllTeacherRecords(): Promise<Teacher[]> {
    const logger = createServerLogger({ component: 'TeacherAPI', action: 'getAllTeacherRecords' });
    
    try {
        const phoenixUser = await getPhoenixUser();

        if (phoenixUser === null) {
            logger.warn('No Phoenix user found');
            return [];
        }

        const supabase = await supabaseServiceClient();
        const { data: teacherDataArray, error: teacherDataError } = await supabase
            .from('teacher')
            .select('*')
            .eq('linked_user', phoenixUser.id);

        if (teacherDataError !== null) {
            logger.error("Error fetching teacher data:", { teacherDataError });
            return [];
        }

        if (!teacherDataArray || teacherDataArray.length === 0) {
            logger.warn('No teacher records found for user', { userId: phoenixUser.id.toString() });
            return [];
        }

        const teachers: Teacher[] = teacherDataArray.map(teacherData => ({
            id: teacherData.id,
            schoolId: teacherData.school_id,
            firstName: teacherData.first_name,
            lastName: teacherData.last_name,
            linkedUserId: teacherData.linked_user,
        }));

        logger.info('All teacher records retrieved successfully', { 
            userId: phoenixUser.id.toString(),
            teacherCount: teachers.length,
            teacherIds: teachers.map(t => t.id)
        });

        return teachers;
    } catch (error) {
        logger.error('Failed to get all teacher records', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return [];
    }
}

/**
 * Gets student groups for multiple teachers
 */
async function getStudentGroupsForTeachers(teacherIds: number[]): Promise<{ id: number; name: string; archived: boolean }[]> {
    const logger = createServerLogger({ component: 'TeacherAPI', action: 'getStudentGroupsForTeachers' });
    
    try {
        if (teacherIds.length === 0) {
            return [];
        }

        const supabase = await supabaseServiceClient();
        const { data: groupPairs, error: groupPairsError } = await supabase
            .from('teacher_student_group_pair')
            .select(`
                group_id,
                student_group (
                    id,
                    name,
                    archived
                )
            `)
            .in('teacher_id', teacherIds);

        if (groupPairsError !== null) {
            logger.error("Error fetching teacher student groups:", { groupPairsError });
            return [];
        }

        // Use a Map to deduplicate by group ID
        const uniqueGroups = new Map<number, { id: number; name: string; archived: boolean }>();
        
        groupPairs?.forEach(pair => {
            const group = pair.student_group;
            if (group && group.id !== undefined && group.name !== undefined && group.archived !== undefined) {
                uniqueGroups.set(group.id, {
                    id: group.id,
                    name: group.name,
                    archived: group.archived
                });
            }
        });

        const groups = Array.from(uniqueGroups.values());

        logger.info('Student groups for multiple teachers retrieved successfully', { 
            teacherIds,
            groupCount: groups.length
        });

        return groups;
    } catch (error) {
        logger.error('Failed to get student groups for multiple teachers', { 
            teacherIds,
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return [];
    }
}

/**
 * Gets ranking groups for multiple teachers
 */
async function getRankingGroupsForTeachers(teacherIds: number[]): Promise<{ id: number; name: string; studentGroups: { id: number; name: string }[] }[]> {
    const logger = createServerLogger({ component: 'TeacherAPI', action: 'getRankingGroupsForTeachers' });
    
    try {
        if (teacherIds.length === 0) {
            return [];
        }

        const supabase = await supabaseServiceClient();
        const { data: rankingGroupPairs, error: rankingGroupPairsError } = await supabase
            .from('teacher_ranking_group_pair')
            .select(`
                ranking_group_id,
                ranking_group (
                    id,
                    name,
                    ranking_group_pair (
                        student_group_id,
                        student_group (
                            id,
                            name
                        )
                    )
                )
            `)
            .in('teacher_id', teacherIds);

        if (rankingGroupPairsError !== null) {
            logger.error("Error fetching teacher ranking groups:", { rankingGroupPairsError });
            return [];
        }

        // Use a Map to deduplicate by ranking group ID
        const uniqueRankingGroups = new Map<number, { id: number; name: string; studentGroups: { id: number; name: string }[] }>();
        
        rankingGroupPairs?.forEach(pair => {
            const rankingGroup = pair.ranking_group;
            if (rankingGroup && rankingGroup.id !== undefined && rankingGroup.name !== undefined) {
                const studentGroups = rankingGroup.ranking_group_pair?.map(groupPair => ({
                    id: groupPair.student_group?.id,
                    name: groupPair.student_group?.name
                })).filter((group): group is { id: number; name: string } => 
                    group.id !== undefined && group.name !== undefined
                ) || [];

                uniqueRankingGroups.set(rankingGroup.id, {
                    id: rankingGroup.id,
                    name: rankingGroup.name,
                    studentGroups
                });
            }
        });

        const rankingGroups = Array.from(uniqueRankingGroups.values());

        logger.info('Ranking groups for multiple teachers retrieved successfully', { 
            teacherIds,
            rankingGroupCount: rankingGroups.length
        });

        return rankingGroups;
    } catch (error) {
        logger.error('Failed to get ranking groups for multiple teachers', { 
            teacherIds,
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return [];
    }
}

/**
 * Gets teacher dashboard data
 */
export async function getTeacherDashboardData(): Promise<{
    teacher: Teacher;
    studentGroups: { id: number; name: string; archived: boolean }[];
    rankingGroups: { id: number; name: string; studentGroups: { id: number; name: string }[] }[];
}> {
    const logger = createServerLogger({ component: 'TeacherAPI', action: 'getTeacherDashboardData' });
    
    try {
        // Get all teacher records for the user
        const allTeachers = await getAllTeacherRecords();

        if (allTeachers.length === 0) {
            logger.error('No teacher data found');
            throw new Error('Teacher not found');
        }

        // Use the first teacher as the primary teacher for the response
        const primaryTeacher = allTeachers[0];
        const teacherIds = allTeachers.map(t => t.id);

        // Fetch data for all teachers
        const [studentGroups, rankingGroups] = await Promise.all([
            getStudentGroupsForTeachers(teacherIds),
            getRankingGroupsForTeachers(teacherIds)
        ]);

        const dashboardData = {
            teacher: primaryTeacher,
            studentGroups,
            rankingGroups
        };

        logger.info('Teacher dashboard data retrieved successfully', { 
            primaryTeacherId: primaryTeacher.id,
            totalTeacherCount: allTeachers.length,
            teacherIds,
            studentGroupCount: studentGroups.length,
            rankingGroupCount: rankingGroups.length
        });

        return dashboardData;
    } catch (error) {
        logger.error('Failed to get teacher dashboard data', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        throw error;
    }
}

/**
 * Gets ranking group scorebook data for a teacher
 */
export async function getTeacherRankingGroupScorebook(rankingGroupId: number): Promise<{
    id: number;
    name: string;
    studentGroups: { id: number; name: string }[];
    pointEvents: {
        id: number;
        name: string;
        date: string;
        studentGroupPoints: {
            studentGroupId: number;
            value: number;
            pointId: number;
        }[];
    }[];
}> {
    const logger = createServerLogger({ component: 'TeacherAPI', action: 'getTeacherRankingGroupScorebook', rankingGroupId });
    
    try {
        const teacher = await getOwnTeacherData();

        if (teacher === null) {
            logger.error('No teacher data found');
            throw new Error('Teacher not found');
        }

        const supabase = await supabaseServiceClient();
        
        // Check if teacher has access to this ranking group
        const { data: accessCheck, error: accessError } = await supabase
            .from('teacher_ranking_group_pair')
            .select('ranking_group_id')
            .eq('teacher_id', teacher.id)
            .eq('ranking_group_id', rankingGroupId)
            .single();

        if (accessError || !accessCheck) {
            logger.error('Teacher does not have access to this ranking group', { 
                teacherId: teacher.id, 
                rankingGroupId 
            });
            throw new Error('Access denied - teacher does not have access to this ranking group');
        }

        // Get ranking group data with point events and student groups
        const { data: rankingGroupData, error: rankingGroupError } = await supabase
            .from('ranking_group')
            .select(`
                id,
                name,
                ranking_group_pair (
                    student_group_id,
                    student_group (
                        id,
                        name
                    )
                ),
                ranking_group_point_event (
                    id,
                    name,
                    date,
                    student_group_point (
                        id,
                        student_group_id,
                        value
                    )
                )
            `)
            .eq('id', rankingGroupId)
            .single();

        if (rankingGroupError || !rankingGroupData) {
            logger.error('Error fetching ranking group data', { rankingGroupId, rankingGroupError });
            throw new Error('Failed to load ranking group data');
        }

        const scorebookData = {
            id: rankingGroupData.id,
            name: rankingGroupData.name,
            studentGroups: rankingGroupData.ranking_group_pair?.map(pair => ({
                id: pair.student_group?.id,
                name: pair.student_group?.name
            })).filter((group): group is { id: number; name: string } => 
                group.id !== undefined && group.name !== undefined
            ) || [],
            pointEvents: rankingGroupData.ranking_group_point_event?.map(event => ({
                id: event.id,
                name: event.name || '',
                date: event.date,
                studentGroupPoints: event.student_group_point?.map(point => ({
                    studentGroupId: point.student_group_id,
                    value: point.value,
                    pointId: point.id
                })) || []
            })) || []
        };

        logger.info('Ranking group scorebook data retrieved successfully', { 
            teacherId: teacher.id,
            rankingGroupId,
            studentGroupCount: scorebookData.studentGroups.length,
            pointEventCount: scorebookData.pointEvents.length
        });

        return scorebookData;
    } catch (error) {
        logger.error('Failed to get ranking group scorebook data', { 
            rankingGroupId,
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        throw error;
    }
}

/**
 * Gets teaching assistant data for a specific student group
 */
export async function getTeachingAssistantData(groupId: number): Promise<{
  assistants: TeachingAssistant[];
  availableStudents: { id: number; firstName: string; lastName: string }[];
  pointEvents: { id: number; name: string; date: string; pointGroupId: number; pointGroup: { id: number; name: string; color: string } | null }[];
  pointGroups: { id: number; name: string; color: string }[];
}> {
  const logger = createServerLogger({ component: 'TeacherAPI', action: 'getTeachingAssistantData' });
  
  try {
    const teacher = await getOwnTeacherData();
    if (!teacher) {
      logger.warn('No teacher data found');
      throw new Error('Teacher not found');
    }

    const supabase = await supabaseServiceClient();
    const authClient = require('@/utils/supabase/server').createClient();
    const { data: { user: supabaseUser }, error: authError } = await authClient.auth.getUser();

    let hasAccess = false;

    if (!authError && supabaseUser) {
      // Get numeric user ID from user table
      const { data: userRow } = await supabase
        .from('user')
        .select('id')
        .eq('supabase_id', supabaseUser.id)
        .single();

      if (userRow) {
        // Check teacher access using centralized function
        hasAccess = await checkTeacherGroupAccess(teacher, groupId);

        // Check teaching assistant access if not a teacher. teaching_assistant.student_id is a
        // STUDENT id, so compare it with the student this account owns, never with user.id.
        const ownStudent = hasAccess ? null : await getOwnStudent(userRow.id);
        if (!hasAccess && ownStudent) {
          const { data: taRow } = await supabase
            .from('teaching_assistant')
            .select('id')
            .eq('group_id', groupId)
            .eq('student_id', ownStudent.id)
            .limit(1);

          if (taRow && taRow.length > 0) {
            hasAccess = true;
          }
        }
      }
    }

    if (!hasAccess) {
      logger.warn('User does not have access to this group', { groupId });
      throw new Error('Access denied to this group');
    }

    // Get existing teaching assistants
    const { data: assistants, error: assistantsError } = await supabase
      .from('teaching_assistant')
      .select(`
        id,
        student_id,
        group_id,
        full_access,
        student (
          id,
          first_name,
          last_name
        )
      `)
      .eq('group_id', groupId);

    if (assistantsError) {
      logger.error('Error fetching teaching assistants:', { assistantsError });
      throw new Error('Failed to fetch teaching assistants');
    }

    // Get all students in the group
    const { data: groupStudents, error: studentsError } = await supabase
      .from('student_group_pair')
      .select(`
        student (
          id,
          first_name,
          last_name
        )
      `)
      .eq('student_group_id', groupId);

    if (studentsError) {
      logger.error('Error fetching group students:', { studentsError });
      throw new Error('Failed to fetch group students');
    }

    // Get point events for this group with point group information
    const { data: pointEvents, error: eventsError } = await supabase
      .from('point_event')
      .select(`
        id,
        name,
        date,
        point_group_id,
        point_group (
          id,
          name,
          color
        )
      `)
      .eq('student_group_id', groupId);

    if (eventsError) {
      logger.error('Error fetching point events:', { eventsError });
      throw new Error('Failed to fetch point events');
    }

    const availableStudents = groupStudents
      ?.map(pair => ({
        id: pair.student?.id,
        firstName: pair.student?.first_name,
        lastName: pair.student?.last_name
      }))
      .filter((student): student is { id: number; firstName: string; lastName: string } =>
        student.id !== undefined && student.firstName !== undefined && student.lastName !== undefined
      ) || [];

    const formattedAssistants = assistants?.map(assistant => ({
      id: assistant.id,
      studentId: assistant.student_id,
      groupId: assistant.group_id,
      fullAccess: assistant.full_access ?? false,
      student: {
        id: assistant.student?.id || 0,
        firstName: assistant.student?.first_name || '',
        lastName: assistant.student?.last_name || ''
      }
    })) || [];

    const formattedPointEvents = pointEvents?.map(event => ({
      id: event.id,
      name: event.name || '',
      date: event.date || '',
      pointGroupId: event.point_group_id || 0,
      pointGroup: event.point_group ? {
        id: event.point_group.id,
        name: event.point_group.name,
        color: event.point_group.color
      } : null
    })) || [];

    // Get unique point groups for filtering
    const uniquePointGroups = Array.from(
      new Map(
        formattedPointEvents
          .filter(event => event.pointGroup)
          .map(event => [event.pointGroup!.id, event.pointGroup!])
      ).values()
    );

    logger.info('Teaching assistant data retrieved successfully', {
      teacherId: teacher.id,
      groupId,
      assistantCount: formattedAssistants.length,
      studentCount: availableStudents.length,
      eventCount: formattedPointEvents.length
    });

    return {
      assistants: formattedAssistants,
      availableStudents,
      pointEvents: formattedPointEvents,
      pointGroups: uniquePointGroups
    };
  } catch (error) {
    logger.error('Failed to get teaching assistant data', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Assigns a student as a teaching assistant to a group
 */
export async function assignTeachingAssistant(
  groupId: number,
  studentId: number,
  fullAccess: boolean,
  pointEventIds: number[] = []
): Promise<void> {
  const logger = createServerLogger({ component: 'TeacherAPI', action: 'assignTeachingAssistant' });
  
  try {
    const teacher = await getOwnTeacherData();
    if (!teacher) {
      logger.warn('No teacher data found');
      throw new Error('Teacher not found');
    }

    const supabase = await supabaseServiceClient();
    
    // Check if teacher has access to this group using centralized function
    const hasAccess = await checkTeacherGroupAccess(teacher, groupId);
    if (!hasAccess) {
      throw new Error('Access denied to this group');
    }

    await assertPointEventsInGroup(pointEventIds, groupId);

    // Check if student is in the group
    const { data: studentInGroup, error: studentError } = await supabase
      .from('student_group_pair')
      .select('student_id')
      .eq('student_group_id', groupId)
      .eq('student_id', studentId)
      .single();

    if (studentError || !studentInGroup) {
      logger.warn('Student is not in this group', { studentId, groupId });
      throw new Error('Student is not in this group');
    }

    // Check if assistant already exists
    const { data: existingAssistant, error: existingError } = await supabase
      .from('teaching_assistant')
      .select('id')
      .eq('group_id', groupId)
      .eq('student_id', studentId)
      .single();

    if (existingAssistant) {
      logger.warn('Teaching assistant already exists', { studentId, groupId });
      throw new Error('Student is already a teaching assistant for this group');
    }

    // Insert new teaching assistant
    const { data: newAssistant, error: insertError } = await supabase
      .from('teaching_assistant')
      .insert({
        group_id: groupId,
        student_id: studentId,
        full_access: fullAccess
      })
      .select('id')
      .single();

    if (insertError || !newAssistant) {
      logger.error('Error creating teaching assistant:', { insertError });
      throw new Error('Failed to create teaching assistant');
    }

    // If not full access and point events specified, insert point event assignments
    if (!fullAccess && pointEventIds.length > 0) {
      const pointEventAssignments = pointEventIds.map(pointEventId => ({
        assistant_id: newAssistant.id,
        point_event_id: pointEventId
      }));

      const { error: assignmentError } = await supabase
        .from('teaching_assistant_point_event')
        .insert(pointEventAssignments);

      if (assignmentError) {
        logger.error('Error assigning point events:', { assignmentError });
        throw new Error('Failed to assign point events');
      }
    }

    logger.info('Teaching assistant assigned successfully', {
      teacherId: teacher.id,
      groupId,
      studentId,
      fullAccess,
      pointEventCount: pointEventIds.length
    });
  } catch (error) {
    logger.error('Failed to assign teaching assistant', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Updates teaching assistant permissions
 */
export async function updateTeachingAssistant(
  groupId: number,
  assistantId: number,
  fullAccess: boolean,
  pointEventIds: number[] = []
): Promise<void> {
  const logger = createServerLogger({ component: 'TeacherAPI', action: 'updateTeachingAssistant' });
  
  try {
    const teacher = await getOwnTeacherData();
    if (!teacher) {
      logger.warn('No teacher data found');
      throw new Error('Teacher not found');
    }

    const supabase = await supabaseServiceClient();
    
    // Check if teacher has access to this group using centralized function
    const hasAccess = await checkTeacherGroupAccess(teacher, groupId);
    if (!hasAccess) {
      throw new Error('Access denied to this group');
    }

    // Check if assistant exists and belongs to this group
    const { data: existingAssistant, error: existingError } = await supabase
      .from('teaching_assistant')
      .select('id, group_id')
      .eq('id', assistantId)
      .eq('group_id', groupId)
      .single();

    if (existingError || !existingAssistant) {
      logger.warn('Teaching assistant not found or not in this group', { assistantId, groupId });
      throw new Error('Teaching assistant not found');
    }

    await assertPointEventsInGroup(pointEventIds, groupId);

    // Update full access flag
    const { error: updateError } = await supabase
      .from('teaching_assistant')
      .update({ full_access: fullAccess })
      .eq('id', assistantId);

    if (updateError) {
      logger.error('Error updating teaching assistant:', { updateError });
      throw new Error('Failed to update teaching assistant');
    }

    // If not full access, update point event assignments
    if (!fullAccess) {
      // Remove existing assignments
      const { error: deleteError } = await supabase
        .from('teaching_assistant_point_event')
        .delete()
        .eq('assistant_id', assistantId);

      if (deleteError) {
        logger.error('Error removing existing point event assignments:', { deleteError });
        throw new Error('Failed to remove existing point event assignments');
      }

      // Add new assignments if specified
      if (pointEventIds.length > 0) {
        const pointEventAssignments = pointEventIds.map(pointEventId => ({
          assistant_id: assistantId,
          point_event_id: pointEventId
        }));

        const { error: assignmentError } = await supabase
          .from('teaching_assistant_point_event')
          .insert(pointEventAssignments);

        if (assignmentError) {
          logger.error('Error assigning point events:', { assignmentError });
          throw new Error('Failed to assign point events');
        }
      }
    }

    logger.info('Teaching assistant updated successfully', {
      teacherId: teacher.id,
      groupId,
      assistantId,
      fullAccess,
      pointEventCount: pointEventIds.length
    });
  } catch (error) {
    logger.error('Failed to update teaching assistant', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Removes a teaching assistant from a group
 */
export async function removeTeachingAssistant(groupId: number, assistantId: number): Promise<void> {
  const logger = createServerLogger({ component: 'TeacherAPI', action: 'removeTeachingAssistant' });
  
  try {
    const teacher = await getOwnTeacherData();
    if (!teacher) {
      logger.warn('No teacher data found');
      throw new Error('Teacher not found');
    }

    const supabase = await supabaseServiceClient();
    
    // Check if teacher has access to this group using centralized function
    const hasAccess = await checkTeacherGroupAccess(teacher, groupId);
    if (!hasAccess) {
      throw new Error('Access denied to this group');
    }

    // Check if assistant exists and belongs to this group
    const { data: existingAssistant, error: existingError } = await supabase
      .from('teaching_assistant')
      .select('id, group_id')
      .eq('id', assistantId)
      .eq('group_id', groupId)
      .single();

    if (existingError || !existingAssistant) {
      logger.warn('Teaching assistant not found or not in this group', { assistantId, groupId });
      throw new Error('Teaching assistant not found');
    }

    // Remove point event assignments first
    const { error: deleteAssignmentsError } = await supabase
      .from('teaching_assistant_point_event')
      .delete()
      .eq('assistant_id', assistantId);

    if (deleteAssignmentsError) {
      logger.error('Error removing point event assignments:', { deleteAssignmentsError });
      throw new Error('Failed to remove point event assignments');
    }

    // Remove the teaching assistant
    const { error: deleteAssistantError } = await supabase
      .from('teaching_assistant')
      .delete()
      .eq('id', assistantId);

    if (deleteAssistantError) {
      logger.error('Error removing teaching assistant:', { deleteAssistantError });
      throw new Error('Failed to remove teaching assistant');
    }

    logger.info('Teaching assistant removed successfully', {
      teacherId: teacher.id,
      groupId,
      assistantId
    });
  } catch (error) {
    logger.error('Failed to remove teaching assistant', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Clears all point event assignments for a teaching assistant (keeps full access flag)
 */
export async function clearTeachingAssistantPointEvents(groupId: number, assistantId: number): Promise<void> {
  const logger = createServerLogger({ component: 'TeacherAPI', action: 'clearTeachingAssistantPointEvents' });
  
  try {
    const teacher = await getOwnTeacherData();
    if (!teacher) {
      logger.warn('No teacher data found');
      throw new Error('Teacher not found');
    }

    const supabase = await supabaseServiceClient();
    
    // Check if teacher has access to this group using centralized function
    const hasAccess = await checkTeacherGroupAccess(teacher, groupId);
    if (!hasAccess) {
      throw new Error('Access denied to this group');
    }

    // Check if assistant exists and belongs to this group
    const { data: existingAssistant, error: existingError } = await supabase
      .from('teaching_assistant')
      .select('id, group_id')
      .eq('id', assistantId)
      .eq('group_id', groupId)
      .single();

    if (existingError || !existingAssistant) {
      logger.warn('Teaching assistant not found or not in this group', { assistantId, groupId });
      throw new Error('Teaching assistant not found');
    }

    // Remove all point event assignments
    const { error: deleteError } = await supabase
      .from('teaching_assistant_point_event')
      .delete()
      .eq('assistant_id', assistantId);

    if (deleteError) {
      logger.error('Error clearing point event assignments:', { deleteError });
      throw new Error('Failed to clear point event assignments');
    }

    logger.info('Teaching assistant point events cleared successfully', {
      teacherId: teacher.id,
      groupId,
      assistantId
    });
  } catch (error) {
    logger.error('Failed to clear teaching assistant point events', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Creates a new point event for a ranking group
 */
export async function createRankingGroupPointEvent(
  rankingGroupId: number, 
  name: string, 
  date: string
): Promise<boolean> {
  const logger = createServerLogger({ 
    component: 'TeacherAPI', 
    action: 'createRankingGroupPointEvent', 
    rankingGroupId 
  });
  
  try {
    const teacher = await getOwnTeacherData();
    if (!teacher) {
      logger.warn('No teacher data found');
      throw new Error('Teacher not found');
    }

    const supabase = await supabaseServiceClient();
    
    // Check if teacher has access to this ranking group
    const { data: accessCheck, error: accessError } = await supabase
      .from('teacher_ranking_group_pair')
      .select('ranking_group_id')
      .eq('teacher_id', teacher.id)
      .eq('ranking_group_id', rankingGroupId)
      .single();

    if (accessError || !accessCheck) {
      logger.error('Teacher does not have access to this ranking group', { 
        teacherId: teacher.id, 
        rankingGroupId 
      });
      throw new Error('Access denied - teacher does not have access to this ranking group');
    }

    // Create the ranking group point event
    const { data, error } = await supabase
      .from('ranking_group_point_event')
      .insert({
        ranking_group_id: rankingGroupId,
        name: name,
        date: date
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating ranking group point event', { 
        rankingGroupId, 
        name, 
        date, 
        error 
      });
      throw new Error('Failed to create point event');
    }

    logger.info('Ranking group point event created successfully', { 
      teacherId: teacher.id,
      rankingGroupId,
      pointEventId: data.id,
      name,
      date
    });

    return true;
  } catch (error) {
    logger.error('Failed to create ranking group point event', { 
      rankingGroupId, 
      name, 
      date,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Edits a ranking group point event and its student group points
 */
export async function editRankingGroupPointEvent(
  rankingGroupId: number,
  pointEventId: number,
  name: string,
  date: string,
  points: {
    studentGroupId: number;
    pointId: number;
    value: number;
  }[]
): Promise<boolean> {
  const logger = createServerLogger({ 
    component: 'TeacherAPI', 
    action: 'editRankingGroupPointEvent', 
    rankingGroupId,
    pointEventId
  });
  
  try {
    const teacher = await getOwnTeacherData();
    if (!teacher) {
      logger.warn('No teacher data found');
      throw new Error('Teacher not found');
    }

    const supabase = await supabaseServiceClient();
    
    // Check if teacher has access to this ranking group
    const { data: accessCheck, error: accessError } = await supabase
      .from('teacher_ranking_group_pair')
      .select('ranking_group_id')
      .eq('teacher_id', teacher.id)
      .eq('ranking_group_id', rankingGroupId)
      .single();

    if (accessError || !accessCheck) {
      logger.error('Teacher does not have access to this ranking group', { 
        teacherId: teacher.id, 
        rankingGroupId 
      });
      throw new Error('Access denied - teacher does not have access to this ranking group');
    }

    // Verify the point event belongs to this ranking group
    const { data: pointEventData, error: pointEventError } = await supabase
      .from('ranking_group_point_event')
      .select('id, ranking_group_id')
      .eq('id', pointEventId)
      .single();

    if (pointEventError || !pointEventData) {
      logger.error('Point event not found', { pointEventId, pointEventError });
      throw new Error('Point event not found');
    }

    if (pointEventData.ranking_group_id !== rankingGroupId) {
      logger.error('Point event does not belong to this ranking group', { 
        pointEventId, 
        pointEventRankingGroupId: pointEventData.ranking_group_id,
        requestedRankingGroupId: rankingGroupId
      });
      throw new Error('Point event does not belong to this ranking group');
    }

    // Every scored group must be in this ranking group, and every existing score row must already
    // belong to this event: the upsert below writes by id and would otherwise overwrite other rows.
    {
      const groupIds = Array.from(new Set(points.map((point) => point.studentGroupId)));
      if (groupIds.length > 0) {
        const { data: members, error: membersError } = await supabase
          .from('ranking_group_pair')
          .select('student_group_id')
          .eq('ranking_group_id', rankingGroupId)
          .in('student_group_id', groupIds);
        if (membersError || (members?.length ?? 0) !== groupIds.length) {
          throw new Error('Student group is not part of this ranking group');
        }
      }
      const existingIds = Array.from(new Set(points.filter((point) => point.pointId !== -1).map((point) => point.pointId)));
      if (existingIds.length > 0) {
        const { data: owned, error: ownedError } = await supabase
          .from('student_group_point')
          .select('id')
          .eq('ranking_group_point_event_id', pointEventId)
          .in('id', existingIds);
        if (ownedError || (owned?.length ?? 0) !== existingIds.length) {
          throw new Error('Point entry does not belong to this point event');
        }
      }
    }

    // Update the point event
    const { error: updateError } = await supabase
      .from('ranking_group_point_event')
      .update({
        name: name,
        date: date
      })
      .eq('id', pointEventId);

    if (updateError) {
      logger.error('Error updating ranking group point event', { 
        pointEventId, 
        name, 
        date, 
        updateError 
      });
      throw new Error('Failed to update point event');
    }

    // Prepare student group points for upsert
    const studentGroupPoints = points.map((point) => {
      if (point.pointId === -1) {
        // New point entry
        return {
          student_group_id: point.studentGroupId,
          value: point.value,
          ranking_group_point_event_id: pointEventId
        };
      } else {
        // Update existing point entry
        return {
          id: point.pointId,
          student_group_id: point.studentGroupId,
          value: point.value,
          ranking_group_point_event_id: pointEventId
        };
      }
    });

    // Upsert student group points
    const { error: pointsError } = await supabase
      .from('student_group_point')
      .upsert(studentGroupPoints);

    if (pointsError) {
      logger.error('Error updating student group points', { 
        pointEventId, 
        pointsError 
      });
      throw new Error('Failed to update student group points');
    }

    logger.info('Ranking group point event updated successfully', { 
      teacherId: teacher.id,
      rankingGroupId,
      pointEventId,
      name,
      date,
      pointsCount: points.length
    });

    return true;
  } catch (error) {
    logger.error('Failed to edit ranking group point event', { 
      rankingGroupId,
      pointEventId,
      name,
      date,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Deletes a ranking group point event
 */
export async function deleteRankingGroupPointEvent(
  rankingGroupId: number,
  pointEventId: number
): Promise<boolean> {
  const logger = createServerLogger({ 
    component: 'TeacherAPI', 
    action: 'deleteRankingGroupPointEvent', 
    rankingGroupId,
    pointEventId
  });
  
  try {
    const teacher = await getOwnTeacherData();
    if (!teacher) {
      logger.warn('No teacher data found');
      throw new Error('Teacher not found');
    }

    const supabase = await supabaseServiceClient();
    
    // Check if teacher has access to this ranking group
    const { data: accessCheck, error: accessError } = await supabase
      .from('teacher_ranking_group_pair')
      .select('ranking_group_id')
      .eq('teacher_id', teacher.id)
      .eq('ranking_group_id', rankingGroupId)
      .single();

    if (accessError || !accessCheck) {
      logger.error('Teacher does not have access to this ranking group', { 
        teacherId: teacher.id, 
        rankingGroupId 
      });
      throw new Error('Access denied - teacher does not have access to this ranking group');
    }

    // Verify the point event belongs to this ranking group
    const { data: pointEventData, error: pointEventError } = await supabase
      .from('ranking_group_point_event')
      .select('id, ranking_group_id')
      .eq('id', pointEventId)
      .single();

    if (pointEventError || !pointEventData) {
      logger.error('Point event not found', { pointEventId, pointEventError });
      throw new Error('Point event not found');
    }

    if (pointEventData.ranking_group_id !== rankingGroupId) {
      logger.error('Point event does not belong to this ranking group', { 
        pointEventId, 
        pointEventRankingGroupId: pointEventData.ranking_group_id,
        requestedRankingGroupId: rankingGroupId
      });
      throw new Error('Point event does not belong to this ranking group');
    }

    // Delete the point event (this will cascade delete student_group_point entries)
    const { error: deleteError } = await supabase
      .from('ranking_group_point_event')
      .delete()
      .eq('id', pointEventId);

    if (deleteError) {
      logger.error('Error deleting ranking group point event', { 
        pointEventId, 
        deleteError 
      });
      throw new Error('Failed to delete point event');
    }

    logger.info('Ranking group point event deleted successfully', { 
      teacherId: teacher.id,
      rankingGroupId,
      pointEventId
    });

    return true;
  } catch (error) {
    logger.error('Failed to delete ranking group point event', { 
      rankingGroupId,
      pointEventId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}