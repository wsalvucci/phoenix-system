"use server";
import { DateTime } from "luxon";
import checkAdminSchoolAccess from "./schools/checkAdminSchoolAccess";
import supabaseServiceClient from "../supabaseServiceClient";

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