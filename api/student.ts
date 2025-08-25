"use server";
import { Student, StudentMonthlyTrends, MonthlyTrendData } from "@/types/domain";
import { getPhoenixUser } from "./user";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { createClient } from "@/utils/supabase/server";
import { UserContextResolver } from "./core/user-context";
import { createServerLogger } from "@/utils/serverLogger";
import { TeacherTimeframe } from "@/types/domain";

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
            .select("*")
            .eq("linkedUser", phoenixUser.id)
            .single();

        if (studentError !== null) {
            logger.error("Error fetching student data:", { studentError });
            return null;
        }

        const student: Student = {
            id: studentData.id,
            schoolId: studentData.school_id,
            linkCode: studentData.link_code,
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
            .select("*")
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
            linkCode: studentRecord.link_code,
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
                point_template!inner(
                    point_group_id,
                    point_group!inner(id, name, color, school_id)
                ),
                student_point(student_id, point_value, input_score)
            `)
            .eq('point_template.point_group.school_id', student.schoolId)
            .gte('date', timeframe.starts_at)
            .lte('date', timeframe.ends_at);

        if (!pointEvents) {
            logger.warn('No point events found');
            return null;
        }

        // Get point groups for ranking calculations
        const { data: pointGroups } = await supabase
            .from('point_group')
            .select('id, name, color')
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
        
        // Get recent point events where the student participated
        const { data: events } = await supabase
            .from('point_event')
            .select(`
                id,
                name,
                date,
                max_input,
                point_template!inner(
                    point_group_id,
                    point_group!inner(id, name, color)
                ),
                student_point!inner(point_value, input_score)
            `)
            .eq('student_point.student_id', student.id)
            .order('date', { ascending: false })
            .limit(limit);

        if (!events) {
            return [];
        }

        return events.map(event => ({
            id: event.id,
            name: event.name || 'Unnamed Event',
            date: event.date,
            maxPoints: event.max_input,
            points: event.student_point[0]?.point_value || 0,
            pointGroup: {
                id: event.point_template.point_group.id,
                name: event.point_template.point_group.name,
                color: event.point_template.point_group.color
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

    // Calculate points from events
    pointEvents.forEach(event => {
        const pointGroupId = event.point_template.point_group_id;
        
        event.student_point.forEach((sp: any) => {
            const currentPoints = studentPoints.get(sp.student_id) || 0;
            studentPoints.set(sp.student_id, currentPoints + sp.point_value);
            
            const groupPoints = studentPointGroups.get(sp.student_id);
            if (groupPoints) {
                const currentGroupPoints = groupPoints.get(pointGroupId) || 0;
                groupPoints.set(pointGroupId, currentGroupPoints + sp.point_value);
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

    // Get nearby students (2 above, 2 below)
    const studentIndex = sortedStudents.findIndex(s => s.id === student.id);
    const nearbyStudents = sortedStudents.slice(
        Math.max(0, studentIndex - 2),
        Math.min(sortedStudents.length, studentIndex + 3)
    );

    const gradeIndex = gradeStudents.findIndex(s => s.id === student.id);
    const nearbyGradeStudents = gradeStudents.slice(
        Math.max(0, gradeIndex - 2),
        Math.min(gradeStudents.length, gradeIndex + 3)
    );

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
        nearbyStudents: nearbyStudents.map(s => ({
            studentId: s.id,
            firstName: s.first_name,
            lastName: s.last_name,
            totalPoints: s.totalPoints,
            rank: sortedStudents.findIndex(ss => ss.id === s.id) + 1
        })),
        nearbyGradeStudents: nearbyGradeStudents.map(s => ({
            studentId: s.id,
            firstName: s.first_name,
            lastName: s.last_name,
            points: s.totalPoints,
            rank: gradeStudents.findIndex(ss => ss.id === s.id) + 1
        })),
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
            // Get nearby students (2 above, 2 below)
            const studentIndex = studentsInGroup.findIndex(s => s.id === studentId);
            const nearbyStudents = studentsInGroup.slice(
                Math.max(0, studentIndex - 2),
                Math.min(studentsInGroup.length, studentIndex + 3)
            );

            pointGroupRankings.push({
                pointGroupId: groupId,
                pointGroupName: group.name,
                pointGroupColor: group.color,
                points: studentPoints,
                rank: studentRank,
                outOf: studentsInGroup.length,
                nearbyStudents: nearbyStudents.map(s => ({
                    studentId: s.id,
                    firstName: s.first_name,
                    lastName: s.last_name,
                    points: s.points,
                    rank: studentsInGroup.findIndex(ss => ss.id === s.id) + 1
                }))
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
            // Sort all participants by points
            const participants = event.student_point
                .map((sp: any) => ({
                    studentId: sp.student_id,
                    points: sp.point_value
                }))
                .sort((a: { studentId: number; points: number }, b: { studentId: number; points: number }) => b.points - a.points);

            const studentRank = participants.findIndex((p: { studentId: number; points: number }) => p.studentId === studentId) + 1;
            const studentPoints = studentParticipation.point_value;

            pointEventRankings.push({
                eventId: event.id,
                eventName: event.name || 'Unnamed Event',
                eventDate: event.date,
                maxPoints: event.max_input,
                points: studentPoints,
                rank: studentRank,
                outOf: participants.length,
                pointGroup: {
                    id: event.point_template.point_group.id,
                    name: event.point_template.point_group.name,
                    color: event.point_template.point_group.color
                }
            });
        }
    });

    return pointEventRankings;
}

/**
 * Gets student dashboard data by student ID (for parent/compare pages)
 */
export async function getStudentDashboardDataById(studentId: number, timeframeId?: number | null) {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getStudentDashboardDataById' });
    
    try {
        const supabase = await supabaseServiceClient();
        
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
            linkCode: studentData.link_code,
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
                point_template!inner(
                    point_group_id,
                    point_group!inner(id, name, color, school_id)
                ),
                student_point(student_id, point_value, input_score)
            `)
            .eq('point_template.point_group.school_id', student.schoolId)
            .gte('date', timeframe.starts_at)
            .lte('date', timeframe.ends_at);

        if (!pointEvents) {
            logger.warn('No point events found');
            return null;
        }

        // Get point groups for ranking calculations
        const { data: pointGroups } = await supabase
            .from('point_group')
            .select('id, name, color')
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
 * Gets global stats for a school (for compare page)
 */
