"use server";
import getOwnUserData from "./getOwnUserData";
import supabaseServiceClient from "./supabaseServiceClient";

// One message for every way a code can fail to match. DATA_DISCLOSURE.md D11 / §10.4.
const NO_MATCH_MESSAGE = "That code did not match. Check the school number and code and try again.";

export default async function linkTeacher(schoolId: number, linkCode: string): Promise<{ success: boolean, message: string, linkId: number | null }> {
    const userData = await getOwnUserData();

    if (!userData) return { success: false, message: "User not found", linkId: null };

    const supabase = await supabaseServiceClient();

    // Check if the teacher exists
    const { data: teacherData, error: teacherDataError } = await supabase.from("teacher").select("id, school_id, linked_user").eq("link_code", linkCode.trim()).maybeSingle();

    if (teacherDataError) {
        console.error("Error fetching teacher", teacherDataError.message);
        return { success: false, message: "Error fetching teacher", linkId: null };
    } else if (teacherData === null) {
        return { success: false, message: NO_MATCH_MESSAGE, linkId: null };
    }

    // Check if the teacher belongs to the school
    if (teacherData.school_id !== schoolId) {
        return { success: false, message: NO_MATCH_MESSAGE, linkId: null };
    }

    // Check if the teacher is already linked
    if (teacherData.linked_user !== null) {
        return { success: false, message: NO_MATCH_MESSAGE, linkId: null };
    }

    // Link the teacher
    const { data: linkedData, error: linkedDataError } = await supabase.from("teacher").update({ linked_user: userData.id }).eq("id", teacherData.id).select("id").single();

    if (linkedDataError) {
        console.error("Error linking teacher", linkedDataError.message);
        return { success: false, message: "Error linking teacher", linkId: null };
    }

    return { success: true, message: "Teacher linked successfully", linkId: linkedData.id };
}