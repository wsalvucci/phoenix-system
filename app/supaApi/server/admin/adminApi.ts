"use server";
import { DateTime } from "luxon";
import checkAdminSchoolAccess from "./schools/checkAdminSchoolAccess";
import supabaseServiceClient from "../supabaseServiceClient";
import { AdminDashboardData, AdminStudentDashboardData, convertPointUsingRuleType, SchoolTimeframe, stringToRuleType } from "@/app/dataClasses";

export async function bulkAddStudentsToSchool(
    students: {
        powerschoolId: number;
        firstName: string;
        lastName: string;
        grade: number;
        birthdate: string;
        gender: string;
    }[],
    schoolId: number
): Promise<boolean> {
    const schoolAccess = await checkAdminSchoolAccess(schoolId);
    if (!schoolAccess) return false;

    // Add students to school
    const supabase = await supabaseServiceClient();

    const { data: studentsData, error: studentsError } = await supabase.from("student").upsert(
        students.map(student => ({
            powerschool_id: student.powerschoolId,
            first_name: student.firstName,
            last_name: student.lastName,
            grade: student.grade,
            birthdate: DateTime.fromISO(student.birthdate).toString(),
            gender: student.gender,
            school_id: schoolId
        })),
    );

    if (studentsError) {
        console.error("Error adding students to school", studentsError);
        return false;
    }

    return true;
}

export async function addTeacherToSchool(
    schoolId: number,
    firstName: string,
    lastName: string
): Promise<void> {
    const schoolAccess = await checkAdminSchoolAccess(schoolId);
    if (!schoolAccess) throw new Error("Unauthorized school access");

    const supabase = await supabaseServiceClient();

    const { data, error } = await supabase
        .from("teacher")
        .insert({
            first_name: firstName,
            last_name: lastName,
            school_id: schoolId
        });

    if (error) {
        console.error(error);
        throw new Error("Error adding teacher to school");
    }
}

export async function addStudentToSchool(
    schoolId: number,
    powerSchoolId: number,
    firstName: string,
    lastName: string,
    birthdate: Date,
    grade: number,
    gender: string
): Promise<void> {
    const schoolAccess = await checkAdminSchoolAccess(schoolId);
    if (!schoolAccess) throw new Error("Unauthorized school access");

    const supabase = await supabaseServiceClient();

    const { data, error } = await supabase
        .from("student")
        .insert({
            school_id: schoolId,
            powerschool_id: powerSchoolId,
            first_name: firstName,
            last_name: lastName,
            birthdate: birthdate.toISOString(),
            grade: grade,
            gender: gender
        });

    if (error) {
        console.error(error);
        throw new Error("Error adding student to school");
    }
}

export async function addPointGroupToSchool(
    schoolId: number,
    name: string,
    parentId: number | null,
    ranked: boolean,
    color: string
): Promise<void> {
    const schoolAccess = await checkAdminSchoolAccess(schoolId);
    if (!schoolAccess) throw new Error("Unauthorized school access");

    const supabase = await supabaseServiceClient();

    const { data, error } = await supabase
        .from("point_group")
        .insert({
            name: name,
            school_id: schoolId,
            parent_id: parentId,
            ranked: ranked,
            color: color
        })

    if (error) {
        console.error(error)
        throw new Error("An error occured while adding the point group to the school")
    }
}

