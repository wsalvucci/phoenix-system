"use server";
import { createClient } from "@/utils/supabase/server";
import { AdminData, CompiledStudentPoints, GlobalPoints, PointEventData, PointGroupData, RankingGroupData, RankingGroupPointEventData, StudentData, StudentGroupData, SupabaseUserData, TimeframeData, UserData } from "./utils/types";
import supabaseServiceClient from "../server/supabaseServiceClient";
import { DateTime } from "luxon";
import { getCallerAccess, isStaffOfSchool } from "../server/staffAccess";

export async function getSupabaseUser() : Promise<SupabaseUserData | null> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData.user === null) return null;

    return {
        supaId: userData.user.id
    }
}

export async function getUserData() : Promise<UserData | null> {
    const supabaseUserData = await getSupabaseUser();
    if (supabaseUserData === null) return null;

    const supabase = await supabaseServiceClient();

    const { data: userData, error: userDataError } = 
        await supabase.from("user")
            .select("*")
            .eq("supabase_id", supabaseUserData.supaId)
            .single();

    if (userData === null) {
        console.error(userDataError);
        return null;
    }

    return {
        userId: userData.id,
        adminId: userData.admin_id ?? -1
    }

}

export async function getAdminData() : Promise<AdminData | null> {
    const userData = await getUserData();
    if (userData === null) return null;

    const supabase = await supabaseServiceClient();

    const { data : adminData, error: adminError } = await supabase.from("admin")
        .select("*, user(id)")
        .eq("id", userData.adminId)
        .single();
    
    if (adminData === null) {
        console.error(adminError);
        return null;
    }

    const { data: adminSchools, error: adminSchoolsError } = await supabase.from("admin_school_pair")
        .select("school_id")
        .eq("admin_id", adminData.id);

    if (adminSchools === null) {
        console.error(adminSchoolsError);
        return null;
    }

    return {
        userId: userData.userId,
        adminId: adminData.id,
        schools: adminSchools.map((school) => school.school_id)
    }
}

async function loadSchoolTimeframes(
    schoolId: number
): Promise<TimeframeData[] | null> {
    const supabase = await supabaseServiceClient();

    
    const { data: timeframes, error: timeframesError } = await supabase.from("school_timeframes")
        .select("*")
        .eq("school_id", schoolId);

    
    // Test query for specific timeframe ID 7
    const { data: specificTimeframe, error: specificError } = await supabase
        .from("school_timeframes")
        .select("*")
        .eq("school_id", schoolId)
        .eq("id", 7);
    

    if (timeframes === null) {
        console.error(timeframesError);
        return null;
    }

    const mappedTimeframes = timeframes.map((timeframe) => ({
        id: timeframe.id,
        name: timeframe.name,
        startDate: timeframe.starts_at,
        endDate: timeframe.ends_at,
        isActive: timeframe.active
    }));

    // WORKAROUND: Check if we're missing the active timeframe due to RLS filtering
    // If the specific query for ID 7 worked, add it to the results
    if (specificTimeframe && specificTimeframe.length > 0) {
        const activeTimeframe = specificTimeframe[0];
        const isAlreadyIncluded = mappedTimeframes.some(tf => tf.id === activeTimeframe.id);
        
        if (!isAlreadyIncluded) {
            mappedTimeframes.push({
                id: activeTimeframe.id,
                name: activeTimeframe.name,
                startDate: activeTimeframe.starts_at,
                endDate: activeTimeframe.ends_at,
                isActive: activeTimeframe.active
            });
        }
    }

    // Debug logging for timeframes

    return mappedTimeframes;
}

async function loadSelectedOrActiveTimeframe(
    schoolId: number,
    timeframeId: number | null,
): Promise<TimeframeData | null> {
    
    const supabase = await supabaseServiceClient();

    const getTimeframeData = async (query: any) => {
        const { data: timeframeData, error: timeframeDataError } = await query.single();
        
        if (timeframeData === null) {
            console.error(timeframeDataError);
            return null;
        }

        return {
            id: timeframeData.id,
            name: timeframeData.name,
            startDate: timeframeData.starts_at,
            endDate: timeframeData.ends_at,
            isActive: timeframeData.active
        }
    };

    if (timeframeId !== null) {
        return await getTimeframeData(
            supabase.from("school_timeframes")
                .select("*")
                .eq("school_id", schoolId)
                .eq("id", timeframeId)
        );
    } else {
        // First try to get the active timeframe
        const { data: activeTimeframes, error: activeError } = await supabase
            .from("school_timeframes")
            .select("*")
            .eq("school_id", schoolId)
            .eq("active", true)
            .order("id", { ascending: true });

        if (activeError) {
            console.error("Error fetching active timeframes:", activeError);
            return null;
        }

        if (activeTimeframes && activeTimeframes.length > 0) {
            // If multiple active timeframes, use the first one (lowest ID)
            const activeTimeframe = activeTimeframes[0];
            return {
                id: activeTimeframe.id,
                name: activeTimeframe.name,
                startDate: activeTimeframe.starts_at,
                endDate: activeTimeframe.ends_at,
                isActive: activeTimeframe.active
            };
        } else {
            // If no active timeframe, get the most recent one
            const { data: recentTimeframes, error: recentError } = await supabase
                .from("school_timeframes")
                .select("*")
                .eq("school_id", schoolId)
                .order("id", { ascending: false })
                .limit(1);

            if (recentError) {
                console.error("Error fetching recent timeframes:", recentError);
                return null;
            }

            if (recentTimeframes && recentTimeframes.length > 0) {
                const recentTimeframe = recentTimeframes[0];
                return {
                    id: recentTimeframe.id,
                    name: recentTimeframe.name,
                    startDate: recentTimeframe.starts_at,
                    endDate: recentTimeframe.ends_at,
                    isActive: recentTimeframe.active
                };
            }
        }

        return null;
    }
}

