"use server";
import getOwnUserData from "./getOwnUserData";
import supabaseServiceClient from "./supabaseServiceClient";

export default async function linkStudent(schoolId: number, linkCode: string): Promise<{ success: boolean, message: string, linkId: number | null }> {
    const userData = await getOwnUserData();

    if (!userData) return { success: false, message: "User not found", linkId: null };

    const supabase = await supabaseServiceClient();

    // Check if the student exists
    const { data: studentData, error: studentDataError } = await supabase.from("student").select("*").eq("link_code", linkCode).maybeSingle();

    if (studentDataError) {
        console.error("Error fetching student", studentDataError);
        return { success: false, message: "Error fetching student", linkId: null };
    } else if (studentData === null) {
        console.log("No student found for link code: " + linkCode);
        return { success: false, message: "No student found for link code: " + linkCode, linkId: null };
    }

    // Check if the student belongs to the school
    if (studentData.school_id !== schoolId) {
        console.log("Student is not associated with this school");
        return { success: false, message: "Student is not associated with this school", linkId: null };
    }

    // Check if the student is already linked
    if (studentData.linkedUser !== null) {
        console.log("Student is already linked");
        return { success: false, message: "Student is already linked", linkId: null };
    }

    // Link the student
    const { data: linkedData, error: linkedDataError } = await supabase.from("student").update({ linkedUser: userData.id }).eq("id", studentData.id).select("id").single();

    if (linkedDataError) {
        console.error("Error linking student", linkedDataError);
        return { success: false, message: "Error linking student", linkId: null };
    }

    return { success: true, message: "Student linked successfully", linkId: linkedData.id };
}