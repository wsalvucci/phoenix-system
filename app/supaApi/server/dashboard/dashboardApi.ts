"use server";

import { DateTime } from "luxon";
import Color from "color";
import { GlobalDashboardData, MobileDashboardData, TimedTotalPointData } from "@/app/dataClasses";
import supabaseServiceClient from "../supabaseServiceClient";
import { getOwnStudentData } from "../student/studentApi";

export async function getMobileDashData(schoolId: number): Promise<MobileDashboardData> {
    const supabase = await supabaseServiceClient();

    const { data: schoolData, error: schoolDataError } = await supabase
        .from("school")
        .select("*")
        .eq("id", schoolId)
        .single();

    if (schoolDataError) {
        console.error(schoolDataError);
        throw schoolDataError;
    } else if (schoolData === null) {
        throw new Error("School not found");
    }

    const { data: allStudentPointsData, error: allStudentPointsError } =
        await supabase
            .from("student_point")
            .select("created_at, student_id, point_value, student (school_id, first_name, last_name, grade, student_group (id, name, ranking_group (id, name)))")
            .eq("student.school_id", schoolId)

    if (allStudentPointsError) {
        console.error(allStudentPointsError);
        throw allStudentPointsError;
    } else if (allStudentPointsData === null) {
        throw new Error("All student points not found");
    }

    const fetchedStudent = await getOwnStudentData();
    var studentGrade: number | null = null;
    var studentGroups: { id: number, name: string }[] = [];

    if (fetchedStudent !== null) {
        const { data: fetchedStudentData, error: fetchedStudentDataError } = await supabase
            .from("student")
            .select("id, first_name, last_name, grade, student_group (id, name)")
            .eq("id", fetchedStudent.id)
            .single();

        if (fetchedStudentDataError) {
            console.error(fetchedStudentDataError);
            throw fetchedStudentDataError;
        } else if (fetchedStudentData === null) {
            throw new Error("Student not found");
        }

        studentGrade = fetchedStudentData.grade;
        studentGroups = fetchedStudentData.student_group.map((group: { id: number, name: string }) => ({
            id: group.id,
            name: group.name
        }));
    }

    const topOverallStudents = allStudentPointsData.reduce((acc, studentPoint) => {
        if (studentPoint.student == null) return acc;
        if (studentPoint.student.grade < 0) return acc;
        if (acc[studentPoint.student_id]) {
            acc[studentPoint.student_id].totalPoints += studentPoint.point_value;
        } else {
            acc[studentPoint.student_id] = {
                id: studentPoint.student_id,
                totalPoints: studentPoint.point_value,
                firstName: studentPoint.student.first_name,
                lastName: studentPoint.student.last_name,
                grade: studentPoint.student.grade
            }
        }
        return acc;
    }, {} as { [key: number]: { id: number, firstName: string, lastName: string, totalPoints: number, grade: number } })

    const topOverallStudentsSorted = Object.values(topOverallStudents)
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((student, index) => ({ ...student, rank: index + 1 }))

    const topOverallStudentsByGrade = topOverallStudentsSorted.reduce((acc, student) => {
        if (student.grade < 0) return acc;
        if (acc[student.grade]) {
            acc[student.grade].push(student);
        } else {
            acc[student.grade] = [student];
        }
        return acc;
    }, {} as { [key: number]: { id: number, firstName: string, lastName: string, totalPoints: number, grade: number }[] });

    const topOverallStudentsByGradeSorted = Object.entries(topOverallStudentsByGrade).map(([grade, students]) => {
        return {
            grade: parseInt(grade),
            topStudents: students.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10)
        }
    });

    const thisStudentOverall = fetchedStudent !== null ? topOverallStudentsSorted.find((student) => student.id === fetchedStudent.id) || null : null;

    const topOverallGroupsByRankingGroup = allStudentPointsData.reduce((acc, studentPoint) => {
        if (studentPoint.student == null) return acc;
        studentPoint.student.student_group.forEach((studentGroup: { id: number, name: string, ranking_group: { id: number, name: string }[] }) => {
            studentGroup.ranking_group.forEach((rankingGroup: { id: number, name: string }) => {
                if (!acc[rankingGroup.id]) {
                    acc[rankingGroup.id] = {
                        id: rankingGroup.id,
                        name: rankingGroup.name,
                        topGroups: {
                            [studentGroup.id]: {
                                id: studentGroup.id,
                                name: studentGroup.name,
                                totalPoints: studentPoint.point_value,
                            }
                        }
                    }
                } else {
                    if (!acc[rankingGroup.id].topGroups[studentGroup.id]) {
                        acc[rankingGroup.id].topGroups[studentGroup.id] = {
                            id: studentGroup.id,
                            name: studentGroup.name,
                            totalPoints: studentPoint.point_value
                        }
                    } else {
                        acc[rankingGroup.id].topGroups[studentGroup.id].totalPoints += studentPoint.point_value;
                    }
                }
            });
        });
        return acc;
    }, {} as { [key: number]: { id: number, name: string, topGroups: { [key: number]: { id: number, name: string, totalPoints: number } } } });

    const topRankingGroupsSorted = Object.values(topOverallGroupsByRankingGroup).map((rankingGroup) => {
        return {
            id: rankingGroup.id,
            name: rankingGroup.name,
            topGroups: Object.values(rankingGroup.topGroups).map((studentGroup) => ({
                id: studentGroup.id,
                name: studentGroup.name,
                totalPoints: studentGroup.totalPoints
            })).sort((a, b) => b.totalPoints - a.totalPoints),
            studentGroup: Object.values(rankingGroup.topGroups).find((studentGroup) => studentGroups.find((group) => group.id === studentGroup.id)) || null
        }
    });

    return {
        schoolData: {
            id: schoolData.id,
            name: schoolData.name,
        },
        topStudents: {
            topOverall: topOverallStudentsSorted.slice(0, 10),
            studentData: thisStudentOverall || null,
            byGrade: topOverallStudentsByGradeSorted
        },
        rankingGroups: topRankingGroupsSorted
    }

}

