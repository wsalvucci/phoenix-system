"use server";
import { createClient } from "@/utils/supabase/server";
import { AdminData, GlobalPoints, PointEventData, PointGroupData, RankingGroupData, RankingGroupPointEventData, StudentData, StudentGroupData, StudentPointsData, SupabaseUserData, TimeframeData, UserData } from "./utils/types";
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
        .select("*, student_group (id)")
        .eq("school_id", schoolId);

    if (rankingGroups === null) {
        console.error(rankingGroupsError);
        return null;
    }

    return rankingGroups.map((rankingGroup) => ({
        id: rankingGroup.id,
        name: rankingGroup.name,
        studentGroups: rankingGroup.student_group.map((studentGroup) => studentGroup.id)
    }));
}

export async function getRankingGroupPoints(
    schoolId: number,
    timeframeId: number | null,
) : Promise<RankingGroupPointEventData[] | null> {
    const supabase = await supabaseServiceClient();

    const timeframe = await getSelectedOrActiveTimeframe(schoolId, timeframeId);

    if (timeframe === null) return null

    const { data: pointGroups, error: pointGroupsError } = await supabase.from("ranking_group")
        .select("*, ranking_group_point_event (*, student_group_point (*))")
        .eq("school_id", schoolId)
        .gte("ranking_group_point_event.date", timeframe.startDate)
        .lte("ranking_group_point_event.date", timeframe.endDate);
    
    if (pointGroups === null) {
        console.error(pointGroupsError);
        return null;
    }

    return pointGroups.reduce((acc, rankingGroup) => {
        rankingGroup.ranking_group_point_event.forEach((pointEvent) => {
            acc.push({
                id: pointEvent.id,
                name: pointEvent.name ?? "",
                date: pointEvent.created_at,
                groupPoints: pointEvent.student_group_point.map((studentGroupPoint) => ({
                    groupId: studentGroupPoint.student_group_id,
                    points: studentGroupPoint.value
                }))
            })
        })
        return acc
    }, [] as RankingGroupPointEventData[]);
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
        getRankingGroupPoints(schoolId, timeframeId),
        getSchoolStudentGroups(schoolId),
        getSchoolRankingGroups(schoolId),
        getSchoolTimeframes(schoolId),
        getSelectedOrActiveTimeframe(schoolId, timeframeId)
    ]);

    const pointsPerStudent = pointData?.reduce((acc, pointEvent) => {
        pointEvent.studentPoints.forEach((studentPoint) => {
            const existingStudent = acc.find((student) => student.id === studentPoint.studentId);
            const pointsEarned = calculatePoints(
                pointEvent.template.conversionRule.name,
                studentPoint.input,
                pointEvent.template.conversionRule.value
            )

            if (existingStudent === undefined) {
                const newStudentData = students?.find((student) => student.id === studentPoint.studentId);
                if (newStudentData === undefined) return acc;
                acc.push({
                    id: studentPoint.studentId,
                    firstName: newStudentData.firstName,
                    lastName: newStudentData.lastName,
                    totalPoints: pointsEarned,
                    lastMonthPoints: pointEvent.date <= DateTime.now().minus({ months: 1 }).toISO() ? pointsEarned : 0,
                    grade: newStudentData.grade,
                    pointGroups: pointGroups?.map((pointGroup) => ({
                        id: pointGroup.id,
                        points: pointGroup.id === pointEvent.template.pointGroupId ? pointsEarned : 0
                    })) ?? [],
                    totalPointsByDay: [{
                        date: pointEvent.date,
                        points: pointsEarned
                    }],
                    pointsEarnedEachDay: [{
                        date: pointEvent.date,
                        points: pointsEarned
                    }],
                    monthToMonthImprovement: 0,
                    studentGroups: studentGroups
                        ?.filter(
                            (studentGroup) => studentGroup.students.find((student) => student === studentPoint.studentId) !== undefined
                        )
                        .map((studentGroup) => studentGroup.id) ?? []
                });
            } else {
                existingStudent.totalPoints += pointsEarned;
                existingStudent.lastMonthPoints += pointEvent.date <= DateTime.now().minus({ months: 1 }).toISO() ? pointsEarned : 0;
                existingStudent.pointGroups.forEach((pointGroup) => {
                    if (pointGroup.id === pointEvent.template.pointGroupId) {
                        pointGroup.points += pointsEarned;
                    }
                });
                const existingDay = existingStudent.totalPointsByDay.find((day) => day.date === pointEvent.date);
                if (existingDay === undefined) {
                    existingStudent.totalPointsByDay.push({
                        date: pointEvent.date,
                        points: existingStudent.totalPoints + pointsEarned
                    });
                } else {
                    existingDay.points += pointsEarned;
                }
                const existingDayEarned = existingStudent.pointsEarnedEachDay.find((day) => day.date === pointEvent.date);
                if (existingDayEarned === undefined) {
                    existingStudent.pointsEarnedEachDay.push({
                        date: pointEvent.date,
                        points: pointsEarned
                    });
                } else {
                    existingDayEarned.points += pointsEarned;
                }
            }
        })

        return acc;
    }, [] as {
        id: number,
        firstName: string,
        lastName: string,
        totalPoints: number,
        lastMonthPoints: number,
        grade: number,
        pointGroups: {
            id: number,
            points: number
        }[],
        totalPointsByDay: {
            date: string,
            points: number
        }[],
        pointsEarnedEachDay: {
            date: string,
            points: number
        }[],
        monthToMonthImprovement: number,
        studentGroups: number[]
    }[]);

    if (pointsPerStudent === undefined) return null;

    const allStudentsRanked = pointsPerStudent.sort((a, b) => b.totalPoints - a.totalPoints);
    const copyOfAllStudentsRanked = allStudentsRanked.map((student) => ({ ...student }));

    const allStudentsRankedByLastMonth = copyOfAllStudentsRanked
        .sort((a, b) => b.lastMonthPoints - a.lastMonthPoints);

    const allStudentGrades = allStudentsRanked.reduce((acc, student) => {
        if (acc.find((grade) => grade === student.grade) === undefined) {
            acc.push(student.grade);
        }
        return acc;
    }, [] as number[]);

    const allStudentsRankedByGrade = allStudentsRanked.reduce((acc, student) => {
        const existingGrade = acc.find((grade) => grade.grade === student.grade);
        const data = {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            totalPoints: student.totalPoints
        }
        if (existingGrade === undefined) {
            acc.push({
                grade: student.grade,
                students: [data]
            });
        } else {
            existingGrade.students.push(data);
        }
        return acc;
    }, [] as {
        grade: number,
        students: {
            id: number,
            firstName: string,
            lastName: string,
            totalPoints: number,
        }[]
    }[]);
    
    allStudentsRankedByGrade.forEach((grade) => {
        grade.students.sort((a, b) => b.totalPoints - a.totalPoints);
    })

    const allStudentsRankedByStudentGroup = allStudentsRanked.reduce((acc, student) => {
        student.studentGroups.forEach((studentGroup) => {
            const existingGroup = acc.find((group) => group.id === studentGroup);
            const data = {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                totalPoints: student.totalPoints
            }
            if (existingGroup === undefined) {
                acc.push({
                    id: studentGroup,
                    students: [data]
                });
            } else {
                existingGroup.students.push(data);
            }
        });
        return acc;
    }, [] as {
        id: number,
        students: {
            id: number,
            firstName: string,
            lastName: string,
            totalPoints: number,
        }[]
    }[])
    
    allStudentsRankedByStudentGroup.forEach((group) => {
        group.students.sort((a, b) => b.totalPoints - a.totalPoints);
    });

    const allStudentsRankedByPointGroup = allStudentsRanked.reduce((acc, student) => {
        student.pointGroups.forEach((pointGroup) => {
            const existingGroup = acc.find((group) => group.id === pointGroup.id);
            const data = {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                totalPoints: student.totalPoints
            }
            if (existingGroup === undefined) {
                acc.push({
                    id: pointGroup.id,
                    students: [data]
                });
            } else {
                existingGroup.students.push(data);
            }
        });
        return acc;
    }, [] as {
        id: number,
        students: {
            id: number,
            firstName: string,
            lastName: string,
            totalPoints: number,
        }[]
    }[])
    
    allStudentsRankedByPointGroup.forEach((group) => {
        group.students.sort((a, b) => b.totalPoints - a.totalPoints);
    });

    const allStudentGroupsRanked = studentGroups?.map((studentGroup) => {
        const totalPoints = allStudentsRanked.reduce((acc, student) => {
            if (studentGroup.students.find((groupStudent) => groupStudent === student.id) === undefined) return acc;
            return acc + student.totalPoints;
        }, 0);
        const rawPoints = rankingGroupPoints?.reduce((acc, rankingGroup) => {
            const groupPoints = rankingGroup.groupPoints.find((groupPoint) => groupPoint.groupId === studentGroup.id);
            if (groupPoints === undefined) return acc;
            return acc + groupPoints.points;
        }, 0);

        return {
            id: studentGroup.id,
            name: studentGroup.name,
            totalStudents: studentGroup.students.length,
            averagePoints: totalPoints / studentGroup.students.length,
            rawPoints: rawPoints ?? 0,
            pointGroups: pointGroups?.map((pointGroup) => ({
                id: pointGroup.id,
                points: studentGroup.students.reduce((acc, student) => {
                    const studentData = allStudentsRanked.find((rankedStudent) => rankedStudent.id === student);
                    if (studentData === undefined) return acc;
                    return acc + (studentData.pointGroups.find((group) => group.id === pointGroup.id)?.points || 0);
                }, 0)
            })) ?? []
        };
    }).sort((a, b) => (b.averagePoints + b.rawPoints) - (a.averagePoints + a.rawPoints));

    if (selectedTimeframe === null) return null;

    return {
        schoolId: schoolId,
        totalStudents: allStudentsRanked.length,
        timeframes: schoolTimeframes ?? [],
        grades: allStudentGrades,
        students: allStudentsRanked.map((student, index) => {
            const lastMonthPts = student.pointsEarnedEachDay.filter((day) =>
                DateTime.now().minus({ months: 1 }) >= DateTime.fromISO(day.date)
            ).reduce((acc, day) => acc + day.points, 0)
            return {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                rank: index + 1,
                lastMonthRank: (allStudentsRankedByLastMonth.findIndex((lastMonthStudent) => lastMonthStudent.id === student.id) ?? -1) + 1,
                totalPoints: student.totalPoints,
                grade: student.grade,
                gradeRank: (allStudentsRankedByGrade.find((grade) => grade.grade === student.grade)?.students.findIndex((gradeStudent) => gradeStudent.id === student.id) ?? -1) + 1,
                pointGroups: student.pointGroups,
                totalPointsByDay: student.totalPointsByDay,
                pointsEarnedEachDay: student.pointsEarnedEachDay,
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
            const studentWithinGradeRatio = student.gradeRank / (allStudentsRankedByGrade.find((grade) => grade.grade === student.grade)?.students.length ?? 1) < ratioStudentsPerGrade
            const studentWithinOverall = student.rank <= numStudentsOverall;
            const studentWithinPointGroup = 
                student.pointGroups.find((pointGroup) => {
                    const rank = allStudentsRankedByPointGroup.find((group) => group.id === pointGroup.id)?.students.findIndex((groupStudent) => groupStudent.id === student.id) ?? -1;
                    return rank <= numStudentsPerPointGroup;
                }) !== undefined;
            return studentWithinGradeRatio || studentWithinOverall || studentWithinPointGroup;
        }),
        pointGroups: pointGroups ?? [],
        studentGroups: allStudentGroupsRanked?.map((studentGroup) => ({
            id: studentGroup.id,
            name: studentGroup.name,
            totalStudents: studentGroup.totalStudents,
            averagePoints: studentGroup.averagePoints,
            rawPoints: studentGroup.rawPoints,
            pointGroups: studentGroup.pointGroups
        })) ?? [],
        rankingGroups: rankingGroups?.map((rankingGroup) => ({
            id: rankingGroup.id,
            name: rankingGroup.name,
            studentGroups: rankingGroup.studentGroups
        })) ?? [],
        pointEvents: pointData?.map((pointEvent) => ({
            id: pointEvent.id,
            name: pointEvent.name,
            maxPoints: calculatePoints(
                pointEvent.template.conversionRule.name,
                pointEvent.maxInput,
                pointEvent.template.conversionRule.value
            ),
            date: pointEvent.date,
            studentGroupId: pointEvent.studentGroup.id,
            pointGroup: pointEvent.template.pointGroupId,
            students: pointEvent.studentPoints.map((studentPoint) => ({
                id: studentPoint.studentId,
                points: calculatePoints(
                    pointEvent.template.conversionRule.name,
                    studentPoint.input,
                    pointEvent.template.conversionRule.value
                )
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
        //console.log(studentGroup.name, idx);
        if (studentGroup.id === 4) {
           // console.log(studentsSortedByStudentGroupPoints.map((student) => student.firstName + " " + student.lastName));
        }
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