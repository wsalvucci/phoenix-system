"use server";
import { getCallerAccess } from "../staffAccess";
import supabaseServiceClient from "../supabaseServiceClient";

/** A school the current dashboard caller may display. Names only: no counts, no roster. */
export type DashboardSchool = { id: number; name: string };

/**
 * Picks the school a staff caller's dashboard should show.
 * `requested` is only a preference: it is honoured iff the session caller is
 * staff of that school, otherwise we fall back to their lowest-id school.
 * Returns null when the caller is not staff anywhere. The result is always one
 * of the caller's own schools, so this discloses nothing beyond their own ids.
 */
export async function getDashboardSchoolId(requested: number | null): Promise<number | null> {
    const access = await getCallerAccess();
    if (access === null || access.staffSchoolIds.length === 0) return null;
    if (requested !== null && Number.isInteger(requested) && access.staffSchoolIds.includes(requested)) {
        return requested;
    }
    return Math.min(...access.staffSchoolIds);
}

/**
 * The schools the session caller may open a dashboard for, for the school switcher
 * (DATA_DISCLOSURE.md §10.7: ALLOW, own schools only, names only). Sorted by name, then id.
 *
 * Who: an admin (every admin_school_pair school) or a teacher (teacher.school_id), resolved
 * from the session by getCallerAccess. It takes no arguments, so a caller cannot widen it.
 * Anyone else gets []. Once display devices ship (BACKEND_PLAN.md section 4), a display
 * session returns exactly its one bound school here.
 */
export async function getDashboardSchools(): Promise<DashboardSchool[]> {
    const access = await getCallerAccess();
    if (access === null || access.staffSchoolIds.length === 0) return [];

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase
        .from("school")
        .select("id, name")
        .in("id", access.staffSchoolIds);
    if (error || !data) {
        console.error("getDashboardSchools: school lookup failed", error?.message);
        return [];
    }

    return data
        .map((school) => ({ id: school.id, name: school.name }))
        .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
}
