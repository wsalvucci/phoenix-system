"use server";
// The one DISPLAY-tier server action behind every app/dashboard/* screen (DATA_DISCLOSURE.md §11.3, D20).
//
// Who may call: a staff session (admin or teacher) for one of their own schools, or a live display
// device for its one bound school. The viewer comes from getDashboardViewer() (session or httpOnly
// cookie), never from an argument. `requestedSchoolId` is only a preference among a staff caller's
// own schools; a display device ignores it.
//
// What leaves: one already-cut list per cohort, from public.display_cut (one call per cohort), plus
// school metadata (timeframe names, ranked point-group names and colours, upcoming event metadata).
// No student id, no cohort size or other denominator, no per-event scores, no trends, no team panels.
//
// Why service_role: a display device has no Postgres identity, and "top k of a set you may not read
// row by row" is not a row policy. Every query below runs only after the viewer is authorized for
// `schoolId`, and is filtered to that school. display_cut re-checks the actor in SQL.
import { DateTime } from "luxon";
import { evaluatePointConversionFormula } from "@/lib/pointConversionFormula";
import type { Cohort, DisplayBoard, DisplayBoards, DisplayEvent, DisplayTimeframe } from "@/app/supaApi/universal/displayTypes";
import { getDashboardViewer, type DashboardViewer } from "../display/displayAccess";
import supabaseServiceClient from "../supabaseServiceClient";
import { cohortKey, getDisplayCut } from "./displayCut";

const MAX_UPCOMING_EVENTS = 30;

function resolveSchool(viewer: DashboardViewer, requested: number | null): number | null {
    if (viewer.kind === "display") return viewer.schoolId;
    if (viewer.schoolIds.length === 0) return null;
    if (requested !== null && Number.isInteger(requested) && viewer.schoolIds.includes(requested)) return requested;
    return Math.min(...viewer.schoolIds);
}

function eventMaxPoints(formula: string | null, maxInput: number): number {
    try {
        return evaluatePointConversionFormula(formula, maxInput);
    } catch {
        return maxInput;
    }
}

/**
 * DISPLAY boards for the caller's school and a timeframe (null or unknown = the active one).
 * Returns null when there is no authorized viewer. Takes no tier, limit, filter or cohort size.
 */
export async function getDisplayBoards(
    requestedSchoolId: number | null,
    timeframeId: number | null,
): Promise<DisplayBoards | null> {
    const viewer = await getDashboardViewer();
    if (viewer === null) return null;
    const schoolId = resolveSchool(viewer, requestedSchoolId);
    if (schoolId === null) return null;

    const supabase = await supabaseServiceClient();

    const [timeframesRes, gradesRes, pointGroupsRes] = await Promise.all([
        supabase.from("school_timeframes").select("id, name, active, starts_at, ends_at").eq("school_id", schoolId),
        supabase.from("student").select("grade").eq("school_id", schoolId),
        supabase.from("point_group").select("id, name, color").eq("school_id", schoolId).eq("ranked", true),
    ]);
    if (timeframesRes.error || gradesRes.error || pointGroupsRes.error) {
        console.error("getDisplayBoards: school metadata lookup failed");
        return null;
    }

    const timeframeRows = timeframesRes.data ?? [];
    const timeframes: DisplayTimeframe[] = timeframeRows
        .map((t) => ({ id: t.id, name: t.name, isActive: t.active }))
        .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
    const selected =
        (timeframeId !== null ? timeframeRows.find((t) => t.id === timeframeId) : undefined) ??
        timeframeRows.find((t) => t.active) ??
        null;

    const emptyOverall: DisplayBoard = { key: cohortKey({ kind: "overall" }), title: "Overall", color: null, rows: [] };
    if (selected === null) {
        return { timeframes, timeframeId: null, overall: emptyOverall, grades: [], pointGroups: [], upcomingEvents: [] };
    }

    const grades = Array.from(new Set((gradesRes.data ?? []).map((s) => s.grade).filter((g): g is number => Number.isInteger(g))))
        .sort((a, b) => a - b);
    const pointGroups = [...(pointGroupsRes.data ?? [])].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);

    const board = async (cohort: Cohort, title: string, color: string | null): Promise<DisplayBoard> => ({
        key: cohortKey(cohort),
        title,
        color,
        rows: await getDisplayCut(viewer, schoolId, selected.id, cohort),
    });

    const today = DateTime.utc().toISODate() ?? "";
    const from = selected.starts_at > today ? selected.starts_at : today;

    const [overall, gradeBoards, pointGroupBoards, eventsRes] = await Promise.all([
        board({ kind: "overall" }, "Overall", null),
        Promise.all(grades.map((grade) => board({ kind: "grade", grade }, `Grade ${grade}`, null))),
        Promise.all(pointGroups.map((pg) => board({ kind: "pointGroup", pointGroupId: pg.id }, pg.name, pg.color))),
        supabase
            .from("point_event")
            .select("name, date, max_input, conversion_formula, point_group_id, student_group!inner(school_id, archived)")
            .eq("student_group.school_id", schoolId)
            .eq("student_group.archived", false)
            .gte("date", from)
            .lte("date", selected.ends_at)
            .order("date", { ascending: true })
            .limit(MAX_UPCOMING_EVENTS * 4),
    ]);

    if (eventsRes.error) console.error("getDisplayBoards: upcoming events lookup failed", eventsRes.error.message);
    // The same assignment is often created once per class; show it once.
    const seen = new Set<string>();
    const upcomingEvents: DisplayEvent[] = [];
    for (const event of eventsRes.data ?? []) {
        if (!event.date) continue;
        const name = event.name ?? "School event";
        const dedupe = `${event.date}|${name}|${event.point_group_id ?? ""}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        upcomingEvents.push({
            key: `event:${upcomingEvents.length}`,
            name,
            date: event.date,
            maxPoints: eventMaxPoints(event.conversion_formula, event.max_input),
            pointGroupId: event.point_group_id,
        });
        if (upcomingEvents.length >= MAX_UPCOMING_EVENTS) break;
    }

    return {
        timeframes,
        timeframeId: selected.id,
        overall,
        grades: gradeBoards.filter((b) => b.rows.length > 0),
        pointGroups: pointGroupBoards.filter((b) => b.rows.length > 0),
        upcomingEvents,
    };
}
