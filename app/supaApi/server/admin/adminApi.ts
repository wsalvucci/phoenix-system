"use server";
import { DateTime } from "luxon";
import checkAdminSchoolAccess from "./schools/checkAdminSchoolAccess";
import supabaseServiceClient from "../supabaseServiceClient";
import { AdminDashboardData } from "@/app/dataClasses";

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