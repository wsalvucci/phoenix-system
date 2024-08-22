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
            .select("created_at, student_id, totalPoints: point_value.sum(), student (school_id, first_name, last_name, grade)")
            .eq("student.school_id", schoolId)
            .returns<{
                student_id: number,
                totalPoints: number,
                created_at: string,
                student: {
                    first_name: string,
                    last_name: string,
                    schoolId: number,
                    grade: number
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
            .select("created_at, point_value, point_event (point_template (point_group (*))), student (*, student_group (*, ranking_group (*)))")
            .eq("student.school_id", schoolId)
            .returns<{
                created_at: string,
                point_value: number,
                student: {
                    id: number,
                    first_name: string,
                    last_name: string,
                    student_group: {
                        id: number,
                        name: string,
                        ranking_group: {
                            id: number,
                            name: string
                        }[]
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

    const { data: allPointEventsForSchoolData, error: allPointEventsForSchoolError } = await supabase
        .from("point_event")
        .select("*, point_template (id, conversion_rule_value, point_conversion_rule_type (*), point_group (*))")
        .eq("point_template.point_group.school_id", schoolId);

    if (allPointEventsForSchoolError) {
        console.error(allPointEventsForSchoolError);
        throw allPointEventsForSchoolError;
    }

    if (allPointEventsForSchoolData === null) throw new Error("All point events for school not found");

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
                    .filter((studentPoint) => DateTime.fromISO(studentPoint.created_at).toUnixInteger() > DateTime.now().startOf('month').toUnixInteger())
                    .reduce((acc, studentPoint) => acc + studentPoint.point_value, 0),
                totalPointsByPointGroup: [],
                totalPointsByStudentGroup: []
            },
            thisWeek: {
                totalPoints: allStudentPointsByGroupData
                    .filter((studentPoint) => DateTime.fromISO(studentPoint.created_at).toUnixInteger() > DateTime.now().startOf('week').toUnixInteger())
                    .reduce((acc, studentPoint) => acc + studentPoint.point_value, 0),
                totalPointsByPointGroup: [],
                totalPointsByStudentGroup: []
            },
            today: {
                totalPoints: allStudentPointsByGroupData
                    .filter((studentPoint) => DateTime.fromISO(studentPoint.created_at).toUnixInteger() > DateTime.now().startOf('day').toUnixInteger())
                    .reduce((acc, studentPoint) => acc + studentPoint.point_value, 0),
                totalPointsByPointGroup: [],
                totalPointsByStudentGroup: []
            }
        },
        rankingGroups: Object.values(allStudentPointsByGroupData.reduce((acc, studentPoint) => {
            studentPoint.student.student_group.forEach((studentGroup) => {
                studentGroup.ranking_group.forEach((rankingGroup) => {
                    if (!acc[rankingGroup.id]) {
                        acc[rankingGroup.id] = {
                            id: rankingGroup.id,
                            name: rankingGroup.name,
                            studentGroups: [{
                                id: studentGroup.id,
                                name: studentGroup.name,
                                totalPoints: studentPoint.point_value,
                                students: [{
                                    id: studentPoint.student.id,
                                    firstName: studentPoint.student.first_name,
                                    lastName: studentPoint.student.last_name,
                                    totalPoints: studentPoint.point_value
                                }]
                            }]
                        }
                    } else {
                        const studentGroupIndex = acc[rankingGroup.id].studentGroups.findIndex(group => group.id === studentGroup.id);
                        if (studentGroupIndex === -1) {
                            acc[rankingGroup.id].studentGroups.push({
                                id: studentGroup.id,
                                name: studentGroup.name,
                                totalPoints: studentPoint.point_value,
                                students: [{
                                    id: studentPoint.student.id,
                                    firstName: studentPoint.student.first_name,
                                    lastName: studentPoint.student.last_name,
                                    totalPoints: studentPoint.point_value
                                }]
                            });
                        } else {
                            acc[rankingGroup.id].studentGroups[studentGroupIndex].totalPoints += studentPoint.point_value;
                            const studentIndex = acc[rankingGroup.id].studentGroups[studentGroupIndex].students.findIndex(student => student.id === studentPoint.student.id);
                            if (studentIndex === -1) {
                                acc[rankingGroup.id].studentGroups[studentGroupIndex].students.push({
                                    id: studentPoint.student.id,
                                    firstName: studentPoint.student.first_name,
                                    lastName: studentPoint.student.last_name,
                                    totalPoints: studentPoint.point_value
                                });
                            } else {
                                acc[rankingGroup.id].studentGroups[studentGroupIndex].students[studentIndex].totalPoints += studentPoint.point_value;
                            }
                        }
                    }
                });
            });
            return acc;
        }, {} as {
            [key: number]: {
                id: number,
                name: string,
                studentGroups: {
                    id: number;
                    name: string;
                    totalPoints: number;
                    students: {
                        id: number,
                        firstName: string,
                        lastName: string,
                        totalPoints: number
                    }[];
                }[];
            }
        })),
        topStudents: {
            topOverall: Object.values(allStudentPointsData.reduce((acc, studentPoint) => {
                if (acc[studentPoint.student_id]) {
                    acc[studentPoint.student_id].totalPoints += studentPoint.totalPoints;
                } else {
                    acc[studentPoint.student_id] = {
                        id: studentPoint.student_id,
                        totalPoints: studentPoint.totalPoints,
                        firstName: studentPoint.student.first_name,
                        lastName: studentPoint.student.last_name,
                    }
                }
                return acc;
            }, {} as { [key: number]: { id: number, firstName: string, lastName: string, totalPoints: number } }))
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .slice(0, 10),
            topTrending: Object.values(allStudentPointsData.reduce((acc, studentPoint) => {
                if (acc[studentPoint.student_id]) {
                    acc[studentPoint.student_id].totalPoints += studentPoint.totalPoints;
                    acc[studentPoint.student_id].lastWeekTotalPoints += DateTime.fromISO(studentPoint.created_at).toUnixInteger() < DateTime.now().startOf('week').toUnixInteger() ? studentPoint.totalPoints : 0;
                } else {
                    acc[studentPoint.student_id] = {
                        id: studentPoint.student_id,
                        totalPoints: studentPoint.totalPoints,
                        firstName: studentPoint.student.first_name,
                        lastName: studentPoint.student.last_name,
                        lastWeekTotalPoints: DateTime.fromISO(studentPoint.created_at).toUnixInteger() < DateTime.now().startOf('week').toUnixInteger() ? studentPoint.totalPoints : 0
                    }
                }
                return acc;
            }, {} as { [key: number]: { id: number, firstName: string, lastName: string, totalPoints: number, lastWeekTotalPoints: number } }))
                .sort((a, b) => (b.totalPoints - b.lastWeekTotalPoints) - (a.totalPoints - a.lastWeekTotalPoints))
                .slice(0, 20),
            topByPointGroup: Object.values(allStudentPointsByGroupData.reduce((acc, studentPoint) => {
                const pointGroup = studentPoint.point_event.point_template.point_group;
                if (!acc[pointGroup.id]) {
                    acc[pointGroup.id] = {
                        id: pointGroup.id,
                        name: pointGroup.name,
                        topStudents: [{
                            id: studentPoint.student.id,
                            firstName: studentPoint.student.first_name,
                            lastName: studentPoint.student.last_name,
                            totalPoints: studentPoint.point_value
                        }]
                    }
                } else {
                    const studentIndex = acc[pointGroup.id].topStudents.findIndex(student => student.id === studentPoint.student.id);
                    if (studentIndex === -1) {
                        acc[pointGroup.id].topStudents.push({
                            id: studentPoint.student.id,
                            firstName: studentPoint.student.first_name,
                            lastName: studentPoint.student.last_name,
                            totalPoints: studentPoint.point_value
                        });
                    } else {
                        acc[pointGroup.id].topStudents[studentIndex].totalPoints += studentPoint.point_value;
                    }
                }
                return acc;
            }, {} as {
                [key: number]: {
                    id: number,
                    name: string,
                    topStudents: {
                        id: number,
                        firstName: string,
                        lastName: string,
                        totalPoints: number
                    }[]
                }
            })).map(pointGroup => {
                return {
                    id: pointGroup.id,
                    name: pointGroup.name,
                    topStudents: pointGroup.topStudents.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10)
                }
            }),
            topByGrade: Object.values(allStudentPointsData.reduce((acc, studentPoint) => {
                if (studentPoint.student.grade < 0) return acc;
                if (acc[studentPoint.student.grade]) {
                    const studentData = acc[studentPoint.student.grade].topStudents.find(student => student.id === studentPoint.student_id);
                    if (studentData) {
                        studentData.totalPoints += studentPoint.totalPoints;
                    } else {
                        acc[studentPoint.student.grade].topStudents.push({
                            id: studentPoint.student_id,
                            firstName: studentPoint.student.first_name,
                            lastName: studentPoint.student.last_name,
                            totalPoints: studentPoint.totalPoints
                        });
                    }
                } else {
                    acc[studentPoint.student.grade] = {
                        grade: studentPoint.student.grade,
                        topStudents: [{
                            id: studentPoint.student_id,
                            firstName: studentPoint.student.first_name,
                            lastName: studentPoint.student.last_name,
                            totalPoints: studentPoint.totalPoints
                        }]
                    }
                }
                return acc;
            }, {} as {
                [key: number]: {
                    grade: number,
                    topStudents: {
                        id: number,
                        firstName:
                        string,
                        lastName: string,
                        totalPoints: number
                    }[]
                }
            }))
                .sort((a, b) => a.grade - b.grade)
                .map(grade => {
                    console.log(grade);
                    return {
                        grade: grade.grade,
                        topStudents: grade.topStudents.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10)
                    }
                })
        },
        pointEvents: allPointEventsForSchoolData.map((pointEvent) => ({
            id: pointEvent.id,
            name: pointEvent.name || "",
            date: pointEvent.date || "",
            pointGroup: {
                id: pointEvent.point_template?.point_group?.id || 0,
                name: pointEvent.point_template?.point_group?.name || "",
                color: pointEvent.point_template?.point_group?.color || ""
            },
            pointTemplate: {
                id: pointEvent.point_template?.id || 0,
                conversionRuleValue: pointEvent.point_template?.conversion_rule_value || 0,
                conversionRuleType: {
                    id: pointEvent.point_template?.point_conversion_rule_type?.id || 0,
                    name: pointEvent.point_template?.point_conversion_rule_type?.name || ""
                }
            },
            maxInput: pointEvent.max_input,
        }))
    }
}