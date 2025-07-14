"use client";
import { useState } from "react";
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, YAxis, ZAxis, BarChart, Bar, XAxis, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import Link from "next/link";
import { Space_Mono, Quicksand } from "next/font/google"
import { useQuery } from "@tanstack/react-query";
import { getAdminSchoolDashWithTimeframe } from "@/api/admin";
import { useTheme } from "@/components/ThemeProvider";
import ThemeInput from "@/components/ThemeInput";
import ThemeSelect from "@/components/ThemeSelect";
import { LoadingState } from "@/components/LoadingLayout";
import { wrapServerAction } from "@/utils/serverActionWrapper";
import { faUsers, faGraduationCap, faTrophy, faChartLine, faCalendarAlt, faCog, faUserGraduate, faUsersCog, faChartBar, faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTimeframe } from "./TimeframeProvider";

const customFont = Space_Mono({
    weight: "400",
    subsets: ["latin"]
});

const titleFont = Quicksand({
    weight: "600",
    subsets: ["latin"]
});

enum SortType {
    FirstName,
    LastName,
    Grade,
    Points
}

enum SortDirection {
    Ascending,
    Descending
}

export default function AdminPage({ params: { schoolId } }: { params: { schoolId: string } }) {
    const { theme } = useTheme();
    const { selectedTimeframeId } = useTimeframe();
    
    const {data: adminDashData, isLoading, error} = useQuery({
        queryKey: ["adminSchoolDash", schoolId, selectedTimeframeId],
        queryFn: () => wrapServerAction(getAdminSchoolDashWithTimeframe)(parseInt(schoolId), selectedTimeframeId)
    })

    const [studentSearch, setStudentSearch] = useState<string>("")
    const [studentSort, setStudentSort] = useState<SortType>(SortType.LastName)
    const [studentSortDirection, setStudentSortDirection] = useState<SortDirection>(SortDirection.Ascending)
    const [studentHover, setStudentHover] = useState<number | null>(null)

    const [groupSearch, setGroupSearch] = useState<string>("")
    const [groupSort, setGroupSort] = useState<SortType>(SortType.LastName)
    const [groupSortDirection, setGroupSortDirection] = useState<SortDirection>(SortDirection.Ascending)
    const [showAllStudents, setShowAllStudents] = useState<boolean>(false)

    // Calculate key metrics
    const totalStudents = adminDashData?.students.length || 0;
    const totalGroups = adminDashData?.studentGroups.length || 0;
    const totalPointTypes = adminDashData?.pointTypes.length || 0;
    const averagePoints = totalStudents > 0 && adminDashData?.students ? Math.round(adminDashData.students.reduce((sum, student) => sum + student.totalPoints, 0) / totalStudents) : 0;
    const topStudent = adminDashData?.students.sort((a, b) => b.totalPoints - a.totalPoints)[0];
    const studentsByGrade = adminDashData?.students.reduce((acc, student) => {
        acc[student.grade] = (acc[student.grade] || 0) + 1;
        return acc;
    }, {} as Record<number, number>) || {};

    // Prepare chart data
    const gradeDistribution = Object.entries(studentsByGrade).map(([grade, count]) => ({
        grade: `Grade ${grade}`,
        students: count
    }));

    const pointsDistribution = adminDashData?.students
        .sort((a, b) => a.totalPoints - b.totalPoints)
        .map((student, index) => ({
            name: `${student.lastName}, ${student.firstName}`,
            points: student.totalPoints,
            rank: index + 1,
            id: student.id
        })) || [];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

    return (
        <LoadingState
            isLoading={isLoading}
            error={error}
            data={adminDashData}
            errorFallback={(err) => <div>Error: {err.message}</div>}
        >
            {(data) => (
                <div className="animate-in w-full p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className={`text-3xl font-bold ${titleFont.className}`}>
                                {data.school.name} - Admin Dashboard
                            </h1>
                            <p className="text-muted-foreground">Comprehensive overview and management</p>
                        </div>
                        <div className="flex space-x-2">
                            <Link href={`/admin/school/${schoolId}/students`}>
                                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                                    <FontAwesomeIcon icon={faUsers} className="mr-2" />
                                    Manage Students
                                </button>
                            </Link>
                            <Link href={`/admin/school/${schoolId}/groups`}>
                                <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors">
                                    <FontAwesomeIcon icon={faUsersCog} className="mr-2" />
                                    Manage Groups
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Students</p>
                                    <p className="text-3xl font-bold">{totalStudents}</p>
                                </div>
                                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                                    <FontAwesomeIcon icon={faUserGraduate} className="text-blue-600 dark:text-blue-400 text-xl" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Student Groups</p>
                                    <p className="text-3xl font-bold">{totalGroups}</p>
                                </div>
                                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                                    <FontAwesomeIcon icon={faUsers} className="text-green-600 dark:text-green-400 text-xl" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Point Categories</p>
                                    <p className="text-3xl font-bold">{totalPointTypes}</p>
                                </div>
                                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
                                    <FontAwesomeIcon icon={faStar} className="text-purple-600 dark:text-purple-400 text-xl" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Avg Points/Student</p>
                                    <p className="text-3xl font-bold">{averagePoints.toLocaleString()}</p>
                                </div>
                                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                                    <FontAwesomeIcon icon={faChartLine} className="text-orange-600 dark:text-orange-400 text-xl" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Points Distribution Chart */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold flex items-center">
                                    <FontAwesomeIcon icon={faChartBar} className="mr-2" />
                                    Points Distribution
                                </h3>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-muted-foreground">
                                        {showAllStudents ? `${pointsDistribution.length} students` : 'Top 20 students'}
                                    </span>
                                    <button
                                        onClick={() => setShowAllStudents(!showAllStudents)}
                                        className="text-sm bg-secondary text-secondary-foreground px-3 py-1 rounded hover:bg-secondary/80 transition-colors"
                                    >
                                        {showAllStudents ? 'Show Top 20' : 'Show All Students'}
                                    </button>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <ScatterChart>
                                    <YAxis hide dataKey="points" type="number" name="points" unit="pts" />
                                    <ZAxis dataKey="name" type="category" name="student" />
                                    <Tooltip 
                                        cursor={{ strokeDasharray: '3 3' }}
                                        formatter={(value: unknown, name: unknown) => [value, name]}
                                        labelFormatter={(label) => `Student: ${label}`}
                                    />
                                    <Scatter 
                                        data={showAllStudents ? pointsDistribution : pointsDistribution.slice(-20)}
                                        shape={(props: unknown) => {
                                            const { cx, cy, payload } = props;
                                            const isHovered = payload.id === studentHover;
                                            const color = isHovered 
                                                ? "#00ff00"
                                                : (theme === 'dark' ? "#9ca3af" : "#6b7280");
                                            return (
                                                <circle
                                                    cx={cx}
                                                    cy={cy}
                                                    r={isHovered ? 6 : 4}
                                                    fill={color}
                                                />
                                            );
                                        }}
                                    />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Grade Distribution Chart */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                                <FontAwesomeIcon icon={faGraduationCap} className="mr-2" />
                                Students by Grade
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={gradeDistribution}>
                                    <XAxis dataKey="grade" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="students" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Quick Actions & Navigation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Link href={`/admin/school/${schoolId}/students`}>
                            <div className="bg-card border border-border rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer">
                                <div className="flex items-center mb-3">
                                    <FontAwesomeIcon icon={faUsers} className="text-blue-600 dark:text-blue-400 text-xl mr-3" />
                                    <h3 className="text-lg font-semibold">Student Management</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    View, edit, and manage all students in the school
                                </p>
                            </div>
                        </Link>

                        <Link href={`/admin/school/${schoolId}/groups`}>
                            <div className="bg-card border border-border rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer">
                                <div className="flex items-center mb-3">
                                    <FontAwesomeIcon icon={faUsersCog} className="text-green-600 dark:text-green-400 text-xl mr-3" />
                                    <h3 className="text-lg font-semibold">Group Management</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    Organize students into groups and manage hierarchies
                                </p>
                            </div>
                        </Link>

                        <Link href={`/admin/school/${schoolId}/pointGroups`}>
                            <div className="bg-card border border-border rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer">
                                <div className="flex items-center mb-3">
                                    <FontAwesomeIcon icon={faStar} className="text-purple-600 dark:text-purple-400 text-xl mr-3" />
                                    <h3 className="text-lg font-semibold">Point Categories</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    Configure point types and categories
                                </p>
                            </div>
                        </Link>

                        <Link href={`/admin/school/${schoolId}/rankingGroups`}>
                            <div className="bg-card border border-border rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer">
                                <div className="flex items-center mb-3">
                                    <FontAwesomeIcon icon={faTrophy} className="text-yellow-600 dark:text-yellow-400 text-xl mr-3" />
                                    <h3 className="text-lg font-semibold">Ranking Groups</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    Set up competitive rankings and leaderboards
                                </p>
                            </div>
                        </Link>

                        <Link href={`/admin/school/${schoolId}/teachers`}>
                            <div className="bg-card border border-border rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer">
                                <div className="flex items-center mb-3">
                                    <FontAwesomeIcon icon={faGraduationCap} className="text-indigo-600 dark:text-indigo-400 text-xl mr-3" />
                                    <h3 className="text-lg font-semibold">Teacher Management</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    Manage teachers and their group assignments
                                </p>
                            </div>
                        </Link>

                        <Link href={`/admin/school/${schoolId}/timeframes`}>
                            <div className="bg-card border border-border rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer">
                                <div className="flex items-center mb-3">
                                    <FontAwesomeIcon icon={faCalendarAlt} className="text-red-600 dark:text-red-400 text-xl mr-3" />
                                    <h3 className="text-lg font-semibold">Timeframes</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    Configure academic periods and competition cycles
                                </p>
                            </div>
                        </Link>
                    </div>

                    {/* Top Performers Section */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <FontAwesomeIcon icon={faTrophy} className="mr-2 text-yellow-600" />
                            Top Performers
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {adminDashData?.students
                                .sort((a, b) => b.totalPoints - a.totalPoints)
                                .slice(0, 6)
                                .map((student, index) => (
                                    <Link key={student.id} href={`/admin/school/${schoolId}/student/${student.id}`}>
                                        <div className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                                                <span className="text-lg font-bold text-primary">
                                                    {student.totalPoints.toLocaleString()} pts
                                                </span>
                                            </div>
                                            <div className="font-semibold">
                                                {student.firstName} {student.lastName}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Grade {student.grade}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                        </div>
                    </div>

                    {/* Quick Data Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Students */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4">Recent Students</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {adminDashData?.students
                                    .slice(0, 10)
                                    .map(student => (
                                        <Link key={student.id} href={`/admin/school/${schoolId}/student/${student.id}`}>
                                            <div className="flex items-center justify-between p-2 hover:bg-accent/50 rounded transition-colors cursor-pointer">
                                                <div>
                                                    <div className="font-medium">{student.firstName} {student.lastName}</div>
                                                    <div className="text-sm text-muted-foreground">Grade {student.grade}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold">{student.totalPoints.toLocaleString()}</div>
                                                    <div className="text-sm text-muted-foreground">points</div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                            </div>
                        </div>

                        {/* Student Groups */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4">Student Groups</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {adminDashData?.studentGroups
                                    .slice(0, 10)
                                    .map(group => (
                                        <Link key={group.id} href={`/admin/school/${schoolId}/editGroup/${group.id}`}>
                                            <div className="flex items-center justify-between p-2 hover:bg-accent/50 rounded transition-colors cursor-pointer">
                                                <div className="font-medium">{group.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {group.parentId ? 'Subgroup' : 'Main Group'}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </LoadingState>
    )
}