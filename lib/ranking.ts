/**
 * Standard competition ranking ("1224"): a participant's rank is one plus the
 * number of participants with a strictly higher score, so tied scores share the
 * better rank. DATA_DISCLOSURE.md §10.5: breaking a tie by array order invents a
 * distinction the data does not support.
 */
export function competitionRank(scores: readonly number[], score: number): number {
    let higher = 0;
    for (const s of scores) {
        if (s > score) higher++;
    }
    return higher + 1;
}