export async function getAdminDashboardData(
    schoolId: number
): Promise<AdminDashboardData | null> {
    const schoolAccess = await checkAdminSchoolAccess(schoolId);
    if (!schoolAccess) return null

    const supabase = await supabaseServiceClient()

    const { data: timeframeData, error: timeframeDataError } = await supabase
        .from('school_timeframes')
        .select('*')
        .eq('school_id', schoolId)

    if (timeframeDataError) {
        console.error(timeframeDataError)
        return null
    }

    if (timeframeData === null) {
        console.error("Null school timeframe data")
        return null
    }

    let currentTimeframe = undefined
    let timeframeStart = DateTime.fromFormat("1970-01-01", "yyyy-MM-dd")
    let timeframeEnd = DateTime.fromFormat("2100-01-01", "yyyy-MM-dd")
    for (let timeframe of timeframeData) {
        if (timeframe.active) {
            currentTimeframe = timeframe
            break
        }
    }

    if (currentTimeframe) {
        timeframeStart = DateTime.fromISO(currentTimeframe.starts_at)
        timeframeEnd = DateTime.fromISO(currentTimeframe.ends_at)
    }


    const { data: schoolData, error: schoolDataError } = await supabase
        .from("school")
        .select("*, teacher (*), student_group (*, point_event (*, student_point (*), point_template(*, point_conversion_rule_type (*)))), student(*), point_group (*), ranking_group (*)")
        .gt("student_group.point_event.date", timeframeStart.toISODate())
        .lt("student_group.point_event.date", timeframeEnd.toISODate())
        .eq("id", schoolId)
        .single()

    if (schoolDataError) {
        console.error(schoolDataError)
        return null
    }

    return {
        school: {
            id: schoolData.id,
            name: schoolData.name
        },
        teachers: schoolData.teacher.map((teacher) => {
            return {
                id: teacher.id,
                name: teacher.last_name + ", " + teacher.first_name
            }
        }),
        students: schoolData.student.map((student) => {
            return {
                id: student.id,
                name: student.last_name + ", " + student.first_name,
                grade: student.grade,
                totalPoints: schoolData.student_group.reduce((totalPoints, studentGroup) => {
                    return totalPoints + studentGroup.point_event.reduce((totalPoints, pointEvent) => {
                        return totalPoints + pointEvent.student_point.reduce((totalPoints, studentPoint) => {
                            let pointValue = convertPointUsingRuleType(stringToRuleType(pointEvent.point_template?.point_conversion_rule_type?.name || ""), pointEvent.point_template?.conversion_rule_value || 0, studentPoint.input_score || 0)
                            if (studentPoint.student_id === student.id) {
                                return totalPoints + pointValue
                            } else {
                                return totalPoints
                            }
                        }, 0)
                    }, 0)
                }, 0)
            }
        }),
        studentGroups: schoolData.student_group.map((studentGroup) => {
            return {
                id: studentGroup.id,
                name: studentGroup.name,
                parentId: studentGroup.parent_id,
                pointEvents: studentGroup.point_event.map((pointEvent) => {
                    return {
                        id: pointEvent.id,
                        pointGroupId: pointEvent.point_template?.point_group_id || 0,
                        name: pointEvent.name || "",
                        date: pointEvent.date || "",
                        studentPoints: pointEvent.student_point.map((studentPoint) => {
                            let pointValue = convertPointUsingRuleType(stringToRuleType(pointEvent.point_template?.point_conversion_rule_type?.name || ""), pointEvent.point_template?.conversion_rule_value || 0, studentPoint.input_score || 0)
                            return {
                                studentId: studentPoint.student_id,
                                value: pointValue,
                                input: studentPoint.input_score || 0
                            }
                        })
                    }
                })
            }
        }),
        pointGroups: schoolData.point_group.map((pointGroup) => {
            return {
                id: pointGroup.id,
                name: pointGroup.name,
                color: pointGroup.color
            }
        }),
        rankingGroups: schoolData.ranking_group.map((rankingGroup) => {
            return {
                id: rankingGroup.id,
                name: rankingGroup.name
            }
        })
    }
}

