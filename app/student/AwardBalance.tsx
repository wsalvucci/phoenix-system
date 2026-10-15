'use client'

import { useEffect, useState } from 'react'

interface AwardBalanceProps {
    studentId: number
    timeframeId: number
    timeframeName: string
    totalPoints: number
}

const COUNT_MS = 700

/**
 * The balance block. When the total is higher than the last one this browser showed for the
 * same student and timeframe, the number counts up and the gilt rule shimmers once.
 * First visits, unchanged totals and reduced-motion settings render the plain number.
 * Screen readers always get the final number, never the counting one.
 */
export default function AwardBalance({ studentId, timeframeId, timeframeName, totalPoints }: AwardBalanceProps) {
    const [shown, setShown] = useState(totalPoints)
    const [celebrate, setCelebrate] = useState(false)

    useEffect(() => {
        const key = `phoenix:balance:${studentId}:${timeframeId}`
        let previous: number | null = null
        try {
            const raw = window.localStorage.getItem(key)
            previous = raw === null ? null : Number(raw)
            window.localStorage.setItem(key, String(totalPoints))
        } catch {
            /* storage unavailable: show the plain number */
        }
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (previous === null || !Number.isFinite(previous) || previous >= totalPoints || reduce) {
            setShown(totalPoints)
            return
        }
        const from = previous
        setCelebrate(true)
        setShown(from)
        const start = performance.now()
        let frame = 0
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / COUNT_MS)
            const eased = 1 - (1 - t) ** 3
            setShown(Math.round(from + (totalPoints - from) * eased))
            if (t < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [studentId, timeframeId, totalPoints])

    return (
        <>
            <div className="py-4">
                <p className="vic-label">Your points</p>
                <p className="text-sm text-muted-foreground">{timeframeName}</p>
                <p className="vic-numeral vic-balance mt-1">
                    <span aria-hidden="true" className="tabular-nums">{shown.toLocaleString()}</span>
                    <span className="sr-only">{totalPoints.toLocaleString()}</span>
                </p>
                <p className="vic-label mt-1">Points</p>
            </div>
            <div className="vic-gilt-rule" data-shimmer={celebrate} aria-hidden="true" />
        </>
    )
}
