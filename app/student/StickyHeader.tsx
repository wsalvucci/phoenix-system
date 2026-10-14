import Link from "next/link";
import { Student } from "@/types/domain";
import { rankTier } from "@/lib/rankTier";
import { isRanked, NOT_RANKED_YET, numberToOrdinal } from "@/lib/rankText";
import { RankBadge } from "./ui";

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
        <header className="student-identity">
            <div className="student-topline"><Link href="/" className="inline-flex min-h-11 items-center">← Home</Link></div>
            <div className="student-id-body">
                <div className="student-avatar" aria-hidden="true"><span>{student.firstName?.[0]}{student.lastName?.[0]}</span></div>
                <div className="student-id-copy"><h1>{student.firstName} {student.lastName}</h1><div className="student-id-details"><span>Grade <strong>{student.grade}</strong></span><span>{timeframe.name}</span></div></div>
            </div>
            <div className="student-balance">
                <div>
                    <span className="student-kicker">Your points</span>
                    <p>{timeframe.name}</p>
                </div>
                <div className="student-balance-value">{totalPoints.toLocaleString()}<span>POINTS</span></div>
            </div>
            <p className="student-standing-line flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold">
                {ranked ? (
                    <>
                        <RankBadge rank={gradeRank} tier={rankTier(gradeRank, gradeOutOf)} />
                        <span>{numberToOrdinal(gradeRank)} of {gradeOutOf} in Grade {student.grade}</span>
                    </>
                ) : (
                    <span>{NOT_RANKED_YET}</span>
                )}
            </p>
        </header>
    );
}
