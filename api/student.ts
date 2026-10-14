"use server";
import { Student, StudentMonthlyTrends, MonthlyTrendData, percentileToRating } from "@/types/domain";
import { getPhoenixUser } from "./user";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { createClient } from "@/utils/supabase/server";
import { UserContextResolver } from "./core/user-context";
import { createServerLogger } from "@/utils/serverLogger";
import { TeacherTimeframe } from "@/types/domain";
import { getCallerAccess } from "@/app/supaApi/server/staffAccess";
import { competitionRank } from "@/lib/ranking";
import { partitionShareGroups, compareSharedEntries } from "@/lib/sharing";

export async function getOwnStudentData(): Promise<Student | null> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getOwnStudentData' });
    
    try {
        const phoenixUser = await getPhoenixUser();

        if (phoenixUser === null) {
            logger.warn('No Phoenix user found');
            return null;
        }

        if (phoenixUser.studentId === null) {
            logger.warn('User is not a student', { userId: phoenixUser.id.toString() });
            return null;
        }

        const supabase = await supabaseServiceClient();
        const { data: studentData, error: studentError } = await supabase
            .from("student")
            .select("id, school_id, first_name, last_name, birthdate, grade, gender, linkedUser")
            .eq("linkedUser", phoenixUser.id)
            .single();

        if (studentError !== null) {
            logger.error("Error fetching student data:", { studentError });
            return null;
        }

        const student: Student = {
            id: studentData.id,
            schoolId: studentData.school_id,
            firstName: studentData.first_name,
            lastName: studentData.last_name,
            birthdate: studentData.birthdate,
            grade: studentData.grade,
            gender: studentData.gender,
            linkedUserId: studentData.linkedUser,
        };

        logger.info('Student data retrieved successfully', { 
            studentId: student.id,
            schoolId: student.schoolId,
            studentName: `${student.firstName} ${student.lastName}`
        });

        return student;
    } catch (error) {
        logger.error('Failed to get own student data', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Gets student data using the robust user context system
 */
export async function getStudentDataWithContext(): Promise<Student | null> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getStudentDataWithContext' });
    
    try {
        const authClient = createClient();
        const supabase = await supabaseServiceClient();
        
        // Get the authenticated user
        const { data: { user: supabaseUser }, error: authError } = await authClient.auth.getUser();
        
        if (authError || !supabaseUser) {
            logger.warn('No authenticated user found');
            return null;
        }

        // Get user data to check for student relationship
        const { data: userData, error: userError } = await supabase
            .from('user')
            .select('id, student_id')
            .eq('supabase_id', supabaseUser.id)
            .single();

        if (userError || !userData) {
            logger.warn('User data not found');
            return null;
        }

        // Get all students whose linkedUser field matches the current user's ID
        const { data: studentData, error: studentError } = await supabase
            .from("student")
            .select("id, school_id, first_name, last_name, birthdate, grade, gender, linkedUser")
            .eq("linkedUser", userData.id);  // Find all students linked to this user

        if (studentError !== null) {
            logger.error("Error fetching student data:", { studentError });
            return null;
        }

        if (!studentData || studentData.length === 0) {
            logger.warn('No students found linked to current user', { 
                userId: userData.id.toString() 
            });
            return null;
        }

        // Use the first student if multiple are found
        const studentRecord = studentData[0];

        const student: Student = {
            id: studentRecord.id,
            schoolId: studentRecord.school_id,
            firstName: studentRecord.first_name,
            lastName: studentRecord.last_name,
            birthdate: studentRecord.birthdate,
            grade: studentRecord.grade,
            gender: studentRecord.gender,
            linkedUserId: studentRecord.linkedUser,
        };

        logger.info('Student data retrieved successfully', { 
            studentId: student.id,
            schoolId: student.schoolId,
            studentName: `${student.firstName} ${student.lastName}`
        });

        return student;
    } catch (error) {
        logger.error('Failed to get student data with context', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Gets comprehensive student dashboard data including rankings and statistics
 */
export async function getStudentDashboardData(timeframeId?: number | null) {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getStudentDashboardData' });
    
    try {
        const student = await getStudentDataWithContext();
        if (!student) {
            logger.warn('No student data found');
            return null;
        }

        const supabase = await supabaseServiceClient();
        
        // Get active timeframe if none specified
        let timeframe = null;
        if (timeframeId) {
            const { data: tfData } = await supabase
                .from('school_timeframes')
                .select('*')
                .eq('id', timeframeId)
                .eq('school_id', student.schoolId)
                .single();
            timeframe = tfData;
        } else {
            const { data: tfData } = await supabase
                .from('school_timeframes')
                .select('*')
                .eq('school_id', student.schoolId)
                .eq('active', true)
                .single();
            timeframe = tfData;
        }

        if (!timeframe) {
            logger.warn('No timeframe found');
            return null;
        }

        // Get all students in the school for ranking calculations
        const { data: allStudents } = await supabase
            .from('student')
            .select('id, first_name, last_name, grade')
            .eq('school_id', student.schoolId);

        if (!allStudents) {
            logger.warn('No students found in school');
            return null;
        }

        // Get point events and student points for the timeframe
        const { data: pointEvents } = await supabase
            .from('point_event')
            .select(`
                id,
                name,
                date,
                max_input,
                point_group!inner(id, name, color),
                point_group_id,
                student_point(id, student_id, point_value, input_score)
            `)
            .eq('point_group.school_id', student.schoolId)
            .gte('date', timeframe.starts_at)
            .lte('date', timeframe.ends_at);

        if (!pointEvents) {
            logger.warn('No point events found');
            return null;
        }

        // Get point groups for ranking calculations (include parent to roll up categories)
        const { data: pointGroups } = await supabase
            .from('point_group')
            .select('id, name, color, parent_id')
            .eq('school_id', student.schoolId);

        if (!pointGroups) {
            logger.warn('No point groups found');
            return null;
        }

        // Calculate student statistics
        const studentStats = calculateStudentStats(student, allStudents, pointEvents, pointGroups, timeframe);
        
        return {
            student,
            timeframe: {
                id: timeframe.id,
                name: timeframe.name,
                startsAt: timeframe.starts_at,
                endsAt: timeframe.ends_at,
                active: timeframe.active
            },
            ...studentStats
        };
    } catch (error) {
        logger.error('Failed to get student dashboard data', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Gets recent point events for the student
 */
export async function getStudentRecentEvents(limit: number = 10) {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getStudentRecentEvents' });
    
    try {
        const student = await getStudentDataWithContext();
        if (!student) {
            logger.warn('No student data found');
            return null;
        }

        const supabase = await supabaseServiceClient();
        
        // Get the school's active timeframe
        const { data: timeframe } = await supabase
            .from('school_timeframes')
            .select('*')
            .eq('school_id', student.schoolId)
            .eq('active', true)
            .single();

        if (!timeframe) {
            logger.warn('No active timeframe found for school');
            return [];
        }
        
        // Get recent point events where the student participated, filtered by the active timeframe
        const { data: events } = await supabase
            .from('point_event')
            .select(`
                id,
                name,
                date,
                max_input,
                point_group!inner(id, name, color),
                student_point!inner(point_value, input_score)
            `)
            .eq('student_point.student_id', student.id)
            .gte('date', timeframe.starts_at)
            .lte('date', timeframe.ends_at)
            .order('date', { ascending: false })
            .limit(limit);

        if (!events) {
            return [];
        }

        return events.map((event: any) => ({
            id: event.id,
            name: event.name || 'Unnamed Event',
            date: event.date,
            maxPoints: event.max_input,
            points: event.student_point[0]?.point_value || 0,
            pointGroup: {
                id: event.point_group?.id,
                name: event.point_group?.name,
                color: event.point_group?.color
            }
        }));
    } catch (error) {
        logger.error('Failed to get student recent events', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Gets the groups that the current student leads, with member names only.
 * DATA_DISCLOSURE.md §10.7: a student leader is a peer, so no grade, totals,
 * letter grades or any other standing leaves the server for group mates.
 */
export async function getStudentLeaderGroups(): Promise<{
    groups: Array<{
        id: number;
        name: string;
        students: Array<{
            id: number;
            firstName: string;
            lastName: string;
        }>;
    }>;
} | null> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getStudentLeaderGroups' });

    try {
        const authClient = createClient();
        const supabase = await supabaseServiceClient();

        const { data: { user: supabaseUser }, error: authError } = await authClient.auth.getUser();

        if (authError || !supabaseUser) {
            logger.warn('No authenticated user found');
            return null;
        }

        const { data: userData, error: userError } = await supabase
            .from('user')
            .select('id, student_id')
            .eq('supabase_id', supabaseUser.id)
            .single();

        if (userError || !userData) {
            logger.warn('User data not found');
            return null;
        }

        const { data: linkedStudents, error: lsError } = await supabase
            .from('student')
            .select('id')
            .eq('linkedUser', userData.id);

        if (lsError || !linkedStudents || linkedStudents.length === 0) {
            logger.info('No students found linked to current user');
            return { groups: [] };
        }

        const linkedStudentIds = linkedStudents.map(s => s.id);

        const { data: leaderGroups, error: leaderGroupsError } = await supabase
            .from('student_group_leaders')
            .select(`
                group_id,
                student_group (
                    id,
                    name
                )
            `)
            .in('student_id', linkedStudentIds);

        if (leaderGroupsError || !leaderGroups || leaderGroups.length === 0) {
            logger.info('No linked students are leaders of any groups');
            return { groups: [] };
        }

        const groupIds = leaderGroups.map(lg => lg.group_id);

        // Names only: no grade, no points.
        const { data: studentsInGroups, error: studentsError } = await supabase
            .from('student_group_pair')
            .select(`
                student_group_id,
                student (
                    id,
                    first_name,
                    last_name
                )
            `)
            .in('student_group_id', groupIds);

        if (studentsError) {
            logger.error('Error fetching students in groups', { studentsError });
            return null;
        }

        const groupsMap = new Map<number, { id: number; name: string; students: Array<{ id: number; firstName: string; lastName: string }> }>();
        leaderGroups.forEach(leaderGroup => {
            groupsMap.set(leaderGroup.group_id, {
                id: leaderGroup.group_id,
                name: leaderGroup.student_group!.name,
                students: []
            });
        });

        (studentsInGroups ?? []).forEach(sig => {
            const student = sig.student;
            if (!student) return;
            groupsMap.get(sig.student_group_id)?.students.push({
                id: student.id,
                firstName: student.first_name,
                lastName: student.last_name
            });
        });

        // Alphabetical, never by standing.
        groupsMap.forEach(group => {
            group.students.sort((a, b) =>
                a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
        });

        const result = { groups: Array.from(groupsMap.values()) };

        logger.info('Student leader groups retrieved successfully', {
            groupCount: result.groups.length
        });

        return result;
    } catch (error) {
        logger.error('Failed to get student leader groups', {
            error: error instanceof Error ? error.message : 'Unknown error'
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Gets the list of student groups where the current student is a teaching assistant,
 * including whether access is full or limited and which point events are allowed when limited.
 */
export async function getStudentTeachingAssistantGroups(): Promise<{
    group: { id: number; name: string };
    fullAccess: boolean;
    allowedPointEventIds: number[] | null;
}[]> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getStudentTeachingAssistantGroups' });
    try {
        const authClient = createClient();
        const supabase = await supabaseServiceClient();

        const { data: { user: supabaseUser }, error: authError } = await authClient.auth.getUser();
        if (authError || !supabaseUser) return [];

        const { data: userRow, error: userError } = await supabase
            .from('user')
            .select('id')
            .eq('supabase_id', supabaseUser.id)
            .single();
        if (userError || !userRow) return [];

        // Find student record(s) linked to this user, then match teaching_assistant by student_id
        const { data: linkedStudents, error: lsError } = await supabase
            .from('student')
            .select('id')
            .eq('linkedUser', userRow.id);
        if (lsError || !linkedStudents || linkedStudents.length === 0) return [];
        const studentIds = linkedStudents.map(s => s.id);

        const { data: assistants, error: taError } = await supabase
            .from('teaching_assistant')
            .select('id, group_id, full_access')
            .in('student_id', studentIds);
        if (taError || !assistants || assistants.length === 0) return [];

        const groupIds = Array.from(new Set(assistants.map(a => a.group_id)));
        const { data: groups, error: groupsError } = await supabase
            .from('student_group')
            .select('id, name')
            .in('id', groupIds);
        if (groupsError) return [];
        const idToGroup = new Map<number, { id: number; name: string }>();
        (groups || []).forEach(g => idToGroup.set(g.id, { id: g.id, name: g.name }));

        const results: { group: { id: number; name: string }; fullAccess: boolean; allowedPointEventIds: number[] | null }[] = [];
        for (const ta of assistants) {
            let allowed: number[] | null = null;
            if (!ta.full_access) {
                const { data: rows } = await supabase
                    .from('teaching_assistant_point_event')
                    .select('point_event_id')
                    .eq('assistant_id', ta.id);
                allowed = (rows || []).map(r => r.point_event_id);
            }
            const group = idToGroup.get(ta.group_id);
            if (group) {
                results.push({
                    group,
                    fullAccess: !!ta.full_access,
                    allowedPointEventIds: allowed,
                });
            }
        }
        return results;
    } catch (error) {
        logger.error('Failed to get student TA groups', { error: error instanceof Error ? error.message : 'Unknown error' }, error instanceof Error ? error : undefined);
        return [];
    }
}

/**
 * Helper function to calculate student statistics
 */
function calculateStudentStats(
    student: Student, 
    allStudents: any[], 
    pointEvents: any[], 
    pointGroups: any[],
    timeframe: any
) {
    // Calculate total points for each student
    const studentPoints = new Map<number, number>();
    const studentPointGroups = new Map<number, Map<number, number>>();
    
    // Initialize maps
    allStudents.forEach(s => {
        studentPoints.set(s.id, 0);
        studentPointGroups.set(s.id, new Map());
    });

    // Build a quick lookup to roll up groups to their top-level parent (Academics/Athletics/Activities)
    const groupById: Map<number, { id: number; name: string; color: string; parent_id: number | null }> = new Map();
    pointGroups.forEach((g: any) => {
        groupById.set(g.id, { id: g.id, name: g.name, color: g.color, parent_id: g.parent_id ?? null });
    });

    function getTopLevelGroupId(groupId: number): number {
        let current: { id: number; parent_id: number | null } | undefined = groupById.get(groupId);
        const visited = new Set<number>();
        while (current && current.parent_id && !visited.has(current.parent_id)) {
            visited.add(current.id);
            const parent = groupById.get(current.parent_id);
            if (!parent) break;
            current = parent as any;
        }
        return current ? current.id : groupId;
    }

    // Calculate points from events, rolling up to top-level category
    pointEvents.forEach(event => {
        const rawGroupId = (event.point_group && event.point_group.id) || event.point_group_id;
        const topLevelGroupId = typeof rawGroupId === 'number' ? getTopLevelGroupId(rawGroupId) : rawGroupId;
        
        event.student_point.forEach((sp: any) => {
            const currentPoints = studentPoints.get(sp.student_id) || 0;
            studentPoints.set(sp.student_id, currentPoints + sp.point_value);
            
            const groupPoints = studentPointGroups.get(sp.student_id);
            if (groupPoints) {
                const currentGroupPoints = groupPoints.get(topLevelGroupId) || 0;
                groupPoints.set(topLevelGroupId, currentGroupPoints + sp.point_value);
            }
        });
    });

    // Calculate rankings
    const sortedStudents = allStudents
        .map(s => ({
            ...s,
            totalPoints: studentPoints.get(s.id) || 0
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints);

    const studentRank = sortedStudents.findIndex(s => s.id === student.id) + 1;
    const gradeStudents = sortedStudents.filter(s => s.grade === student.grade);
    const gradeRank = gradeStudents.findIndex(s => s.id === student.id) + 1;

    // Calculate point group rankings
    const pointGroupRankings = calculatePointGroupRankings(allStudents, studentPointGroups, student.id, pointGroups);

    // Calculate point event rankings
    const pointEventRankings = calculatePointEventRankings(pointEvents, student.id);

    return {
        totalPoints: studentPoints.get(student.id) || 0,
        totalRank: studentRank,
        totalOutOf: sortedStudents.length,
        gradeRank,
        gradeOutOf: gradeStudents.length,
        pointGroupRankings,
        pointEventRankings
    };
}

/**
 * Calculate rankings for each point group
 */
function calculatePointGroupRankings(
    allStudents: any[], 
    studentPointGroups: Map<number, Map<number, number>>, 
    studentId: number,
    pointGroups: any[]
) {
    const pointGroupRankings: any[] = [];
    // Get all unique point group IDs
    const allPointGroupIds = new Set<number>();
    studentPointGroups.forEach(groupMap => {
        groupMap.forEach((points, groupId) => {
            allPointGroupIds.add(groupId);
        });
    });

    // Calculate rankings for each point group
    allPointGroupIds.forEach(groupId => {
        // Get all students with points in this group
        const studentsInGroup = allStudents
            .map(s => ({
                ...s,
                points: studentPointGroups.get(s.id)?.get(groupId) || 0
            }))
            .filter(s => s.points > 0)
            .sort((a, b) => b.points - a.points);

        const studentRank = studentsInGroup.findIndex(s => s.id === studentId) + 1;
        const studentPoints = studentsInGroup.find(s => s.id === studentId)?.points || 0;

        const group = pointGroups.find((g: any) => g.id === groupId);

        if (studentRank > 0 && group) {
            // Calculate percentile for letter grade (1 = best, outOf = worst)
            const percentile = 1 - (studentRank - 1) / studentsInGroup.length;
            const letterGrade = percentileToRating(percentile);

            pointGroupRankings.push({
                pointGroupId: groupId,
                pointGroupName: group.name,
                pointGroupColor: group.color,
                points: studentPoints,
                rank: studentRank,
                outOf: studentsInGroup.length,
                letterGrade
            });
        }
    });

    return pointGroupRankings;
}

/**
 * Calculate rankings for each point event
 */
function calculatePointEventRankings(pointEvents: any[], studentId: number) {
    const pointEventRankings: any[] = [];

    pointEvents.forEach(event => {
        // Find if student participated in this event
        const studentParticipation = event.student_point.find((sp: any) => sp.student_id === studentId);
        
        if (studentParticipation) {
            const participantScores: number[] = event.student_point.map((sp: any) => sp.point_value);
            const participantCount = participantScores.length;

            // Tied scores share the better rank (§10.5).
            const studentRank = competitionRank(participantScores, studentParticipation.point_value);
            const studentPoints = studentParticipation.point_value;

            pointEventRankings.push({
                eventId: event.id,
                eventName: event.name || 'Unnamed Event',
                eventDate: event.date,
                maxPoints: event.max_input,
                points: studentPoints,
                rank: studentRank,
                outOf: participantCount,
                studentPointId: studentParticipation.id,
                pointGroup: {
                    id: (event.point_group && event.point_group.id) || event.point_group_id,
                    name: event.point_group?.name || 'Unknown',
                    color: event.point_group?.color || '#999999'
                }
            });
        }
    });

    return pointEventRankings;
}

/**
 * Gets student dashboard data by student ID (for the parent child page)
 */
export async function getStudentDashboardDataById(studentId: number, timeframeId?: number | null) {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getStudentDashboardDataById' });
    
    try {
        if (!Number.isInteger(studentId)) {
            logger.warn('Invalid student id', { studentId });
            return null;
        }

        // Authorization: caller must be linked to this student via user_student_pair.
        const phoenixUser = await getPhoenixUser();
        if (!phoenixUser) {
            logger.warn('Unauthenticated access denied', { studentId });
            return null;
        }

        const supabase = await supabaseServiceClient();

        const { data: pairing, error: pairingError } = await supabase
            .from('user_student_pair')
            .select('student_id')
            .eq('student_id', studentId)
            .eq('user_id', phoenixUser.id)
            .maybeSingle();

        if (pairingError || !pairing) {
            logger.warn('Access denied: caller not linked to student', {
                studentId,
                userId: phoenixUser.id.toString()
            });
            return null;
        }
        
        // Get student data
        const { data: studentData, error: studentError } = await supabase
            .from('student')
            .select('*')
            .eq('id', studentId)
            .single();

        if (studentError || !studentData) {
            logger.warn('Student not found', { studentId });
            return null;
        }

        const student: Student = {
            id: studentData.id,
            schoolId: studentData.school_id,
            firstName: studentData.first_name,
            lastName: studentData.last_name,
            birthdate: studentData.birthdate,
            grade: studentData.grade,
            gender: studentData.gender,
            linkedUserId: studentData.linkedUser,
        };

        // Get active timeframe if none specified
        let timeframe = null;
        if (timeframeId) {
            const { data: tfData } = await supabase
                .from('school_timeframes')
                .select('*')
                .eq('id', timeframeId)
                .eq('school_id', student.schoolId)
                .single();
            timeframe = tfData;
        } else {
            const { data: tfData } = await supabase
                .from('school_timeframes')
                .select('*')
                .eq('school_id', student.schoolId)
                .eq('active', true)
                .single();
            timeframe = tfData;
        }

        if (!timeframe) {
            logger.warn('No timeframe found');
            return null;
        }

        // Get all students in the school for ranking calculations
        const { data: allStudents } = await supabase
            .from('student')
            .select('id, first_name, last_name, grade')
            .eq('school_id', student.schoolId);

        if (!allStudents) {
            logger.warn('No students found in school');
            return null;
        }

        // Get point events and student points for the timeframe
        const { data: pointEvents } = await supabase
            .from('point_event')
            .select(`
                id,
                name,
                date,
                max_input,
                point_group!inner(id, name, color),
                point_group_id,
                student_point(id, student_id, point_value, input_score)
            `)
            .eq('point_group.school_id', student.schoolId)
            .gte('date', timeframe.starts_at)
            .lte('date', timeframe.ends_at);

        if (!pointEvents) {
            logger.warn('No point events found');
            return null;
        }

        // Get point groups for ranking calculations (include parent to roll up categories)
        const { data: pointGroups } = await supabase
            .from('point_group')
            .select('id, name, color, parent_id')
            .eq('school_id', student.schoolId);

        if (!pointGroups) {
            logger.warn('No point groups found');
            return null;
        }

        // Calculate student statistics
        const studentStats = calculateStudentStats(student, allStudents, pointEvents, pointGroups, timeframe);
        
        return {
            student,
            timeframe: {
                id: timeframe.id,
                name: timeframe.name,
                startsAt: timeframe.starts_at,
                endsAt: timeframe.ends_at,
                active: timeframe.active
            },
            ...studentStats
        };
    } catch (error) {
        logger.error('Failed to get student dashboard data by ID', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Gets monthly trend data for the student
 */
export async function getStudentMonthlyTrends(): Promise<StudentMonthlyTrends | null> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getStudentMonthlyTrends' });
    
    try {
        const student = await getStudentDataWithContext();
        if (!student) {
            logger.warn('No student data found');
            return null;
        }

        const supabase = await supabaseServiceClient();
        
        // Get the school's active timeframe
        const { data: timeframe } = await supabase
            .from('school_timeframes')
            .select('*')
            .eq('school_id', student.schoolId)
            .eq('active', true)
            .single();

        if (!timeframe) {
            logger.warn('No active timeframe found for school');
            return null;
        }
        
        // Get all students in the school for ranking calculations
        const { data: allStudents } = await supabase
            .from('student')
            .select('id, first_name, last_name, grade')
            .eq('school_id', student.schoolId);

        if (!allStudents) {
            logger.warn('No students found in school');
            return null;
        }

        // Get point events for the active timeframe only
        const { data: pointEvents } = await supabase
            .from('point_event')
            .select(`
                id,
                name,
                date,
                max_input,
                point_group:point_group_id (id, name, color, school_id),
                point_group_id,
                student_point(student_id, point_value, input_score)
            `)
            .eq('point_group.school_id', student.schoolId)
            .gte('date', timeframe.starts_at)
            .lte('date', timeframe.ends_at);

        if (!pointEvents || pointEvents.length === 0) {
            logger.warn('No point events found in active timeframe');
            return null;
        }

        // Calculate monthly trends
        const trends = calculateMonthlyTrends(student, allStudents, pointEvents);
        
        if (trends.length === 0) {
            logger.warn('No trend data available');
            return null;
        }

        const currentMonth = trends[trends.length - 1];
        const previousMonth = trends.length > 1 ? trends[trends.length - 2] : null;

        return {
            currentMonth,
            previousMonth,
            trends
        };
    } catch (error) {
        logger.error('Failed to get student monthly trends', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Helper function to calculate monthly trends
 */
function calculateMonthlyTrends(student: Student, allStudents: any[], pointEvents: any[]): MonthlyTrendData[] {
    const trends: MonthlyTrendData[] = [];
    const monthlyData = new Map<string, { studentPoints: Map<number, number> }>();
    
    // Group events by month
    pointEvents.forEach(event => {
        const eventDate = new Date(event.date);
        const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, {
                studentPoints: new Map()
            });
        }
        
        const monthData = monthlyData.get(monthKey)!;
        
        // Calculate points for each student in this event
        event.student_point.forEach((sp: any) => {
            const currentPoints = monthData.studentPoints.get(sp.student_id) || 0;
            monthData.studentPoints.set(sp.student_id, currentPoints + sp.point_value);
        });
    });
    
    // Get current and previous month keys
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
    
    // Get points for current and previous month
    const currentMonthPoints = monthlyData.get(currentMonthKey)?.studentPoints.get(student.id) || 0;
    const previousMonthPoints = monthlyData.get(previousMonthKey)?.studentPoints.get(student.id) || 0;
    
    // Calculate changes for display in header
    // We treat the monthly "increase" as points earned in the current month (never negative)
    const pointIncrease = currentMonthPoints;
    // Percentage is relative to previous month but never negative
    const rawPct = previousMonthPoints > 0 ? ((currentMonthPoints / previousMonthPoints) - 1) * 100 : 0;
    const percentageIncrease = Math.max(0, rawPct);
    
    // For ranking, we need to calculate cumulative points up to current month
    const allStudentCumulativePoints = new Map<number, number>();
    
    // Calculate cumulative points for all students up to current month
    const sortedMonths = Array.from(monthlyData.keys()).sort();
    sortedMonths.forEach(monthKey => {
        const monthData = monthlyData.get(monthKey)!;
        monthData.studentPoints.forEach((points, studentId) => {
            const current = allStudentCumulativePoints.get(studentId) || 0;
            allStudentCumulativePoints.set(studentId, current + points);
        });
    });
    
    // Sort students by cumulative points for ranking
    const studentPoints = Array.from(allStudentCumulativePoints.entries())
        .map(([studentId, points]) => ({
            studentId,
            points,
            student: allStudents.find(s => s.id === studentId)
        }))
        .filter(s => s.student)
        .sort((a, b) => b.points - a.points);
    
    const currentRank = studentPoints.findIndex(s => s.studentId === student.id) + 1;
    const totalPoints = allStudentCumulativePoints.get(student.id) || 0;
    
    // Only add trend data if there are points in the current month
    if (currentMonthPoints > 0) {
        trends.push({
            month: currentMonthKey,
            totalPoints,
            rank: currentRank,
            outOf: studentPoints.length,
            pointIncrease,
            percentageIncrease,
            rankChange: 0 // We don't have previous rank data in this simplified approach
        });
    }
    
    return trends;
}

/**
 * Gets all groups that the current student belongs to, with hierarchical structure
 */
export async function getStudentGroups(): Promise<Array<{
    id: number;
    name: string;
    parentId: number | null;
    childGroups: Array<{ id: number; name: string }>;
}>> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getStudentGroups' });
    
    try {
        const student = await getStudentDataWithContext();
        if (!student) {
            logger.warn('No student data found');
            return [];
        }

        const supabase = await supabaseServiceClient();
        
        // Get all groups the student belongs to via student_group_pair
        const { data: groupPairs, error: pairsError } = await supabase
            .from('student_group_pair')
            .select(`
                student_group_id,
                student_group!inner(
                    id,
                    name,
                    parent_id
                )
            `)
            .eq('student_id', student.id);

        if (pairsError) {
            logger.error('Error fetching student groups', { error: pairsError });
            return [];
        }

        if (!groupPairs || groupPairs.length === 0) {
            logger.info('Student is not in any groups');
            return [];
        }

        // Get all groups with their parent/child relationships
        const groupIds = groupPairs.map(p => p.student_group_id);
        const { data: allGroups, error: groupsError } = await supabase
            .from('student_group')
            .select('id, name, parent_id')
            .in('id', groupIds);

        if (groupsError) {
            logger.error('Error fetching group details', { error: groupsError });
            return [];
        }

        // Build a map of groups
        const groupMap = new Map<number, { id: number; name: string; parentId: number | null; childGroups: Array<{ id: number; name: string }> }>();
        allGroups?.forEach(group => {
            groupMap.set(group.id, {
                id: group.id,
                name: group.name,
                parentId: group.parent_id,
                childGroups: []
            });
        });

        // Build parent-child relationships
        allGroups?.forEach(group => {
            if (group.parent_id && groupMap.has(group.parent_id)) {
                const parent = groupMap.get(group.parent_id)!;
                parent.childGroups.push({ id: group.id, name: group.name });
            }
        });

        // Return only top-level groups (groups without parents, or groups the student is directly in)
        const topLevelGroups = Array.from(groupMap.values())
            .filter(group => group.parentId === null || groupIds.includes(group.id));

        logger.info('Student groups retrieved successfully', { 
            studentId: student.id,
            groupCount: topLevelGroups.length
        });

        return topLevelGroups;
    } catch (error) {
        logger.error('Failed to get student groups', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return [];
    }
}

/**
 * Helper function to get all child group IDs recursively for a parent group
 */
async function getAllChildGroupIds(parentGroupId: number): Promise<number[]> {
    const supabase = await supabaseServiceClient();
    const childIds: number[] = [];

    async function getChildren(parentId: number) {
        const { data: children, error } = await supabase
            .from('student_group')
            .select('id')
            .eq('parent_id', parentId);

        if (error || !children) return;

        for (const child of children) {
            childIds.push(child.id);
            await getChildren(child.id); // Recursively get grandchildren
        }
    }

    await getChildren(parentGroupId);
    return childIds;
}

/**
 * Share a student point to one or more groups
 * Automatically includes all child groups when a parent is selected
 */
export async function shareStudentPoint(studentPointId: number, groupIds: number[]): Promise<{ success: boolean; error?: string }> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'shareStudentPoint' });
    
    try {
        const student = await getStudentDataWithContext();
        if (!student) {
            logger.warn('No student data found');
            return { success: false, error: 'Student not found' };
        }

        const supabase = await supabaseServiceClient();

        // Verify the student_point belongs to the current student
        const { data: studentPoint, error: pointError } = await supabase
            .from('student_point')
            .select('student_id')
            .eq('id', studentPointId)
            .single();

        if (pointError || !studentPoint) {
            logger.warn('Student point not found', { studentPointId });
            return { success: false, error: 'Point not found' };
        }

        if (studentPoint.student_id !== student.id) {
            logger.warn('Student does not own this point', { studentPointId, studentId: student.id });
            return { success: false, error: 'Unauthorized' };
        }

        // The audience of a share is group membership (§10.3): only groups the
        // sharer belongs to may be targeted. Reject the whole request otherwise.
        if (!Array.isArray(groupIds) || groupIds.length === 0) {
            return { success: false, error: 'Choose a group to share with' };
        }
        const { data: ownGroupRows, error: ownGroupError } = await supabase
            .from('student_group_pair')
            .select('student_group_id')
            .eq('student_id', student.id);
        if (ownGroupError) {
            logger.error('Error fetching sharer groups', { error: ownGroupError });
            return { success: false, error: 'Failed to share points' };
        }
        const { allowed, rejected } = partitionShareGroups(
            groupIds,
            (ownGroupRows || []).map(r => r.student_group_id)
        );
        if (rejected.length > 0) {
            logger.warn('Share rejected: group(s) outside sharer membership', {
                studentId: student.id,
                rejectedCount: rejected.length
            });
            return { success: false, error: 'You can only share with groups you belong to' };
        }

        // Get all groups to share to (including child groups)
        const allGroupIds = new Set<number>();
        for (const groupId of allowed) {
            allGroupIds.add(groupId);
            const childIds = await getAllChildGroupIds(groupId);
            childIds.forEach(id => allGroupIds.add(id));
        }

        // Check which groups already have this point shared
        const { data: existingShares, error: existingError } = await supabase
            .from('shared_point')
            .select('shared_group_id')
            .eq('student_point_id', studentPointId)
            .in('shared_group_id', Array.from(allGroupIds));

        const existingGroupIds = new Set((existingShares || []).map(s => s.shared_group_id));

        // Insert new shares (only for groups that don't already have it)
        const newShares = Array.from(allGroupIds)
            .filter(id => !existingGroupIds.has(id))
            .map(groupId => ({
                student_point_id: studentPointId,
                shared_group_id: groupId,
                pinned: false
            }));

        if (newShares.length > 0) {
            const { error: insertError } = await supabase
                .from('shared_point')
                .insert(newShares);

            if (insertError) {
                logger.error('Error sharing points', { error: insertError });
                return { success: false, error: 'Failed to share points' };
            }
        }

        logger.info('Student point shared successfully', { 
            studentPointId,
            groupCount: allGroupIds.size,
            newShares: newShares.length
        });

        return { success: true };
    } catch (error) {
        logger.error('Failed to share student point', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return { success: false, error: 'An error occurred' };
    }
}

/**
 * Unshare a student point from one or more groups
 * Also removes shares from all child groups
 */
export async function unshareStudentPoint(studentPointId: number, groupIds: number[]): Promise<{ success: boolean; error?: string }> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'unshareStudentPoint' });
    
    try {
        const student = await getStudentDataWithContext();
        if (!student) {
            logger.warn('No student data found');
            return { success: false, error: 'Student not found' };
        }

        const supabase = await supabaseServiceClient();

        // Verify the student_point belongs to the current student
        const { data: studentPoint, error: pointError } = await supabase
            .from('student_point')
            .select('student_id')
            .eq('id', studentPointId)
            .single();

        if (pointError || !studentPoint) {
            logger.warn('Student point not found', { studentPointId });
            return { success: false, error: 'Point not found' };
        }

        if (studentPoint.student_id !== student.id) {
            logger.warn('Student does not own this point', { studentPointId, studentId: student.id });
            return { success: false, error: 'Unauthorized' };
        }

        // Get all groups to unshare from (including child groups)
        const allGroupIds = new Set<number>();
        for (const groupId of groupIds) {
            allGroupIds.add(groupId);
            const childIds = await getAllChildGroupIds(groupId);
            childIds.forEach(id => allGroupIds.add(id));
        }

        // Delete shares for these groups
        const { error: deleteError } = await supabase
            .from('shared_point')
            .delete()
            .eq('student_point_id', studentPointId)
            .in('shared_group_id', Array.from(allGroupIds));

        if (deleteError) {
            logger.error('Error unsharing points', { error: deleteError });
            return { success: false, error: 'Failed to unshare points' };
        }

        logger.info('Student point unshared successfully', { 
            studentPointId,
            groupCount: allGroupIds.size
        });

        return { success: true };
    } catch (error) {
        logger.error('Failed to unshare student point', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return { success: false, error: 'An error occurred' };
    }
}

/**
 * Get all points that have been shared to groups the student belongs to
 * Returns points grouped by point event, sorted by date (newest first)
 * Within each event, entries are ordered by share time (newest first), then name.
 * Never by points, and recipients get no raw score and no real student id (§10.3).
 */
export async function getSharedPointsForStudent(): Promise<Array<{
    eventId: number;
    eventName: string | null;
    eventDate: string | null;
    pointGroup: {
        id: number;
        name: string;
        color: string;
    };
    sharedPoints: Array<{
        key: string;
        pointValue: number;
        sharer: {
            firstName: string;
            lastName: string;
        };
    }>;
}>> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getSharedPointsForStudent' });
    
    try {
        const student = await getStudentDataWithContext();
        if (!student) {
            logger.warn('No student data found');
            return [];
        }

        const supabase = await supabaseServiceClient();

        // Get all groups the student belongs to
        const { data: groupPairs, error: pairsError } = await supabase
            .from('student_group_pair')
            .select('student_group_id')
            .eq('student_id', student.id);

        if (pairsError || !groupPairs || groupPairs.length === 0) {
            logger.info('Student is not in any groups');
            return [];
        }

        const studentGroupIds = groupPairs.map(p => p.student_group_id);

        // Get all shared points for groups the student is in
        // Join with student_point, point_event, student (sharer), and point_group
        const { data: sharedPoints, error: sharedError } = await supabase
            .from('shared_point')
            .select(`
                student_point_id,
                created_at,
                student_point!inner(
                    id,
                    point_value,
                    point_event_id,
                    student_id,
                    student:student!inner(
                        first_name,
                        last_name
                    ),
                    point_event:point_event(
                        id,
                        name,
                        date,
                        point_group_id,
                        point_group:point_group(
                            id,
                            name,
                            color
                        )
                    )
                )
            `)
            .in('shared_group_id', studentGroupIds);

        if (sharedError) {
            logger.error('Error fetching shared points', { error: sharedError });
            return [];
        }

        if (!sharedPoints || sharedPoints.length === 0) {
            logger.info('No shared points found');
            return [];
        }

        // Remove duplicates by student_point_id (same point can be shared to multiple groups),
        // keeping the earliest share time.
        const uniquePoints = new Map<number, typeof sharedPoints[0]>();
        sharedPoints.forEach(sp => {
            const studentPointId = sp.student_point?.id;
            if (!studentPointId) return;
            const existing = uniquePoints.get(studentPointId);
            if (!existing || Date.parse(sp.created_at) < Date.parse(existing.created_at)) {
                uniquePoints.set(studentPointId, sp);
            }
        });

        type FeedPoint = {
            key: string;
            pointValue: number;
            sharer: { firstName: string; lastName: string };
            sharedAt: string;
        };

        // Group by point_event_id
        const eventMap = new Map<number, {
            eventId: number;
            eventName: string | null;
            eventDate: string | null;
            pointGroup: { id: number; name: string; color: string };
            sharedPoints: FeedPoint[];
        }>();

        uniquePoints.forEach((sp) => {
            const studentPoint = sp.student_point as any;
            const pointEvent = studentPoint.point_event as any;
            const sharer = studentPoint.student as any;
            const pointGroup = pointEvent.point_group as any;

            if (!eventMap.has(pointEvent.id)) {
                eventMap.set(pointEvent.id, {
                    eventId: pointEvent.id,
                    eventName: pointEvent.name,
                    eventDate: pointEvent.date,
                    pointGroup: {
                        id: pointGroup.id,
                        name: pointGroup.name,
                        color: pointGroup.color
                    },
                    sharedPoints: []
                });
            }

            eventMap.get(pointEvent.id)!.sharedPoints.push({
                key: '',
                pointValue: studentPoint.point_value,
                sharer: {
                    firstName: sharer.first_name,
                    lastName: sharer.last_name
                },
                sharedAt: sp.created_at
            });
        });

        // Sort events by date (reverse chronological - newest first)
        const events = Array.from(eventMap.values());
        events.sort((a, b) => {
            const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
            const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
            return dateB - dateA;
        });

        // Order entries by share time then name (never by points), then assign opaque
        // per-response keys. The real student_point id never reaches recipients.
        let keyCounter = 0;
        const result = events.map(event => {
            event.sharedPoints.sort((a, b) => compareSharedEntries(
                { sharedAt: a.sharedAt, ...a.sharer },
                { sharedAt: b.sharedAt, ...b.sharer }
            ));
            return {
                eventId: event.eventId,
                eventName: event.eventName,
                eventDate: event.eventDate,
                pointGroup: event.pointGroup,
                sharedPoints: event.sharedPoints.map(p => ({
                    key: `sp-${++keyCounter}`,
                    pointValue: p.pointValue,
                    sharer: p.sharer
                }))
            };
        });

        logger.info('Shared points retrieved successfully', { 
            studentId: student.id,
            eventCount: result.length,
            totalPoints: uniquePoints.size
        });

        return result;
    } catch (error) {
        logger.error('Failed to get shared points for student', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return [];
    }
}

/**
 * Get groups that a point is already shared to
 */
export async function getPointSharedGroups(studentPointId: number): Promise<number[]> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getPointSharedGroups' });
    
    try {
        const student = await getStudentDataWithContext();
        if (!student) {
            logger.warn('No student data found');
            return [];
        }

        const supabase = await supabaseServiceClient();

        // Verify the student_point belongs to the current student
        const { data: studentPoint, error: pointError } = await supabase
            .from('student_point')
            .select('student_id')
            .eq('id', studentPointId)
            .single();

        if (pointError || !studentPoint) {
            logger.warn('Student point not found', { studentPointId });
            return [];
        }

        if (studentPoint.student_id !== student.id) {
            logger.warn('Student does not own this point', { studentPointId, studentId: student.id });
            return [];
        }

        // Get existing shares
        const { data: existingShares, error: sharesError } = await supabase
            .from('shared_point')
            .select('shared_group_id')
            .eq('student_point_id', studentPointId);

        if (sharesError) {
            logger.error('Error fetching existing shares', { error: sharesError });
            return [];
        }

        return (existingShares || []).map(s => s.shared_group_id);
    } catch (error) {
        logger.error('Failed to get point shared groups', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return [];
    }
}

/**
 * Check if multiple student points are shared (returns a record of studentPointId -> boolean)
 */
export async function checkPointsSharedStatus(studentPointIds: number[]): Promise<Record<number, boolean>> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'checkPointsSharedStatus' });
    
    try {
        const student = await getStudentDataWithContext();
        if (!student) {
            logger.warn('No student data found');
            return {};
        }

        if (studentPointIds.length === 0) {
            return {};
        }

        const supabase = await supabaseServiceClient();

        // Verify all student_points belong to the current student
        const { data: studentPoints, error: pointsError } = await supabase
            .from('student_point')
            .select('id, student_id')
            .in('id', studentPointIds)
            .eq('student_id', student.id);

        if (pointsError || !studentPoints) {
            logger.warn('Error verifying student points', { error: pointsError });
            return {};
        }

        const validPointIds = studentPoints.map(sp => sp.id);
        if (validPointIds.length === 0) {
            return {};
        }

        // Get existing shares for all valid points
        const { data: existingShares, error: sharesError } = await supabase
            .from('shared_point')
            .select('student_point_id')
            .in('student_point_id', validPointIds);

        if (sharesError) {
            logger.error('Error fetching existing shares', { error: sharesError });
            return {};
        }

        // Create a set of shared point IDs
        const sharedPointIds = new Set((existingShares || []).map(s => s.student_point_id));

        // Build result object - all points default to false, then set true for shared ones
        const result: Record<number, boolean> = {};
        validPointIds.forEach(id => {
            result[id] = sharedPointIds.has(id);
        });

        return result;
    } catch (error) {
        logger.error('Failed to check points shared status', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return {};
    }
}