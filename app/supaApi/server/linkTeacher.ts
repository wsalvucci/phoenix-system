"use server";
import getOwnUserData from "./getOwnUserData";
import supabaseServiceClient from "./supabaseServiceClient";

export default async function linkTeacher(schoolId: number, linkCode: string): Promise<{ success: boolean, message: string, linkId: number | null }> {
    const userData = await getOwnUserData();

    if (!userData) return { success: false, message: "User not found", linkId: null };

    const supabase = await supabaseServiceClient();

    // Check if the teacher exists
    const { data: teacherData, error: teacherDataError } = await supabase.from("teacher").select("*").eq("link_code", linkCode).maybeSingle();

    if (teacherDataError) {
        console.error("Error fetching teacher", teacherDataError);
        return { success: false, message: "Error fetching teacher", linkId: null };
    } else if (teacherData === null) {
        console.log("No teacher found for link code: " + linkCode);
        return { success: false, message: "No teacher found for link code: " + linkCode, linkId: null };
    }

    // Check if the teacher belongs to the school
    if (teacherData.school_id !== schoolId) {
        console.log("Teacher is not associated with this school");
        return { success: false, message: "Teacher is not associated with this school", linkId: null };
    }

    // Check if the teacher is already linked
    if (teacherData.linked_user !== null) {
        console.log("Teacher is already linked");
        return { success: false, message: "Teacher is already linked", linkId: null };
    }

    // Link the teacher
    const { data: linkedData, error: linkedDataError } = await supabase.from("teacher").update({ linked_user: userData.id }).eq("id", teacherData.id).select("id").single();

    if (linkedDataError) {
        console.error("Error linking teacher", linkedDataError);
        return { success: false, message: "Error linking teacher", linkId: null };
    }

    return { success: true, message: "Teacher linked successfully", linkId: linkedData.id };
}