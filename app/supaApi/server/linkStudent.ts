"use server";
import getOwnUserData from "./getOwnUserData";
import supabaseServiceClient from "./supabaseServiceClient";

// One message for every way a code can fail to match (wrong code, wrong school,
// already linked), so the response cannot be used to probe codes. DATA_DISCLOSURE.md §10.4.
const NO_MATCH_MESSAGE = "That code did not match. Check the school number and code and try again.";

export default async function linkStudent(schoolId: number, linkCode: string): Promise<{ success: boolean, message: string, linkId: number | null }> {
    const userData = await getOwnUserData();

    if (!userData) return { success: false, message: "User not found", linkId: null };

    const code = typeof linkCode === "string" ? linkCode.trim() : "";
    if (!Number.isInteger(schoolId) || code === "") {
        return { success: false, message: NO_MATCH_MESSAGE, linkId: null };
    }

    const supabase = await supabaseServiceClient();

    // Match on code, school, and unlinked in one query so the three failure modes are indistinguishable.
    const { data: studentData, error: studentDataError } = await supabase
        .from("student")
        .select("id")
        .eq("link_code", code)
        .eq("school_id", schoolId)
        .is("linkedUser", null)
        .maybeSingle();

    if (studentDataError) {
        console.error("Error fetching student", studentDataError.message);
        return { success: false, message: "Something went wrong. Please try again.", linkId: null };
    }

    if (studentData === null) {
        return { success: false, message: NO_MATCH_MESSAGE, linkId: null };
    }

    // Link the student (the unlinked guard is repeated so two simultaneous attempts cannot both win)
    const { data: linkedData, error: linkedDataError } = await supabase
        .from("student")
        .update({ linkedUser: userData.id })
        .eq("id", studentData.id)
        .is("linkedUser", null)
        .select("id")
        .maybeSingle();

    if (linkedDataError) {
        console.error("Error linking student", linkedDataError.message);
        return { success: false, message: "Something went wrong. Please try again.", linkId: null };
    }

    if (linkedData === null) {
        return { success: false, message: NO_MATCH_MESSAGE, linkId: null };
    }

    return { success: true, message: "Student linked successfully", linkId: linkedData.id };
}
