import { describe, it, expect } from 'vitest';
import { competitionRank } from './ranking';

describe('competitionRank', () => {
    it('ranks distinct scores by position', () => {
        const scores = [90, 80, 70];
        expect(competitionRank(scores, 90)).toBe(1);
        expect(competitionRank(scores, 80)).toBe(2);
        expect(competitionRank(scores, 70)).toBe(3);
    });

    it('gives tied scores the same, better rank', () => {
        const scores = [90, 80, 80, 70];
        expect(competitionRank(scores, 80)).toBe(2);
        expect(competitionRank(scores, 70)).toBe(4);
    });

    it('does not depend on input order', () => {
        expect(competitionRank([70, 80, 90, 80], 80)).toBe(2);
    });

    it('ranks an all-tied event as first for everyone', () => {
        const scores = [5, 5, 5];
        expect(competitionRank(scores, 5)).toBe(1);
    });

    it('ranks a lone participant first', () => {
        expect(competitionRank([0], 0)).toBe(1);
    });
});
