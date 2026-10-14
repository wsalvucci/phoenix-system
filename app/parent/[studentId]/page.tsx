import { getStudentDashboardDataById } from "@/api/student";
import Link from "next/link";
import { redirect } from "next/navigation";
import { rankTier } from "@/lib/rankTier";
import { isRanked, NOT_RANKED_YET, numberToOrdinal, standingText } from "@/lib/rankText";
import { GradeBadge, LedgerRow, RankBadge, SectionTitle } from "@/app/student/ui";
import StandingPlate, { pointsToMoveUp } from "@/app/student/StandingPlate";
import { LedLettersNotice } from "@/app/student/LeaderLetters";
import { getOwnLedLetters, getPointsToNextRank } from "@/app/supaApi/server/student/ownRecordRpc";

function formatDate(dateString: string | null): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * What a parent came for, in order: the child and their points, what they earned recently,
 * where the points come from, then standing. No other student appears on this page.
 */
export default async function ParentStudentDashboard({ params: { studentId } }: { params: { studentId: string } }) {
    const studentData = await getStudentDashboardDataById(parseInt(studentId), null);

    if (!studentData) {
        redirect("/parent");
    }

    const { student, totalPoints, totalRank, totalOutOf, gradeRank, gradeOutOf, pointGroupRankings, pointEventRankings, timeframe } = studentData;
    const firstName = student.firstName;
    const recent = (pointEventRankings ?? []).slice(0, 8);
    // Linked-parent scope, re-checked in TS (canViewStudent) and in SQL (can_view_student).
    // L11: no Groups-You-Lead letters here, only the child's own letters and who can see them (L10).
    const [pointsToNext, ownLedLetters] = await Promise.all([
        timeframe?.id ? getPointsToNextRank(student.id, timeframe.id) : Promise.resolve(null),
        getOwnLedLetters(student.id),
    ]);
    const categoryGap = new Map((pointsToNext?.pointGroups ?? []).map((g) => [g.pointGroupId, g.pointsToNext]));

    return (
        <div className="app-page">
            <header className="app-header">
                <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
                    <Link className="inline-flex min-h-11 items-center text-sm font-medium text-slate-500 hover:text-slate-950 dark:hover:text-white" href="/parent">← Your children</Link>
                    <h1 className="page-title mt-1">{student.firstName} {student.lastName}</h1>
                    <p className="page-description">Grade {student.grade}{timeframe?.name ? ` · ${timeframe.name}` : ""}</p>
                    <p className="mt-4 text-5xl font-bold tracking-tight">{totalPoints.toLocaleString()}</p>
                    <p className="text-sm text-slate-500">points</p>
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
                        {isRanked(gradeRank, gradeOutOf) ? (
                            <>
                                <RankBadge rank={gradeRank} tier={rankTier(gradeRank, gradeOutOf)} />
                                <span>{numberToOrdinal(gradeRank)} of {gradeOutOf} in Grade {student.grade}</span>
                            </>
                        ) : (
                            <span>{NOT_RANKED_YET}</span>
                        )}
                    </p>
                </div>
            </header>

            <main className="mx-auto w-full max-w-3xl space-y-10 px-4 py-8 sm:px-6">
                <section>
                    <SectionTitle>Recent points</SectionTitle>
                    {recent.length > 0 ? (
                        <div>
                            {recent.map(event => (
                                <LedgerRow
                                    key={event.studentPointId ?? event.eventId}
                                    title={event.eventName}
                                    detail={[formatDate(event.eventDate), event.pointGroup.name].filter(Boolean).join(" · ")}
                                    amount={`+${event.points}`}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="py-4 text-base">
                            No points yet this term. Points {firstName}&apos;s teachers award will show up here.
                        </p>
                    )}
                </section>

                <section>
                    <SectionTitle>By category</SectionTitle>
                    {pointGroupRankings.length > 0 ? (
                        <div>
                            {pointGroupRankings.map(ranking => (
                                <LedgerRow
                                    key={ranking.pointGroupId}
                                    title={ranking.pointGroupName}
                                    detail={[`${ranking.points.toLocaleString()} points`, standingText(ranking.rank, ranking.outOf), categoryGap.has(ranking.pointGroupId) ? pointsToMoveUp(categoryGap.get(ranking.pointGroupId)!) : null].filter(Boolean).join(" · ")}
                                    amount={<GradeBadge grade={ranking.letterGrade.letter} />}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="py-4 text-base">
                            {firstName}&apos;s points will be split by category here once they earn some.
                        </p>
                    )}
                </section>

                <section>
                    <SectionTitle>Where {firstName} stands</SectionTitle>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <StandingPlate label="Whole school" rank={totalRank} outOf={totalOutOf} unit="students" pointsToNext={pointsToNext?.overall ?? null} />
                        <StandingPlate label={`Grade ${student.grade}`} rank={gradeRank} outOf={gradeOutOf} unit={`students in Grade ${student.grade}`} pointsToNext={pointsToNext?.grade ?? null} />
                    </div>
                </section>

                {ownLedLetters.length > 0 && (
                    <section>
                        <SectionTitle>{firstName}&apos;s group leaders</SectionTitle>
                        <div className="mt-4">
                            <LedLettersNotice groups={ownLedLetters} possessive={`${firstName}'s`} />
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
