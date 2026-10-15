// NOTE: deliberately NOT a "use server" module (see staffAccess.ts). Plain helpers for the admin
// actions: derive the caller from the session, find the school of the ROW being touched, and require
// the caller to be an admin of that school. Nothing here trusts a school id sent by the browser
// unless it is then compared with the row's own school.
import { getSessionUserId, isAdminOfSchool } from "./sessionActor";
import supabaseServiceClient from "./supabaseServiceClient";

export type SchoolOwnedTable =
    | "student"
    | "teacher"
    | "student_group"
    | "ranking_group"
    | "point_group"
    | "school_timeframes";

/** school_id of a row, or null when it does not exist / has no school. */
export async function schoolOfRow(table: SchoolOwnedTable, id: number): Promise<number | null> {
    if (!Number.isInteger(id) || id <= 0) return null;
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.from(table).select("school_id").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return (data as { school_id: number | null }).school_id ?? null;
}

/** Throws unless the session caller is an admin of this school. Returns the caller's user id. */
export async function requireAdminOfSchool(schoolId: number): Promise<number> {
    const userId = await getSessionUserId();
    if (userId === null) throw new Error("User not authenticated");
    if (!(await isAdminOfSchool(userId, schoolId))) {
        throw new Error("Access denied - admin does not have access to this school");
    }
    return userId;
}

/** Throws unless the caller is an admin of the school that owns this row. Returns that school id. */
export async function requireAdminOfRow(table: SchoolOwnedTable, id: number): Promise<number> {
    const schoolId = await schoolOfRow(table, id);
    if (schoolId === null) throw new Error("Not found");
    await requireAdminOfSchool(schoolId);
    return schoolId;
}

/** Throws unless every id is a row of `table` that belongs to `schoolId`. Empty list passes. */
export async function assertRowsInSchool(table: SchoolOwnedTable, ids: number[], schoolId: number): Promise<void> {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return;
    if (unique.some((id) => !Number.isInteger(id) || id <= 0)) throw new Error("Not found");
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.from(table).select("id").eq("school_id", schoolId).in("id", unique);
    if (error || (data?.length ?? 0) !== unique.length) {
        throw new Error("Record not found in this school");
    }
}

/** Requires the caller to administer the school of every listed row, and all rows to share one school. */
export async function requireSameSchoolAdmin(rows: Array<[SchoolOwnedTable, number]>): Promise<number> {
    const schools = await Promise.all(rows.map(([t, id]) => schoolOfRow(t, id)));
    if (schools.some((s) => s === null) || new Set(schools).size !== 1) {
        throw new Error("Access denied - records belong to different schools");
    }
    await requireAdminOfSchool(schools[0] as number);
    return schools[0] as number;
}