async function loadAllTimeframePointEvents(
    schoolId: number,
    timeframeId: number | null,
) : Promise<PointEventData[] | null> {

    const timeframe = await loadSelectedOrActiveTimeframe(schoolId, timeframeId);

    if (timeframe === null) return null;

    const supabase = await supabaseServiceClient();

    const { data: pointEvents, error: pointEventsError } = await supabase.from("point_event")
        .select("*, student_group!inner(id, name, school_id, ranking_group (id)), student_point (student_id, point_value)")
        .eq("student_group.school_id", schoolId)
        .gte("date", timeframe.startDate)
        .lte("date", timeframe.endDate);

    if (pointEvents === null) {
        console.error(pointEventsError);
        return null;
    }

    return pointEvents.map((pointEvent) => ({
        id: pointEvent.id,
        name: pointEvent.name ?? "",
        date: pointEvent.date ?? "",
        maxInput: pointEvent.max_input,
        template: {
            id: pointEvent.template_id,
            pointGroupId: pointEvent.point_group_id ?? -1, // Use point_group_id directly from point_event
        },
        studentGroup: {
            id: pointEvent.student_group?.id ?? -1,
            name: pointEvent.student_group?.name ?? "",
            rankingGroups: pointEvent.student_group?.ranking_group.map((rankingGroup) => rankingGroup.id) ?? []
        },
        studentPoints: pointEvent.student_point.map((studentPoint) => ({
            studentId: studentPoint.student_id,
            input: studentPoint.point_value ?? 0
        })) ?? []
    }));
}

async function loadSchoolStudents(
    schoolId: number,
): Promise<StudentData[] | null> {
    const supabase = await supabaseServiceClient();

    const { data: students, error: studentsError } = await supabase.from("student")
        .select("*")
        .eq("school_id", schoolId);

    if (students === null) {
        console.error(studentsError);
        return null;
    }

    return students.map((student) => ({
        id: student.id,
        schoolId: student.school_id,
        firstName: student.first_name.trim(),
        lastName: student.last_name.trim(),
        grade: student.grade
    }));
}

async function loadStudent(
    studentId: number,
): Promise<StudentData | null> {
    const supabase = await supabaseServiceClient();

    const { data: student, error: studentError } = await supabase.from("student")
        .select("*")
        .eq("id", studentId)
        .single();

    if (student === null) {
        console.error(studentError);
        return null;
    }

    return {
        id: student.id,
        schoolId: student.school_id,
        firstName: student.first_name.trim(),
        lastName: student.last_name.trim(),
        grade: student.grade
    };
}

async function loadSchoolPointGroups(
    schoolId: number,
): Promise<PointGroupData[] | null> {
    const supabase = await supabaseServiceClient();

    const { data: pointGroups, error: pointGroupsError } = await supabase.from("point_group")
        .select("*")
        .eq("school_id", schoolId);

    if (pointGroups === null) {
        console.error(pointGroupsError);
        return null;
    }

    return pointGroups.map((pointGroup) => ({
        id: pointGroup.id,
        name: pointGroup.name,
        color: pointGroup.color
    }));
}

async function loadSchoolStudentGroups(
    schoolId: number
): Promise<StudentGroupData[] | null> {
    const supabase = await supabaseServiceClient();

    const { data: studentGroups, error: studentGroupsError } = await supabase.from("student_group")
        .select("*, student (id)")
        .eq("school_id", schoolId);
    
    if (studentGroups === null) {
        console.error(studentGroupsError);
        return null;
    }


    return studentGroups.map((studentGroup) => ({
        id: studentGroup.id,
        name: studentGroup.name,
        students: studentGroup.student.map((student) => student.id)
    }));
}

