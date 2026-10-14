import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import './victorian.css'

/**
 * Student-local presentational primitives (Victorian remake, Phase 1).
 * Style only: no data fetching, no rank logic. The tier name is computed by the caller
 * (`rankTier(rank, cohortSize)` in lib/rankTier.ts, which also enforces the cohort gate).
 */

export type RankTierName = '1' | '2' | '3' | '4' | '5' | 'top10' | 'top20' | 'none'

const rankStyle = (tier: RankTierName) =>
  tier === 'none' ? 'plain' : tier === 'top10' || tier === 'top20' ? 'ringed' : 'filled'

/** Resting card with a hairline rule. Pass `tier` only on a plate that shows its own rank numeral. */
export function Plate({
  children,
  className,
  tier,
}: {
  children: ReactNode
  className?: string
  tier?: RankTierName
}) {
  return (
    <section data-rank-tier={tier} className={cn('vic-plate', className)}>
      {children}
    </section>
  )
}

/** Double-rule frame for the identity card. */
export function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('vic-frame p-4 sm:p-6', className)}>{children}</div>
}

/** Section title in the display face, followed by the diamond divider. */
export function SectionTitle({
  children,
  as: Tag = 'h2',
  className,
}: {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <Tag className="font-display text-2xl font-semibold leading-tight text-foreground">{children}</Tag>
      <div className="vic-divider" aria-hidden="true" />
    </div>
  )
}

/** Ledger row: label and detail on the left, amount right-aligned and never wrapping. */
export function LedgerRow({
  title,
  detail,
  amount,
  className,
}: {
  title: ReactNode
  detail?: ReactNode
  amount?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-h-11 items-center justify-between gap-4 border-b border-rule py-3 last:border-b-0', className)}>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground">{title}</p>
        {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
      </div>
      {amount ? (
        <p className="vic-numeral shrink-0 whitespace-nowrap text-lg text-gilt-ink">{amount}</p>
      ) : null}
    </div>
  )
}

/** The one rank disc. Always shows the numeral; pair it with ordinal text in the caller. */
export function RankBadge({
  rank,
  tier,
  size = 'sm',
  className,
}: {
  rank: number
  tier: RankTierName
  size?: 'sm' | 'lg'
  className?: string
}) {
  return (
    <span
      data-rank-tier={tier}
      data-rank-style={rankStyle(tier)}
      data-size={size}
      className={cn('vic-rank', className)}
    >
      {rank}
    </span>
  )
}

/** Decorative wax seal. `stamp` plays the 220ms stamp once; only use it on a points award. */
export function WaxSeal({
  size = 'sm',
  stamp = false,
  className,
}: {
  size?: 'sm' | 'lg'
  stamp?: boolean
  className?: string
}) {
  return (
    <span aria-hidden="true" data-size={size} data-stamp={stamp} className={cn('vic-seal', className)}>
      <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round">
        <path d="M12 3.5l2.4 5.2 5.6.7-4.1 3.9 1.1 5.6L12 16.1 7 18.9l1.1-5.6L4 9.4l5.6-.7L12 3.5z" />
      </svg>
    </span>
  )
}

/** Letter grade in a ruled badge. Ink on --secondary; the letter carries the meaning, never a hue. */
export function GradeBadge({ grade, className }: { grade: string; className?: string }) {
  return <span className={cn('vic-grade', className)}>{grade}</span>
}

/** Corner flourish for the identity card: 24px, 1.25px stroke, decorative. */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      className={cn('text-gilt-ink dark:text-gilt', className)}
    >
      <path d="M3 21c8 0 18-4 18-18" />
      <path d="M9 18c0-4 3-7 7-7M14 13c0-3 2-5 5-5" />
    </svg>
  )
}
