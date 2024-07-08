"use server";
import getOwnUserData from "./getOwnUserData";
import supabaseServiceClient from "./supabaseServiceClient";

export default async function linkTeacher(schoolId: number, linkCode: string): Promise<{ success: boolean, message: string }> {
    const userData = await getOwnUserData();

    if (!userData) return { success: false, message: "User not found" };

    const supabase = await supabaseServiceClient();

    // Check if the teacher exists
    const { data: teacherData, error: teacherDataError } = await supabase.from("teacher").select("*").eq("link_code", linkCode).maybeSingle();

    if (teacherDataError) {
        console.error("Error fetching teacher", teacherDataError);
        return { success: false, message: "Error fetching teacher" };
    } else if (teacherData === null) {
        console.log("No teacher found for link code: " + linkCode);
        return { success: false, message: "No teacher found for link code: " + linkCode };
    }

    // Check if the teacher belongs to the school
    if (teacherData.school_id !== schoolId) {
        console.log("Teacher is not associated with this school");
        return { success: false, message: "Teacher is not associated with this school" };
    }

    // Check if the teacher is already linked
    if (teacherData.linked_user !== null) {
        console.log("Teacher is already linked");
        return { success: false, message: "Teacher is already linked" };
    }

    // Link the teacher
    const { error } = await supabase.from("teacher").update({ linked_user: userData.id }).eq("id", teacherData.id);

    if (error) {
        console.error("Error linking teacher", error);
        return { success: false, message: "Error linking teacher" };
    }

    return { success: true, message: "Teacher linked successfully" };
}