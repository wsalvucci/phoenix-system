"use server";
import checkAdminTeacherAccess from "./checkAdminTeacherAccess";
import supabaseServiceClient from "../../supabaseServiceClient";

/** Detaches the teacher record from its account. The caller must be an admin of the teacher's school. */
export default async function unlinkTeacher(teacherId: number): Promise<boolean> {
    const adminAccess = await checkAdminTeacherAccess(teacherId);

    if (!adminAccess) return false;

    const supabase = await supabaseServiceClient();

    const { error } = await supabase.from("teacher").update({ linked_user: null }).eq("id", teacherId);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}
