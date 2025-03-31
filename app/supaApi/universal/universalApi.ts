"use server";
import { createClient } from "@/utils/supabase/server";
import { AdminData, CompiledStudentPoints, GlobalPoints, PointEventData, PointGroupData, RankingGroupData, RankingGroupPointEventData, StudentData, StudentGroupData, StudentPointsData, SupabaseUserData, TimeframeData, UserData } from "./utils/types";
import supabaseServiceClient from "../server/supabaseServiceClient";
import { DateTime } from "luxon";
import { getOwnStudentData } from "../server/student/studentApi";

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

export async function getSchoolTimeframes(
    schoolId: number
): Promise<TimeframeData[] | null> {
    const supabase = await supabaseServiceClient();

    const { data: timeframes, error: timeframesError } = await supabase.from("school_timeframes")
        .select("*")
        .eq("school_id", schoolId);

    if (timeframes === null) {
        console.error(timeframesError);
        return null;
    }

    return timeframes.map((timeframe) => ({
        id: timeframe.id,
        name: timeframe.name,
        startDate: timeframe.starts_at,
        endDate: timeframe.ends_at,
        isActive: timeframe.active
    }));
}

export async function getSelectedOrActiveTimeframe(
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
        return await getTimeframeData(
            supabase.from("school_timeframes")
                .select("*")
                .eq("school_id", schoolId)
                .eq("active", true)
        );
    }
}

export async function getAllTimeframePointEvents(
    schoolId: number,
    timeframeId: number | null,
) : Promise<PointEventData[] | null> {

    const timeframe = await getSelectedOrActiveTimeframe(schoolId, timeframeId);

    if (timeframe === null) return null;

    const supabase = await supabaseServiceClient();

    const { data: pointEvents, error: pointEventsError } = await supabase.from("point_event")
        .select("*, student_group(id, name, school_id, ranking_group (id)), point_template (point_group_id, point_conversion_rule_type (*), conversion_rule_value), student_point (student_id, input_score)")
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
            pointGroupId: pointEvent.point_template?.point_group_id ?? -1,
            conversionRule: {
                name: pointEvent.point_template?.point_conversion_rule_type?.name ?? "",
                value: pointEvent.point_template?.conversion_rule_value ?? 0
            }
        },
        studentGroup: {
            id: pointEvent.student_group?.id ?? -1,
            name: pointEvent.student_group?.name ?? "",
            rankingGroups: pointEvent.student_group?.ranking_group.map((rankingGroup) => rankingGroup.id) ?? []
        },
        studentPoints: pointEvent.student_point.map((studentPoint) => ({
            studentId: studentPoint.student_id,
            input: studentPoint.input_score ?? 0
        })) ?? []
    }));
}

