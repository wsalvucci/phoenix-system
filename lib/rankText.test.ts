import { describe, expect, it } from 'vitest'
import { isRanked, NOT_RANKED_YET, numberToOrdinal, standingText } from './rankText'

describe('rankText', () => {
  it('builds ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(numberToOrdinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '103rd',
    ])
  })
  it('shows rank of N for a ranked student', () => {
    expect(standingText(3, 40)).toBe('3rd of 40')
  })
  it('says Not ranked yet for missing, zero or impossible ranks', () => {
    for (const [r, n] of [[0, 40], [null, 40], [3, 0], [undefined, undefined], [5, 4], [NaN, 3]] as const) {
      expect(standingText(r, n)).toBe(NOT_RANKED_YET)
      expect(isRanked(r, n)).toBe(false)
    }
  })
})
