"use client";
import { Teacher } from "@/types/domain";

// Force static generation to reduce serverless functions
export const dynamic = 'force-static';
import { getTeacherDashboardData } from "@/api/teacher";
import { LoadingState } from "@/components/LoadingLayout";
import { useQuery } from "@tanstack/react-query";
import { wrapServerAction } from "@/utils/serverActionWrapper";
import MotionButton from "@/components/MotionButton";
import { useState } from "react";
import ThemeInput from "@/components/ThemeInput";
import ThemeSelect from "@/components/ThemeSelect";

enum SortType {
    Name,
    Id
}

enum SortDirection {
    Ascending,
    Descending
}

export default function TeacherHome() {
    const [groupSearch, setGroupSearch] = useState<string>("");
    const [groupSort, setGroupSort] = useState<SortType>(SortType.Name);
    const [groupSortDirection, setGroupSortDirection] = useState<SortDirection>(SortDirection.Ascending);
    const [rankingGroupSearch, setRankingGroupSearch] = useState<string>("");
    const [rankingGroupSort, setRankingGroupSort] = useState<SortType>(SortType.Name);
    const [rankingGroupSortDirection, setRankingGroupSortDirection] = useState<SortDirection>(SortDirection.Ascending);

    const { data, isLoading, error } = useQuery({
        queryKey: ["teacherDashboard"],
        queryFn: () => wrapServerAction(getTeacherDashboardData)()
    });

    console.log("TeacherHome debug:", { data, isLoading, error });

    const filteredAndSortedGroups = data?.studentGroups
        .filter(group => group.name.toLowerCase().includes(groupSearch.toLowerCase()))
        .sort((a, b) => {
            switch (groupSort) {
                case SortType.Name:
                    return groupSortDirection === SortDirection.Ascending 
                        ? a.name.localeCompare(b.name) 
                        : b.name.localeCompare(a.name);
                case SortType.Id:
                    return groupSortDirection === SortDirection.Ascending 
                        ? a.id - b.id 
                        : b.id - a.id;
                default:
                    return a.name.localeCompare(b.name);
            }
        }) || [];

    const filteredAndSortedRankingGroups = data?.rankingGroups
        .filter(group => group.name.toLowerCase().includes(rankingGroupSearch.toLowerCase()))
        .sort((a, b) => {
            switch (rankingGroupSort) {
                case SortType.Name:
                    return rankingGroupSortDirection === SortDirection.Ascending 
                        ? a.name.localeCompare(b.name) 
                        : b.name.localeCompare(a.name);
                case SortType.Id:
                    return rankingGroupSortDirection === SortDirection.Ascending 
                        ? a.id - b.id 
                        : b.id - a.id;
                default:
                    return a.name.localeCompare(b.name);
            }
        }) || [];


    return (
        <LoadingState
            isLoading={isLoading}
            error={error}
            data={data}
            errorFallback={(err) => (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Dashboard</h2>
                        <p className="text-gray-600 dark:text-gray-400">{err.message}</p>
                    </div>
                </div>
            )}
        >
            {(data) => (
                <div className="animate-in w-full">
                    <header className="flex items-center justify-center w-full p-5 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        <div className="text-center">
                            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
                            <p className="text-lg mt-2">Welcome, {data.teacher.firstName} {data.teacher.lastName}</p>
                        </div>
                    </header>
                    
                    <div className="m-5">
                        {/* Student Groups Section */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-4">Your Student Groups ({filteredAndSortedGroups.length})</h2>
                            
                            {/* Search and Sort Controls */}
                            <div className="mb-4">
                                <ThemeInput
                                    type="text"
                                    placeholder="Search Groups"
                                    fullWidth
                                    onChange={(e) => setGroupSearch(e.target.value)}
                                    className="mb-2"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <ThemeSelect
                                        fullWidth
                                        onChange={(e) => setGroupSort(parseInt(e.target.value))}
                                    >
                                        <option value={SortType.Name}>Name</option>
                                        <option value={SortType.Id}>ID</option>
                                    </ThemeSelect>
                                    <ThemeSelect
                                        fullWidth
                                        onChange={(e) => setGroupSortDirection(parseInt(e.target.value))}
                                    >
                                        <option value={SortDirection.Ascending}>ASC</option>
                                        <option value={SortDirection.Descending}>DESC</option>
                                    </ThemeSelect>
                                </div>
                            </div>

                            {/* Groups Grid */}
                            {filteredAndSortedGroups.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredAndSortedGroups.map((group) => (
                                        <MotionButton 
                                            href={`/teacher/group/${group.id}`} 
                                            key={group.id}
                                            variant="secondary"
                                            className="bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-700 shadow-md transition-all duration-200 h-32"
                                        >
                                            <div className="flex flex-col items-center justify-center text-center w-full h-full p-4">
                                                <div className="text-lg font-bold mb-2">{group.name}</div>
                                                <div className="text-sm opacity-75 mb-2">Group ID: {group.id}</div>
                                                {group.archived && (
                                                    <div className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                                                        Archived
                                                    </div>
                                                )}
                                            </div>
                                        </MotionButton>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {groupSearch ? 'No groups match your search criteria.' : 'No groups found.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Ranking Groups Section */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-4">Your Ranking Groups ({filteredAndSortedRankingGroups.length})</h2>
                            
                            {/* Search and Sort Controls */}
                            <div className="mb-4">
                                <ThemeInput
                                    type="text"
                                    placeholder="Search Ranking Groups"
                                    fullWidth
                                    onChange={(e) => setRankingGroupSearch(e.target.value)}
                                    className="mb-2"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <ThemeSelect
                                        fullWidth
                                        onChange={(e) => setRankingGroupSort(parseInt(e.target.value))}
                                    >
                                        <option value={SortType.Name}>Name</option>
                                        <option value={SortType.Id}>ID</option>
                                    </ThemeSelect>
                                    <ThemeSelect
                                        fullWidth
                                        onChange={(e) => setRankingGroupSortDirection(parseInt(e.target.value))}
                                    >
                                        <option value={SortDirection.Ascending}>ASC</option>
                                        <option value={SortDirection.Descending}>DESC</option>
                                    </ThemeSelect>
                                </div>
                            </div>

                            {/* Ranking Groups Grid */}
                            {filteredAndSortedRankingGroups.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredAndSortedRankingGroups.map((rankingGroup) => (
                                        <MotionButton 
                                            href={`/teacher/rankingGroup/${rankingGroup.id}`} 
                                            key={rankingGroup.id}
                                            variant="secondary"
                                            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md transition-all duration-200 h-32"
                                        >
                                            <div className="flex flex-col items-center justify-center text-center w-full h-full p-4">
                                                <div className="text-lg font-bold mb-2">{rankingGroup.name}</div>
                                                <div className="text-sm opacity-75 mb-2">Ranking Group ID: {rankingGroup.id}</div>
                                                <div className="text-xs opacity-75">
                                                    {rankingGroup.studentGroups.length} Student Group{rankingGroup.studentGroups.length !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </MotionButton>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {rankingGroupSearch ? 'No ranking groups match your search criteria.' : 'No ranking groups found.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-8">
                            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Teacher ID</h3>
                                <p className="text-3xl font-bold text-blue-600">{data.teacher.id}</p>
                            </div>
                            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">School ID</h3>
                                <p className="text-3xl font-bold text-green-600">{data.teacher.schoolId}</p>
                            </div>
                            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Student Groups</h3>
                                <p className="text-3xl font-bold text-purple-600">{data.studentGroups.length}</p>
                            </div>
                            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Ranking Groups</h3>
                                <p className="text-3xl font-bold text-orange-600">{data.rankingGroups.length}</p>
                            </div>
                            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Link Code</h3>
                                <p className="text-3xl font-bold text-red-600">{data.teacher.linkCode}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </LoadingState>
    );
}