export async function getSchoolStudents(
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

export async function getStudent(
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

export async function getSchoolPointGroups(
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

export async function getSchoolStudentGroups(
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

export async function getSchoolRankingGroups(
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

export async function getRankingGroupPoints(
    schoolId: number,
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
        const timeframeId = event.ranking_group?.timeframe_id;
        if (timeframeId === null || timeframeId === undefined) return; // Skip if event has no timeframe linked

        const timeframe = timeframeMap.get(timeframeId);
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

enum PointConversionRuleType {
    ADD = 'add',
    SUBTRACT = 'subtract',
    MULTIPLY = 'multiply',
    DIVIDE = 'divide',
    FORMULA = 'formula',
    DIRECT = 'direct'
}

function calculatePoints(
    ruleName: string,
    input: number,
    ruleValue: number,
) : number {
    const convertPointUsingRuleType = (
            ruleType: PointConversionRuleType,
            value: number,
            input: number,
            formula: string | null = null
    ): number => {
            switch (ruleType) {
                    case PointConversionRuleType.ADD:
                            return Number(input) + Number(value);
                    case PointConversionRuleType.SUBTRACT:
                            return Number(input) - Number(value);
                    case PointConversionRuleType.MULTIPLY:
                            return Number(input) * Number(value);
                    case PointConversionRuleType.DIVIDE:
                            return Number(input) / Number(value);
                    case PointConversionRuleType.FORMULA:
                            if (!formula) return input;
                            return eval(formula);
                    case PointConversionRuleType.DIRECT:
                            return input;
            }
    }

    const stringToRuleType = (ruleType: string): PointConversionRuleType => {
            switch (ruleType.toLowerCase()) {
                    case 'add':
                            return PointConversionRuleType.ADD;
                    case 'subtract':
                            return PointConversionRuleType.SUBTRACT;
                    case 'multiply':
                            return PointConversionRuleType.MULTIPLY;
                    case 'divide':
                            return PointConversionRuleType.DIVIDE;
                    case 'formula':
                            return PointConversionRuleType.FORMULA;
                    case 'direct':
                            return PointConversionRuleType.DIRECT;
                    default:
                            return PointConversionRuleType.DIRECT;
            }
    }

    return convertPointUsingRuleType(
        stringToRuleType(ruleName),
        ruleValue,
        input
    )
}

export async function adminGetGlobalPointStats(
    schoolId: number,
    timeframeId: number | null,
): Promise<GlobalPoints | null> {
    const adminData = await getAdminData();
    if (adminData === null) return null;
    if (adminData.schools.find((school) => school === schoolId) === undefined) return null;

    return await getGlobalPointStats(schoolId, timeframeId, null, null, null);
}

export async function featuredDashGetGlobalStats(
    schoolId: number,
    timeframeId: number | null,
): Promise<GlobalPoints | null> {
    return await getGlobalPointStats(schoolId, timeframeId, 20, 5, 0.33);
}

async function getGlobalPointStats(
    schoolId: number,
    timeframeId: number | null,
    numStudentsOverall: number | null,
    numStudentsPerPointGroup: number | null,
    ratioStudentsPerGrade: number | null,
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
        getAllTimeframePointEvents(schoolId, timeframeId),
        getSchoolStudents(schoolId),
        getSchoolPointGroups(schoolId),
        getRankingGroupPoints(schoolId),
        getSchoolStudentGroups(schoolId),
        getSchoolRankingGroups(schoolId),
        getSchoolTimeframes(schoolId),
        getSelectedOrActiveTimeframe(schoolId, timeframeId)
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
                    const pointsEarned = calculatePoints(
                        pointEvent.template.conversionRule.name,
                        studentPoint.input,
                        pointEvent.template.conversionRule.value
                    );

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
    const allStudentsRankedByLastMonth = [...pointsPerStudent].sort((a, b) => b.lastMonthPoints - a.lastMonthPoints);

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
    allStudentsRankedByLastMonth.forEach((student, index) => lastMonthRankMap.set(student.id, index + 1));

    const gradeRankMap = new Map<number, number>();
    const lastMonthGradeRankMap = new Map<number, number>();
    studentsByGrade.forEach((studentsInGrade, grade) => {
        // Sort within grade
        const rankedInGrade = [...studentsInGrade].sort((a, b) => b.totalPoints - a.totalPoints);
        rankedInGrade.forEach((student, index) => gradeRankMap.set(student.id, index + 1));

        // Sort within grade for last month
        const rankedLastMonthInGrade = [...studentsInGrade].sort((a, b) => b.lastMonthPoints - a.lastMonthPoints);
        rankedLastMonthInGrade.forEach((student, index) => lastMonthGradeRankMap.set(student.id, index + 1));
    });

    const pointGroupRankMap = new Map<number, Map<number, number>>();
    const lastMonthPointGroupRankMap = new Map<number, Map<number, number>>();
    studentsByPointGroup.forEach((studentsInGroup, pgId) => {
        // Sort within point group
        const rankedInPG = [...studentsInGroup].sort((a, b) => b.totalPoints - a.totalPoints); // Uses the specific group points stored earlier
        const pgRank = new Map<number, number>();
        rankedInPG.forEach((student, index) => pgRank.set(student.id, index + 1));
        pointGroupRankMap.set(pgId, pgRank);

        // Sort within point group for last month
        const rankedLastMonthInPG = [...studentsInGroup].sort((a, b) => b.lastMonthPoints - a.lastMonthPoints);
        const pgLastMonthRank = new Map<number, number>();
        rankedLastMonthInPG.forEach((student, index) => pgLastMonthRank.set(student.id, index + 1));
        lastMonthPointGroupRankMap.set(pgId, pgLastMonthRank);
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

    // --- Filter Ranking Groups based on Timeframe Overlap --- 
    const filteredRankingGroups = rankingGroups?.filter(rg => {
        // --- Start Debug Logging ---
        console.log(`\nChecking RG: ${rg.id} (${rg.name})`);
        console.log(`  RG Timeframe: ${rg.timeframeStart} to ${rg.timeframeEnd}`);
        console.log(`  Selected Timeframe: ${selectedTimeframe?.startDate} to ${selectedTimeframe?.endDate}`);
        // --- End Debug Logging ---

        if (!selectedTimeframe || !rg.timeframeStart || !rg.timeframeEnd) {
            console.log(`  Result: Filtering out due to missing timeframe info.`);
            return false; // Exclude if timeframes are missing
        }
        const rgStart = DateTime.fromISO(rg.timeframeStart);
        const rgEnd = DateTime.fromISO(rg.timeframeEnd);
        const selStart = DateTime.fromISO(selectedTimeframe.startDate);
        const selEnd = DateTime.fromISO(selectedTimeframe.endDate);

        // --- Start Debug Logging ---
        console.log(`  Parsed RG Start: ${rgStart.toISO()}, Valid: ${rgStart.isValid}`);
        console.log(`  Parsed RG End: ${rgEnd.toISO()}, Valid: ${rgEnd.isValid}`);
        console.log(`  Parsed Sel Start: ${selStart.toISO()}, Valid: ${selStart.isValid}`);
        console.log(`  Parsed Sel End: ${selEnd.toISO()}, Valid: ${selEnd.isValid}`);
        // --- End Debug Logging ---

        if (!rgStart.isValid || !rgEnd.isValid || !selStart.isValid || !selEnd.isValid) {
            console.log(`  Result: Filtering out due to invalid date parsing.`);
            return false; // Exclude if dates are invalid
        }

        // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
        const overlapCondition = rgStart <= selEnd && rgEnd >= selStart;
        // --- Start Debug Logging ---
        console.log(`  Overlap Condition (rgStart <= selEnd && rgEnd >= selStart): ${overlapCondition}`);
        // --- End Debug Logging ---
        return overlapCondition;
    }) ?? []; // Default to empty array if rankingGroups is null/undefined

    // --- Pre-process Point Events for Ranks --- 
    const processedPointEventsData = pointData?.map(event => {
        // Calculate points for each student in the event
        const studentsWithPoints = event.studentPoints.map(sp => ({
            id: sp.studentId,
            points: calculatePoints(
                event.template.conversionRule.name,
                sp.input,
                event.template.conversionRule.value
            )
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

    if (selectedTimeframe === null) return null;

    // --- Final Mapping Logic (Using Rank Maps & Pre-calculated Group/Event Data) --- 
    return {
        schoolId: schoolId,
        totalStudents: allStudentsRanked.length,
        timeframes: schoolTimeframes ?? [],
        grades: allStudentGrades,
        students: allStudentsRanked.map((student) => { // Iterate over the original sorted array
            // Fix last month calculation for Map
            const lastMonthPts = Array.from(student.pointsEarnedEachDay.entries())
                .filter(([date, points]) => DateTime.fromISO(date) <= DateTime.now().minus({ months: 1 }))
                .reduce((acc, [date, points]) => acc + points, 0);

            return {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                rank: overallRankMap.get(student.id) ?? 0, // Use Map
                lastMonthRank: lastMonthRankMap.get(student.id) ?? 0, // Use Map
                totalPoints: student.totalPoints,
                lastMonthPoints: student.lastMonthPoints,
                grade: student.grade,
                gradeRank: gradeRankMap.get(student.id) ?? 0, // Use Map
                lastMonthGradeRank: lastMonthGradeRankMap.get(student.id) ?? 0, // Use Map
                pointGroups: student.pointGroups.map((pointGroup) => ({
                    id: pointGroup.id,
                    points: pointGroup.points,
                    rank: pointGroupRankMap.get(pointGroup.id)?.get(student.id) ?? 0, // Use nested Map
                    lastMonthPoints: pointGroup.lastMonthPoints,
                    lastMonthRank: lastMonthPointGroupRankMap.get(pointGroup.id)?.get(student.id) ?? 0 // Use nested Map
                })),
                totalPointsByDay: student.totalPointsByDay, // Keep Map format
                pointsEarnedEachDay: student.pointsEarnedEachDay, // Keep Map format
                monthToMonthChange: student.totalPoints - lastMonthPts,
                studentGroups: student.studentGroups
            }
        }).filter((student) => {
            // This is a privacy filter so that people who are not admins
            // can't see the full list of students beyond the best
            if (
                numStudentsOverall === null ||
                ratioStudentsPerGrade === null ||
                numStudentsPerPointGroup === null
            ) return true;
            // Use the studentsByGrade map for grade count - UPDATED
            const gradeStudentCount = studentsByGrade.get(student.grade)?.length ?? 1; 
            const studentWithinGradeRatio = student.gradeRank / gradeStudentCount < ratioStudentsPerGrade;
            const studentWithinOverall = student.rank <= numStudentsOverall;
            const studentWithinPointGroup = 
                student.pointGroups.find((pointGroup) => {
                    const rank = pointGroupRankMap.get(pointGroup.id)?.get(student.id) ?? -1;
                    return rank <= numStudentsPerPointGroup;
                }) !== undefined;
            return studentWithinGradeRatio || studentWithinOverall || studentWithinPointGroup;
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
            // Recalculate maxPoints (could also be pre-calculated if needed)
            maxPoints: calculatePoints(
                event.template.conversionRule.name,
                event.maxInput,
                event.template.conversionRule.value
            ),
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

const NEARBY_STUDENT_COUNT = 2;
export async function getStudentPointStats(
    studentId: number | null,
    timeframeId: number | null,
) : Promise<StudentPointsData | null> {
    let verifiedStudentId = studentId;
    
    if (verifiedStudentId === null) {
        let studentData = await getOwnStudentData()
        if (studentData === null) return null;
        verifiedStudentId = studentData.id;
    } else {
        const adminData = await getAdminData();
        if (adminData === null) return null;
        const baseStudentData = await getStudent(verifiedStudentId);
        if (baseStudentData === null) return null;
        if (adminData.schools.find((school) => school === baseStudentData.schoolId) === undefined) return null;
    }

    const baseStudentData = await getStudent(verifiedStudentId);
    if (baseStudentData === null) return null;

    const globalStats = await getGlobalPointStats(baseStudentData.schoolId, timeframeId, null, null, null);
    if (globalStats === null) return null;

    const studentIndex = globalStats.students.findIndex((student) => student.id === verifiedStudentId);
    if (studentIndex === undefined) return null;
    const studentData = globalStats.students[studentIndex];

    const nearbyStudents =
        globalStats.students.slice(Math.max(studentIndex - NEARBY_STUDENT_COUNT, 0), Math.min(studentIndex + NEARBY_STUDENT_COUNT, globalStats.students.length));

    const studentsFilteredByGrade = globalStats.students.filter((student) => student.grade === studentData.grade);
    const studentGradeIndex = studentsFilteredByGrade.findIndex((student) => student.id === verifiedStudentId);
    const nearbyGradeStudents = studentsFilteredByGrade.slice(Math.max(studentGradeIndex - NEARBY_STUDENT_COUNT, 0), Math.min(studentGradeIndex + NEARBY_STUDENT_COUNT, studentsFilteredByGrade.length));
    
    const pointGroupData = globalStats.pointGroups.map((pointGroup) => {
        const studentsSortedByPointGroupPoints = globalStats.students.sort((a, b) => {
            const aPoints = a.pointGroups.find((group) => group.id === pointGroup.id)?.points ?? 0;
            const bPoints = b.pointGroups.find((group) => group.id === pointGroup.id)?.points ?? 0;
            return bPoints - aPoints;
        })
        const idx = studentsSortedByPointGroupPoints.findIndex((student) => student.id === verifiedStudentId);
        const nearbyStudentsData = studentsSortedByPointGroupPoints.slice(Math.max(idx - NEARBY_STUDENT_COUNT, 0), Math.min(idx + NEARBY_STUDENT_COUNT, studentsSortedByPointGroupPoints.length));
        return {
            id: pointGroup.id,
            name: pointGroup.name,
            color: pointGroup.color,
            points: studentData.pointGroups.find((group) => group.id === pointGroup.id)?.points ?? 0,
            rank: idx + 1,
            outOf: globalStats.students.length,
            nearbyStudents: nearbyStudentsData.map((student) => ({
                studentId: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                points: student.pointGroups.find((group) => group.id === pointGroup.id)?.points ?? 0,
                rank: studentsSortedByPointGroupPoints.findIndex((sortedStudent) => sortedStudent.id === student.id) + 1
            }))
        }
    })

    const studentGroupData = globalStats.studentGroups.map((studentGroup) => {
        const studentsSortedByStudentGroupPoints = globalStats.students
            .filter((student) => student.studentGroups.find((group) => group === studentGroup.id) !== undefined)
            .sort((a, b) => {
                return b.totalPoints - a.totalPoints;
            })
        const idx = studentsSortedByStudentGroupPoints.findIndex((student) => student.id === verifiedStudentId);
        if (idx !== -1) {
            const nearbyStudentsData = studentsSortedByStudentGroupPoints.slice(Math.max(idx - NEARBY_STUDENT_COUNT, 0), Math.min(idx + NEARBY_STUDENT_COUNT, studentsSortedByStudentGroupPoints.length));
            return {
                id: studentGroup.id,
                name: studentGroup.name,
                rank: idx + 1,
                outOf: studentsSortedByStudentGroupPoints.length,
                nearbyStudents: nearbyStudentsData.map((student) => ({
                    studentId: student.id,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    points: student.totalPoints,
                    rank: studentsSortedByStudentGroupPoints.findIndex((sortedStudent) => sortedStudent.id === student.id) + 1
                }))
            }
        }
    }).filter((studentGroup) => studentGroup !== undefined)


    const pointEventsData = globalStats.pointEvents.filter((pointEvent) => {
        return studentData.studentGroups.find((group) => group === pointEvent.studentGroupId) !== undefined;
    }).map((pointEvent) => {
        const studentListCopy = pointEvent.students.map((student) => ({ ...student }));
        const sortedStudents = studentListCopy
            .sort((a, b) => b.points - a.points)
        const idx = sortedStudents.findIndex((student) => student.id === verifiedStudentId);
        const rank = sortedStudents
            .filter((student) => student.points !== studentListCopy[idx].points || student.id === verifiedStudentId)
            .findIndex((student) => student.id === verifiedStudentId) + 1;
        return {
            id: pointEvent.id,
            name: pointEvent.name,
            maxPoints: pointEvent.maxPoints,
            date: pointEvent.date,
            rank: rank === 0 ? pointEvent.students.length : rank,
            outOf: pointEvent.students.length,
            points: studentListCopy[idx].points,
            pointGroup: {
                id: pointEvent.pointGroup,
                name: globalStats.pointGroups.find((group) => group.id === pointEvent.pointGroup)?.name ?? "",
                color: globalStats.pointGroups.find((group) => group.id === pointEvent.pointGroup)?.color ?? ""
            }
        }
    });

    return {
        schoolId: baseStudentData.schoolId,
        studentId: baseStudentData.id,
        firstName: baseStudentData.firstName,
        lastName: baseStudentData.lastName,
        grade: baseStudentData.grade,
        gradeRank: studentData.gradeRank,
        gradeOutOf: globalStats.students.filter((student) => student.grade === baseStudentData.grade).length,
        totalPoints: studentData.totalPoints,
        totalRank: studentData.rank,
        totalOutOf: globalStats.totalStudents,
        nearbyStudents: nearbyStudents.map((student) => ({
            studentId: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            totalPoints: student.totalPoints,
            rank: student.rank
        })),
        nearbyGradeStudents: nearbyGradeStudents.map((student) => ({
            studentId: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            points: student.totalPoints,
            rank: student.gradeRank
        })),
        pointGroups: pointGroupData,
        studentGroups: studentGroupData,
        pointEvents: pointEventsData
    }
}