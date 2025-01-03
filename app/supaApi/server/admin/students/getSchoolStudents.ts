"use server";
import { LinkedStudent } from "@/app/supaApi/mappers/dataTypes";
import supabaseServiceClient from "../../supabaseServiceClient";

export default async function getSchoolStudents(schoolId: number): Promise<LinkedStudent[] | null> {
    const supabase = await supabaseServiceClient();

    const { data: studentData, error: studentDataError } = await supabase.from("student").select("*, linkedUser: user!student_linkedUser_fkey (*)").eq("school_id", schoolId);

    if (studentDataError) {
        console.error(studentDataError);
        return null;
    }

    if (studentData === null) return null;

    return studentData as LinkedStudent[] | null;
}