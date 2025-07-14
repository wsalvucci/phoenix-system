"use server";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { createClient } from "@/utils/supabase/server";
import { Teacher } from "@/types/domain";
import { getPhoenixUser } from "./user";
import { UserContextResolver } from "./core/user-context";
import { createServerLogger } from "@/utils/serverLogger";

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
            linkCode: teacherData.link_code,
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
            linkCode: teacherData.link_code,
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
            linkCode: teacherData.link_code,
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
export async function getStudentGroupsForTeachers(teacherIds: number[]): Promise<{ id: number; name: string; archived: boolean }[]> {
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
export async function getRankingGroupsForTeachers(teacherIds: number[]): Promise<{ id: number; name: string; studentGroups: { id: number; name: string }[] }[]> {
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