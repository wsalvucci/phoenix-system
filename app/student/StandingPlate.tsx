import { rankTier } from "@/lib/rankTier";
import { isRanked, NOT_RANKED_YET, numberToOrdinal } from "@/lib/rankText";
import { Plate, RankBadge } from "./ui";

/** "12 points to move up" (DATA_DISCLOSURE §9.3): a gap only, never who holds the next place. */
export function pointsToMoveUp(points: number): string {
    return `${points.toLocaleString()} ${points === 1 ? "point" : "points"} to move up`;
}

/** One rank in plain words: a disc and an ordinal when ranked, "Not ranked yet" otherwise (D19).
 *  `pointsToNext` comes from points_to_next_rank and is null at rank 1, when unranked, or when the
 *  cohort is under the floor. */
export default function StandingPlate({ label, rank, outOf, unit, pointsToNext = null }: { label: string; rank: number; outOf: number; unit: string; pointsToNext?: number | null }) {
    const ranked = isRanked(rank, outOf);
    return (
        <Plate tier={ranked ? rankTier(rank, outOf) : "none"} className="flex min-h-11 items-center gap-3 p-4">
            {ranked && <RankBadge rank={rank} tier={rankTier(rank, outOf)} size="lg" />}
            <div className="min-w-0">
                <p className="vic-label">{label}</p>
                <p className="text-base font-semibold">
                    {ranked ? `${numberToOrdinal(rank)} of ${outOf} ${unit}` : NOT_RANKED_YET}
                </p>
                {ranked && pointsToNext !== null && pointsToNext > 0 && (
                    <p className="text-sm text-muted-foreground">{pointsToMoveUp(pointsToNext)}</p>
                )}
            </div>
        </Plate>
    );
}
