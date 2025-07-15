import Link from "next/link";
import { getStudentDataWithContext, getStudentDashboardData, getStudentRecentEvents, getStudentMonthlyTrends } from "@/api/student";
import { StudentDashboardData, StudentRecentEvent, rankToColor, rankToColorWithOpacity, StudentMonthlyTrends } from "@/types/domain";
import dynamic from "next/dynamic";
import "./victorian-theme.css";

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

    return (
        <div className="victorian-bg victorian-scrollbar">
            {/* Victorian Header */}
            <div className="victorian-header">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2 victorian-fade-in">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl md:text-3xl font-bold text-white">
                                    {student.firstName} {student.lastName}
                                </h1>
                            </div>
                            <div className="flex items-center gap-4 text-white/90 text-sm">
                                <span className="flex items-center gap-2">
                                    Grade {student.grade}
                                </span>
                                <span className="flex items-center gap-2">
                                    {dashboardData.timeframe.name}
                                </span>
                            </div>
                        </div>
                        <div className="text-right victorian-fade-in victorian-delay-1">
                            <div className="victorian-stat">
                                <div className="victorian-stat-number text-white text-xl md:text-2xl">
                                    {totalPoints.toLocaleString()}pts
                                </div>
                                {monthlyTrends?.currentMonth ? (
                                    <div className="text-green-400 text-xs mt-1">
                                        +{monthlyTrends.currentMonth.pointIncrease}pts ({Math.round(monthlyTrends.currentMonth.percentageIncrease)}%)
                                    </div>
                                ) : (
                                    <div className="text-gray-400 text-xs mt-1">
                                        No recent activity
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-4">
                {/* Academic Achievement Overview */}
                <div className="victorian-section victorian-fade-in">
                    <div className="victorian-grid">

                        {/* Overall Ranking */}
                        <div className="victorian-content victorian-delay-1">
                            <div className="flex items-center gap-3 mb-4">
                                <h3 className="victorian-title text-xl">Overall Ranking</h3>
                            </div>
                            <div className="text-center mb-4">
                                <div className="victorian-stat-number text-2xl" style={{ color: themeColor }}>
                                    #{totalRank}
                                    {monthlyTrends?.currentMonth && (
                                        <span className="text-green-400 text-sm ml-2">
                                            {monthlyTrends.currentMonth.rankChange > 0 ? '+' : ''}{monthlyTrends.currentMonth.rankChange}
                                        </span>
                                    )}
                                </div>
                                <div className="victorian-subtitle text-sm">
                                    of {totalOutOf} students
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="victorian-subtitle font-medium text-sm">Nearby Students</div>
                                <div className="space-y-2">
                                    {nearbyStudents.map((nearby, index) => (
                                        <div 
                                            key={nearby.studentId}
                                            className={`victorian-list-item flex items-center justify-between ${
                                                nearby.studentId === student.id ? 'highlight' : ''
                                            } victorian-slide-in`}
                                            style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                                        >
                                            <span className="font-medium">
                                                {nearby.firstName} {nearby.lastName}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-gray-600">
                                                    {nearby.totalPoints.toLocaleString()} pts
                                                </span>
                                                <span className="victorian-accent text-sm font-semibold">
                                                    #{nearby.rank}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Grade Ranking */}
                        <div className="victorian-content victorian-delay-2">
                            <div className="flex items-center gap-3 mb-4">
                                <h3 className="victorian-title text-xl">Grade {student.grade} Ranking</h3>
                            </div>
                            <div className="text-center mb-4">
                                <div className="victorian-stat-number text-2xl text-blue-600">
                                    #{gradeRank}
                                    {monthlyTrends?.currentMonth && (
                                        <span className="text-green-400 text-sm ml-2">
                                            {monthlyTrends.currentMonth.percentageIncrease > 0 ? '+' : ''}{Math.round(monthlyTrends.currentMonth.percentageIncrease)}%
                                        </span>
                                    )}
                                </div>
                                <div className="victorian-subtitle text-sm">
                                    of {gradeOutOf} students
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="victorian-subtitle font-medium text-sm">Grade Peers</div>
                                <div className="space-y-2">
                                    {nearbyGradeStudents.map((nearby, index) => (
                                        <div 
                                            key={nearby.studentId}
                                            className={`victorian-list-item flex items-center justify-between ${
                                                nearby.studentId === student.id ? 'highlight' : ''
                                            } victorian-slide-in`}
                                            style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                                        >
                                            <span className="font-medium">
                                                {nearby.firstName} {nearby.lastName}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-gray-600">
                                                    {nearby.points.toLocaleString()} pts
                                                </span>
                                                <span className="victorian-accent text-sm font-semibold">
                                                    #{nearby.rank}
                                                </span>
                                            </div>
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
                            <div className="space-y-3">
                                <Link 
                                    href="/dashboard/mobile"
                                    className="victorian-button-secondary inline-flex items-center justify-center w-full px-4 py-3 rounded-lg"
                                >
                                    View Global Stats
                                </Link>
                                <Link 
                                    href="/student/compare"
                                    className="victorian-button-secondary inline-flex items-center justify-center w-full px-4 py-3 rounded-lg"
                                >
                                    Compare Rankings
                                </Link>
                            </div>
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
                                            <div className="victorian-subtitle text-xs">
                                                {numberToOrdinal(ranking.rank)} of {ranking.outOf}
                                            </div>
                                        </div>
                                        <div className="victorian-stat-number mb-3 text-lg" style={{ color: rankToColor(ranking.rank) }}>
                                            {ranking.points.toLocaleString()} pts
                                        </div>
                                        <div className="space-y-1">
                                            {ranking.nearbyStudents.slice(0, 3).map((nearby: { studentId: number; firstName: string; lastName: string; points: number; rank: number }) => (
                                                <div 
                                                    key={nearby.studentId}
                                                    className={`flex items-center justify-between text-xs ${
                                                        nearby.studentId === student.id ? 'font-bold victorian-accent' : ''
                                                    }`}
                                                >
                                                    <span>
                                                        {nearby.firstName} {nearby.lastName}
                                                    </span>
                                                    <span className="text-gray-600">
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