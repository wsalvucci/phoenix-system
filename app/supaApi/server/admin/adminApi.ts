"use server";
import { DateTime } from "luxon";
import checkAdminSchoolAccess from "./schools/checkAdminSchoolAccess";
import supabaseServiceClient from "../supabaseServiceClient";
import { AdminDashboardData, SchoolTimeframe } from "@/app/dataClasses";

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

    const { data: schoolData, error: schoolDataError } = await supabase
        .from("school")
        .select("*, teacher (*), student_group (*), student(*), point_group (*), ranking_group (*)")
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
                grade: student.grade
            }
        }),
        studentGroups: schoolData.student_group.map((studentGroup) => {
            return {
                id: studentGroup.id,
                name: studentGroup.name,
                parentId: studentGroup.parent_id
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