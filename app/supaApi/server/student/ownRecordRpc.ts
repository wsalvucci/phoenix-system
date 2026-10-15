// Student / parent wrappers for the 2026-10-14 RPCs (BACKEND_PLAN.md §3, §5, §6.1, §7).
//
// Plain server module (NOT "use server"): these are read by server components only, so none of them
// is a POST-able endpoint. Each one resolves the actor from the session, checks it in TypeScript,
// and calls a service_role-only RPC that re-checks the same rule in SQL. Why not RLS: every one of
// these is an aggregate over other students' rows (a gap, a percentile band) or a write-on-read
// (notices marked seen, the daily letter snapshot) that no row policy can express without exposing
// the underlying rows.
import { canViewStudent, getOwnStudent, getSessionUserId } from "../sessionActor";
import supabaseServiceClient from "../supabaseServiceClient";
import {
    mapLeaderGroupLetters,
    mapOwnLedLetters,
    mapPointsToNext,
    type LeaderGroupLetters,
    type OwnLedLetters,
    type PointsToNextRank,
} from "../../mappers/rpcMappers";

export type { LeaderGroupLetters, OwnLedLetters, PointsToNextRank };
export type ShareWithdrawalNotice ={ eventName: string | null; eventDate: string | null; withdrawnAt: string };

/**
 * "N points to move up" per cohort, replacing the nearby lists (§9.3, §10.2). Overall always; grade,
 * point group and student group only with at least 10 ranked participants; nothing at rank 1 or for
 * an unranked student (D19). Who: the student's own account or a linked parent.
 */
export async function getPointsToNextRank(studentId: number, timeframeId: number): Promise<PointsToNextRank | null> {
    if (!Number.isInteger(timeframeId) || timeframeId <= 0) return null;
    const userId = await getSessionUserId();
    if (userId === null || !(await canViewStudent(userId, studentId))) return null;

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("points_to_next_rank", {
        p_actor_user_id: userId,
        p_student_id: studentId,
        p_timeframe_id: timeframeId,
    });
    if (error) {
        console.error("points_to_next_rank failed", error.message);
        return null;
    }
    const gaps = mapPointsToNext(data ?? []);
    // §11.5 G-b (proposed ruling in force): the overall gap also needs MIN_COHORT_FOR_AGGREGATE (10)
    // ranked students. points_to_next_rank does not apply it to 'overall' yet, so it is applied here
    // from the same D19 cohort size until the SQL is amended.
    if (gaps.overall !== null) {
        // The floor is read from publication_cut_policy(), the single copy of the thresholds (D20).
        const [standing, policy] = await Promise.all([
            getOwnStanding(studentId, timeframeId),
            supabase.rpc("publication_cut_policy"),
        ]);
        const floor = policy.data?.[0]?.min_cohort_for_aggregate;
        if (!standing?.overall || typeof floor !== "number" || standing.overall.outOf < floor) gaps.overall = null;
    }
    return gaps;
}

export type OwnRank = { rank: number; outOf: number };
export type OwnStanding = {
    overall: OwnRank | null;
    grade: OwnRank | null;
    /** Ranked point groups only (D18), and only those where the student is ranked. */
    pointGroups: ({ pointGroupId: number; pointGroupName: string; pointGroupColor: string } & OwnRank)[];
};

/**
 * Own rank and own denominator over the D19 cohort (students with a total > 0), computed in SQL by
 * mobile_own_rank, the same function the mobile app's figures use (DATA_DISCLOSURE.md D22, §11.4 #21).
 * Ties share the better rank. null = "Not ranked yet". mobile_own_rank is an internal helper that
 * takes a student id and does no actor check, so the actor is checked here first (canViewStudent),
 * and the school, timeframe and ranked point groups are all read from the student's own school.
 */