async function loadSchoolRankingGroups(
    schoolId: number
): Promise<RankingGroupData[] | null> {
    const supabase = await supabaseServiceClient();

    const { data: rankingGroups, error: rankingGroupsError } = await supabase.from("ranking_group")
        .select("*, school_timeframes (*), student_group (id)")
        .eq("school_id", schoolId);

    if (rankingGroups === null) {
        console.error(rankingGroupsError);
        return null;
    }

    return rankingGroups.map((rankingGroup) => ({
        id: rankingGroup.id,
        name: rankingGroup.name,
        studentGroups: rankingGroup.student_group.map((studentGroup) => studentGroup.id),
        timeframeStart: rankingGroup.school_timeframes?.starts_at ?? null,
        timeframeEnd: rankingGroup.school_timeframes?.ends_at ?? null
    }));
}

async function loadRankingGroupPoints(
    schoolId: number,
    timeframeId: number | null = null,
): Promise<RankingGroupPointEventData[] | null> {
    const supabase = await supabaseServiceClient();

    // 1. Fetch all timeframes for the school
    const { data: timeframesData, error: timeframesError } = await supabase
        .from("school_timeframes")
        .select("id, starts_at, ends_at")
        .eq("school_id", schoolId);

    if (timeframesError || !timeframesData) {
        console.error("Error fetching school timeframes:", timeframesError);
        return null;
    }

    // Create a map for quick timeframe lookup
    const timeframeMap = new Map(timeframesData.map(tf => [tf.id, { startDate: tf.starts_at, endDate: tf.ends_at }]));

    // 2. Fetch all ranking group point events for the school, including the parent ranking group's timeframe_id
    const { data: eventsData, error: eventsError } = await supabase
        .from("ranking_group_point_event")
        .select(`
            id,
            name,
            created_at,
            date, 
            ranking_group_id,
            ranking_group!inner(timeframe_id),
            student_group_point(*)
        `)
        .eq("ranking_group.school_id", schoolId); // Filter by school_id via the joined ranking_group

    if (eventsError || !eventsData) {
        console.error("Error fetching ranking group point events:", eventsError);
        return null;
    }

    // 3. Filter events in JavaScript using the timeframe map
    const filteredEvents: RankingGroupPointEventData[] = [];
    eventsData.forEach((event) => {
        const eventTimeframeId = event.ranking_group?.timeframe_id;
        if (eventTimeframeId === null || eventTimeframeId === undefined) return; // Skip if event has no timeframe linked

        // If a specific timeframe is requested, only include events from that timeframe
        if (timeframeId !== null && eventTimeframeId !== timeframeId) {
            return;
        }

        const timeframe = timeframeMap.get(eventTimeframeId);
        if (!timeframe) return; // Skip if timeframe details not found

        // Check if the event date falls within the linked timeframe
        if (event.date >= timeframe.startDate && event.date <= timeframe.endDate) {
            filteredEvents.push({
                id: event.id,
                name: event.name ?? "",
                date: event.created_at, // Using created_at as before, adjust if event.date is intended
                groupPoints: event.student_group_point.map((studentGroupPoint) => ({
                    groupId: studentGroupPoint.student_group_id,
                    points: studentGroupPoint.value
                }))
            });
        }
    });

    return filteredEvents;
}

// ---------------------------------------------------------------------------
// Authorized entry points.
// Every export of a "use server" file is a POST-able endpoint, and the loaders
// above run on the service-role client (no RLS). The loaders are therefore
// module-private; these wrappers are the only way in, and each one checks the
// session caller against the requested school and fails closed (null).
// ---------------------------------------------------------------------------

export async function getSchoolTimeframes(schoolId: number): Promise<TimeframeData[] | null> {
    if (!(await isStaffOfSchool(schoolId))) return null;
    return loadSchoolTimeframes(schoolId);
}

export async function getSelectedOrActiveTimeframe(
    schoolId: number,
    timeframeId: number | null,
): Promise<TimeframeData | null> {
    if (!(await isStaffOfSchool(schoolId))) return null;
    return loadSelectedOrActiveTimeframe(schoolId, timeframeId);
}

export async function getAllTimeframePointEvents(
    schoolId: number,
    timeframeId: number | null,
): Promise<PointEventData[] | null> {
    if (!(await isStaffOfSchool(schoolId))) return null;
    return loadAllTimeframePointEvents(schoolId, timeframeId);
}

export async function getSchoolStudents(schoolId: number): Promise<StudentData[] | null> {
    if (!(await isStaffOfSchool(schoolId))) return null;
    return loadSchoolStudents(schoolId);
}

/**
 * Staff of the student's school may read any student there. Anyone else may read
 * only their own student record or a child linked to them via user_student_pair.
 */
export async function getStudent(studentId: number): Promise<StudentData | null> {
    if (!Number.isInteger(studentId)) return null;
    const access = await getCallerAccess();
    if (access === null) return null;

    const student = await loadStudent(studentId);
    if (student === null) return null;

    if (access.staffSchoolIds.includes(student.schoolId)) return student;
    if (access.studentId === studentId) return student;

    const supabase = await supabaseServiceClient();
    const { data: pairing } = await supabase.from("user_student_pair")
        .select("student_id")
        .eq("student_id", studentId)
        .eq("user_id", access.userId)
        .maybeSingle();
    return pairing ? student : null;
}

