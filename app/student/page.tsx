import Link from "next/link";
import { getStudentDataWithContext, getStudentDashboardData, getStudentRecentEvents, getStudentMonthlyTrends, getStudentTeachingAssistantGroups } from "@/api/student";
import { StudentDashboardData, StudentRecentEvent, rankToColor, rankToColorWithOpacity, StudentMonthlyTrends } from "@/types/domain";
import dynamic from "next/dynamic";
import "./victorian-theme.css";
import StickyHeader from "./StickyHeader";
import Color from "color";



const RecentEventsWithRankings = dynamic(() => import("./RecentEventsWithRankings"), { ssr: false });

// Simple date formatting function
function formatDate(dateString: string | null): string {
    if (!dateString) return 'Unknown date';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    } catch {
        return 'Invalid date';
    }
}

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
    const recentEvents = await getStudentRecentEvents(5);
    const monthlyTrends: StudentMonthlyTrends | null = await getStudentMonthlyTrends();
  const taGroups = await getStudentTeachingAssistantGroups();

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

    const { student, totalPoints, totalRank, totalOutOf, gradeRank, gradeOutOf, nearbyStudents, nearbyGradeStudents, pointGroupRankings, pointEventRankings } = dashboardData;

    // Get the theme color based on overall rank
    const themeColor = rankToColor(totalRank);
    const themeColorWithOpacity = rankToColorWithOpacity(totalRank, 0.1);
    const bgColor = '#00000000'

    return (
        <div className="victorian-scrollbar"
        style={{
    //         background:
    // `linear-gradient(217deg, rgb(255 0 0 / 80%), transparent 70.71%),
    // linear-gradient(127deg, rgb(0 255 0 / 80%), transparent 70.71%),
    // linear-gradient(336deg, rgb(0 0 255 / 80%), transparent 70.71%);`
            background: `
            linear-gradient(135deg, ${themeColor} 0%, ${themeColor} 4%, ${bgColor} 4%, ${bgColor} 5%, ${themeColor} 5%, ${themeColor} 9.5%, ${bgColor} 9.5%, ${bgColor} 10%, ${themeColor} 10%, ${themeColor} 10.25%, ${bgColor} 10.25%, ${bgColor} 10.5%, ${themeColor} 10.5%, ${themeColor} 10.75%, ${bgColor} 10.75%, transparent 50%),
            linear-gradient(-135deg, ${themeColor} 0%, ${themeColor} 4%, ${bgColor} 4%, ${bgColor} 5%, ${themeColor} 5%, ${themeColor} 9.5%, ${bgColor} 9.5%, ${bgColor} 10%, ${themeColor} 10%, ${themeColor} 10.25%, ${bgColor} 10.25%, ${bgColor} 10.5%, ${themeColor} 10.5%, ${themeColor} 10.75%, ${bgColor} 10.75%, transparent 50%)`
        }}>
                {/* Victorian Header */}
                            <StickyHeader 
                student={student}
                totalPoints={totalPoints}
                monthlyTrends={monthlyTrends}
                timeframe={dashboardData.timeframe}
            />

                <div className="container mx-auto px-4 py-4 pt-6">
                    {/* Academic Achievement Overview */}
                    <div className="victorian-section victorian-fade-in">
                        <div className="victorian-grid">

                            {/* Overall Ranking */}
                            <div className="victorian-content victorian-delay-1">
                                <div className="flex justify-between items-center gap-3 mb-4">
                                    <h3 className="victorian-title text-xl">Overall Ranking</h3>
                                    <div className="victorian-stat-number text-2xl text-right" style={{ color: themeColor }}>
                                        <span>#{totalRank}</span>
                                        {monthlyTrends?.currentMonth && (
                                            <span className="text-green-400 text-sm ml-2">
                                                {monthlyTrends.currentMonth.rankChange > 0 ? '+' : ''}{monthlyTrends.currentMonth.rankChange}
                                            </span>
                                        )}
                                        <span className="victorian-subtitle text-sm ml-2">
                                            of {totalOutOf} students
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="victorian-subtitle font-medium text-sm">Nearby Students</div>
                                    <div className="space-y-2">
                                        {nearbyStudents.map((nearby, index) => (
                                            <div 
                                                key={nearby.studentId}
                                                className={`victorian-list-item grid grid-cols-3 ${
                                                    nearby.studentId === student.id ? 'highlight' : ''
                                                } victorian-slide-in`}
                                                style={{ animationDelay: `${0.2 + index * 0.1}s`, gridTemplateColumns: '1fr 5fr 2fr' }}
                                            >
                                                <span className="font-medium" style={{ color: rankToColor(nearby.rank) }}>
                                                    {numberToOrdinal(nearby.rank)}
                                                </span>
                                                <span className="font-medium victorian-student-name">
                                                    {nearby.firstName} {nearby.lastName}
                                                </span>
                                                <span className="text-sm text-right" style={{ color: rankToColor(nearby.rank) }}>
                                                    {nearby.totalPoints.toLocaleString()} pts
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Grade Ranking */}
                            <div className="victorian-content victorian-delay-2">
                                <div className="flex justify-between items-center gap-3 mb-4">
                                    <h3 className="victorian-title text-xl">Grade {student.grade} Ranking</h3>
                                    <div className="victorian-stat-number text-2xl text-right" style={{ color: themeColor }}>
                                        <span className="text-lg">#{gradeRank}</span>
                                        {monthlyTrends?.currentMonth && (
                                            <span className="text-green-400 text-sm ml-2">
                                                {monthlyTrends.currentMonth.percentageIncrease > 0 ? '+' : ''}{Math.round(monthlyTrends.currentMonth.percentageIncrease)}%
                                            </span>
                                        )}
                                        <span className="victorian-subtitle text-sm ml-2">
                                            of {gradeOutOf} students
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="victorian-subtitle font-medium text-sm">Grade Peers</div>
                                    <div className="space-y-2">
                                        {nearbyGradeStudents.map((nearby, index) => (
                                            <div 
                                                key={nearby.studentId}
                                                className={`victorian-list-item grid grid-cols-3 ${
                                                    nearby.studentId === student.id ? 'highlight' : ''
                                                } victorian-slide-in`}
                                                style={{ animationDelay: `${0.3 + index * 0.1}s`, gridTemplateColumns: '1fr 5fr 2fr' }}
                                            >
                                                <span className="font-medium" style={{ color: rankToColor(nearby.rank) }}>
                                                    {numberToOrdinal(nearby.rank)}
                                                </span>
                                                <span className="font-medium victorian-student-name" style={{ color: rankToColor(nearby.rank) }}>
                                                    {nearby.firstName} {nearby.lastName}
                                                </span>
                                                <span className="text-sm text-gray-600 text-right" style={{ color: rankToColor(nearby.rank) }}>
                                                    {nearby.points.toLocaleString()} pts
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="victorian-content victorian-delay-3">
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="victorian-title text-xl">Quick Actions</h3>
                                </div>
                                {taGroups.length > 0 && (
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
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Point Group Rankings */}
                    {pointGroupRankings.length > 0 && (
                        <div className="victorian-section victorian-section-alt victorian-fade-in victorian-delay-4">
                            <div className="victorian-content">
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="victorian-title text-xl">Point Group Rankings</h3>
                                </div>
                                <p className="victorian-subtitle mb-4 text-sm">
                                    Your performance in different academic categories
                                </p>
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
                                                    <span style={{ color: rankToColor(ranking.rank) }}>{numberToOrdinal(ranking.rank)}</span> of {ranking.outOf}
                                                </div>
                                            </div>
                                            <div className="victorian-stat-number mb-3 text-lg" style={{ color: rankToColor(ranking.rank) }}>
                                                {ranking.points.toLocaleString()} pts
                                            </div>
                                            <div className="space-y-1">
                                                {ranking.nearbyStudents.slice(0, 3).map((nearby: { studentId: number; firstName: string; lastName: string; points: number; rank: number }) => (
                                                    <div 
                                                        key={nearby.studentId}
                                                        className={`grid grid-cols-3 text-xs ${
                                                            nearby.studentId === student.id ? 'font-bold victorian-accent' : ''
                                                        }`}
                                                        style={{ gridTemplateColumns: '1fr 5fr 2fr' }}
                                                    >
                                                        <span className="text-left col-span-1">
                                                            {numberToOrdinal(nearby.rank)}
                                                        </span>
                                                        <span className="text-left col-span-1">
                                                            {nearby.firstName} {nearby.lastName}
                                                        </span>
                                                        <span className="text-gray-600 col-span-1">
                                                            {nearby.points.toLocaleString()} pts
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Combined Recent Events with Rankings */}
                    {(pointEventRankings && pointEventRankings.length > 0) && (
                        <div className="victorian-section victorian-fade-in victorian-delay-5">
                            <RecentEventsWithRankings 
                                pointEventRankings={pointEventRankings} 
                                initialCount={5}
                            />
                        </div>
                    )}
                </div>
            </div>
    );
}