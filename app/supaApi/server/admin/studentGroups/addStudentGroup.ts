"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import checkAdminSchoolAccess from "../schools/checkAdminSchoolAccess";

export default async function addStudentGroup(schoolId: number, name: string, parentId: number | null): Promise<boolean> {
    const adminAccess = await checkAdminSchoolAccess(schoolId);

    if (!adminAccess) return false;

    const supabase = await supabaseServiceClient();

    const { error } = await supabase.from("student_group").insert([{ school_id: schoolId, name: name, parent_id: parentId }]);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}