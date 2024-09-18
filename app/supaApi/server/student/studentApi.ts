"use server";
import { Student, StudentRankData } from "@/app/dataClasses";
import supabaseServiceClient from "../supabaseServiceClient";
import getOwnUserData from "../getOwnUserData";
import { DateTime } from "luxon";

export async function getOwnStudentData(): Promise<Student | null> {
    const userData = await getOwnUserData();
    if (!userData) {
        return null;
    }

    const supabase = await supabaseServiceClient();

    const { data: studentData, error: studentError } = await supabase.from("student").select("*").eq("linkedUser", userData.id).single();

    if (studentError) {
        console.error(studentError);
        return null;
    }

    if (studentData === null) throw new Error("Student not found");

    return {
        id: studentData.id,
        schoolId: studentData.school_id,
        linkCode: studentData.link_code,
        powerSchoolId: studentData.powerschool_id,
        firstName: studentData.first_name,
        lastName: studentData.last_name,
        birthdate: studentData.birthdate ? new Date(studentData.birthdate) : null,
        grade: studentData.grade,
        gender: studentData.gender
    };
}

export async function getStudentDashboardData(): Promise<StudentRankData> {
    const studentData = await getOwnStudentData();

    if (studentData === null) {
        throw new Error("Student not found");
    }

    const supabase = await supabaseServiceClient();

    const { data: allStudentPointsData, error: allStudentPointsError } =
        await supabase
            .from("student")
            .select("*, student_point(*, point_event (*, point_template (*, point_group (*), point_conversion_rule_type (*)))), student_group (*, ranking_group (*))")
            .eq("school_id", studentData.schoolId)

    if (allStudentPointsError !== null) {
        console.error(allStudentPointsError);
        throw allStudentPointsError;
    }

    if (allStudentPointsData === null) throw new Error("All student points not found");

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

    const thisStudent = studentPointTotals.find((student) => student.id == studentData.id)

    if (thisStudent === undefined) {
        throw new Error("Student not found in school totals")
    }

    const thisStudentTotalRank = studentPointTotals
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .findIndex((student) => student.id == thisStudent.id) + 1

    const thisStudentPointGroupRanks = thisStudent.byPointGroup.map((pointGroup) => {
        return {
            pointGroup: {
                id: pointGroup.groupId,
                name: pointGroup.groupName,
                color: pointGroup.groupColor
            },
            totalPoints: pointGroup.totalPoints,
            rank: studentPointTotals
                .sort((a, b) =>
                    (b.byPointGroup.find((_) => _.groupId == pointGroup.groupId)?.totalPoints ?? 0) -
                    (a.byPointGroup.find((_) => _.groupId == pointGroup.groupId)?.totalPoints ?? 0)
                )
                .findIndex((student) => student.id == thisStudent.id) + 1
        }
    })

    const thisStudentGroupRanks = thisStudent.studentGroups.map((studentGroup) => {
        return {
            studentGroup: {
                id: studentGroup.id,
                name: studentGroup.name
            },
            totalPoints: thisStudent.totalPoints,
            rank: studentPointTotals
                .filter((student) => student.studentGroups.find((_) => _.id === studentGroup.id) !== undefined)
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .findIndex((student) => student.id == thisStudent.id) + 1
        }
    })

    const thisStudentGradeRank = studentPointTotals
        .filter((student) => student.grade == thisStudent.grade)
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .findIndex((student) => student.id == thisStudent.id) + 1


    const thisStudentPointEvents = allStudentPointsData
        .filter((student) => student.id == thisStudent.id)
        .at(0)
        ?.student_point.map((point) => {
            return {
                id: point.id,
                value: point.point_value,
                date: point.point_event?.date ?? "",
                pointEvent: {
                    id: point.point_event_id,
                    name: point.point_event?.name ?? "",
                    date: point.point_event?.date ?? "",
                    maxInput: point.point_event?.max_input ?? 0,
                    studentGroup: {
                        id: point.point_event?.student_group_id ?? -1,
                        name: "",
                    },
                    pointTemplate: {
                        id: point.point_event?.point_template?.id ?? -1,
                        name: point.point_event?.point_template?.name ?? "",
                        pointGroup: {
                            id: point.point_event?.point_template?.point_group_id ?? -1,
                            name: point.point_event?.point_template?.point_group?.name ?? "",
                            color: point.point_event?.point_template?.point_group?.color ?? ""
                        },
                        pointConversionRule: {
                            pointConversionRuleType: {
                                id: point.point_event?.point_template?.point_conversion_rule_type?.id ?? -1,
                                name: point.point_event?.point_template?.point_conversion_rule_type?.name ?? "",
                            },
                            ruleValue: point.point_event?.point_template?.conversion_rule_value ?? 0
                        }
                    }
                }
            }
        })

    return {
        points: thisStudentPointEvents ?? [],
        ranks: {
            totalPoints: thisStudent.totalPoints,
            totalRank: thisStudentTotalRank,
            pointGroupRanks: thisStudentPointGroupRanks,
            studentGroupRanks: thisStudentGroupRanks,
            gradeRank: {
                grade: studentData.grade,
                rank: thisStudentGradeRank
            }
        }
    }
}