export async function getAdminStudentDashboardData(
    schoolId: number,
    studentId: number
): Promise<AdminStudentDashboardData | null> {
    const schoolAccess = await checkAdminSchoolAccess(schoolId);
    if (!schoolAccess) return null

    const supabase = await supabaseServiceClient()

    const { data: timeframeData, error: timeframeDataError } = await supabase
        .from('school_timeframes')
        .select('*')
        .eq('school_id', schoolId)

    if (timeframeDataError) {
        console.error(timeframeDataError)
        return null
    }

    if (timeframeData === null) {
        console.error("Null school timeframe data")
        return null
    }

    let currentTimeframe = undefined
    let timeframeStart = DateTime.fromFormat("1970-01-01", "yyyy-MM-dd")
    let timeframeEnd = DateTime.fromFormat("2100-01-01", "yyyy-MM-dd")
    for (let timeframe of timeframeData) {
        if (timeframe.active) {
            currentTimeframe = timeframe
            break
        }
    }

    if (currentTimeframe) {
        timeframeStart = DateTime.fromISO(currentTimeframe.starts_at)
        timeframeEnd = DateTime.fromISO(currentTimeframe.ends_at)
    }

    const { data: pointData, error: pointDataError } = await supabase
        .from("student_group")
        .select("*, ranking_group (*), point_event (*, student_point (*, student (*)), point_template (*, point_group (*), point_conversion_rule_type (*)))")
        .eq("school_id", schoolId)
    // .gt("point_event.date", timeframeStart.toISODate())
    // .lt("point_event.date", timeframeEnd.toISODate())

    console.log(pointData)

    if (pointDataError) {
        console.error(pointDataError)
        return null
    }

    let formattedStudentData = pointData?.reduce((formattedData, studentGroup) => {
        studentGroup.point_event.forEach((pointEvent) => {
            pointEvent.student_point.forEach((studentPoint) => {
                let curStudentData = formattedData.find((studentData) => studentData.studentId === studentPoint.student_id)
                let pointValue = convertPointUsingRuleType(stringToRuleType(pointEvent.point_template?.point_conversion_rule_type?.name || ""), pointEvent.point_template?.conversion_rule_value || 0, studentPoint.input_score || 0)
                if (curStudentData) {
                    curStudentData.studentTotalPoints += pointValue
                    let curStudentGroupData = curStudentData.studentPointsByStudentGroup.find((studentGroupData) => studentGroupData.groupId === studentGroup.id)
                    if (curStudentGroupData) {
                        curStudentGroupData.points += pointValue
                    } else {
                        curStudentData.studentPointsByStudentGroup.push({
                            groupId: studentGroup.id,
                            groupName: studentGroup.name,
                            points: pointValue,
                            rank: -1
                        })
                    }
                    let curPointGroupData = curStudentData.studentPointsByPointGroup.find((pointGroupData) => pointGroupData.groupId === pointEvent.point_template?.point_group_id)
                    if (curPointGroupData) {
                        curPointGroupData.points += pointValue
                    } else {
                        curStudentData.studentPointsByPointGroup.push({
                            groupId: pointEvent.point_template?.point_group_id || 0,
                            groupName: pointEvent.point_template?.point_group?.name || "",
                            color: pointEvent.point_template?.point_group?.color || "",
                            points: pointValue,
                            rank: -1
                        })
                    }
                    studentGroup.ranking_group.map((rankingGroup) => {
                        return {
                            groupId: rankingGroup.id,
                            groupName: rankingGroup.name
                        }
                    }).forEach((rankingGroup) => {
                        if (curStudentData.studentRanksByRankingGroup.findIndex((foundGroup) => foundGroup.groupId === rankingGroup.groupId) === -1) {
                            curStudentData.studentRanksByRankingGroup.push({
                                ...rankingGroup,
                                rank: -1
                            })
                        }
                    })
                    curStudentData.pointEvents.push({
                        id: pointEvent.id,
                        name: pointEvent.name || "",
                        date: pointEvent.date || "",
                        pointGroup: {
                            id: pointEvent.point_template?.point_group_id || 0,
                            name: pointEvent.point_template?.point_group?.name || "",
                            color: pointEvent.point_template?.point_group?.color || ""
                        },
                        pointTemplate: {
                            id: pointEvent.point_template?.id || 0,
                            name: pointEvent.point_template?.name || "",
                            conversionRuleType: {
                                id: pointEvent.point_template?.point_conversion_rule_type?.id || 0,
                                name: pointEvent.point_template?.point_conversion_rule_type?.name || ""
                            },
                            conversionRuleValue: pointEvent.point_template?.conversion_rule_value || 0
                        },
                        maxInput: pointEvent.max_input || 0,
                        pointsEarned: {
                            input: studentPoint.input_score || 0,
                            value: pointValue
                        }
                    })
                } else {
                    formattedData.push({
                        studentId: studentPoint.student_id,
                        studentName: studentPoint.student?.last_name + ", " + studentPoint.student?.first_name,
                        studentTotalPoints: 0,
                        studentRankByGrade: {
                            grade: studentPoint.student?.grade || 0,
                            rank: -1
                        },
                        studentPointsByStudentGroup: [],
                        studentRanksByRankingGroup: [],
                        studentPointsByPointGroup: [],
                        pointEvents: []
                    })
                }
            })
        })
        return formattedData
    }, [] as {
        studentId: number,
        studentName: string,
        studentTotalPoints: number,
        studentRankByGrade: {
            grade: number,
            rank: number
        },
        studentPointsByStudentGroup: {
            groupId: number,
            groupName: string,
            points: number,
            rank: number
        }[],
        studentRanksByRankingGroup: {
            groupId: number,
            groupName: string,
            rank: number
        }[],
        studentPointsByPointGroup: {
            groupId: number,
            groupName: string,
            color: string,
            points: number,
            rank: number
        }[],
        pointEvents: {
            id: number,
            name: string,
            date: string,
            pointGroup: {
                id: number,
                name: string,
                color: string
            },
            pointTemplate: {
                id: number,
                name: string,
                conversionRuleType: {
                    id: number,
                    name: string
                },
                conversionRuleValue: number
            },
            maxInput: number,
            pointsEarned: {
                input: number,
                value: number
            }
        }[]
    }[])

    console.log(formattedStudentData)

    formattedStudentData?.forEach((student) => {
        student.studentRankByGrade.rank = formattedStudentData
            .copyWithin(0, 0)
            .filter((otherStudent) => otherStudent.studentRankByGrade.grade === student.studentRankByGrade.grade && otherStudent.studentTotalPoints > student.studentTotalPoints).length + 1
        student.studentPointsByStudentGroup.forEach((studentGroup) => {
            studentGroup.rank = formattedStudentData
                .sort((a, b) => (b.studentPointsByStudentGroup.find((group) => group.groupId === studentGroup.groupId)?.points ?? 0) - (a.studentPointsByStudentGroup.find((group) => group.groupId === studentGroup.groupId)?.points ?? 0)).findIndex((sortedStudent) => sortedStudent.studentId === student.studentId) + 1
        })
        student.studentPointsByPointGroup.forEach((pointGroup) => {
            pointGroup.rank = formattedStudentData
                .sort((a, b) => (b.studentPointsByPointGroup.find((group) => group.groupId === pointGroup.groupId)?.points ?? 0) - (a.studentPointsByPointGroup.find((group) => group.groupId === pointGroup.groupId)?.points ?? 0)).findIndex((sortedStudent) => sortedStudent.studentId === student.studentId) + 1
        })
        student.studentRanksByRankingGroup.forEach((rankingGroup) => {
            rankingGroup.rank = formattedStudentData.copyWithin(0, 0)
                .filter((student) => student.studentRanksByRankingGroup.findIndex((foundRankGroup) => foundRankGroup.groupId === rankingGroup.groupId) !== -1)
                .sort((a, b) => b.studentTotalPoints - a.studentTotalPoints)
                .findIndex((sortedStudent) => sortedStudent.studentId === student.studentId) + 1
        })
    })

    const thisStudent = formattedStudentData?.find((student) => student.studentId === studentId)

    return {
        student: {
            id: thisStudent?.studentId || 0,
            name: thisStudent?.studentName || "",
            grade: thisStudent?.studentRankByGrade.grade || 0,
            totalPoints: thisStudent?.studentTotalPoints || 0,
            rank: thisStudent?.studentRankByGrade.rank || 0,
            rankByStudentGroup: thisStudent?.studentPointsByStudentGroup.map((studentGroup) => {
                return {
                    groupId: studentGroup.groupId,
                    name: studentGroup.groupName,
                    points: studentGroup.points,
                    rank: studentGroup.rank,
                }
            }) || [],
            rankByPointGroup: thisStudent?.studentPointsByPointGroup.map((pointGroup) => {
                return {
                    groupId: pointGroup.groupId,
                    name: pointGroup.groupName,
                    color: pointGroup.color,
                    points: pointGroup.points,
                    rank: pointGroup.rank
                }
            }) || [],
            rankByGrade: {
                grade: thisStudent?.studentRankByGrade.grade || 0,
                rank: thisStudent?.studentRankByGrade.rank || 0
            }
        },
        pointEvents: formattedStudentData?.find((student) => student.studentId === studentId)?.pointEvents || []
    }
}

