import Link from "next/link";
import { Student } from "@/types/domain";
import { rankTier } from "@/lib/rankTier";
import { isRanked, NOT_RANKED_YET, numberToOrdinal } from "@/lib/rankText";
import { Flourish, Frame, RankBadge, WaxSeal } from "./ui";

interface StickyHeaderProps {
    student: Student;
    totalPoints: number;
    gradeRank: number;
    gradeOutOf: number;
    timeframe: { id: number; name: string; startsAt: string; endsAt: string; active: boolean };
}

/**
 * Identity and balance: one block. One H1 (the student's name), one primary number (the balance),
 * one line of standing under it. No second competing number at the same size.
 */
export default function StickyHeader({ student, totalPoints, gradeRank, gradeOutOf, timeframe }: StickyHeaderProps) {
    const ranked = isRanked(gradeRank, gradeOutOf);
    return (
        <header className="mx-auto w-full max-w-3xl px-4 pt-2">
            <div className="flex">
                <Link href="/" className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-foreground underline-offset-4 hover:underline">← Home</Link>
            </div>
            <Frame className="vic-enter relative">
                <WaxSeal className="absolute right-3 top-3 z-10" />
                <div className="flex items-center gap-3 pr-14 sm:gap-4">
                    <div
                        aria-hidden="true"
                        className="vic-numeral flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-lg text-secondary-foreground sm:h-14 sm:w-14 sm:text-xl"
                    >
                        {student.firstName?.[0]}{student.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-display text-2xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere] min-[390px]:text-3xl sm:text-4xl">{student.firstName} {student.lastName}</h1>
                        <p className="vic-label mt-1 flex flex-wrap gap-x-4 gap-y-1">
                            <span>Grade <strong className="font-semibold text-foreground">{student.grade}</strong></span>
                            <span>{timeframe.name}</span>
                        </p>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <div className="vic-divider" aria-hidden="true" />
                    <div className="py-4">
                        <p className="vic-label">Your points</p>
                        <p className="text-sm text-muted-foreground">{timeframe.name}</p>
                        <p className="vic-numeral vic-balance mt-1">{totalPoints.toLocaleString()}</p>
                        <p className="vic-label mt-1">Points</p>
                    </div>
                    <div className="vic-gilt-rule" aria-hidden="true" />
                    <p className="flex flex-wrap items-center justify-center gap-2 px-2 pb-6 pt-4 text-sm font-semibold text-foreground">
                        {ranked ? (
                            <>
                                <RankBadge rank={gradeRank} tier={rankTier(gradeRank, gradeOutOf)} />
                                <span>{numberToOrdinal(gradeRank)} of {gradeOutOf} in Grade {student.grade}</span>
                            </>
                        ) : (
                            <span>{NOT_RANKED_YET}</span>
                        )}
                    </p>
                </div>
                <Flourish className="absolute bottom-3 right-3" />
            </Frame>
        </header>
    );
}
