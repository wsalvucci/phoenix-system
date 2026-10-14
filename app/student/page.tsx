import Link from "next/link";
import { getStudentDataWithContext, getStudentDashboardData, getStudentMonthlyTrends, getStudentTeachingAssistantGroups, getStudentLeaderGroups } from "@/api/student";
import { StudentMonthlyTrends } from "@/types/domain";
import { rankTier } from "@/lib/rankTier";
import dynamic from "next/dynamic";
import "./victorian-theme.css";
import StickyHeader from "./StickyHeader";
import "./student-dashboard.css";
import PointDistribution from "./PointDistribution";
const StudentTabs = dynamic(() => import('./StudentTabs'), { ssr: false });



const RecentEventsWithRankings = dynamic(() => import("./RecentEventsWithRankings"), { ssr: false });

// Helper function to convert number to ordinal
function numberToOrdinal(num: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}



export default async function StudentDashboard() {
    const studentData = await getStudentDataWithContext();
    
    if (!studentData) {
        return (
            <div className="victorian-bg min-h-screen flex items-center justify-center p-4">
                <div className="victorian-content max-w-md w-full p-8 text-center space-y-6 victorian-fade-in">
                                        <div className="space-y-4">
                        <h1 className="victorian-title text-3xl">Student Data Not Found</h1>
                        <p className="victorian-subtitle">
                            Please link your student account to view your academic achievements.
                        </p>
                    </div>
                    <Link 
                        href="/linkAccount/student"
                        className="victorian-button inline-flex items-center justify-center px-6 py-3 rounded-lg w-full"
                    >
                        Link Student Account
                </Link>
                </div>
            </div>
        );
    }

    const dashboardData = await getStudentDashboardData();
    const monthlyTrends: StudentMonthlyTrends | null = await getStudentMonthlyTrends();
    const taGroups = await getStudentTeachingAssistantGroups();
    const leaderGroups = await getStudentLeaderGroups();

    if (!dashboardData) {
        return (
            <div className="victorian-bg min-h-screen flex items-center justify-center p-4">
                <div className="victorian-content max-w-md w-full p-8 text-center victorian-fade-in">
                    <h1 className="victorian-title text-3xl mb-4">Unable to Load Dashboard</h1>
                    <p className="victorian-subtitle">
                        There was an error loading your academic achievements.
                    </p>
                </div>
            </div>
        );
    }

    const { student, totalPoints, totalRank, totalOutOf, gradeRank, gradeOutOf, pointGroupRankings, pointEventRankings } = dashboardData;

    return (
        <div className="student-console victorian-scrollbar w-full max-w-full"
        >
            
                {/* Victorian Header */}
                            <StickyHeader 
                student={student}
                totalPoints={totalPoints}
                monthlyTrends={monthlyTrends}
                timeframe={dashboardData.timeframe}
            />
            <div className="student-workspace">
                <StudentTabs
                    dashboardContent={
                        <div className="w-full max-w-full">
                            <div className="victorian-section victorian-fade-in">
                        <div className="student-overview-label"><span>01 / PERFORMANCE OVERVIEW</span><span>YOUR CURRENT STANDING</span></div>
                        <div className="victorian-grid">

                            {/* Overall Ranking */}
                            <div className="victorian-content victorian-delay-1">
                                <div className="flex justify-between items-center gap-3 mb-4">
                                    <h3 className="victorian-title text-xl">Overall Ranking</h3>
                                    <div className="victorian-stat-number text-2xl text-right text-rank-ink" data-rank-tier={rankTier(totalRank, totalOutOf)}>
                                        <span>#{totalRank}</span>
                                        <span className="victorian-subtitle text-sm ml-2">
                                            of {totalOutOf} students
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Grade Ranking */}
                            <div className="victorian-content victorian-delay-2">
                                <div className="flex justify-between items-center gap-3 mb-4">
                                    <h3 className="victorian-title text-xl">Grade {student.grade} Ranking</h3>
                                    <div className="victorian-stat-number text-2xl text-right text-rank-ink" data-rank-tier={rankTier(gradeRank, gradeOutOf)}>
                                        <span className="text-lg">#{gradeRank}</span>
                                        <span className="victorian-subtitle text-sm ml-2">
                                            of {gradeOutOf} students
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            {taGroups.length > 0 && (
                            <div className="victorian-content victorian-delay-3">
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="victorian-title text-xl">Quick Actions</h3>
                                </div>
                                <div className="space-y-3">
                                  <div className="pt-2">
                                    <div className="victorian-subtitle font-medium text-sm mb-2">Teaching Assistant Scorebooks</div>
                                    <div className="space-y-2">
                                      {taGroups.map((g) => (
                                        <Link
                                          key={g.group.id}
                                          href={`/student/scorebook/${g.group.id}`}
                                          className="victorian-button-secondary inline-flex items-center justify-between w-full px-4 py-3 rounded-lg"
                                        >
                                          <span>{g.group.name}</span>
                                          <span className="text-xs text-gray-500">{g.fullAccess ? 'All events' : 'Limited events'}</span>
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                            </div>
                            )}
                        </div>
                    </div>

                    {/* Student Leader Groups */}
                    {leaderGroups && leaderGroups.groups.length > 0 && (
                        <div className="victorian-section victorian-fade-in victorian-delay-4">
                            <div className="victorian-content">
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="victorian-title text-xl">Groups You Lead</h3>
                                </div>
                                <p className="victorian-subtitle mb-4 text-sm">
                                    Students in the groups you lead
                                </p>
                                <div className="space-y-6">
                                    {leaderGroups.groups.map((group, groupIndex) => (
                                        <div 
                                            key={group.id}
                                            className="victorian-content victorian-slide-in"
                                            style={{ animationDelay: `${0.5 + groupIndex * 0.1}s` }}
                                        >
                                            <h4 className="victorian-title text-lg mb-4">{group.name}</h4>
                                            <ul className="space-y-2">
                                                {group.students.map((member) => (
                                                    <li
                                                        key={member.id}
                                                        className="victorian-list-item p-3 rounded-lg border border-slate-200 dark:border-slate-600 font-medium text-slate-900 dark:text-slate-100 truncate"
                                                    >
                                                        {member.firstName} {member.lastName}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Point Group Rankings */}
                    {pointGroupRankings.length > 0 && (
                        <div className="victorian-section victorian-section-alt victorian-fade-in victorian-delay-6">
                            <div className="victorian-content">
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="victorian-title text-xl">Point Group Rankings</h3>
                                </div>
                                <p className="victorian-subtitle mb-4 text-sm">
                                    Your performance in different academic categories
                                </p>
                                <PointDistribution categories={pointGroupRankings.map(r => ({ name: r.pointGroupName, points: r.points }))} />
                                <div className="victorian-grid-compact">
                                    {pointGroupRankings.map((ranking, index) => (
                                        <div 
                                            key={ranking.pointGroupId}
                                            className="victorian-content victorian-slide-in"
                                            style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="font-medium flex items-center gap-2 text-sm">
                                                    <span 
                                                        className="w-3 h-3 rounded-full inline-block" 
                                                        style={{ backgroundColor: ranking.pointGroupColor }} 
                                                    />
                                                    {ranking.pointGroupName}
                                                </div>
                                                <div className="victorian-subtitle text-md">
                                                    <span className="text-rank-ink" data-rank-tier={rankTier(ranking.rank, ranking.outOf)}>{numberToOrdinal(ranking.rank)}</span> of {ranking.outOf}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="student-grade text-2xl font-bold">
                                                    {ranking.letterGrade.letter}
                                                </div>
                                                <div className="victorian-stat-number text-lg">
                                                    {ranking.points.toLocaleString()} pts
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Combined Recent Events with Rankings */}
                    {(pointEventRankings && pointEventRankings.length > 0) && (
                        <div className="victorian-section victorian-fade-in victorian-delay-6">
                            <RecentEventsWithRankings 
                                pointEventRankings={pointEventRankings} 
                                initialCount={5}
                            />
                        </div>
                    )}
                        </div>
                    }
                />
            </div>
        </div>
    );
}
