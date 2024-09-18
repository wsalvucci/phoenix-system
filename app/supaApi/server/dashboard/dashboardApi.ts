"use server";

import { DateTime } from "luxon";
import { GlobalDashboardData, MobileDashboardData, TimedTotalPointData } from "@/app/dataClasses";
import supabaseServiceClient from "../supabaseServiceClient";
import { getOwnStudentData } from "../student/studentApi";

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

    const fetchedStudent = await getOwnStudentData();

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
                }),
            studentData: fetchedStudent !== null ? {
                id: fetchedStudent.id,
                firstName: fetchedStudent.firstName,
                lastName: fetchedStudent.lastName,
                totalPoints: 0,
                grade: fetchedStudent.grade,
                rank: 0
            } : null
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
