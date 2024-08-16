"use server";

import { DateTime } from "luxon";
import Color from "color";
import { GlobalDashboardData } from "@/app/dataClasses";
import supabaseServiceClient from "../supabaseServiceClient";

export async function getGlobalDashData(schoolId: number): Promise<GlobalDashboardData> {
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
            .from("student_point")
            .select("student_id, totalPoints: point_value.sum(), student (school_id, first_name, last_name)")
            .eq("student.school_id", schoolId)
            .returns<{
                student_id: number,
                totalPoints: number,
                student: {
                    first_name: string,
                    last_name: string,
                    schoolId: number,
                }
            }[]>();

    if (allStudentPointsError) {
        console.error(allStudentPointsError);
        throw allStudentPointsError;
    }

    if (allStudentPointsData === null) throw new Error("All student points not found");

    const { data: allStudentPointsByGroupData, error: allStudentPointsByGroupError } =
        await supabase
            .from("student_point")
            .select("created_at, point_event (point_template (point_group (*))), student (*, student_group (*))")
            .eq("student.school_id", schoolId)
            .returns<{
                created_at: string,
                point_value: number,
                student: {
                    id: number,
                    student_group: {
                        id: number,
                        name: string
                    }[]
                },
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

    if (allStudentPointsByGroupError) {
        console.error(allStudentPointsByGroupError);
        throw allStudentPointsByGroupError;
    }

    if (allStudentPointsByGroupData === null) throw new Error("All student points by point group not found");

    const pointGroups = allStudentPointsByGroupData.reduce((acc, pointData) => {
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
        acc[pointGroup.id].totalPoints += pointData.point_value;
        acc[pointGroup.id].students.push({
            id: pointData.student.id,
            totalPoints: pointData.point_value
        });
        return acc;
    }, {} as { [key: number]: { id: number, name: string, color: string, totalPoints: number, students: { id: number, totalPoints: number }[] } });

    const sortedPointGroups = Object.values(pointGroups).map((pointGroup) => {
        return {
            ...pointGroup,
            students: pointGroup.students.sort((a, b) => b.totalPoints - a.totalPoints)
        }
    })

    const studentGroupRankings = allStudentPointsByGroupData.reduce((acc, pointData) => {
        pointData.student.student_group.forEach((studentGroup) => {
            if (!acc[studentGroup.id]) {
                acc[studentGroup.id] = {
                    id: studentGroup.id,
                    name: studentGroup.name,
                    totalPoints: 0,
                    students: []
                }
            }
            acc[studentGroup.id].totalPoints += pointData.point_value;
            acc[studentGroup.id].students.push({
                id: pointData.student.id,
                totalPoints: pointData.point_value
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

    console.log(Object.values(allStudentPointsData.reduce((acc, studentPoint) => {
        if (acc[studentPoint.student_id]) {
            acc[studentPoint.student_id].totalPoints += studentPoint.totalPoints;
        } else {
            acc[studentPoint.student_id] = {
                id: studentPoint.student_id,
                totalPoints: studentPoint.totalPoints,
                firstName: studentPoint.student.first_name,
                lastName: studentPoint.student.last_name
            }
        }
        return acc;
    }, {} as { [key: number]: { id: number, firstName: string, lastName: string, totalPoints: number } })).sort((a, b) => b.totalPoints - a.totalPoints))

    return {
        schoolData: {
            id: schoolData.id,
            name: schoolData.name,
        },
        totals: {
            allTime: {
                totalPoints: allStudentPointsData.reduce((acc, studentPoint) => acc + studentPoint.totalPoints, 0),
                totalPointsByPointGroup: sortedPointGroups.map((pointGroup) => ({
                    id: pointGroup.id,
                    name: pointGroup.name,
                    color: pointGroup.color,
                    totalPoints: pointGroup.totalPoints
                })),
                totalPointsByStudentGroup: sortedStudentGroups.map((studentGroup) => ({
                    id: studentGroup.id,
                    name: studentGroup.name,
                    totalPoints: studentGroup.totalPoints,
                    totalStudents: studentGroup.students.length
                }))
            },
            thisMonth: {
                totalPoints: allStudentPointsByGroupData
                    .filter((studentPoint) => DateTime.fromSQL(studentPoint.created_at).toUnixInteger() > DateTime.now().startOf('month').toUnixInteger())
                    .reduce((acc, studentPoint) => acc + studentPoint.point_value, 0),
                totalPointsByPointGroup: [],
                totalPointsByStudentGroup: []
            },
            thisWeek: {
                totalPoints: allStudentPointsByGroupData
                    .filter((studentPoint) => DateTime.fromSQL(studentPoint.created_at).toUnixInteger() > DateTime.now().startOf('week').toUnixInteger())
                    .reduce((acc, studentPoint) => acc + studentPoint.point_value, 0),
                totalPointsByPointGroup: [],
                totalPointsByStudentGroup: []
            },
            today: {
                totalPoints: allStudentPointsByGroupData
                    .filter((studentPoint) => DateTime.fromSQL(studentPoint.created_at).toUnixInteger() > DateTime.now().startOf('day').toUnixInteger())
                    .reduce((acc, studentPoint) => acc + studentPoint.point_value, 0),
                totalPointsByPointGroup: [],
                totalPointsByStudentGroup: []
            }
        },
        topStudents: {
            topOverall: Object.values(allStudentPointsData.reduce((acc, studentPoint) => {
                if (acc[studentPoint.student_id]) {
                    acc[studentPoint.student_id].totalPoints += studentPoint.totalPoints;
                } else {
                    acc[studentPoint.student_id] = {
                        id: studentPoint.student_id,
                        totalPoints: studentPoint.totalPoints,
                        firstName: studentPoint.student.first_name,
                        lastName: studentPoint.student.last_name
                    }
                }
                return acc;
            }, {} as { [key: number]: { id: number, firstName: string, lastName: string, totalPoints: number } })).sort((a, b) => b.totalPoints - a.totalPoints),
            topByPointGroup: [],
            topByGrade: []
        }
    }
}