export async function getSchoolTimeframes(
    schoolId: number
): Promise<SchoolTimeframe[]> {
    const schoolAccess = await checkAdminSchoolAccess(schoolId);
    if (!schoolAccess) return []

    const supabase = await supabaseServiceClient()

    const { data: timeframeData, error: timeframeDataError } =
        await supabase.from('school_timeframes')
            .select('*')
            .eq('school_id', schoolId)

    if (timeframeDataError) {
        console.error(timeframeDataError)
        return []
    }

    if (timeframeData === null) {
        console.error("Null school timeframe data")
        return []
    }

    return timeframeData.map((timeframe) => {
        return {
            id: timeframe.id,
            createdAt: timeframe.created_at,
            startsAt: timeframe.starts_at,
            endsAt: timeframe.ends_at,
            name: timeframe.name,
            active: timeframe.active
        }
    })
}

export async function addSchoolTimeframe(
    schoolId: number,
    startsAt: string,
    endsAt: string,
    name: string
): Promise<boolean> {
    const schoolAccess = await checkAdminSchoolAccess(schoolId);
    if (!schoolAccess) return false

    const supabase = await supabaseServiceClient()

    const { error } =
        await supabase.from('school_timeframes')
            .insert({
                starts_at: startsAt,
                ends_at: endsAt,
                school_id: schoolId,
                name: name
            })

    if (error) {
        console.error(error)
        return false
    }

    return true
}

