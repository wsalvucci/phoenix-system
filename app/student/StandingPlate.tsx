import { rankTier } from "@/lib/rankTier";
import { isRanked, NOT_RANKED_YET, numberToOrdinal } from "@/lib/rankText";
import { Plate, RankBadge } from "./ui";

/** One rank in plain words: a disc and an ordinal when ranked, "Not ranked yet" otherwise (D19). */
export default function StandingPlate({ label, rank, outOf, unit }: { label: string; rank: number; outOf: number; unit: string }) {
    const ranked = isRanked(rank, outOf);
    return (
        <Plate tier={ranked ? rankTier(rank, outOf) : "none"} className="flex min-h-11 items-center gap-3 p-4">
            {ranked && <RankBadge rank={rank} tier={rankTier(rank, outOf)} size="lg" />}
            <div className="min-w-0">
                <p className="vic-label">{label}</p>
                <p className="text-base font-semibold">
                    {ranked ? `${numberToOrdinal(rank)} of ${outOf} ${unit}` : NOT_RANKED_YET}
                </p>
            </div>
        </Plate>
    );
}
