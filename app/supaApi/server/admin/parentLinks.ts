"use server";
// Admin: parent links on a student's record, revocation (audited), and code rotation
// (BACKEND_PLAN.md §6.1, DATA_DISCLOSURE.md §10.4 "parent links must be listed ... and revocable",
// hard rule 4: the new code is returned only to the staff issuing screen).
//
// Authorization, twice: (1) here, the session user must be an admin of the record's own school,
// looked up from the record (never from a school id the browser sends); (2) each RPC re-checks
// is_admin_of_school against the row's school. Service_role is used because parent emails live in
// auth.users and the audit table has no API grant; no RLS policy can expose either safely.
import { getSessionUserId, isAdminOfSchool } from "../sessionActor";
import supabaseServiceClient from "../supabaseServiceClient";

export type ParentLink = {
    parentUserId: number;
    linkedAt: string;
    parentName: string | null;
    parentEmail: string | null;
};

async function adminOfRecord(kind: "student" | "teacher", id: number): Promise<number | null> {
    if (!Number.isInteger(id) || id <= 0) return null;
    const userId = await getSessionUserId();
    if (userId === null) return null;
    const supabase = await supabaseServiceClient();
    const { data, error } = kind === "student"
        ? await supabase.from("student").select("school_id").eq("id", id).maybeSingle()
        : await supabase.from("teacher").select("school_id").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return (await isAdminOfSchool(userId, data.school_id)) ? userId : null;
}

export async function listParentLinks(studentId: number): Promise<ParentLink[]> {
    const actor = await adminOfRecord("student", studentId);
    if (actor === null) return [];
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("admin_list_parent_links", { p_actor_user_id: actor, p_student_id: studentId });
    if (error) {
        console.error("admin_list_parent_links failed", error.message);
        return [];
    }
    return (data ?? []).map((row) => ({
        parentUserId: row.parent_user_id,
        linkedAt: row.linked_at,
        parentName: row.parent_name ?? null,
        parentEmail: row.parent_email ?? null,
    }));
}

/** Removes one parent link and writes a parent_link_revocation audit row. */
export async function revokeParentLink(studentId: number, parentUserId: number): Promise<boolean> {
    if (!Number.isInteger(parentUserId) || parentUserId <= 0) return false;
    const actor = await adminOfRecord("student", studentId);
    if (actor === null) return false;
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("admin_revoke_parent_link", {
        p_actor_user_id: actor,
        p_student_id: studentId,
        p_parent_user_id: parentUserId,
    });
    if (error) {
        console.error("admin_revoke_parent_link failed", error.message);
        return false;
    }
    return data === true;
}

/** Issues a fresh 50-bit code. Existing links are kept; the old code stops working. */
export async function rotateLinkCode(kind: "student" | "teacher", id: number): Promise<{ code: string } | null> {
    if (kind !== "student" && kind !== "teacher") return null;
    const actor = await adminOfRecord(kind, id);
    if (actor === null) return null;
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("admin_rotate_link_code", { p_actor_user_id: actor, p_kind: kind, p_id: id });
    if (error || typeof data !== "string") {
        console.error("admin_rotate_link_code failed", error?.message);
        return null;
    }
    return { code: data };
}
