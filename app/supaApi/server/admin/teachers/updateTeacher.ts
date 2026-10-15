"use server";
import checkAdminTeacherAccess from "./checkAdminTeacherAccess";
import supabaseServiceClient from "../../supabaseServiceClient";

/** The only teacher fields an admin may edit. link_code, linked_user and school_id are deliberately absent:
 *  codes go through rotateLinkCode and unlinking through unlinkTeacher. */
export type TeacherPatch = {
    firstName?: string;
    lastName?: string;
};

export default async function updateTeacher(teacherId: number, patch: TeacherPatch): Promise<boolean> {
    // Build the column map from known keys only; anything else the browser sends is ignored.
    const update: { first_name?: string; last_name?: string } = {};
    for (const [key, column] of [["firstName", "first_name"], ["lastName", "last_name"]] as const) {
        const value = (patch as Record<string, unknown> | null | undefined)?.[key];
        if (value === undefined) continue;
        if (typeof value !== "string" || value.trim() === "" || value.length > 100) return false;
        update[column] = value.trim();
    }
    if (Object.keys(update).length === 0) return false;

    const adminAccess = await checkAdminTeacherAccess(teacherId);

    if (!adminAccess) return false;

    const supabase = await supabaseServiceClient();

    const { error: teacherUpdateError } = await supabase.from("teacher").update(update).eq("id", teacherId);

    if (teacherUpdateError) {
        console.error(teacherUpdateError);
        return false;
    }

    return true;
}
