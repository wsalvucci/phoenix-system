// Row -> domain mappers for the 2026-10-14 RPCs. Pure, so the disclosure-relevant shaping is tested.
// Generated row types stay here; nothing returned from these functions carries a database id of
// another student.
import type { Database, Json } from "@/types/supabase";

type Fn = Database["public"]["Functions"];

export type LeaderLetter = "S" | "A" | "B" | "C" | "D" | "E";

export function asLeaderLetter(value: unknown): LeaderLetter | null {
    return value === "S" || value === "A" || value === "B" || value === "C" || value === "D" || value === "E"
        ? value
        : null;
}

// ---------------------------------------------------------------------------------------------
// points_to_next_rank
// ---------------------------------------------------------------------------------------------
export type PointsToNextRank = {
    overall: number | null;
    grade: number | null;
    pointGroups: { pointGroupId: number; pointsToNext: number }[];
    studentGroups: { studentGroupId: number; pointsToNext: number }[];
};

export function mapPointsToNext(rows: Fn["points_to_next_rank"]["Returns"]): PointsToNextRank {
    const out: PointsToNextRank = { overall: null, grade: null, pointGroups: [], studentGroups: [] };
    for (const row of rows) {
        const gap = Number(row.points_to_next);
        if (!Number.isFinite(gap) || gap <= 0) continue;
        if (row.cohort_kind === "overall") out.overall = gap;
        else if (row.cohort_kind === "grade") out.grade = gap;
        else if (row.cohort_kind === "point_group" && row.cohort_id !== null) out.pointGroups.push({ pointGroupId: row.cohort_id, pointsToNext: gap });
        else if (row.cohort_kind === "student_group" && row.cohort_id !== null) out.studentGroups.push({ studentGroupId: row.cohort_id, pointsToNext: gap });
    }
    return out;
}

// ---------------------------------------------------------------------------------------------
// get_leader_group_letters (L1, L2, L6, L8)
// ---------------------------------------------------------------------------------------------
export type LeaderGroupLetters = {
    groupId: number;
    groupName: string;
    /** Every active ranked point group; the colour styles the column header only (L6). */
    pointGroups: { id: number; name: string; color: string }[];
    /** Sorted server-side by last name, first name. `key` is opaque, never student.id. */
    members: {
        key: string;
        firstName: string;
        lastName: string;
        letters: { pointGroupId: number; letter: LeaderLetter | null }[];
    }[];
};

export function mapLeaderGroupLetters(rows: Fn["get_leader_group_letters"]["Returns"]): LeaderGroupLetters[] {
    const groups = new Map<number, LeaderGroupLetters & { memberIndex: Map<number, LeaderGroupLetters["members"][number]>; pgSeen: Set<number> }>();
    for (const row of rows) {
        let group = groups.get(row.group_id);
        if (!group) {
            group = { groupId: row.group_id, groupName: row.group_name, pointGroups: [], members: [], memberIndex: new Map(), pgSeen: new Set() };
            groups.set(row.group_id, group);
        }
        if (!group.pgSeen.has(row.point_group_id)) {
            group.pgSeen.add(row.point_group_id);
            group.pointGroups.push({ id: row.point_group_id, name: row.point_group_name, color: row.point_group_color });
        }
        let member = group.memberIndex.get(row.member_ordinal);
        if (!member) {
            member = { key: `${row.group_id}:${row.member_ordinal}`, firstName: row.member_first_name, lastName: row.member_last_name, letters: [] };
            group.memberIndex.set(row.member_ordinal, member);
            group.members.push(member);
        }
        member.letters.push({ pointGroupId: row.point_group_id, letter: asLeaderLetter(row.letter) });
    }
    // Row order from SQL is already group name, ordinal, point group name; keep it.
    return Array.from(groups.values()).map(({ groupId, groupName, pointGroups, members }) => ({ groupId, groupName, pointGroups, members }));
}

// ---------------------------------------------------------------------------------------------
// get_own_led_letters (L10)
// ---------------------------------------------------------------------------------------------
export type OwnLedLetters = {
    groupId: number;
    groupName: string;
    leaders: { firstName: string; lastInitial: string }[];
    letters: { pointGroupId: number; pointGroupName: string; letter: LeaderLetter | null }[];
};

function isObject(value: Json): value is { [key: string]: Json | undefined } {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mapOwnLedLetters(
    rows: Fn["get_own_led_letters"]["Returns"],
    pointGroupNames: ReadonlyMap<number, string>,
): OwnLedLetters[] {
    return rows.map((row) => {
        const leaders = (Array.isArray(row.leaders) ? row.leaders : [])
            .filter(isObject)
            .map((l) => ({ firstName: String(l.firstName ?? ""), lastInitial: String(l.lastInitial ?? "") }))
            .filter((l) => l.firstName !== "");
        const letters = (Array.isArray(row.letters) ? row.letters : [])
            .filter(isObject)
            .map((l) => ({ pointGroupId: Number(l.pointGroupId), letter: asLeaderLetter(l.letter) }))
            .filter((l) => Number.isInteger(l.pointGroupId) && pointGroupNames.has(l.pointGroupId))
            .map((l) => ({ ...l, pointGroupName: pointGroupNames.get(l.pointGroupId)! }));
        return { groupId: row.group_id, groupName: row.group_name, leaders, letters };
    });
}

/** L10 sentence: "Ana B., who leads Band, can see your letter grade (S, or A to E) for each category." */
export function leaderNoticeSentence(group: OwnLedLetters, subject: "your" | { possessive: string }): string {
    const names = group.leaders.map((l) => `${l.firstName} ${l.lastInitial}.`);
    const who = names.length <= 1 ? (names[0] ?? "")
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    const verb = names.length > 1 ? "lead" : "leads";
    const whose = subject === "your" ? "your" : subject.possessive;
    return `${who}, who ${verb} ${group.groupName}, can see ${whose} letter grade (S, or A to E) for each category.`;
}
