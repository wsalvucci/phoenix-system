// DISPLAY-tier cut rows (BACKEND_PLAN.md §3, DATA_DISCLOSURE.md §3, §8.7).
//
// Plain server module (NOT "use server"). The cut is computed in SQL (public.display_cut): at most
// `cut` rows, shrink-only ties, no cohort size, no student id. Here the viewer is checked first:
// a staff viewer must be staff of the school; a display viewer may only ask for its own bound school.
// display_cut then re-checks the actor (is_staff_of_school, or display_device_live).
// Why service_role: a display device has no Postgres identity, and "the top k of a set you may not
// read row by row" is not expressible as a row policy.
import type { Cohort, DisplayStudentRow } from "@/app/supaApi/universal/displayTypes";
import type { DashboardViewer } from "../display/displayAccess";
import supabaseServiceClient from "../supabaseServiceClient";

export type { Cohort, DisplayStudentRow };

export function cohortKey(cohort: Cohort): string {
    switch (cohort.kind) {
        case "overall": return "overall";
        case "grade": return `grade-${cohort.grade}`;
        case "pointGroup": return `pg-${cohort.pointGroupId}`;
        case "studentGroup": return `sg-${cohort.studentGroupId}`;
    }
}

function cohortArgs(cohort: Cohort): { kind: string; id: number | null } | null {
    switch (cohort.kind) {
        case "overall": return { kind: "overall", id: null };
        case "grade": return Number.isInteger(cohort.grade) ? { kind: "grade", id: cohort.grade } : null;
        case "pointGroup": return Number.isInteger(cohort.pointGroupId) ? { kind: "point_group", id: cohort.pointGroupId } : null;
        case "studentGroup": return Number.isInteger(cohort.studentGroupId) ? { kind: "student_group", id: cohort.studentGroupId } : null;
        default: return null;
    }
}

/** `viewer` comes from getDashboardViewer(), never from the browser. Empty means "nothing to show". */
export async function getDisplayCut(
    viewer: DashboardViewer,
    schoolId: number,
    timeframeId: number,
    cohort: Cohort,
): Promise<readonly DisplayStudentRow[]> {
    if (!Number.isInteger(schoolId) || !Number.isInteger(timeframeId)) return [];
    const args = cohortArgs(cohort);
    if (args === null) return [];
    if (viewer.kind === "display" && viewer.schoolId !== schoolId) return [];
    if (viewer.kind === "staff" && !viewer.schoolIds.includes(schoolId)) return [];

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("display_cut", {
        p_school_id: schoolId,
        p_timeframe_id: timeframeId,
        p_cohort_kind: args.kind,
        // Generated types mark this required; SQL accepts NULL for the overall cohort.
        p_cohort_id: args.id as number,
        ...(viewer.kind === "staff" ? { p_actor_user_id: viewer.userId } : { p_display_device_id: viewer.deviceId }),
    });
    if (error) {
        console.error("display_cut failed", error.message);
        return [];
    }
    const prefix = cohortKey(cohort);
    return (data ?? []).map((row, index) => ({
        key: `${prefix}:${index}`,
        rank: row.display_rank,
        firstName: row.first_name,
        lastName: row.last_name,
        grade: row.grade,
        totalPoints: row.total_points,
    }));
}
