"use server";
import { getDashboardViewer } from "../display/displayAccess";
import supabaseServiceClient from "../supabaseServiceClient";

/** A school the current dashboard caller may display. Names only: no counts, no roster. */
export type DashboardSchool = { id: number; name: string };

/** Who is looking at /dashboard. A display gets its own label and "Paired by" name (§10.7, ALLOWED),
 *  nothing else; no device id. */
export type DashboardViewerSummary =
    | { kind: "staff" }
    | { kind: "display"; schoolName: string; label: string; pairedByName: string | null };

/**
 * Picks the school the current dashboard should show. The viewer comes from getDashboardViewer()
 * (display cookie, else staff session). A display always gets its one bound school and `requested`
 * is ignored. For staff, `requested` is only a preference: it is honoured iff the caller is staff of
 * that school, otherwise we fall back to their lowest-id school. Null when there is no viewer.
 */
export async function getDashboardSchoolId(requested: number | null): Promise<number | null> {
    const viewer = await getDashboardViewer();
    if (viewer === null) return null;
    if (viewer.kind === "display") return viewer.schoolId;
    if (viewer.schoolIds.length === 0) return null;
    if (requested !== null && Number.isInteger(requested) && viewer.schoolIds.includes(requested)) {
        return requested;
    }
    return Math.min(...viewer.schoolIds);
}

/**
 * The schools the caller may open a dashboard for, for the school switcher
 * (DATA_DISCLOSURE.md §10.7: ALLOW, own schools only, names only). Sorted by name, then id.
 * A display gets exactly its one bound school. Staff (admin via admin_school_pair, teacher via
 * teacher.school_id) get their own schools. Anyone else gets []. Takes no arguments, so a caller
 * cannot widen it.
 */
export async function getDashboardSchools(): Promise<DashboardSchool[]> {
    const viewer = await getDashboardViewer();
    if (viewer === null) return [];
    if (viewer.kind === "display") return [{ id: viewer.schoolId, name: viewer.schoolName }];
    if (viewer.schoolIds.length === 0) return [];

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase
        .from("school")
        .select("id, name")
        .in("id", viewer.schoolIds);
    if (error || !data) {
        console.error("getDashboardSchools: school lookup failed", error?.message);
        return [];
    }

    return data
        .map((school) => ({ id: school.id, name: school.name }))
        .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
}

/** Lets the hub hide staff-only controls on a display and show "Paired by". Null: no viewer. */
export async function getDashboardViewerSummary(): Promise<DashboardViewerSummary | null> {
    const viewer = await getDashboardViewer();
    if (viewer === null) return null;
    if (viewer.kind === "staff") return { kind: "staff" };
    return { kind: "display", schoolName: viewer.schoolName, label: viewer.label, pairedByName: viewer.pairedByName };
}
