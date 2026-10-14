import Link from "next/link";
import { getStudentDataWithContext, getStudentDashboardData, getStudentTeachingAssistantGroups, getStudentLeaderGroups } from "@/api/student";
import { rankTier } from "@/lib/rankTier";
import { isRanked, NOT_RANKED_YET, numberToOrdinal, standingText } from "@/lib/rankText";
import { GradeBadge, LedgerRow, Plate, RankBadge, SectionTitle } from "./ui";
import dynamic from "next/dynamic";
import "./victorian-theme.css";
import StickyHeader from "./StickyHeader";
import "./student-dashboard.css";
import PointDistribution from "./PointDistribution";
const StudentTabs = dynamic(() => import('./StudentTabs'), { ssr: false });



const RecentEventsWithRankings = dynamic(() => import("./RecentEventsWithRankings"), {
    ssr: false,
    loading: () => (
        <div role="status" aria-label="Loading recent points" className="min-h-[22rem] space-y-3">
            <div className="h-8 w-40 animate-pulse rounded bg-slate-800/60" />
            {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-14 animate-pulse rounded bg-slate-800/40" />)}
            <span className="sr-only">Loading recent points…</span>
        </div>
    ),
});

export default async function StudentDashboard() {
    const studentData = await getStudentDataWithContext();
    
    if (!studentData) {
        return (
            <div className="victorian-bg min-h-screen flex items-center justify-center p-4">
                <div className="victorian-content max-w-md w-full p-8 text-center space-y-6 victorian-fade-in">
                                        <div className="space-y-4">
                        <h1 className="victorian-title text-3xl">Connect your student account</h1>
                        <p className="victorian-subtitle">
                            Enter the code from your school to see your points.
                        </p>
                    </div>
                    <Link 
                        href="/linkAccount/student"
                        className="victorian-button inline-flex items-center justify-center px-6 py-3 rounded-lg w-full"
                    >
                        Connect my account
                </Link>
                </div>
            </div>
        );
    }

    const dashboardData = await getStudentDashboardData();
    const taGroups = await getStudentTeachingAssistantGroups();
    const leaderGroups = await getStudentLeaderGroups();

    if (!dashboardData) {
        return (
            <div className="victorian-bg min-h-screen flex items-center justify-center p-4">
                <div className="victorian-content max-w-md w-full p-8 text-center victorian-fade-in">
                    <h1 className="victorian-title text-3xl mb-4">We could not load your points</h1>
                    <p className="victorian-subtitle">
                        Something went wrong on our side. Reload the page to try again.
                    </p>
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload is the point */}
                    <a href="/student" className="victorian-button mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-6 py-3">Reload</a>
                </div>
            </div>
        );
    }

    const { student, totalPoints, totalRank, totalOutOf, gradeRank, gradeOutOf, pointGroupRankings, pointEventRankings } = dashboardData;
    const hasRoles = taGroups.length > 0 || (leaderGroups?.groups.length ?? 0) > 0;

    return (
        <div className="student-console victorian-scrollbar w-full max-w-full">
            {/* 1. Identity and balance */}
            <StickyHeader
                student={student}
                totalPoints={totalPoints}
                gradeRank={gradeRank}
                gradeOutOf={gradeOutOf}
                timeframe={dashboardData.timeframe}
            />
            <div className="student-workspace">
                <StudentTabs
                    dashboardContent={
                        <div className="w-full max-w-full space-y-8">
                            {/* 2. Recent points */}
                            <section className="victorian-fade-in">
                                <RecentEventsWithRankings pointEventRankings={pointEventRankings ?? []} initialCount={5} />
                            </section>

                            {/* 3. By category */}
                            <section className="victorian-fade-in">
                                <SectionTitle>By category</SectionTitle>
                                {pointGroupRankings.length > 0 ? (
                                    <>
                                        <PointDistribution categories={pointGroupRankings.map(r => ({ name: r.pointGroupName, points: r.points }))} />
                                        <div>
                                            {pointGroupRankings.map(ranking => (
                                                <LedgerRow
                                                    key={ranking.pointGroupId}
                                                    title={ranking.pointGroupName}
                                                    detail={standingText(ranking.rank, ranking.outOf)}
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
                            <section className="victorian-fade-in">
                                <SectionTitle>Where you stand</SectionTitle>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <StandingPlate label="Whole school" rank={totalRank} outOf={totalOutOf} unit="students" />
                                    <StandingPlate label={`Grade ${student.grade}`} rank={gradeRank} outOf={gradeOutOf} unit={`students in Grade ${student.grade}`} />
                                </div>
                            </section>

                            {/* 5. Roles (only when the student has one) */}
                            {hasRoles && (
                                <section className="victorian-fade-in space-y-6">
                                    {taGroups.length > 0 && (
                                        <div>
                                            <SectionTitle as="h3">Scorebooks you help with</SectionTitle>
                                            <div className="mt-3 space-y-2">
                                                {taGroups.map((g) => (
                                                    <Link
                                                        key={g.group.id}
                                                        href={`/student/scorebook/${g.group.id}`}
                                                        className="victorian-button-secondary inline-flex min-h-11 w-full items-center justify-between rounded-lg px-4 py-3"
                                                    >
                                                        <span>{g.group.name}</span>
                                                        <span className="text-xs">{g.fullAccess ? 'All events' : 'Some events'}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Names only: letter grades stay off until DATA_DISCLOSURE D13 conditions L1-L12 are met. */}
                                    {leaderGroups && leaderGroups.groups.length > 0 && (
                                        <div>
                                            <SectionTitle as="h3">Groups you lead</SectionTitle>
                                            <div className="mt-3 space-y-4">
                                                {leaderGroups.groups.map((group) => (
                                                    <div key={group.id}>
                                                        <h4 className="text-base font-semibold">{group.name}</h4>
                                                        <ul className="mt-2">
                                                            {group.students.map((member) => (
                                                                <li key={member.id} className="min-h-11 truncate border-b border-rule py-3 last:border-b-0">
                                                                    {member.firstName} {member.lastName}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
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

/** One rank in plain words: a disc and an ordinal when ranked, "Not ranked yet" otherwise (D19). */
function StandingPlate({ label, rank, outOf, unit }: { label: string; rank: number; outOf: number; unit: string }) {
    const ranked = isRanked(rank, outOf);
    return (
        <Plate tier={ranked ? rankTier(rank, outOf) : 'none'} className="flex min-h-11 items-center gap-3 p-4">
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
