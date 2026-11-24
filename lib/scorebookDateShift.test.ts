import { afterEach, describe, expect, it } from 'vitest'
import { Settings } from 'luxon'
import { isWithinTimeframe, shiftScorebookEventDate } from './scorebookDateShift'

const shift = shiftScorebookEventDate

describe('shiftScorebookEventDate', () => {
  afterEach(() => {
    Settings.defaultZone = 'system'
  })

  it('shifts by days and keeps the time of day', () => {
    expect(shift('2026-03-10T14:30:00+00:00', 7, 'days')).toEqual({
      date: '2026-03-17T14:30:00.000Z',
      adjusted: false,
    })
  })

  it('shifts on the UTC wall clock near midnight, whatever the browser time zone', () => {
    // 23:30 UTC on Jan 31 is already Feb 1 in Tokyo and still Jan 31 in New York.
    for (const zone of ['America/New_York', 'Asia/Tokyo', 'Pacific/Kiritimati', 'utc']) {
      Settings.defaultZone = zone
      expect(shift('2026-01-31T23:30:00+00:00', 1, 'months')).toEqual({
        date: '2026-02-28T23:30:00.000Z',
        adjusted: true,
      })
      expect(shift('2026-03-01T00:15:00Z', 1, 'days').date).toBe('2026-03-02T00:15:00.000Z')
    }
  })

  it('reads offsets in the source as the instant they name', () => {
    // 20:00 at -05:00 is 01:00 UTC the next day; the shift happens on that UTC day.
    expect(shift('2026-01-30T20:00:00-05:00', 1, 'months')).toEqual({
      date: '2026-02-28T01:00:00.000Z',
      adjusted: true,
    })
  })

  it('does not move across a DST change', () => {
    Settings.defaultZone = 'America/New_York'
    expect(shift('2026-03-07T12:00:00Z', 1, 'days').date).toBe('2026-03-08T12:00:00.000Z')
    expect(shift('2026-10-31T12:00:00Z', 2, 'days').date).toBe('2026-11-02T12:00:00.000Z')
  })

  it('clamps month shifts to the end of a shorter month', () => {
    expect(shift('2026-01-31T09:00:00Z', 1, 'months')).toEqual({ date: '2026-02-28T09:00:00.000Z', adjusted: true })
    expect(shift('2027-01-31T09:00:00Z', 1, 'months')).toEqual({ date: '2027-02-28T09:00:00.000Z', adjusted: true })
    expect(shift('2028-01-31T09:00:00Z', 1, 'months')).toEqual({ date: '2028-02-29T09:00:00.000Z', adjusted: true })
    expect(shift('2026-08-31T09:00:00Z', 1, 'months')).toEqual({ date: '2026-09-30T09:00:00.000Z', adjusted: true })
  })

  it('counts multi-month shifts from the source date, not month by month', () => {
    // Postgres: '2026-01-31' + interval '2 months' = '2026-03-31' (not Mar 28).
    expect(shift('2026-01-31T09:00:00Z', 2, 'months')).toEqual({ date: '2026-03-31T09:00:00.000Z', adjusted: false })
    expect(shift('2026-10-31T09:00:00Z', 4, 'months')).toEqual({ date: '2027-02-28T09:00:00.000Z', adjusted: true })
  })

  it('clamps a leap day to Feb 28 on year shifts, and keeps it on a leap year', () => {
    expect(shift('2028-02-29T10:00:00Z', 1, 'years')).toEqual({ date: '2029-02-28T10:00:00.000Z', adjusted: true })
    expect(shift('2028-02-29T10:00:00Z', 4, 'years')).toEqual({ date: '2032-02-29T10:00:00.000Z', adjusted: false })
    expect(shift('2028-02-29T10:00:00Z', 12, 'months')).toEqual({ date: '2029-02-28T10:00:00.000Z', adjusted: true })
  })

  it('never reports day shifts as adjusted', () => {
    expect(shift('2026-01-31T09:00:00Z', 29, 'days')).toEqual({ date: '2026-03-01T09:00:00.000Z', adjusted: false })
  })

  it('treats a date without a time as midnight UTC', () => {
    expect(shift('2026-05-31', 1, 'months')).toEqual({ date: '2026-06-30T00:00:00.000Z', adjusted: true })
  })

  it('returns the input unchanged for an invalid date or amount', () => {
    expect(shift('not a date', 1, 'days')).toEqual({ date: 'not a date', adjusted: false })
    for (const amount of [0, -1, 1.5, NaN]) {
      expect(shift('2026-01-01T00:00:00Z', amount, 'days')).toEqual({ date: '2026-01-01T00:00:00Z', adjusted: false })
    }
  })
})

describe('isWithinTimeframe', () => {
  const start = '2027-01-01T00:00:00+00:00'
  const end = '2027-06-30T23:59:59+00:00'

  it('is inclusive at both ends', () => {
    expect(isWithinTimeframe('2027-01-01T00:00:00.000Z', start, end)).toBe(true)
    expect(isWithinTimeframe('2027-06-30T23:59:59.000Z', start, end)).toBe(true)
  })

  it('compares instants, not strings', () => {
    expect(isWithinTimeframe('2026-12-31T23:59:59.999Z', start, end)).toBe(false)
    expect(isWithinTimeframe('2027-07-01T00:00:00.000Z', start, end)).toBe(false)
    // 19:30 at -05:00 on Jun 30 is 00:30 UTC on Jul 1: outside.
    expect(isWithinTimeframe('2027-06-30T19:30:00-05:00', start, end)).toBe(false)
  })

  it('is false for unparseable input', () => {
    expect(isWithinTimeframe('nope', start, end)).toBe(false)
  })
})
