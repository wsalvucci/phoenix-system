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

export async function getStudentRankData(): Promise<StudentRankData> {
    const studentData = await getOwnStudentData();

    if (studentData === null) {
        throw new Error("Student not found");
    }

    const supabase = await supabaseServiceClient();

    const { data: studentPointsData, error: studentPointsError } = await supabase.from("student_point").select("*, point_event (*, point_template (*, point_group (*), point_conversion_rule_type (*)), student_group (*))").eq("student_id", studentData.id);

    if (studentPointsError) {
        console.error(studentPointsError);
        throw studentPointsError;
    }

    if (studentPointsData === null) throw new Error("Student points not found");

    const { data: allStudentPointsData, error: allStudentPointsError } =
        await supabase
            .from("student_point")
            .select("student_id, totalPoints: point_value.sum(), student (school_id, grade)")
            .eq("student.school_id", studentData.schoolId)
            .returns<{
                student_id: number,
                totalPoints: number,
                student: {
                    school_id: number,
                    grade: number
                }
            }[]>();

    if (allStudentPointsError) {
        console.error(allStudentPointsError);
        throw allStudentPointsError;
    }

    if (allStudentPointsData === null) throw new Error("All student points not found");

    // Find the student's rank within the school

    const sortedStudentPointsData = allStudentPointsData.sort((a, b) => b.totalPoints - a.totalPoints);
    const studentRank = (sortedStudentPointsData.findIndex((pointData) => pointData.student_id === studentData.id) ?? -1) + 1;

    const studentRankByTheirGrade = allStudentPointsData.filter((pointData) => pointData.student.grade === studentData.grade);
    const sortedStudentPointsByGrade = studentRankByTheirGrade.sort((a, b) => b.totalPoints - a.totalPoints);
    const studentRankByGrade = (sortedStudentPointsByGrade.findIndex((pointData) => pointData.student_id === studentData.id) ?? -1) + 1;

    if (allStudentPointsError) {
        console.error(allStudentPointsError);
        throw allStudentPointsError;
    }

    if (allStudentPointsData === null) throw new Error("All student points not found");






    const { data: allStudentPointsByPointGroupData, error: allStudentPointsByPointGroupError } =
        await supabase
            .from("student_point")
            .select("point_event (point_template (point_group (*))), student (*, student_group (*)), totalPoints: point_value.sum()")
            .eq("student.school_id", studentData.schoolId)
            .returns<{
                student: {
                    id: number,
                    student_group: {
                        id: number,
                        name: string
                    }[]
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


    // Get the student's total point ranking within each student group that they are a part of

    const studentGroupRankings = allStudentPointsByPointGroupData.reduce((acc, pointData) => {
        pointData.student.student_group.forEach((studentGroup) => {
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
        });
        return acc;
    }, {} as { [key: number]: { id: number, name: string, totalPoints: number, students: { id: number, totalPoints: number }[] } });

    const sortedStudentGroups = Object.values(studentGroupRankings).map((studentGroup) => {
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
                date: DateTime.fromISO(pointData.point_event?.date ?? "").toFormat("yyyy-MM-dd"),
                pointEvent: {
                    id: pointData.point_event!.id,
                    name: pointData.point_event!.name ?? "",
                    date: DateTime.fromISO(pointData.point_event!.date ?? "").toFormat("yyyy-MM-dd"),
                    maxInput: pointData.point_event?.max_input ?? 0,
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
                        },
                        pointConversionRule: {
                            pointConversionRuleType: {
                                id: pointData.point_event?.point_template?.point_conversion_rule_type?.id ?? 0,
                                name: pointData.point_event?.point_template?.point_conversion_rule_type?.name ?? ""
                            },
                            ruleValue: pointData.point_event?.point_template?.conversion_rule_value ?? 0
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
            }),
            gradeRank: {
                grade: studentData.grade,
                rank: studentRankByGrade
            }
        }
    }
}