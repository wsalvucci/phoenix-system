// DISPLAY-tier payload types (DATA_DISCLOSURE.md §4 DISPLAY, §8.2, §8.7, §11.3 / D20).
//
// Types only, safe to import from client components. Every dashboard under app/dashboard/* renders
// from these and nothing else. What is deliberately absent: student ids, cohort sizes or any other
// denominator, per-event score arrays, "last month" figures and rank changes, per-student category
// breakdowns, and team averages. The cut itself is computed in SQL (public.display_cut).

/** A cohort is the population of one published list, not the school (§8.2). */
export type Cohort =
    | { kind: "overall" }
    | { kind: "grade"; grade: number }
    | { kind: "pointGroup"; pointGroupId: number }
    | { kind: "studentGroup"; studentGroupId: number };

/** One published row of one cohort, already cut. */
export type DisplayStudentRow = {
    /** Opaque, per response: `${cohortKey}:${index}`. Never student.id. */
    readonly key: string;
    /** Rank within this cohort; tied students share it. */
    readonly rank: number;
    readonly firstName: string;
    readonly lastName: string;
    readonly grade: number;
    /** Sum of stored point_value in the timeframe (BACKEND_PLAN P-3). */
    readonly totalPoints: number;
};

/** One cohort's list. Rendered on its own (§3.3 rule 6); never joined to another board. */
export type DisplayBoard = {
    /** cohortKey(cohort): "overall", "grade-9", "pg-4". */
    readonly key: string;
    readonly title: string;
    /** Point-group colour; null for overall and grade boards. */
    readonly color: string | null;
    readonly rows: readonly DisplayStudentRow[];
};

/** Upcoming event metadata only (§11.3 item 6). No scores, no participants. */
export type DisplayEvent = {
    readonly key: string;
    readonly name: string;
    /** ISO date. */
    readonly date: string;
    /** Points available: the event's formula applied to its maximum input, else the maximum input. */
    readonly maxPoints: number;
    readonly pointGroupId: number | null;
};

export type DisplayTimeframe = { readonly id: number; readonly name: string; readonly isActive: boolean };

export type DisplayBoards = {
    readonly timeframes: readonly DisplayTimeframe[];
    /** The timeframe the boards were cut for; null when the school has no active timeframe. */
    readonly timeframeId: number | null;
    /** Always present; rows may be empty. */
    readonly overall: DisplayBoard;
    /** Only grades with at least one published row, ascending. */
    readonly grades: readonly DisplayBoard[];
    /** Only `ranked` point groups with at least one published row, by name. */
    readonly pointGroups: readonly DisplayBoard[];
    /** Events dated today or later inside the timeframe, soonest first. */
    readonly upcomingEvents: readonly DisplayEvent[];
};