export async function getSchoolGlobalStats(schoolId: number, timeframeId?: number | null) {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getSchoolGlobalStats' });
    
    try {
        const supabase = await supabaseServiceClient();
        
        // Get timeframe
        let timeframe = null;
        if (timeframeId) {
            const { data: tfData } = await supabase
                .from('school_timeframes')
                .select('*')
                .eq('id', timeframeId)
                .eq('school_id', schoolId)
                .single();
            timeframe = tfData;
        } else {
            const { data: tfData } = await supabase
                .from('school_timeframes')
                .select('*')
                .eq('school_id', schoolId)
                .eq('active', true)
                .single();
            timeframe = tfData;
        }

        if (!timeframe) {
            logger.warn('No timeframe found');
            return null;
        }

        // Get all students and their points
        const { data: allStudents } = await supabase
            .from('student')
            .select('id, first_name, last_name, grade')
            .eq('school_id', schoolId);

        if (!allStudents) {
            logger.warn('No students found in school');
            return null;
        }

        // Get point events
        const { data: pointEvents } = await supabase
            .from('point_event')
            .select(`
                id,
                name,
                date,
                max_input,
                point_template!inner(
                    point_group_id,
                    point_group!inner(id, name, color, school_id)
                ),
                student_point(student_id, point_value, input_score)
            `)
            .eq('point_template.point_group.school_id', schoolId)
            .gte('date', timeframe.starts_at)
            .lte('date', timeframe.ends_at);

        if (!pointEvents) {
            logger.warn('No point events found');
            return null;
        }

        // Calculate global statistics
        const studentPoints = new Map<number, number>();
        const studentPointGroups = new Map<number, Map<number, number>>();
        
        // Initialize maps
        allStudents.forEach(s => {
            studentPoints.set(s.id, 0);
            studentPointGroups.set(s.id, new Map());
        });

        // Calculate points from events
        pointEvents.forEach(event => {
            const pointGroupId = event.point_template.point_group_id;
            
            event.student_point.forEach((sp: any) => {
                const currentPoints = studentPoints.get(sp.student_id) || 0;
                studentPoints.set(sp.student_id, currentPoints + sp.point_value);
                
                const groupPoints = studentPointGroups.get(sp.student_id);
                if (groupPoints) {
                    const currentGroupPoints = groupPoints.get(pointGroupId) || 0;
                    groupPoints.set(pointGroupId, currentGroupPoints + sp.point_value);
                }
            });
        });

        // Get unique point groups
        const pointGroups = new Map<number, { id: number, name: string, color: string }>();
        pointEvents.forEach(event => {
            const group = event.point_template.point_group;
            if (!pointGroups.has(group.id)) {
                pointGroups.set(group.id, {
                    id: group.id,
                    name: group.name,
                    color: group.color
                });
            }
        });

        // Sort students by total points
        const sortedStudents = allStudents
            .map(s => ({
                ...s,
                totalPoints: studentPoints.get(s.id) || 0
            }))
            .sort((a, b) => b.totalPoints - a.totalPoints);

        return {
            schoolId,
            totalStudents: allStudents.length,
            timeframe: {
                id: timeframe.id,
                name: timeframe.name,
                startsAt: timeframe.starts_at,
                endsAt: timeframe.ends_at,
                active: timeframe.active
            },
            students: sortedStudents.map((s, index) => ({
                id: s.id,
                firstName: s.first_name,
                lastName: s.last_name,
                grade: s.grade,
                totalPoints: s.totalPoints,
                rank: index + 1
            })),
            pointGroups: Array.from(pointGroups.values())
        };
    } catch (error) {
        logger.error('Failed to get school global stats', { 
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
        
        // Get all students in the school for ranking calculations
        const { data: allStudents } = await supabase
            .from('student')
            .select('id, first_name, last_name, grade')
            .eq('school_id', student.schoolId);

        if (!allStudents) {
            logger.warn('No students found in school');
            return null;
        }

        // Get point events for the last 2 months only (current month and previous month)
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        
        const { data: pointEvents } = await supabase
            .from('point_event')
            .select(`
                id,
                name,
                date,
                max_input,
                point_template!inner(
                    point_group_id,
                    point_group!inner(id, name, color, school_id)
                ),
                student_point(student_id, point_value, input_score)
            `)
            .eq('point_template.point_group.school_id', student.schoolId)
            .gte('date', twoMonthsAgo.toISOString().split('T')[0]);

        if (!pointEvents || pointEvents.length === 0) {
            logger.warn('No point events found in last 2 months');
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
    
    // Calculate changes
    const pointIncrease = currentMonthPoints - previousMonthPoints;
    const percentageIncrease = previousMonthPoints > 0 ? ((currentMonthPoints - previousMonthPoints) / previousMonthPoints) * 100 : 0;
    
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