export async function getSchoolPointGroups(schoolId: number): Promise<PointGroupData[] | null> {
    if (!(await isStaffOfSchool(schoolId))) return null;
    return loadSchoolPointGroups(schoolId);
}

export async function getSchoolStudentGroups(schoolId: number): Promise<StudentGroupData[] | null> {
    if (!(await isStaffOfSchool(schoolId))) return null;
    return loadSchoolStudentGroups(schoolId);
}

export async function getSchoolRankingGroups(schoolId: number): Promise<RankingGroupData[] | null> {
    if (!(await isStaffOfSchool(schoolId))) return null;
    return loadSchoolRankingGroups(schoolId);
}

export async function getRankingGroupPoints(
    schoolId: number,
    timeframeId: number | null = null,
): Promise<RankingGroupPointEventData[] | null> {
    if (!(await isStaffOfSchool(schoolId))) return null;
    return loadRankingGroupPoints(schoolId, timeframeId);
}


export async function adminGetGlobalPointStats(
    schoolId: number,
    timeframeId: number | null,
): Promise<GlobalPoints | null> {
    const adminData = await getAdminData();
    if (adminData === null) return null;
    if (adminData.schools.find((school) => school === schoolId) === undefined) return null;

    return await getGlobalPointStats(schoolId, timeframeId);
}

/**
 * ADMIN tier only (adminGetGlobalPointStats, checked against admin_school_pair). Every student of
 * the school, uncut. Never feed a DISPLAY surface from this: dashboards use getDisplayBoards (D20).
 */
