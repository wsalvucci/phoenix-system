import { DateTime } from "luxon"

export type ScorebookShiftUnit = "days" | "months" | "years"

export type ShiftedEventDate = {
  /** The shifted instant as a UTC ISO string, or the input unchanged when it can't be shifted. */
  date: string
  /** True when a month/year shift landed on a different day of the month (clamped to month end). */
  adjusted: boolean
}

/**
 * Shifts a point event date the same way `public.duplicate_scorebook_events` does, so the
 * duplication preview shows what will be written:
 *   - arithmetic on the UTC wall clock, independent of the browser's time zone;
 *   - the time of day is kept;
 *   - month/year shifts clamp to the last day of a shorter month
 *     (Jan 31 + 1 month = Feb 28 or 29, Feb 29 + 1 year = Feb 28), reported as `adjusted`.
 * Luxon's month/year addition in the UTC zone clamps exactly like a Postgres interval added to a
 * `timestamp` (years are 12 months, counted from the source date, not accumulated).
 */
export function shiftScorebookEventDate(
  date: string,
  amount: number,
  unit: ScorebookShiftUnit,
): ShiftedEventDate {
  const source = DateTime.fromISO(date, { zone: "utc" })
  if (!source.isValid || !Number.isInteger(amount) || amount < 1) return { date, adjusted: false }

  const shifted = source.plus({ [unit]: amount })
  if (!shifted.isValid) return { date, adjusted: false }

  return {
    date: shifted.toISO() ?? date,
    adjusted: unit !== "days" && shifted.day !== source.day,
  }
}

/**
 * Whether an instant falls inside a timeframe, inclusive at both ends, comparing instants rather
 * than strings (matches the RPC's `shifted_date < destination_start or shifted_date > destination_end`).
 */
export function isWithinTimeframe(date: string, startsAt: string, endsAt: string): boolean {
  const instant = DateTime.fromISO(date, { zone: "utc" })
  const start = DateTime.fromISO(startsAt, { zone: "utc" })
  const end = DateTime.fromISO(endsAt, { zone: "utc" })
  if (!instant.isValid || !start.isValid || !end.isValid) return false
  return instant.toMillis() >= start.toMillis() && instant.toMillis() <= end.toMillis()
}
