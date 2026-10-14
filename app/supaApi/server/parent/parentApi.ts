"use server";

import getOwnUserData from "../getOwnUserData";
import supabaseServiceClient from "../supabaseServiceClient";
import { redeemLinkCode } from "../link/linkCodeActions";
import { linkFailureMessage } from "@/lib/linkCode";

export async function getStudentsOfParent(): Promise<{ id: number, fullName: string }[]> {
    const userData = await getOwnUserData()
    if (!userData) { throw new Error("No user data found") }

    const supabase = await supabaseServiceClient();

    const { data: studentPairs, error: studentPairsError } =
        await supabase
            .from("user_student_pair")
            .select("student (*)")
            .eq("user_id", userData.id)

    if (studentPairsError) throw new Error(studentPairsError.message)

    const students = studentPairs.flatMap((student) => student.student)

    return students.filter((student) => student !== null).map((student) => {
        return {
            id: student?.id,
            fullName: student?.first_name + " " + student?.last_name
        }
    })
}

// Delegates to the rate-limited, uniform-failure redeem_link_code RPC (BACKEND_PLAN.md §6.3,
// DATA_DISCLOSURE.md §10.11). The code is never echoed or logged.
export async function linkStudentToParent(
    schoolId: number,
    linkCode: string
): Promise<{ error?: string }> {
    const { status } = await redeemLinkCode("parent_link", schoolId, linkCode)
    return status === "linked" ? {} : { error: linkFailureMessage(status) }
}

export async function deleteStudentFromParent(
    studentId: number
): Promise<{ error?: string }> {
    const userData = await getOwnUserData()
    if (!userData) {
        return { error: "No user data found" }
    }

    const supabase = await supabaseServiceClient();

    const { data: _, error: removeStudentError } =
        await supabase.from("user_student_pair")
            .delete()
            .eq("user_id", userData.id)
            .eq("student_id", studentId)

    if (removeStudentError) {
        console.error(removeStudentError.message)
        return { error: "Error disconnecting student" }
    }

    return {}
}

export type ParentStudentData = {
    id: number,
    name: string,
    totalPoints: number,
    rank: number,
    totalStudents: number,
    studentGroups: {
        id: number,
        name: string,
        points: number,
        rank: number,
        totalStudents: number
    }[],
    pointGroups: {
        id: number,
        name: string,
        color: string,
        points: number,
        rank: number,
        totalStudents: number
    }[],
    pointEvents: {
        id: number,
        name: string,
        date: string,
        template: {
            ruleType: string,
            ruleValue: number
        },
        pointGroup: {
            id: number,
            name: string,
            color: string
        },
        points: number,
        maxPossible: number
    }[]
}

