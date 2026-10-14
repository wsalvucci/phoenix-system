/**
 * Pure helpers for the peer-visible publication cut applied in getGlobalPointStats.
 * See docs/DATA_DISCLOSURE.md §3 and §7.4 #4/#5.
 *
 * Every helper fails closed: a missing, zero, negative, or non-finite rank or cohort size
 * means "not published". None of these may ever return true for a value that is merely absent.
 */

/** Minimum number of students left unpublished in a cohort (DATA_DISCLOSURE.md §3, K_HIDDEN). */
export const K_HIDDEN = 3;

/** True only for a real 1-based rank that is within the first `limit` positions. */
export function isRankWithin(rank: number | null | undefined, limit: number): boolean {
    if (rank === null || rank === undefined) return false;
    if (!Number.isFinite(rank) || !Number.isFinite(limit)) return false;
    return rank >= 1 && rank <= limit;
}

/**
 * Per-grade cut: floor(ratio * size), never more than size - K_HIDDEN, never negative.
 * An unknown cohort size yields 0 (publish nothing).
 */
export function gradeCut(gradeSize: number | null | undefined, ratio: number): number {
    if (gradeSize === null || gradeSize === undefined) return 0;
    if (!Number.isFinite(gradeSize) || !Number.isFinite(ratio)) return 0;
    const cut = Math.min(Math.floor(ratio * gradeSize), gradeSize - K_HIDDEN);
    return cut > 0 ? cut : 0;
}

export type PublicationCandidate = {
    rank: number;
    grade: number;
    gradeRank: number;
    pointGroups: ReadonlyArray<{ rank: number }>;
};

/**
 * Whether a candidate clears any of the configured cuts. Ranks of 0 (the "not in rank map"
 * value produced upstream) never qualify.
 */
export function isStudentPublished(
    student: PublicationCandidate,
    gradeSizes: ReadonlyMap<number, number>,
    limits: { overall: number; perPointGroup: number; gradeRatio: number },
): boolean {
    const withinGrade = isRankWithin(
        student.gradeRank,
        gradeCut(gradeSizes.get(student.grade), limits.gradeRatio),
    );
    const withinOverall = isRankWithin(student.rank, limits.overall);
    const withinPointGroup = student.pointGroups.some((pg) =>
        isRankWithin(pg.rank, limits.perPointGroup),
    );
    return withinGrade || withinOverall || withinPointGroup;
}
