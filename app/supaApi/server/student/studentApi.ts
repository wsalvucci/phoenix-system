"use server";
import { Student, StudentRankData } from "@/app/dataClasses";
import supabaseServiceClient from "../supabaseServiceClient";
import getOwnUserData from "../getOwnUserData";
import { DateTime } from "luxon";

export async function getOwnStudentData(): Promise<Student> {
    const userData = await getOwnUserData();
    if (!userData) throw new Error("User not found");

    const supabase = await supabaseServiceClient();

    const { data: studentData, error: studentError } = await supabase.from("student").select("*").eq("linkedUser", userData.id).single();

    if (studentError) {
        console.error(studentError);
        throw studentError;
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

export async function getStudentRankData(): Promise<StudentRankData> {
    const studentData = await getOwnStudentData();

    const supabase = await supabaseServiceClient();

    const { data: studentPointsData, error: studentPointsError } = await supabase.from("student_point").select("*, point_event (*, point_template (*, point_group (*)), student_group (*))").eq("student_id", studentData.id);

    if (studentPointsError) {
        console.error(studentPointsError);
        throw studentPointsError;
    }

    if (studentPointsData === null) throw new Error("Student points not found");

    const { data: allStudentPointsData, error: allStudentPointsError } =
        await supabase
            .from("student_point")
            .select("student_id, totalPoints: point_value.sum(), student (school_id)")
            .eq("student.school_id", studentData.schoolId)
            .returns<{
                student_id: number,
                totalPoints: number,
                schoolId: number
            }[]>();

    if (allStudentPointsError) {
        console.error(allStudentPointsError);
        throw allStudentPointsError;
    }

    if (allStudentPointsData === null) throw new Error("All student points not found");

    // Find the student's rank within the school

    const sortedStudentPointsData = allStudentPointsData.sort((a, b) => b.totalPoints - a.totalPoints);
    const studentRank = (sortedStudentPointsData.findIndex((pointData) => pointData.student_id === studentData.id) ?? -1) + 1;

    if (allStudentPointsError) {
        console.error(allStudentPointsError);
        throw allStudentPointsError;
    }

    if (allStudentPointsData === null) throw new Error("All student points not found");

    const { data: allStudentPointsByPointGroupData, error: allStudentPointsByPointGroupError } =
        await supabase
            .from("student_point")
            .select("point_event (point_template (point_group (*))), student (*), totalPoints: point_value.sum()")
            .eq("student.school_id", studentData.schoolId)
            .returns<{
                student: {
                    id: number,
                },
                totalPoints: number,
                point_event: {
                    point_template: {
                        point_group: {
                            id: number,
                            name: string,
                            color: string
                        }
                    }
                }
            }[]>();

    if (allStudentPointsByPointGroupError) {
        console.error(allStudentPointsByPointGroupError);
        throw allStudentPointsByPointGroupError;
    }

    if (allStudentPointsByPointGroupData === null) throw new Error("All student points by point group not found");

    // Find the student's rank within each point group

    const pointGroups = allStudentPointsByPointGroupData.reduce((acc, pointData) => {
        const pointGroup = pointData.point_event.point_template.point_group;
        if (!acc[pointGroup.id]) {
            acc[pointGroup.id] = {
                id: pointGroup.id,
                name: pointGroup.name,
                color: pointGroup.color,
                totalPoints: 0,
                students: []
            }
        }
        acc[pointGroup.id].totalPoints += pointData.totalPoints;
        acc[pointGroup.id].students.push({
            id: pointData.student.id,
            totalPoints: pointData.totalPoints
        });
        return acc;
    }, {} as { [key: number]: { id: number, name: string, color: string, totalPoints: number, students: { id: number, totalPoints: number }[] } });

    const sortedGroups = Object.values(pointGroups).map((pointGroup) => {
        return {
            ...pointGroup,
            students: pointGroup.students.sort((a, b) => b.totalPoints - a.totalPoints)
        }
    })

    const groupRanks = sortedGroups.map((group) => {
        return {
            id: group.id,
            name: group.name,
            color: group.color,
            rank: (group.students.findIndex((student) => student.id === studentData.id) ?? -1) + 1,
            totalPoints: (group.students.find((student) => student.id === studentData.id) ?? { totalPoints: 0 }).totalPoints
        }
    });

    // console.log(sortedGroups.map((group) => {
    //     return group.students.map((student) => {
    //         return {
    //             id: student.id,
    //             totalPoints: student.totalPoints,
    //             groupId: group.id
    //         };
    //     });
    // }));

    // console.log(groupRanks);

    const { data: allStudentPointsByStudentGroupData, error: allStudentPointsByStudentGroupError } =
        await supabase
            .from("student_point")
            .select("point_event (point_template (point_group (*)), student_group (*)), student (*), totalPoints: point_value.sum()")
            .eq("student.school_id", studentData.schoolId)
            .returns<{
                student: {
                    id: number,
                },
                totalPoints: number,
                point_event: {
                    student_group: {
                        id: number,
                        name: string
                    }
                }
            }[]>();

    if (allStudentPointsByStudentGroupError) {
        console.error(allStudentPointsByStudentGroupError);
        throw allStudentPointsByStudentGroupError;
    }

    if (allStudentPointsByStudentGroupData === null) throw new Error("All student points by student group not found");

    console.log("Student points by student group");
    console.log(allStudentPointsByStudentGroupData);

    // Find the student's rank within each student group

    const studentGroups = allStudentPointsByStudentGroupData.reduce((acc, pointData) => {
        const studentGroup = pointData.point_event.student_group;
        if (!acc[studentGroup.id]) {
            acc[studentGroup.id] = {
                id: studentGroup.id,
                name: studentGroup.name,
                totalPoints: 0,
                students: []
            }
        }
        acc[studentGroup.id].totalPoints += pointData.totalPoints;
        acc[studentGroup.id].students.push({
            id: pointData.student.id,
            totalPoints: pointData.totalPoints
        });
        return acc;
    }, {} as { [key: number]: { id: number, name: string, totalPoints: number, students: { id: number, totalPoints: number }[] } });

    const sortedStudentGroups = Object.values(studentGroups).map((studentGroup) => {
        return {
            ...studentGroup,
            students: studentGroup.students.sort((a, b) => b.totalPoints - a.totalPoints)
        }
    })

    const studentGroupRanks = sortedStudentGroups.map((studentGroup) => {
        return {
            id: studentGroup.id,
            name: studentGroup.name,
            rank: (studentGroup.students.findIndex((student) => student.id === studentData.id) ?? -1) + 1,
            totalPoints: (studentGroup.students.find((student) => student.id === studentData.id) ?? { totalPoints: 0 }).totalPoints
        }
    });

    // console.log(sortedStudentGroups.map((studentGroup) => {
    //     return studentGroup.students.map((student) => {
    //         return {
    //             id: student.id,
    //             totalPoints: student.totalPoints,
    //             groupId: studentGroup.id
    //         };
    //     });
    // }));

    return {
        points: studentPointsData.filter((pointData) => {
            return pointData.point_event !== null &&
                pointData.point_event.student_group !== null &&
                pointData.point_event.point_template !== null &&
                pointData.point_event.point_template.point_group !== null;
        }).map((pointData) => {
            return {
                id: pointData.id,
                value: pointData.point_value,
                date: DateTime.fromISO(pointData.created_at ?? "").toFormat("yyyy-MM-dd"),
                pointEvent: {
                    id: pointData.point_event!.id,
                    name: pointData.point_event!.name ?? "",
                    date: DateTime.fromISO(pointData.point_event!.date ?? "").toFormat("yyyy-MM-dd"),
                    studentGroup: {
                        id: pointData.point_event!.student_group!.id,
                        name: pointData.point_event!.student_group!.name ?? ""
                    },
                    pointTemplate: {
                        id: pointData.point_event!.point_template!.id,
                        name: pointData.point_event!.point_template!.name ?? "",
                        pointGroup: {
                            id: pointData.point_event!.point_template!.point_group!.id,
                            name: pointData.point_event!.point_template!.point_group!.name,
                            color: pointData.point_event!.point_template!.point_group!.color
                        }
                    }
                }
            }
        }),
        ranks: {
            totalPoints: studentPointsData.reduce((acc, pointData) => acc + pointData.point_value, 0),
            totalRank: studentRank,
            pointGroupRanks: groupRanks.map((groupRank) => {
                return {
                    pointGroup: {
                        id: groupRank.id,
                        name: groupRank.name,
                        color: groupRank.color
                    },
                    totalPoints: groupRank.totalPoints,
                    rank: groupRank.rank
                }
            }),
            studentGroupRanks: studentGroupRanks.map((studentGroupRank) => {
                return {
                    studentGroup: {
                        id: studentGroupRank.id,
                        name: studentGroupRank.name
                    },
                    totalPoints: studentGroupRank.totalPoints,
                    rank: studentGroupRank.rank
                }
            })
        }
    }
}