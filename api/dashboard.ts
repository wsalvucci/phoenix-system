"use server";
import { getSupabaseUser } from "@/api/user";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { percentileToRating, Rating, Timeframe, TopScrollingDashboard } from "@/types/domain";
import { createServerLogger, logDatabaseQuery, logServerError } from "@/utils/serverLogger";

/**
 * Fetches timeframe data either by ID or gets the active timeframe for a school
 * @param schoolId - The school ID to get the active timeframe for (when timeframeId is null)
 * @param timeframeId - The specific timeframe ID to fetch, or null to get active timeframe
 * @returns Promise<{ id: number, name: string, starts_at: string, ends_at: string, active: boolean, school_id: number }>
 */
async function getTimeframeData(schoolId: number, timeframeId: number | null) : Promise<Timeframe[]> {
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
        
        const timeframeQuery = supabase
            .from('school_timeframes')
            .select('*')
            .eq('school_id', schoolId);

        const { data: timeframeData, error: timeframeError } = await timeframeQuery;

        if (timeframeError !== null) {
            const error = new Error(timeframeError.message);
            error.name = 'TimeframeError';
            logger.error('Error fetching timeframe data', { schoolId, timeframeId }, error);
            throw timeframeError;
        }

        if (!timeframeData) {
            logger.warn('No timeframe data found', { schoolId, timeframeId });
            throw new Error("No timeframe found");
        }

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

        return timeframeData.map(timeframe => ({
            id: timeframe.id,
            name: timeframe.name,
            startsAt: timeframe.starts_at,
            endsAt: timeframe.ends_at,
            active: timeframe.active,
            schoolId: timeframe.school_id
        }));
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

export async function checkSchoolAccess(schoolId: number): Promise<boolean> {
    const startTime = Date.now();
    const logger = createServerLogger({ 
        component: 'DashboardAPI', 
        action: 'checkSchoolAccess',
        schoolId: schoolId.toString()
    });

    logger.debug('Checking school access', { schoolId });
    
    try {
        const supabaseUser = await getSupabaseUser();

        if (supabaseUser === null) {
            logger.warn('No authenticated user found for school access check', { schoolId });
            return false;
        }

        logger.debug('Fetching user data for access check', { 
            schoolId, 
            userId: supabaseUser.id 
        });

        const supabase = await supabaseServiceClient();
        const { data, error } = await supabase
            .from('user')
            .select('id, admin (admin_school_pair (school_id)), teacher (school_id)')
            .eq('supabase_id', supabaseUser.id)
            .single();

        if (error !== null) {
            const userError = new Error(error.message);
            userError.name = 'UserDataError';
            logger.error('Error fetching user data for access check', { 
                schoolId, 
                userId: supabaseUser.id 
            }, userError);
            return false;
        }

        // Check admin access
        if (data.admin !== null && data.admin.admin_school_pair.some(pair => pair.school_id === schoolId)) {
            logger.info('User has admin access to school', { 
                schoolId, 
                userId: supabaseUser.id,
                accessType: 'admin'
            });
            return true;
        }

        // Check teacher access
        if (data.teacher.some(teacher => teacher.school_id === schoolId)) {
            logger.info('User has teacher access to school', { 
                schoolId, 
                userId: supabaseUser.id,
                accessType: 'teacher'
            });
            return true;
        }

        // Check if user has access to students at this school through user_student_pair table
        logger.debug('Checking student pair access', { 
            schoolId, 
            userId: supabaseUser.id 
        });

        const { data: studentPairData, error: studentPairError } = await supabase
            .from('user_student_pair')
            .select('student (school_id)')
            .eq('user_id', data.id);

        if (studentPairError === null && studentPairData && studentPairData.some(pair => pair.student?.school_id === schoolId)) {
            logger.info('User has student access to school', { 
                schoolId, 
                userId: supabaseUser.id,
                accessType: 'student'
            });
            return true;
        }

        const duration = Date.now() - startTime;
        logger.warn('User denied access to school', { 
            schoolId, 
            userId: supabaseUser.id,
            duration
        });

        return false;
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
): Promise<TopScrollingDashboard> {
    const startTime = Date.now();
    const logger = createServerLogger({ 
        component: 'DashboardAPI', 
        action: 'getTopScrollingDashboard',
        schoolId: schoolId.toString(),
        timeframeId: timeframeId?.toString() || 'active'
    });

    logger.info('Starting top scrolling dashboard request', { schoolId, timeframeId });
    
    try {
        // Check access
        logger.debug('Checking school access');
        const checkAccess = await checkSchoolAccess(schoolId);
        if (!checkAccess) {
            logger.warn('User denied access to school dashboard', { schoolId });
            throw new Error("User does not have access to this school");
        }

        logger.debug('Access granted, fetching dashboard data');

        const supabase = await supabaseServiceClient();

        // Fetch timeframe data using the helper function
        logger.debug('Fetching timeframe data');
        const timeframeData = await getTimeframeData(schoolId, timeframeId);
        let timeframe = timeframeData.find(t => t.id === timeframeId);
        if (!timeframe) {
            timeframe = timeframeData.find(t => t.active);
        }
        if (!timeframe) {
            logger.error('No valid timeframe found', { schoolId, timeframeId, availableTimeframes: timeframeData.length });
            throw new Error("No timeframe found");
        }

        logger.debug('Using timeframe for dashboard', { 
            timeframeId: timeframe.id, 
            timeframeName: timeframe.name,
            timeframeStart: timeframe.startsAt,
            timeframeEnd: timeframe.endsAt
        });

        // Fetch all students with their points, point groups, and group memberships
        logger.debug('Fetching student data with points and groups');
        const studentQueryStart = Date.now();
        
        const { data: studentsData, error: studentsError } = await supabase
            .from('student')
            .select(`
                id, 
                first_name, 
                last_name, 
                grade,
                student_point (
                    point_value, 
                    point_event (
                        date,
                        point_group (id, name, color)
                    )
                ),
                student_group_pair (
                    student_group (id, name)
                )
            `)
            .eq('school_id', schoolId)
            .gte('student_point.point_event.date', timeframe.startsAt)
            .lte('student_point.point_event.date', timeframe.endsAt)

        const studentQueryDuration = Date.now() - studentQueryStart;
        logDatabaseQuery('SELECT', 'student', studentQueryDuration, 
            'SELECT student data with points and groups for timeframe',
            { schoolId, timeframeStart: timeframe.startsAt, timeframeEnd: timeframe.endsAt }
        );

        if (studentsError !== null) {
            const studentError = new Error(studentsError.message);
            studentError.name = 'StudentDataError';
            logger.error('Error fetching student data', { 
                schoolId, 
                timeframeId: timeframe.id,
                duration: studentQueryDuration
            }, studentError);
            throw studentsError;
        }

        if (!studentsData || studentsData.length === 0) {
            logger.info('No students found for dashboard', { 
                schoolId, 
                timeframeId: timeframe.id,
                duration: Date.now() - startTime
            });
            return { timeframes: timeframeData, students: [] };
        }

        logger.debug('Processing student data', { 
            studentCount: studentsData.length,
            timeframeId: timeframe.id
        });

        // Calculate total points for each student
        const processingStart = Date.now();
        const studentsWithPoints = studentsData.map(student => {
            // Filter points to only those within the timeframe
            const filteredPoints = student.student_point.filter(point => {
                const date = point.point_event?.date;
                if (!date) return false;
                return date >= timeframe.startsAt && date <= timeframe.endsAt;
            });

            // Calculate total points using only filtered points
            const totalPoints = filteredPoints.reduce((acc, point) => acc + point.point_value, 0);

            // Group points by point type using only filtered points
            const pointsByType = new Map<number, { id: number, name: string, color: string, points: number }>();
            filteredPoints.forEach(point => {
                const pointGroup = point.point_event?.point_group;
                if (pointGroup) {
                    const existing = pointsByType.get(pointGroup.id);
                    if (existing) {
                        existing.points += point.point_value;
                    } else {
                        pointsByType.set(pointGroup.id, {
                            id: pointGroup.id,
                            name: pointGroup.name,
                            color: pointGroup.color,
                            points: point.point_value
                        });
                    }
                }
            });

            // Get student groups
            const studentGroups = student.student_group_pair
                .filter(pair => pair.student_group !== null)
                .map(pair => ({
                    id: pair.student_group!.id,
                    name: pair.student_group!.name
                }));

            return {
                id: student.id,
                firstName: student.first_name,
                lastName: student.last_name,
                grade: student.grade,
                totalPoints, // <-- this is now always filtered
                pointsByType: Array.from(pointsByType.values()),
                studentGroups
            };
        });

        // Sort by total points for overall ranking
        studentsWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);

        logger.debug('Calculating rankings and ratings');

        // Calculate overall ranks
        const overallRanks: { [key: number]: number } = {};
        studentsWithPoints.forEach((student, index) => {
            overallRanks[student.id] = index + 1;
        });

        // Calculate grade-based ranks
        const gradeRanks: { [key: number]: { grade: number, rank: number } } = {};
        const studentsByGrade: { [key: number]: typeof studentsWithPoints } = {};

        studentsWithPoints.forEach(student => {
            if (!studentsByGrade[student.grade]) {
                studentsByGrade[student.grade] = [];
            }
            studentsByGrade[student.grade].push(student);
        });

        Object.entries(studentsByGrade).forEach(([grade, gradeStudents]) => {
            gradeStudents.sort((a, b) => b.totalPoints - a.totalPoints);
            gradeStudents.forEach((student, index) => {
                gradeRanks[student.id] = { grade: parseInt(grade), rank: index + 1 };
            });
        });

        // Calculate group-based ranks
        const groupRanks: { [key: number]: { id: number, name: string, rank: number }[] } = {};
        const studentsByGroup: { [key: number]: typeof studentsWithPoints } = {};

        // Collect all students for each group
        studentsWithPoints.forEach(student => {
            student.studentGroups.forEach(group => {
                if (!studentsByGroup[group.id]) {
                    studentsByGroup[group.id] = [];
                }
                studentsByGroup[group.id].push(student);
            });
        });

        // Calculate ranks for each group
        Object.entries(studentsByGroup).forEach(([groupId, groupStudents]) => {
            const groupIdNum = parseInt(groupId);
            const groupName = groupStudents[0]?.studentGroups.find(g => g.id === groupIdNum)?.name || '';
            groupStudents.sort((a, b) => b.totalPoints - a.totalPoints);

            groupStudents.forEach((student, index) => {
                if (!groupRanks[student.id]) {
                    groupRanks[student.id] = [];
                }
                groupRanks[student.id].push({
                    id: groupIdNum,
                    name: groupName,
                    rank: index + 1
                });
            });
        });

        // Calculate point type ratings
        const pointTypeRatings: { [key: number]: { id: number, name: string, color: string, points: number, rating: Rating }[] } = {};
        const studentsByPointType: { [key: number]: typeof studentsWithPoints } = {};

        // Collect all students for each point type
        studentsWithPoints.forEach(student => {
            student.pointsByType.forEach(pointType => {
                if (!studentsByPointType[pointType.id]) {
                    studentsByPointType[pointType.id] = [];
                }
                studentsByPointType[pointType.id].push(student);
            });
        });

        // Calculate ratings for each point type
        Object.entries(studentsByPointType).forEach(([pointTypeId, typeStudents]) => {
            const pointTypeIdNum = parseInt(pointTypeId);
            const pointTypeName = typeStudents[0]?.pointsByType.find(p => p.id === pointTypeIdNum)?.name || '';
            const pointTypeColor = typeStudents[0]?.pointsByType.find(p => p.id === pointTypeIdNum)?.color || '';

            // Get min and max points for this point type
            const allPoints = typeStudents.map(student =>
                student.pointsByType.find(p => p.id === pointTypeIdNum)?.points || 0
            );
            const minPoints = Math.min(...allPoints);
            const maxPoints = Math.max(...allPoints);

            typeStudents.forEach((student) => {
                const studentPoints = student.pointsByType.find(p => p.id === pointTypeIdNum)?.points || 0;

                // Calculate raw percentile: (points - min) / (max - min)
                const percentile = maxPoints === minPoints ? 1 : (studentPoints - minPoints) / (maxPoints - minPoints);
                const rating = percentileToRating(percentile);

                if (!pointTypeRatings[student.id]) {
                    pointTypeRatings[student.id] = [];
                }
                pointTypeRatings[student.id].push({
                    id: pointTypeIdNum,
                    name: pointTypeName,
                    color: pointTypeColor,
                    points: studentPoints,
                    rating: rating
                });
            });
        });

        // Build the final result
        const students = studentsWithPoints.map(student => {
            const totalRank = overallRanks[student.id] || 0;
            const rankInGrade = gradeRanks[student.id] || { grade: student.grade, rank: 0 };
            const groupRanksForStudent = groupRanks[student.id] || [];
            const pointTypeRatingsForStudent = pointTypeRatings[student.id] || [];

            // Calculate total rating based on raw points percentile
            const allTotalPoints = studentsWithPoints.map(s => s.totalPoints);
            const minTotalPoints = Math.min(...allTotalPoints);
            const maxTotalPoints = Math.max(...allTotalPoints);
            const totalPercentile = maxTotalPoints === minTotalPoints ? 1 : (student.totalPoints - minTotalPoints) / (maxTotalPoints - minTotalPoints);
            const totalRating = percentileToRating(totalPercentile);

            return {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                grade: student.grade,
                totalRank,
                rankInGrade,
                totalPoints: student.totalPoints,
                totalRating,
                pointsByType: pointTypeRatingsForStudent,
                studentGroups: groupRanksForStudent
            };
        }).slice(0, 20);

        const processingDuration = Date.now() - processingStart;
        const totalDuration = Date.now() - startTime;

        logger.info('Dashboard data processed successfully', {
            schoolId,
            timeframeId: timeframe.id,
            timeframeName: timeframe.name,
            studentCount: studentsData.length,
            topStudentsReturned: students.length,
            processingDuration,
            totalDuration,
            studentQueryDuration
        });

        return { timeframes: timeframeData, students };
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