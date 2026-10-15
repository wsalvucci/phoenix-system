/**
 * The only place rank-tier boundaries live (docs/design/VICTORIAN_REMAKE_PLAN.md R1,
 * docs/DATA_DISCLOSURE.md section 10.10, D8). Returns a name only; colours live in
 * app/globals.css under [data-rank-tier]. Tier follows the absolute rank, never rank/N,
 * a percentile or points.
 */
export type RankTier = '1' | '2' | '3' | '4' | '5' | 'top10' | 'top20' | 'none'

const validCount = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 1

const absoluteTier = (rank: number): RankTier => {
  if (rank <= 5) return String(Math.ceil(rank)) as RankTier
  if (rank <= 10) return 'top10'
  if (rank <= 20) return 'top20'
  return 'none'
}

/**
 * Tier for a rank within a cohort of `cohortSize`. Fails closed: a missing or invalid rank or
 * cohort size is `none`. A cohort of 21 to 29 is `none` for every rank, so the neutral band is
 * never a small bottom group.
 */
export function rankTier(rank: number | null | undefined, cohortSize: number | null | undefined): RankTier {
  if (!validCount(rank) || !validCount(cohortSize)) return 'none'
  if (cohortSize >= 21 && cohortSize < 30) return 'none'
  return absoluteTier(rank)
}

/**
 * DISPLAY form (section 10.10 Q2): no cohort size, because the denominator must not reach a
 * DISPLAY payload. Safe only because a DISPLAY cut never exceeds 20, so no neutral rank is shown.
 * Do not use on student, parent, teacher or admin views; use `rankTier`.
 */
export function displayRankTier(rank: number | null | undefined): RankTier {
  return validCount(rank) ? absoluteTier(rank) : 'none'
}
