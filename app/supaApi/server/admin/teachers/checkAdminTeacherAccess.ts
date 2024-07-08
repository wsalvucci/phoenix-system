"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import getAdminSchoolPairs from "../schools/getAdminSchoolPairs";

export default async function checkAdminTeacherAccess(teacherId: number): Promise<boolean> {
    const adminPairs = await getAdminSchoolPairs();

    if (adminPairs === null) return false;

    const schoolIds = adminPairs.map(pair => pair.school_id);
    const supabase = await supabaseServiceClient();

    const { data: teacherData, error: teacherDataError } = await supabase.from("teacher").select("*").eq("id", teacherId).single();

    if (teacherDataError) {
        console.error(teacherDataError);
        return false;
    }

    if (teacherData === null) return false;

    return schoolIds.includes(teacherData.school_id);
}