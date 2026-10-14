import Link from "next/link";
import { getStudentDataWithContext, getStudentDashboardData, getStudentTeachingAssistantGroups, getStudentLeaderGroups } from "@/api/student";
import { standingText } from "@/lib/rankText";
import { GradeBadge, LedgerRow, Plate, SectionTitle } from "./ui";
import StandingPlate from "./StandingPlate";
import dynamic from "next/dynamic";
import StickyHeader from "./StickyHeader";
import PointDistribution from "./PointDistribution";
import { pointsToMoveUp } from "./StandingPlate";
import { LedLettersNotice, LeaderGroupLettersTable, LeaderGroupNames } from "./LeaderLetters";
import {
    getLeaderGroupLetters,
    getOwnLedLetters,
    getPointsToNextRank,
    takeShareWithdrawalNotices,
} from "@/app/supaApi/server/student/ownRecordRpc";
const StudentTabs = dynamic(() => import('./StudentTabs'), { ssr: false });



const RecentEventsWithRankings = dynamic(() => import("./RecentEventsWithRankings"), {
    ssr: false,
    loading: () => (
        <div role="status" aria-label="Loading recent points" className="min-h-[22rem] space-y-3">
            <div className="h-8 w-40 animate-pulse rounded bg-secondary" />
            {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-14 animate-pulse rounded bg-muted" />)}
            <span className="sr-only">Loading recent points…</span>
        </div>
    ),
});

export default async function StudentDashboard() {
    const studentData = await getStudentDataWithContext();
    
    if (!studentData) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Plate className="vic-enter w-full max-w-md space-y-6 p-8 text-center">
                    <div className="space-y-3">
                        <h1 className="font-display text-3xl font-semibold leading-tight">Connect your student account</h1>
                        <p className="text-base text-muted-foreground">
                            Enter the code from your school to see your points.
                        </p>
                    </div>
                    <Link
                        href="/linkAccount/student"
                        className="button-primary min-h-11 w-full px-6 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                        Connect my account
                    </Link>
                </Plate>
            </div>
        );
    }

    const dashboardData = await getStudentDashboardData();
    const taGroups = await getStudentTeachingAssistantGroups();
    const leaderGroups = await getStudentLeaderGroups();

    if (!dashboardData) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Plate className="vic-enter w-full max-w-md p-8 text-center">
                    <h1 className="mb-4 font-display text-3xl font-semibold leading-tight">We could not load your points</h1>
                    <p className="text-base text-muted-foreground">
                        Something went wrong on our side. Reload the page to try again.
                    </p>
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload is the point */}
                    <a href="/student" className="button-primary mt-6 min-h-11 w-full px-6 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">Reload</a>
                </Plate>
            </div>
        );
    }

    const { student, totalPoints, totalRank, totalOutOf, gradeRank, gradeOutOf, pointGroupRankings, pointEventRankings } = dashboardData;
    // Session-scoped RPCs (BACKEND_PLAN.md §3, §5, §7). Each re-checks the caller in TS and in SQL.
    const [pointsToNext, withdrawals, leaderLetters, ownLedLetters] = await Promise.all([
        getPointsToNextRank(student.id, dashboardData.timeframe.id),
        takeShareWithdrawalNotices(),
        getLeaderGroupLetters(),
        getOwnLedLetters(student.id),
    ]);
    const lettersByGroup = new Map(leaderLetters.map((g) => [g.groupId, g]));
    const categoryGap = new Map((pointsToNext?.pointGroups ?? []).map((g) => [g.pointGroupId, g.pointsToNext]));
    const hasRoles = taGroups.length > 0 || (leaderGroups?.groups.length ?? 0) > 0;

    return (
        <div className="w-full max-w-full">
            {/* 1. Identity and balance */}
            <StickyHeader
                student={student}
                totalPoints={totalPoints}
                gradeRank={gradeRank}
                gradeOutOf={gradeOutOf}
                timeframe={dashboardData.timeframe}
            />
            {withdrawals.length > 0 && (
                <div role="status" className="mx-auto w-full max-w-3xl px-4 pt-6">
                    <Plate className="space-y-1 p-4">
                        {withdrawals.map((notice, i) => (
                            <p key={i} className="text-base">
                                {notice.eventName
                                    ? `Your shared score for ${notice.eventName} changed, so it is no longer shared.`
                                    : "One of your shared scores changed, so it is no longer shared."}
                            </p>
                        ))}
                        <p className="text-sm text-muted-foreground">You can share it again from your recent points.</p>
                    </Plate>
                </div>
            )}
            <div className="w-full">
                <StudentTabs
                    dashboardContent={
                        <div className="w-full max-w-full space-y-8">
                            {/* 2. Recent points */}
                            <section className="vic-enter">
                                <RecentEventsWithRankings pointEventRankings={pointEventRankings ?? []} initialCount={5} />
                            </section>

                            {/* 3. By category */}
                            <section className="vic-enter">
                                <SectionTitle>By category</SectionTitle>
                                {pointGroupRankings.length > 0 ? (
                                    <>
                                        <PointDistribution categories={pointGroupRankings.map(r => ({ name: r.pointGroupName, points: r.points }))} />
                                        <div>
                                            {pointGroupRankings.map(ranking => (
                                                <LedgerRow
                                                    key={ranking.pointGroupId}
                                                    title={ranking.pointGroupName}
                                                    detail={[standingText(ranking.rank, ranking.outOf), categoryGap.has(ranking.pointGroupId) ? pointsToMoveUp(categoryGap.get(ranking.pointGroupId)!) : null].filter(Boolean).join(" · ")}
                                                    amount={<GradeBadge grade={ranking.letterGrade.letter} />}
                                                />
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p className="py-4 text-base text-muted-foreground">
                                        Your points will be split by category here once you earn some.
                                    </p>
                                )}
                            </section>

                            {/* 4. Where you stand */}
                            <section className="vic-enter">
                                <SectionTitle>Where you stand</SectionTitle>
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <StandingPlate label="Whole school" rank={totalRank} outOf={totalOutOf} unit="students" pointsToNext={pointsToNext?.overall ?? null} />
                                    <StandingPlate label={`Grade ${student.grade}`} rank={gradeRank} outOf={gradeOutOf} unit={`students in Grade ${student.grade}`} pointsToNext={pointsToNext?.grade ?? null} />
                                </div>
                            </section>

                            {/* L10: who can see your letters, and what they see */}
                            {ownLedLetters.length > 0 && (
                                <section className="vic-enter">
                                    <SectionTitle>Your group leaders</SectionTitle>
                                    <div className="mt-4">
                                        <LedLettersNotice groups={ownLedLetters} />
                                    </div>
                                </section>
                            )}

                            {/* 5. Roles (only when the student has one) */}
                            {hasRoles && (
                                <section className="vic-enter space-y-6">
                                    {taGroups.length > 0 && (
                                        <div>
                                            <SectionTitle as="h3">Scorebooks you help with</SectionTitle>
                                            <div className="mt-3 space-y-2">
                                                {taGroups.map((g) => (
                                                    <Link
                                                        key={g.group.id}
                                                        href={`/student/scorebook/${g.group.id}`}
                                                        className="button-secondary h-auto min-h-11 w-full justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                                    >
                                                        <span>{g.group.name}</span>
                                                        <span className="vic-label shrink-0">{g.fullAccess ? 'All events' : 'Some events'}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* D13: letters per point group where SQL returned them (L1-L12), names only otherwise. */}
                                    {leaderGroups && leaderGroups.groups.length > 0 && (
                                        <div>
                                            <SectionTitle as="h3">Groups you lead</SectionTitle>
                                            <div className="mt-3 space-y-6">
                                                {leaderGroups.groups.map((group) => {
                                                    const letters = lettersByGroup.get(group.id);
                                                    return letters ? (
                                                        <LeaderGroupLettersTable key={group.id} group={letters} />
                                                    ) : (
                                                        <LeaderGroupNames
                                                            key={group.id}
                                                            name={group.name}
                                                            members={group.students
                                                                .filter((member) => member.id !== student.id)
                                                                .map((member, i) => ({ key: `${group.id}:${i}`, firstName: member.firstName, lastName: member.lastName }))}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    }
                />
            </div>
        </div>
    );
}