export async function getOwnStanding(studentId: number, timeframeId: number): Promise<OwnStanding | null> {
    if (!Number.isInteger(timeframeId) || timeframeId <= 0) return null;
    const userId = await getSessionUserId();
    if (userId === null || !(await canViewStudent(userId, studentId))) return null;

    const supabase = await supabaseServiceClient();
    const { data: student } = await supabase.from("student").select("school_id, grade").eq("id", studentId).maybeSingle();
    if (!student) return null;
    const { data: tf } = await supabase
        .from("school_timeframes")
        .select("starts_at, ends_at")
        .eq("id", timeframeId)
        .eq("school_id", student.school_id)
        .maybeSingle();
    if (!tf) return null;
    const { data: groups, error: groupsError } = await supabase
        .from("point_group")
        .select("id, name, color")
        .eq("school_id", student.school_id)
        .eq("ranked", true)
        .order("name");
    if (groupsError) return null;

    const own = async (kind: "overall" | "grade" | "point_group", cohortId: number | null): Promise<OwnRank | null> => {
        const { data, error } = await supabase.rpc("mobile_own_rank", {
            p_student_id: studentId,
            p_school_id: student.school_id,
            p_starts: tf.starts_at,
            p_ends: tf.ends_at,
            p_kind: kind,
            p_cohort_id: cohortId as number,
        });
        if (error) {
            console.error("mobile_own_rank failed", error.message);
            return null;
        }
        const row = data?.[0];
        return row && row.own_rank > 0 && row.cohort_size >= row.own_rank ? { rank: row.own_rank, outOf: row.cohort_size } : null;
    };

    const [overall, grade, ...perGroup] = await Promise.all([
        own("overall", null),
        own("grade", student.grade),
        ...(groups ?? []).map((g) => own("point_group", g.id)),
    ]);
    const pointGroups: OwnStanding["pointGroups"] = [];
    (groups ?? []).forEach((g, i) => {
        const r = perGroup[i];
        if (r) pointGroups.push({ pointGroupId: g.id, pointGroupName: g.name, pointGroupColor: g.color, ...r });
    });
    return { overall, grade, pointGroups };
}

/**
 * Unseen "your shared score changed, so it is no longer shared" notices (§10.3 violation 4), marked
 * seen by this call. Who: the student's own account only (sharing is student-only); parents get [].
 */
export async function takeShareWithdrawalNotices(): Promise<ShareWithdrawalNotice[]> {
    const userId = await getSessionUserId();
    if (userId === null || (await getOwnStudent(userId)) === null) return [];

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("take_share_withdrawal_notices", { p_actor_user_id: userId });
    if (error) {
        console.error("take_share_withdrawal_notices failed", error.message);
        return [];
    }
    return (data ?? []).map((row) => ({
        eventName: row.event_name ?? null,
        eventDate: row.event_date ?? null,
        withdrawnAt: row.withdrawn_at,
    }));
}

/**
 * Groups You Lead letters (D13, L1-L12). Who: the leader's own student account only, never a parent
 * (L11). Groups that produce no rows (no other members, or no active ranked point group) are absent;
 * the page falls back to the names-only list for those.
 */
export async function getLeaderGroupLetters(): Promise<LeaderGroupLetters[]> {
    const userId = await getSessionUserId();
    if (userId === null || (await getOwnStudent(userId)) === null) return [];

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("get_leader_group_letters", { p_actor_user_id: userId });
    if (error) {
        console.error("get_leader_group_letters failed", error.message);
        return [];
    }
    return mapLeaderGroupLetters(data ?? []);
}

/**
 * The member's own view (L10): each of the student's groups that has a leader, the leaders' first
 * name and last initial, and the student's own letters. Who: the student or a linked parent.
 */
export async function getOwnLedLetters(studentId: number): Promise<OwnLedLetters[]> {
    const userId = await getSessionUserId();
    if (userId === null || !(await canViewStudent(userId, studentId))) return [];

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("get_own_led_letters", { p_actor_user_id: userId, p_student_id: studentId });
    if (error) {
        console.error("get_own_led_letters failed", error.message);
        return [];
    }
    const rows = data ?? [];
    if (rows.length === 0) return [];

    // Category names for the student's own letters, from the student's own school only.
    const { data: student } = await supabase.from("student").select("school_id").eq("id", studentId).maybeSingle();
    if (!student) return [];
    const { data: groups, error: pgError } = await supabase
        .from("point_group")
        .select("id, name")
        .eq("school_id", student.school_id);
    if (pgError) {
        console.error("point group names failed", pgError.message);
        return [];
    }
    return mapOwnLedLetters(rows, new Map((groups ?? []).map((g) => [g.id, g.name])));
}

/** "A parent account was linked on <date>" (§10.11). Dates only. Who: the student's own account. */
export async function getOwnParentLinkDates(): Promise<string[]> {
    const userId = await getSessionUserId();
    if (userId === null) return [];
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("own_parent_link_dates", { p_actor_user_id: userId });
    if (error) {
        console.error("own_parent_link_dates failed", error.message);
        return [];
    }
    return (data ?? []).map((row) => row.linked_on);
}
