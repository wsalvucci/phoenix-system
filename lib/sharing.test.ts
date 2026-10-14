import { describe, it, expect } from 'vitest';
import { partitionShareGroups, compareSharedEntries } from './sharing';

describe('partitionShareGroups', () => {
    it('allows groups the sharer belongs to', () => {
        expect(partitionShareGroups([1, 2], [1, 2, 3])).toEqual({ allowed: [1, 2], rejected: [] });
    });

    it('rejects groups the sharer does not belong to', () => {
        expect(partitionShareGroups([1, 99], [1, 2])).toEqual({ allowed: [1], rejected: [99] });
    });

    it('rejects everything when the sharer is in no groups', () => {
        expect(partitionShareGroups([5], [])).toEqual({ allowed: [], rejected: [5] });
    });

    it('rejects non-integer ids even if they appear in the member list', () => {
        expect(partitionShareGroups([1.5, NaN], [1.5, NaN])).toEqual({ allowed: [], rejected: [1.5, NaN] });
    });

    it('de-duplicates ids', () => {
        expect(partitionShareGroups([1, 1, 9, 9], [1])).toEqual({ allowed: [1], rejected: [9] });
    });

    it('returns empty for an empty request', () => {
        expect(partitionShareGroups([], [1])).toEqual({ allowed: [], rejected: [] });
    });
});

describe('compareSharedEntries', () => {
    const e = (sharedAt: string, firstName: string, lastName: string) => ({ sharedAt, firstName, lastName });

    it('puts the most recent share first', () => {
        const rows = [e('2026-01-01T00:00:00Z', 'A', 'A'), e('2026-02-01T00:00:00Z', 'B', 'B')];
        expect(rows.sort(compareSharedEntries).map(r => r.firstName)).toEqual(['B', 'A']);
    });

    it('breaks time ties by last then first name', () => {
        const t = '2026-01-01T00:00:00Z';
        const rows = [e(t, 'Zed', 'Young'), e(t, 'Amy', 'Young'), e(t, 'Bob', 'Adams')];
        expect(rows.sort(compareSharedEntries).map(r => r.firstName)).toEqual(['Bob', 'Amy', 'Zed']);
    });

    it('tolerates unparseable dates', () => {
        expect(() => compareSharedEntries(e('nope', 'A', 'A'), e('2026-01-01T00:00:00Z', 'B', 'B'))).not.toThrow();
    });
});
