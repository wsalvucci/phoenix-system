import { describe, expect, it } from 'vitest'
import { displayRankTier, rankTier } from './rankTier'

describe('rankTier', () => {
  it('maps absolute ranks in a small or large cohort', () => {
    for (const n of [10, 20, 30, 500]) {
      expect([1, 2, 3, 4, 5, 6, 10, 11, 20, 21, 100].map((r) => rankTier(r, n))).toEqual(
        ['1', '2', '3', '4', '5', 'top10', 'top10', 'top20', 'top20', 'none', 'none'],
      )
    }
  })
  it('makes every rank none for cohorts of 21 to 29', () => {
    for (const n of [21, 25, 29]) for (const r of [1, 2, 5, 10, 20, 25]) expect(rankTier(r, n)).toBe('none')
  })
  it('gate edges: 20 and 30 are not gated', () => {
    expect(rankTier(1, 20)).toBe('1')
    expect(rankTier(1, 30)).toBe('1')
  })
  it('fails closed on missing or invalid input', () => {
    const bad = [undefined, null, NaN, Infinity, 0, -1]
    for (const b of bad) {
      expect(rankTier(b, 10)).toBe('none')
      expect(rankTier(1, b)).toBe('none')
    }
  })
})

describe('displayRankTier', () => {
  it('uses the absolute rank with no cohort gate', () => {
    expect([1, 5, 6, 10, 11, 20, 21].map(displayRankTier)).toEqual(['1', '5', 'top10', 'top10', 'top20', 'top20', 'none'])
  })
  it('fails closed on invalid rank', () => {
    expect(displayRankTier(undefined)).toBe('none')
    expect(displayRankTier(0)).toBe('none')
    expect(displayRankTier(NaN)).toBe('none')
  })
})