async function getGlobalPointStats(
    schoolId: number,
    timeframeId: number | null,
) : Promise<GlobalPoints | null> {

    // --- START: Artificial Delay for Local Testing ---
    // if (process.env.NODE_ENV === 'development') {
    //     const delaySeconds = 15;
    //     console.log(`[DEV ONLY] Simulating ${delaySeconds} second delay in getGlobalPointStats...`);
    //     await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    //     console.log(`[DEV ONLY] Delay finished.`);
    // }
    // --- END: Artificial Delay for Local Testing ---

    const [
        pointData,
        students,
        pointGroups,
        rankingGroupPoints,
        studentGroups,
        rankingGroups,
        schoolTimeframes,
        selectedTimeframe,
    ] = await Promise.all([
        loadAllTimeframePointEvents(schoolId, timeframeId),
        loadSchoolStudents(schoolId),
        loadSchoolPointGroups(schoolId),
        loadRankingGroupPoints(schoolId, timeframeId), // Get ranking group points from selected timeframe
        loadSchoolStudentGroups(schoolId),
        loadSchoolRankingGroups(schoolId),
        loadSchoolTimeframes(schoolId),
        loadSelectedOrActiveTimeframe(schoolId, timeframeId)
    ]);

    // --- Pre-process rankingGroupPoints for efficient lookup --- 
    const groupRawPointsMap = new Map<number, { date: string, points: number }[]>();
    rankingGroupPoints?.forEach(rgpEvent => {
        rgpEvent.groupPoints.forEach(gp => {
            if (!groupRawPointsMap.has(gp.groupId)) {
                groupRawPointsMap.set(gp.groupId, []);
            }
            // Ensure you are pushing the correct event date associated with the points
            groupRawPointsMap.get(gp.groupId)?.push({ date: rgpEvent.date, points: gp.points });
        });
    });

    const getPointsPerStudent = (pointData: PointEventData[], startsAt: string | null, endsAt: string | null): Map<number, CompiledStudentPoints> | null => {
        const startingDate = DateTime.fromISO(startsAt ? startsAt : (selectedTimeframe?.startDate ?? ""))
        const endingDate = DateTime.fromISO(endsAt ? endsAt : (selectedTimeframe?.endDate ?? ""))
        if (!startingDate.isValid || !endingDate.isValid) return null;

        // Use a Map for efficient lookups
        const studentPointsMap = new Map<number, CompiledStudentPoints>();

        pointData
            ?.filter((pointEvent) => {
                // Ensure date filtering happens correctly based on provided start/end or timeframe
                const eventDate = DateTime.fromISO(pointEvent.date);
                return eventDate.isValid && eventDate >= startingDate && eventDate <= endingDate;
            })
            .forEach((pointEvent) => { // Use forEach instead of reduce when modifying a Map
                const eventDateISO = pointEvent.date;
                const isLastMonth = DateTime.fromISO(eventDateISO) <= DateTime.now().minus({ months: 1 });

                pointEvent.studentPoints.forEach((studentPoint) => {
                    // P-3: the stored point_value is the score. No conversion is re-applied here.
                    const pointsEarned = studentPoint.input;

                    let existingStudent = studentPointsMap.get(studentPoint.studentId);

                    if (existingStudent === undefined) {
                        const newStudentData = students?.find((student) => student.id === studentPoint.studentId);
                        if (newStudentData === undefined) return; // Skip if student master data not found

                        existingStudent = {
                            id: studentPoint.studentId,
                            firstName: newStudentData.firstName,
                            lastName: newStudentData.lastName,
                            totalPoints: pointsEarned,
                            lastMonthPoints: isLastMonth ? pointsEarned : 0,
                            grade: newStudentData.grade,
                            pointGroups: pointGroups?.map((pointGroup) => ({
                                id: pointGroup.id,
                                points: pointGroup.id === pointEvent.template.pointGroupId ? pointsEarned : 0,
                                lastMonthPoints: pointGroup.id === pointEvent.template.pointGroupId && isLastMonth ? pointsEarned : 0
                            })) ?? [],
                            totalPointsByDay: new Map<string, number>(), // Use Map for daily totals
                            pointsEarnedEachDay: new Map<string, number>(), // Use Map for daily earned
                            monthToMonthImprovement: 0, // This likely needs recalculation later
                            studentGroups: studentGroups
                                ?.filter(
                                    (studentGroup) => studentGroup.students.find((student) => student === studentPoint.studentId) !== undefined
                                )
                                .map((studentGroup) => studentGroup.id) ?? []
                        };
                        existingStudent.totalPointsByDay.set(eventDateISO, pointsEarned); // Initialize day map
                        existingStudent.pointsEarnedEachDay.set(eventDateISO, pointsEarned);
                        studentPointsMap.set(studentPoint.studentId, existingStudent);

                    } else {
                        existingStudent.totalPoints += pointsEarned;
                        existingStudent.lastMonthPoints += isLastMonth ? pointsEarned : 0;

                        // Update point group points
                        const relevantPointGroup = existingStudent.pointGroups.find(pg => pg.id === pointEvent.template.pointGroupId);
                        if (relevantPointGroup) {
                            relevantPointGroup.points += pointsEarned;
                            if (isLastMonth) {
                                relevantPointGroup.lastMonthPoints += pointsEarned;
                            }
                        }

                        // Update total points by day
                        existingStudent.totalPointsByDay.set(
                            eventDateISO,
                            (existingStudent.totalPointsByDay.get(eventDateISO) || 0) + pointsEarned
                        );

                         // Update points earned each day
                        existingStudent.pointsEarnedEachDay.set(
                            eventDateISO,
                            (existingStudent.pointsEarnedEachDay.get(eventDateISO) || 0) + pointsEarned
                        );

                        // No need to update studentGroups here as they don't change per event
                        studentPointsMap.set(studentPoint.studentId, existingStudent); // Update the map entry
                    }
                });
            });

        return studentPointsMap;
    }

    const pointsPerStudentMap = getPointsPerStudent(pointData ?? [], null, null);

    if (pointsPerStudentMap === null) return null;

    // Convert Map back to Array for sorting/ranking
    const pointsPerStudent = Array.from(pointsPerStudentMap.values());

    // --- Optimizing Rank Calculation --- 

    // 1. Sort Arrays
    const allStudentsRanked = [...pointsPerStudent].sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Check if we should show ranking changes (at least 1 month since first points recorded)
    const firstPointDate = pointData?.reduce((earliest, event) => {
        const eventDate = DateTime.fromISO(event.date);
        return eventDate.isValid && eventDate < earliest ? eventDate : earliest;
    }, DateTime.now()) ?? DateTime.now();
    
    const oneMonthAfterFirstPoints = firstPointDate.plus({ months: 1 });
    const shouldShowRankingChanges = DateTime.now() >= oneMonthAfterFirstPoints;
    
    const allStudentsRankedByLastMonth = shouldShowRankingChanges 
        ? [...pointsPerStudent].sort((a, b) => b.lastMonthPoints - a.lastMonthPoints)
        : []; // Empty array means no last month ranking data

    const allStudentGrades = Array.from(new Set(pointsPerStudent.map(s => s.grade))); // More efficient way to get unique grades

    // Group students by grade for ranking
    const studentsByGrade = new Map<number, CompiledStudentPoints[]>();
    pointsPerStudent.forEach(student => {
        if (!studentsByGrade.has(student.grade)) {
            studentsByGrade.set(student.grade, []);
        }
        studentsByGrade.get(student.grade)?.push(student);
    });


    // Group students by point group for ranking
    const studentsByPointGroup = new Map<number, CompiledStudentPoints[]>();
    pointsPerStudent.forEach(student => {
        student.pointGroups.forEach(pg => {
            if (!studentsByPointGroup.has(pg.id)) {
                studentsByPointGroup.set(pg.id, []);
            }
            // Add a copy of the student relevant for this point group ranking
            studentsByPointGroup.get(pg.id)?.push({
                ...student,
                // We only need points specific to this group for sorting within the group
                totalPoints: pg.points, 
                lastMonthPoints: pg.lastMonthPoints
            });
        });
    });

    // 2. Create Rank Maps
    const overallRankMap = new Map<number, number>();
    allStudentsRanked.forEach((student, index) => overallRankMap.set(student.id, index + 1));

    const lastMonthRankMap = new Map<number, number>();
    if (shouldShowRankingChanges) {
        allStudentsRankedByLastMonth.forEach((student, index) => lastMonthRankMap.set(student.id, index + 1));
    }

    const gradeRankMap = new Map<number, number>();
    const lastMonthGradeRankMap = new Map<number, number>();
    studentsByGrade.forEach((studentsInGrade, grade) => {
        // Sort within grade
        const rankedInGrade = [...studentsInGrade].sort((a, b) => b.totalPoints - a.totalPoints);
        rankedInGrade.forEach((student, index) => gradeRankMap.set(student.id, index + 1));

        // Sort within grade for last month (only if we should show ranking changes)
        if (shouldShowRankingChanges) {
            const rankedLastMonthInGrade = [...studentsInGrade].sort((a, b) => b.lastMonthPoints - a.lastMonthPoints);
            rankedLastMonthInGrade.forEach((student, index) => lastMonthGradeRankMap.set(student.id, index + 1));
        }
    });

    const pointGroupRankMap = new Map<number, Map<number, number>>();
    const lastMonthPointGroupRankMap = new Map<number, Map<number, number>>();
    studentsByPointGroup.forEach((studentsInGroup, pgId) => {
        // Sort within point group
        const rankedInPG = [...studentsInGroup].sort((a, b) => b.totalPoints - a.totalPoints); // Uses the specific group points stored earlier
        const pgRank = new Map<number, number>();
        rankedInPG.forEach((student, index) => pgRank.set(student.id, index + 1));
        pointGroupRankMap.set(pgId, pgRank);

        // Sort within point group for last month (only if we should show ranking changes)
        if (shouldShowRankingChanges) {
            const rankedLastMonthInPG = [...studentsInGroup].sort((a, b) => b.lastMonthPoints - a.lastMonthPoints);
            const pgLastMonthRank = new Map<number, number>();
            rankedLastMonthInPG.forEach((student, index) => pgLastMonthRank.set(student.id, index + 1));
            lastMonthPointGroupRankMap.set(pgId, pgLastMonthRank);
        }
    });

    // --- Student Group Point Calculation (Logic moved to final mapping) ---
    const getStudentGroupPoints = (studentGroup: StudentGroupData | null, startsAt: string | null, endsAt: string | null): any | null => {
        if (!studentGroup) return null;

        // Use the main pointsPerStudentMap for efficiency if timeframes match, otherwise recalculate (potential further optimization here)
        const localPointsMap = (startsAt === null && endsAt === null)
            ? pointsPerStudentMap
            : getPointsPerStudent(pointData ?? [], startsAt, endsAt);

        if (localPointsMap === null) return null; // Handle case where recalculation fails

        // Convert map values to array for reduction/iteration
        const localPointArray = Array.from(localPointsMap.values());

        const totalPoints = localPointArray.reduce((acc, student) => {
            if (!studentGroup.students.includes(student.id)) return acc;
            return acc + student.totalPoints;
        }, 0);

        // Calculate lastMonthTotalPoints accurately based on points earned within the timeframe AND last month
        const lastMonthCutoff = DateTime.now().minus({ months: 1 });
        const timeframeStartDate = DateTime.fromISO(startsAt ?? selectedTimeframe?.startDate ?? "");
        const timeframeEndDate = DateTime.fromISO(endsAt ?? selectedTimeframe?.endDate ?? "");

        let accurateLastMonthTotalPoints = 0;
        if (timeframeStartDate.isValid && timeframeEndDate.isValid) { // Only calculate if timeframe is valid
            localPointArray.forEach(student => {
                if (!studentGroup.students.includes(student.id)) return; // Skip students not in the group

                for (const [dateStr, points] of student.pointsEarnedEachDay.entries()) {
                    const eventDate = DateTime.fromISO(dateStr);
                    // Check if the event date is within the timeframe AND within the last month
                    if (
                        eventDate.isValid &&
                        eventDate <= lastMonthCutoff &&
                        eventDate >= timeframeStartDate &&
                        eventDate <= timeframeEndDate
                    ) {
                        accurateLastMonthTotalPoints += points;
                    }
                }
            });
        }

        // (Keep rawPoints calculations - use pre-processed map)
        const relevantRawPoints = groupRawPointsMap.get(studentGroup.id) ?? [];

        const rawPoints = relevantRawPoints.reduce((acc, rawPointEvent) => {
            const eventDate = DateTime.fromISO(rawPointEvent.date);
            const startDate = DateTime.fromISO(startsAt ?? selectedTimeframe?.startDate ?? "");
            const endDate = DateTime.fromISO(endsAt ?? selectedTimeframe?.endDate ?? "");
            if (eventDate.isValid && startDate.isValid && endDate.isValid && eventDate >= startDate && eventDate <= endDate) {
                return acc + rawPointEvent.points;
            }
            return acc;
        }, 0);

        const lastMonthRawPoints = relevantRawPoints.reduce((acc, rawPointEvent) => {
            const eventDate = DateTime.fromISO(rawPointEvent.date);
            // Adjust date range for last month
            const baseStartDate = DateTime.fromISO(startsAt ?? selectedTimeframe?.startDate ?? "");
            const baseEndDate = DateTime.fromISO(endsAt ?? selectedTimeframe?.endDate ?? "");
            const startDate = baseStartDate.isValid ? baseStartDate.minus({ months: 1 }) : DateTime.invalid("Invalid start date");
            const endDate = baseEndDate.isValid ? baseEndDate.minus({ months: 1 }) : DateTime.invalid("Invalid end date");

            if (eventDate.isValid && startDate.isValid && endDate.isValid && eventDate >= startDate && eventDate <= endDate) {
                 return acc + rawPointEvent.points;
            }
            return acc;
        }, 0);

        return {
            id: studentGroup.id,
            name: studentGroup.name,
            totalStudents: studentGroup.students.length,
            averagePoints: studentGroup.students.length > 0 ? totalPoints / studentGroup.students.length : 0,
            // Use the accurately calculated last month points
            lastMonthAveragePoints: studentGroup.students.length > 0 ? accurateLastMonthTotalPoints / studentGroup.students.length : 0,
            rawPoints: rawPoints ?? 0,
            lastMonthRawPoints: lastMonthRawPoints ?? 0,
            pointGroups: pointGroups?.map((pointGroup) => ({
                id: pointGroup.id,
                points: localPointArray.reduce((acc, student) => {
                    if (!studentGroup.students.includes(student.id)) return acc;
                    // Use the data already calculated (from the potentially recalculated map)
                    const studentData = localPointsMap.get(student.id);
                    if (studentData === undefined) return acc;
                    return acc + (studentData.pointGroups.find((group) => group.id === pointGroup.id)?.points || 0);
                }, 0)
            })) ?? []
        };
    }

    // Create a map for quick lookup of studentGroup objects by ID
    const studentGroupMap = new Map(studentGroups?.map(sg => [sg.id, sg]));

    // --- Calculate top-level student group list (based on selected timeframe) --- 
    const topLevelStudentGroupStats = studentGroups?.map(sg => {
        return getStudentGroupPoints(sg, null, null); // Use selectedTimeframe (null, null)
    }).filter(data => data !== null) ?? [];
    const rankedTopLevelStudentGroups = [...topLevelStudentGroupStats].sort((a, b) => 
        (b.averagePoints + b.rawPoints) - (a.averagePoints + a.rawPoints)
    );

    // --- Filter Ranking Groups: overlap with selected timeframe AND exclude archived (end date in past) ---
    const today = DateTime.now().startOf("day");
    const filteredRankingGroups = rankingGroups?.filter(rg => {
        if (!selectedTimeframe || !rg.timeframeStart || !rg.timeframeEnd) {
            return false;
        }
        const rgStart = DateTime.fromISO(rg.timeframeStart);
        const rgEnd = DateTime.fromISO(rg.timeframeEnd);
        const selStart = DateTime.fromISO(selectedTimeframe.startDate);
        const selEnd = DateTime.fromISO(selectedTimeframe.endDate);

        if (!rgStart.isValid || !rgEnd.isValid || !selStart.isValid || !selEnd.isValid) {
            return false;
        }

        // Exclude ranking groups whose timeframe has ended (archived)
        if (rgEnd < today) return false;

        // Overlap: (StartA <= EndB) and (EndA >= StartB)
        return rgStart <= selEnd && rgEnd >= selStart;
    }) ?? [];

    // --- Pre-process Point Events for Ranks --- 
    const processedPointEventsData = pointData?.map(event => {
        // Calculate points for each student in the event
        const studentsWithPoints = event.studentPoints.map(sp => ({
            id: sp.studentId,
            points: sp.input
        }));

        // Sort students within this event by points
        const sortedStudents = [...studentsWithPoints].sort((a, b) => b.points - a.points);

        // Assign ranks within the event
        const studentsWithRank = sortedStudents.map((student, index, arr) => {
            // Basic rank assignment (handle ties simply by index)
            // More complex tie-breaking could be added if needed
            const rank = index + 1; 
            // Alternative: findIndex on unique scores for dense rank
            // const rank = arr.findIndex(s => s.points === student.points) + 1;
            return {
                ...student,
                rank: rank
            };
        });
        
        // Create a Map for quick student lookup by ID within this event
        const studentRankMap = new Map(studentsWithRank.map(s => [s.id, { points: s.points, rank: s.rank }]));

        return {
            ...event,
            // Replace original studentPoints with processed ones including rank
            studentsWithRank: studentRankMap 
        };
    });

    if (selectedTimeframe === null) {
        return null;
    }

    // --- Final Mapping Logic (Using Rank Maps & Pre-calculated Group/Event Data) --- 
    // Debug logging for timeframes

    return {
        schoolId: schoolId,
        totalStudents: allStudentsRanked.length,
        categoryStudentCounts: {
            grades: Object.fromEntries(Array.from(studentsByGrade.entries()).map(([grade, students]) => [grade, students.length])),
            pointGroups: Object.fromEntries((pointGroups ?? []).map(group => [group.id,
                allStudentsRanked.filter(student => student.pointGroups.some(points => points.id === group.id && points.points > 0)).length
            ])),
        },
        timeframes: schoolTimeframes ?? [],
        grades: allStudentGrades,
        students: allStudentsRanked.map((student) => { // Iterate over the original sorted array
            // Fix last month calculation for Map
            const lastMonthPts = Array.from(student.pointsEarnedEachDay.entries())
                .filter(([date, points]) => DateTime.fromISO(date) <= DateTime.now().minus({ months: 1 }))
                .reduce((acc, [date, points]) => acc + points, 0);

            const currentRank = overallRankMap.get(student.id) ?? 0;
            const currentGradeRank = gradeRankMap.get(student.id) ?? 0;
            
            return {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                rank: currentRank, // Use Map
                lastMonthRank: shouldShowRankingChanges ? (lastMonthRankMap.get(student.id) ?? 0) : currentRank, // Set to current rank if we shouldn't show changes
                totalPoints: student.totalPoints,
                lastMonthPoints: student.lastMonthPoints,
                grade: student.grade,
                gradeRank: currentGradeRank, // Use Map
                lastMonthGradeRank: shouldShowRankingChanges ? (lastMonthGradeRankMap.get(student.id) ?? 0) : currentGradeRank, // Set to current rank if we shouldn't show changes
                pointGroups: student.pointGroups.map((pointGroup) => {
                    const currentPointGroupRank = pointGroupRankMap.get(pointGroup.id)?.get(student.id) ?? 0;
                    return {
                        id: pointGroup.id,
                        points: pointGroup.points,
                        rank: currentPointGroupRank, // Use nested Map
                        lastMonthPoints: pointGroup.lastMonthPoints,
                        lastMonthRank: shouldShowRankingChanges ? (lastMonthPointGroupRankMap.get(pointGroup.id)?.get(student.id) ?? 0) : currentPointGroupRank // Set to current rank if we shouldn't show changes
                    };
                }),
                totalPointsByDay: student.totalPointsByDay, // Keep Map format
                pointsEarnedEachDay: student.pointsEarnedEachDay, // Keep Map format
                monthToMonthChange: student.totalPoints - lastMonthPts,
                studentGroups: student.studentGroups
            }
        }),
        pointGroups: pointGroups ?? [],
        // Use the recalculated and sorted top-level student group data
        studentGroups: rankedTopLevelStudentGroups.map(groupData => ({ 
            id: groupData.id,
            name: groupData.name,
            totalStudents: groupData.totalStudents,
            averagePoints: groupData.averagePoints,
            lastMonthAveragePoints: groupData.lastMonthAveragePoints,
            rawPoints: groupData.rawPoints,
            lastMonthRawPoints: groupData.lastMonthRawPoints,
            pointGroups: groupData.pointGroups
        })),        
        // Map the pre-filtered ranking groups, calculating stats within the loop
        rankingGroups: filteredRankingGroups.map((rankingGroup) => { 
            // Calculate stats for student groups within this specific ranking group's timeframe
            const studentGroupStatsInRG = rankingGroup.studentGroups.map((studentGroupId) => {
                const studentGroupObject = studentGroupMap.get(studentGroupId); // Find the student group object
                // Pass null if studentGroupObject is undefined
                const stats = getStudentGroupPoints(studentGroupObject ?? null, rankingGroup.timeframeStart, rankingGroup.timeframeEnd); // Calculate with RG timeframe
                return {
                    id: studentGroupId,
                    name: stats?.name ?? studentGroupObject?.name ?? "Unknown Group", 
                    totalStudents: stats?.totalStudents ?? 0,
                    averagePoints: stats?.averagePoints ?? 0,
                    lastMonthAveragePoints: stats?.lastMonthAveragePoints ?? 0, 
                    rawPoints: stats?.rawPoints ?? 0,
                    lastMonthRawPoints: stats?.lastMonthRawPoints ?? 0, 
                    pointGroups: stats?.pointGroups ?? []
                };
            });

            return {
                id: rankingGroup.id,
                name: rankingGroup.name,
                studentGroups: studentGroupStatsInRG // Use the calculated stats
            }
        }).filter(rg => rg.studentGroups.some(sg => (sg.averagePoints + sg.rawPoints) > 0)), // Keep the filter for empty groups
        
        // Use pre-processed point event data
        pointEvents: processedPointEventsData?.map((event) => ({
            id: event.id,
            name: event.name,
            maxPoints: event.maxInput,
            date: event.date,
            studentGroupId: event.studentGroup.id,
            pointGroup: event.template.pointGroupId,
            // Map student IDs to their pre-calculated points and ranks for this event
            students: Array.from(event.studentsWithRank.entries()).map(([studentId, data]) => ({
                id: studentId,
                points: data.points,
                rank: data.rank
            }))
        })) ?? []
    }
}
