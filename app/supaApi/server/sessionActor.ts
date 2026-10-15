// Session-derived actor for the 2026-10-14 service_role RPCs (BACKEND_PLAN.md §3–§7).
//
// Plain server module (NOT "use server"): nothing here may become a POST-able endpoint. Every RPC
// wrapper resolves the actor here from the Supabase session, checks it in TypeScript, then passes it
// to an RPC that re-checks it in SQL. Neither layer takes a user id from the browser.
import getOwnUserData from "./getOwnUserData";
import supabaseServiceClient from "./supabaseServiceClient";

/** "user".id of the signed-in caller, or null without a session / Phoenix user row. */
export async function getSessionUserId(): Promise<number | null> {
    const user = await getOwnUserData();
    return user?.id ?? null;
}

/** The student record this account owns (student."linkedUser", the web link model), or null.
 *  Parents never resolve here (L11), which is what the leader and share paths require. */
export async function getOwnStudent(userId: number): Promise<{ id: number; schoolId: number } | null> {
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase
        .from("student")
        .select("id, school_id")
        .eq("linkedUser", userId)
        .order("id")
        .limit(1)
        .maybeSingle();
    if (error) {
        console.error("getOwnStudent failed", error.message);
        return null;
    }
    return data ? { id: data.id, schoolId: data.school_id } : null;
}

/** Same rule as SQL public.can_view_student, checked independently: the student's own account or a
 *  linked parent (user_student_pair). Fails closed on any error. */
export async function canViewStudent(userId: number, studentId: number): Promise<boolean> {
    if (!Number.isInteger(studentId) || studentId <= 0) return false;
    const supabase = await supabaseServiceClient();
    const [own, parent] = await Promise.all([
        supabase.from("student").select("id").eq("id", studentId).eq("linkedUser", userId).maybeSingle(),
        supabase.from("user_student_pair").select("student_id").eq("user_id", userId).eq("student_id", studentId).limit(1),
    ]);
    if (own.error || parent.error) {
        console.error("canViewStudent failed", own.error?.message ?? parent.error?.message);
        return false;
    }
    return own.data !== null || (parent.data?.length ?? 0) > 0;
}

/** True only when the user is an admin of this school. Uses the SQL helper that every admin RPC also
 *  uses internally; the RPC then re-checks against the row's own school. */
export async function isAdminOfSchool(userId: number, schoolId: number): Promise<boolean> {
    if (!Number.isInteger(schoolId)) return false;
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("is_admin_of_school", { p_user_id: userId, p_school_id: schoolId });
    if (error) {
        console.error("is_admin_of_school failed", error.message);
        return false;
    }
    return data === true;
}
