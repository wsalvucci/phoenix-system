"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import getAdminSchoolPairs from "../schools/getAdminSchoolPairs";

export default async function checkAdminStudentAccess(studentId: number): Promise<boolean> {
    const adminPairs = await getAdminSchoolPairs();

    if (adminPairs === null) return false;

    const schoolIds = adminPairs.map(pair => pair.school_id);
    const supabase = await supabaseServiceClient();

    const { data: studentData, error: studentDataError } = await supabase.from("student").select("*").eq("id", studentId).single();

    if (studentDataError) {
        console.error(studentDataError);
        return false;
    }

    if (studentData === null) return false;

    return schoolIds.includes(studentData.school_id);
}