export async function newGetGlobalDashData(schoolId: number): Promise<GlobalDashboardData> {
    const supabase = await supabaseServiceClient();

    const { data: schoolData, error: schoolDataError } = await supabase
        .from("school")
        .select("*")
        .eq("id", schoolId)
        .single();

    if (schoolDataError) {
        console.error(schoolDataError);
        throw schoolDataError;
    }

    if (schoolData === null) throw new Error("School not found");

    const { data: allStudentPointsData, error: allStudentPointsError } =
        await supabase
            .from("student")
            .select("*, student_point(*, point_event (*, point_template (*, point_group (*)))), student_group (*, ranking_group (*))")
            .eq("school_id", schoolId)

    if (allStudentPointsError !== null) {
        console.error(allStudentPointsError);
        throw allStudentPointsError;
    }

    if (allStudentPointsData === null) throw new Error("All student points not found");

    const { data: rankingGroupsData, error: rankingGroupsError } =
        await supabase
            .from("ranking_group")
            .select("*, student_group (*)")
            .eq("school_id", schoolData.id)

    if (rankingGroupsError !== null) {
        console.error(rankingGroupsError)
        throw rankingGroupsError
    }

    if (rankingGroupsData === null) throw new Error("Ranking groups not found")

    const { data: futurePointData, error: futurePointError } =
        await supabase
            .from("point_event")
            .select("*, point_template (*, point_group (*), point_conversion_rule_type (*))")
            .gt("date", DateTime.now().startOf("day").toString())

    if (futurePointError !== null) {
        console.error(futurePointError)
        throw futurePointError
    }

    if (futurePointData === null) throw new Error("Future point data not found")

    const studentPointTotals = Object.values(allStudentPointsData.reduce((acc, cur) => {
        if (!acc[cur.id]) {
            acc[cur.id] = {
                id: cur.id,
                firstName: cur.first_name,
                lastName: cur.last_name,
                grade: cur.grade,
                studentGroups: cur.student_group.map((group) => {
                    return {
                        id: group.id,
                        name: group.name
                    }
                }),
                byPointGroup: Object.values(cur.student_point.reduce((acc, cur) => {
                    const pointGroup = cur.point_event?.point_template?.point_group
                    const pointGroupId = pointGroup?.id
                    if (typeof pointGroupId !== 'number') return acc
                    if (!acc[pointGroupId]) {
                        acc[pointGroupId] = {
                            groupId: pointGroupId,
                            groupName: pointGroup?.name ?? "",
                            groupColor: pointGroup?.color ?? "",
                            totalPoints: 0
                        }
                    }
                    acc[pointGroupId].totalPoints += cur.point_value
                    return acc
                }, {} as { [key: number]: { groupId: number, groupName: string, groupColor: string, totalPoints: number } })),
                lastWeekTotal: cur.student_point.reduce((acc, cur) => {
                    if (DateTime.fromISO(cur.point_event?.date ?? "") < DateTime.now().minus({ 'days': 7 })) {
                        acc += cur.point_value
                    }
                    return acc
                }, 0),
                totalPoints: cur.student_point.reduce((acc, cur) => {
                    acc += cur.point_value
                    return acc
                }, 0)
            }
        }
        return acc
    }, {} as {
        [key: number]: {
            id: number,
            firstName: string,
            lastName: string,
            grade: number,
            studentGroups: {
                id: number,
                name: string
            }[],
            byPointGroup: {
                groupId: number,
                groupName: string,
                groupColor: string,
                totalPoints: number
            }[],
            lastWeekTotal: number,
            totalPoints: number
        }
    }))

    const allPointGroups = studentPointTotals.reduce((acc, cur) => {
        cur.byPointGroup.forEach((pointGroup) => {
            const exists = acc.find((value) => value.id == pointGroup.groupId)
            if (exists === undefined) {
                acc.push({
                    id: pointGroup.groupId,
                    name: pointGroup.groupName,
                    color: pointGroup.groupColor
                })
            }
        })
        return acc
    }, [] as { id: number, name: string, color: string }[])

    const allGrades = studentPointTotals.reduce((acc, cur) => {
        if (cur.grade < 0) return acc
        const exists = acc.find((grade) => grade == cur.grade)
        if (exists === undefined) acc.push(cur.grade)
        return acc
    }, [] as number[]).sort((a, b) => a - b)

    const blankTimedPointData: TimedTotalPointData = {
        totalPoints: 0,
        totalPointsByPointGroup: [],
        totalPointsByStudentGroup: []
    }

    return {
        schoolData: {
            id: schoolData.id,
            name: schoolData.name
        },
        totals: {
            allTime: blankTimedPointData,
            thisMonth: blankTimedPointData,
            thisWeek: blankTimedPointData,
            today: blankTimedPointData
        },
        rankingGroups: rankingGroupsData.map((rankingGroup) => {
            return {
                id: rankingGroup.id,
                name: rankingGroup.name,
                studentGroups: rankingGroup.student_group.map((studentGroup) => {
                    return {
                        id: studentGroup.id,
                        name: studentGroup.name,
                        averagePoints: studentPointTotals.reduce((acc, cur) => {
                            if (cur.studentGroups.find((studentGroupData) => studentGroupData.id === studentGroup.id)) {
                                acc.count += 1
                                acc.totalPoints += cur.totalPoints
                                acc.averagePoints = acc.totalPoints / acc.count
                            }
                            return acc
                        }, { count: 0, totalPoints: 0, averagePoints: 0 }).averagePoints,
                        students: []
                    }
                }).sort((a, b) => {
                    return b.averagePoints - a.averagePoints
                })
            }
        }),
        topStudents: {
            topOverall: studentPointTotals.map((student) => {
                return {
                    id: student.id,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    grade: student.grade,
                    totalPoints: student.totalPoints
                }
            }).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10),
            topTrending: studentPointTotals.map((student) => {
                return {
                    id: student.id,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    totalPoints: student.totalPoints,
                    lastWeekTotalPoints: student.lastWeekTotal
                }
            }).sort((a, b) => (b.totalPoints - b.lastWeekTotalPoints) - (a.totalPoints - a.lastWeekTotalPoints)).slice(0, 20),
            topByPointGroup: allPointGroups.reduce((acc, cur) => {
                acc.push(
                    {
                        id: cur.id,
                        name: cur.name,
                        color: cur.color,
                        topStudents: studentPointTotals.sort((a, b) => {
                            const aGroup = a.byPointGroup.find((group) => group.groupId == cur.id)
                            const bGroup = b.byPointGroup.find((group) => group.groupId == cur.id)
                            if (aGroup === undefined) return 1
                            if (bGroup === undefined) return -1
                            return bGroup.totalPoints - aGroup.totalPoints
                        }).map((student) => {
                            const groupPoints = student.byPointGroup.find((group) => group.groupId == cur.id)
                            return {
                                id: student.id,
                                firstName: student.firstName,
                                lastName: student.lastName,
                                totalPoints: groupPoints?.totalPoints ?? 0
                            }
                        }).slice(0, 10)
                    }
                )
                return acc
            }, [] as { id: number, name: string, color: string, topStudents: { id: number, firstName: string, lastName: string, totalPoints: number }[] }[]),
            topByGrade: allGrades.reduce((acc, cur) => {
                acc.push(
                    {
                        grade: cur,
                        topStudents: studentPointTotals
                            .filter((student) => student.grade == cur)
                            .sort((a, b) => b.totalPoints - a.totalPoints)
                    }
                )
                return acc
            }, [] as { grade: number, topStudents: { id: number, firstName: string, lastName: string, totalPoints: number }[] }[])
                .map((grade, index, array) => {
                    console.log(grade.topStudents.length)
                    grade.topStudents = grade.topStudents.slice(0, Math.min(10, grade.topStudents.length / 2))
                    return grade
                })
        },
        pointEvents: futurePointData
            .map((futurePoint) => {
                return {
                    id: futurePoint.id,
                    name: futurePoint.name ?? "",
                    date: futurePoint.date ?? "",
                    pointGroup: {
                        id: futurePoint.point_template?.point_group?.id ?? -1,
                        name: futurePoint.point_template?.point_group?.name ?? "",
                        color: futurePoint.point_template?.point_group?.color ?? ""
                    },
                    pointTemplate: {
                        id: futurePoint.point_template?.id ?? -1,
                        conversionRuleValue: futurePoint.point_template?.conversion_rule_value ?? 0,
                        conversionRuleType: {
                            id: futurePoint.point_template?.point_conversion_rule_type?.id ?? -1,
                            name: futurePoint.point_template?.point_conversion_rule_type?.name ?? ""
                        }
                    },
                    maxInput: futurePoint.max_input
                }
            })
    }
}