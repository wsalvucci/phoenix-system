/**
 * Plain-words standing text for a student's or parent's own view (docs/DATA_DISCLOSURE.md
 * section 10.5: own rank and own "of N"; D19: a student with no points in the cohort is
 * "Not ranked yet", never last). Text only; colours come from rankTier.
 */
export const NOT_RANKED_YET = 'Not ranked yet'

export function numberToOrdinal(num: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = num % 100
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}

const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 1

/** True when the rank is a real position inside a real cohort. */
export function isRanked(rank: number | null | undefined, outOf: number | null | undefined): boolean {
  return valid(rank) && valid(outOf) && rank <= outOf
}

/** "3rd of 40", or "Not ranked yet" when there is no valid rank. */
export function standingText(rank: number | null | undefined, outOf: number | null | undefined): string {
  return isRanked(rank, outOf) ? `${numberToOrdinal(rank as number)} of ${outOf}` : NOT_RANKED_YET
}
