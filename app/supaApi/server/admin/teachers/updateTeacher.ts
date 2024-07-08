"use server";
import checkAdminTeacherAccess from "./checkAdminTeacherAccess";
import supabaseServiceClient from "../../supabaseServiceClient";

export default async function updateTeacher(teacherId: number, property: string, value: any): Promise<boolean> {
    const adminAccess = await checkAdminTeacherAccess(teacherId);

    if (!adminAccess) return false;

    const supabase = await supabaseServiceClient();

    const { data: teacherUpdateData, error: teacherUpdateError } = await supabase.from("teacher").update({ [property]: value }).eq("id", teacherId).single();

    if (teacherUpdateError) {
        console.error(teacherUpdateError);
        return false;
    }

    if (teacherUpdateData === null) return false;

    return true;
}