export async function getStudentDataForParent(
    studentId: number
): Promise<ParentStudentData | null> {
    const userData = await getOwnUserData()
    if (!userData) {
        return null
    }

    const supabase = await supabaseServiceClient();

    const { data: pairingData, error: pairingDataError } =
        await supabase.from("user_student_pair")
            .select("*")
            .eq("student_id", studentId)
            .eq("user_id", userData.id)
            .single()

    if (pairingDataError) {
        if (pairingData === null) return null
        return null
    }

    const { data: studentData, error: studentDataError } =
        await supabase.from("student")
            .select("*")
            .eq("id", studentId)
            .single()

    if (studentDataError) {
        if (studentData === null) return null
        return null
    }

    if (studentData?.school_id === undefined) {
        return null
    }

    const { data: allStudentData, error: allStudentDataError } =
        await supabase.from("student")
            .select("*, student_group (*), student_point (*, point_event (*, student_group (*), point_template (conversion_rule_value, point_group (*), point_conversion_rule_type (*))))")
            .eq("school_id", studentData.school_id)

    if (allStudentDataError) return null
    if (allStudentData === null) return null

    const allStudentPoints = Object.values(
        allStudentData.reduce((acc, cur) => {

            const totalPoints = cur.student_point.reduce((acc2, cur2) => {
                acc2 += cur2.point_value
                return acc2
            }, 0)

            const studentGroupPoints = Object.values(
                cur.student_group.reduce((acc2, cur2) => {
                    const studentGroupId = cur2.id
                    if (studentGroupId !== undefined) {
                        acc2[studentGroupId] = {
                            id: studentGroupId,
                            name: cur2.name,
                            points: totalPoints
                        }
                    }
                    return acc2
                }, {} as { [key: number]: { id: number, name: string, points: number } })
            ).map((studentGroup) => {
                return studentGroup
            })

            const pointGroupPoints = Object.values(
                cur.student_point.reduce((acc2, cur2) => {
                    const pointGroup = cur2.point_event?.point_template?.point_group
                    if (pointGroup !== null && pointGroup !== undefined) {
                        if (!acc2[pointGroup.id]) {
                            acc2[pointGroup.id] = {
                                id: pointGroup.id,
                                name: pointGroup.name,
                                color: pointGroup.color,
                                points: cur2.point_value
                            }
                        } else {
                            acc2[pointGroup.id].points += cur2.point_value
                        }
                    }
                    return acc2
                }, {} as { [key: number]: { id: number, name: string, color: string, points: number } })
            ).map((pointGroup) => {
                return pointGroup
            })

            const pointEvents = cur.student_point.map((studentPoint) => {
                return {
                    id: studentPoint.point_event?.id ?? -1,
                    name: studentPoint.point_event?.name ?? "",
                    date: studentPoint.point_event?.date ?? "",
                    template: {
                        ruleType: studentPoint.point_event?.point_template?.point_conversion_rule_type?.name ?? "direct",
                        ruleValue: studentPoint.point_event?.point_template?.conversion_rule_value ?? 0
                    },
                    pointGroup: {
                        id: studentPoint.point_event?.point_template?.point_group?.id ?? -1,
                        name: studentPoint.point_event?.point_template?.point_group?.name ?? "",
                        color: studentPoint.point_event?.point_template?.point_group?.color ?? ""
                    },
                    points: studentPoint.point_value,
                    maxPossible: studentPoint.point_event?.max_input ?? 0
                }
            })

            acc[cur.id] = {
                id: cur.id,
                name: cur.first_name + " " + cur.last_name,
                totalPoints: totalPoints,
                studentGroups: studentGroupPoints,
                pointGroups: pointGroupPoints,
                pointEvents: pointEvents
            }
            return acc
        }, {} as {
            [key: number]: {
                id: number,
                name: string,
                totalPoints: number,
                pointGroups: {
                    id: number,
                    name: string,
                    color: string,
                    points: number
                }[],
                studentGroups: {
                    id: number,
                    name: string,
                    points: number
                }[],
                pointEvents: {
                    id: number,
                    name: string,
                    date: string,
                    template: {
                        ruleType: string,
                        ruleValue: number
                    },
                    pointGroup: {
                        id: number,
                        name: string,
                        color: string
                    },
                    points: number,
                    maxPossible: number
                }[]
            }
        })
    )
        .map((student) => {
            return student
        })

    const compiledStudentData = allStudentPoints.find((student) => {
        return student.id === studentId
    })

    if (compiledStudentData === undefined) return null

    const pointGroupData = compiledStudentData.pointGroups.map((pointGroup) => {
        // Extract relevant students for this point group only once
        const studentsInGroup = allStudentPoints.filter((student) =>
            student.pointGroups.some((pg) => pg.id === pointGroup.id)
        );

        // Rank the students by points in this point group
        const rankedStudents = studentsInGroup
            .sort((a, b) => {
                const pointsA = a.pointGroups.find((pg) => pg.id === pointGroup.id)?.points ?? 0;
                const pointsB = b.pointGroups.find((pg) => pg.id === pointGroup.id)?.points ?? 0;
                return pointsB - pointsA;
            });

        // Find the rank of the specific student
        const studentRank = rankedStudents.findIndex((student) => student.id === studentId) + 1;

        return {
            ...pointGroup,
            rank: studentRank,
            totalStudents: studentsInGroup.length,
        };
    });


    const studentGroupData = compiledStudentData.studentGroups.map((studentGroup) => {
        // Extract relevant students for this point group only once
        const studentsInGroup = allStudentPoints.filter((student) =>
            student.studentGroups.some((pg) => pg.id === studentGroup.id)
        );

        // Rank the students by points in this point group
        const rankedStudents = studentsInGroup
            .sort((a, b) => {
                const pointsA = a.studentGroups.find((pg) => pg.id === studentGroup.id)?.points ?? 0;
                const pointsB = b.studentGroups.find((pg) => pg.id === studentGroup.id)?.points ?? 0;
                return pointsB - pointsA;
            });

        // Find the rank of the specific student
        const studentRank = rankedStudents.findIndex((student) => student.id === studentId) + 1;

        return {
            ...studentGroup,
            rank: studentRank,
            totalStudents: studentsInGroup.length,
        };
    });

    return {
        id: compiledStudentData.id,
        name: compiledStudentData.name,
        totalPoints: compiledStudentData.totalPoints,
        rank: allStudentPoints.sort((a, b) => b.totalPoints - a.totalPoints).findIndex((student) => student.id === studentId) + 1,
        totalStudents: allStudentPoints.length,
        studentGroups: studentGroupData,
        pointGroups: pointGroupData,
        pointEvents: compiledStudentData.pointEvents
    }

}