/**
 * Pure helpers for point sharing (DATA_DISCLOSURE.md §10.3).
 */

/**
 * Splits requested share targets into those the sharer belongs to and the rest.
 * The audience of a share is group membership, so a student may only share into
 * groups they are a member of. Anything else is rejected, never silently widened.
 * Ids are de-duplicated; non-integer ids are always rejected.
 */
export function partitionShareGroups(
    requestedGroupIds: readonly number[],
    sharerGroupIds: readonly number[],
): { allowed: number[]; rejected: number[] } {
    const own = new Set(sharerGroupIds);
    const allowed = new Set<number>();
    const rejected = new Set<number>();
    for (const id of requestedGroupIds) {
        if (Number.isInteger(id) && own.has(id)) allowed.add(id);
        else rejected.add(id);
    }
    return { allowed: Array.from(allowed), rejected: Array.from(rejected) };
}

export type FeedEntry = {
    sharedAt: string;
    firstName: string;
    lastName: string;
};

/**
 * Feed order within an event: most recently shared first, then by name.
 * Never by points, which would turn the feed into a per-assignment league table.
 */
export function compareSharedEntries(a: FeedEntry, b: FeedEntry): number {
    const timeA = Date.parse(a.sharedAt);
    const timeB = Date.parse(b.sharedAt);
    const safeA = Number.isNaN(timeA) ? 0 : timeA;
    const safeB = Number.isNaN(timeB) ? 0 : timeB;
    if (safeA !== safeB) return safeB - safeA;
    return (
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName)
    );
}