export async function editSchoolTimeframe(
    schoolId: number,
    timeframeId: number,
    startsAt: string,
    endsAt: string,
    name: string
): Promise<boolean> {
    const schoolAccess = await checkAdminSchoolAccess(schoolId);
    if (!schoolAccess) return false

    const supabase = await supabaseServiceClient()

    const { error } =
        await supabase.from('school_timeframes')
            .update({
                starts_at: startsAt,
                ends_at: endsAt,
                name: name
            })
            .eq('id', timeframeId)
            .eq('school_id', schoolId)

    if (error) {
        console.error(error)
        return false
    }

    return true
}

export async function deleteSchoolTimeframe(
    schoolId: number,
    timeframeId: number
): Promise<boolean> {
    const schoolAccess = await checkAdminSchoolAccess(schoolId);
    if (!schoolAccess) return false

    const supabase = await supabaseServiceClient()

    const { error } =
        await supabase.from('school_timeframes')
            .delete()
            .eq('school_id', schoolId)
            .eq('id', timeframeId)

    if (error) {
        console.error(error)
        return false
    }

    return true
}

export async function activateSchoolTimeframe(
    schoolId: number,
    timeframeId: number
): Promise<boolean> {
    const schoolAccess = await checkAdminSchoolAccess(schoolId);
    if (!schoolAccess) return false

    const supabase = await supabaseServiceClient()

    const { error: error1 } =
        await supabase.from('school_timeframes')
            .update({
                active: true
            })
            .eq('school_id', schoolId)
            .eq('id', timeframeId)

    if (error1) {
        console.error(error1)
        return false
    }

    const { error: error2 } =
        await supabase.from('school_timeframes')
            .update({
                active: false
            })
            .eq('school_id', schoolId)
            .neq('id', timeframeId)

    if (error2) {
        console.error(error2)
        return false
    }

    return true
}