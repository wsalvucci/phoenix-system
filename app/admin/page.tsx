"use client";
import { AdminHomeDashboard, School } from "@/types/domain";

// Force static generation to reduce serverless functions
export const dynamic = 'force-static';
import { getAdminHomeDashboard, getAdminSchoolDashboardData } from "@/api/admin";
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

export default function AdminHome() {
    const [schoolSearch, setSchoolSearch] = useState<string>("");
    const [schoolSort, setSchoolSort] = useState<SortType>(SortType.Name);
    const [schoolSortDirection, setSchoolSortDirection] = useState<SortDirection>(SortDirection.Ascending);

    const { data, isLoading, error } = useQuery({
        queryKey: ["adminDashboard"],
        queryFn: () => wrapServerAction(getAdminHomeDashboard)()
    });

    // Fetch detailed data for each school
    const { data: schoolDetails, isLoading: schoolDetailsLoading } = useQuery({
        queryKey: ["adminSchoolDetails", data?.schools?.map(s => s.id)],
        queryFn: async () => {
            if (!data?.schools) return {};
            
            const details: Record<number, any> = {};
            await Promise.all(
                data.schools.map(async (school) => {
                    try {
                        const schoolData = await wrapServerAction(getAdminSchoolDashboardData)(school.id);
                        details[school.id] = schoolData;
                    } catch (error) {
                        console.error(`Failed to load details for school ${school.id}:`, error);
                        details[school.id] = null;
                    }
                })
            );
            return details;
        },
        enabled: !!data?.schools && data.schools.length > 0
    });

    console.log("AdminHome debug:", { data, isLoading, error });

    const filteredAndSortedSchools = data?.schools
        .filter(school => school.name.toLowerCase().includes(schoolSearch.toLowerCase()))
        .sort((a, b) => {
            switch (schoolSort) {
                case SortType.Name:
                    return schoolSortDirection === SortDirection.Ascending 
                        ? a.name.localeCompare(b.name) 
                        : b.name.localeCompare(a.name);
                case SortType.Id:
                    return schoolSortDirection === SortDirection.Ascending 
                        ? a.id - b.id 
                        : b.id - a.id;
                default:
                    return a.name.localeCompare(b.name);
            }
        }) || [];

    return (
        <LoadingState
            isLoading={isLoading || schoolDetailsLoading}
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
                            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                            <p className="text-lg mt-2">Manage your schools and view analytics</p>
                        </div>
                    </header>
                    
                    <div className="m-5">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-4">Your Schools ({filteredAndSortedSchools.length})</h2>
                            
                            {/* Search and Sort Controls */}
                            <div className="mb-4">
                                <ThemeInput
                                    type="text"
                                    placeholder="Search Schools"
                                    fullWidth
                                    onChange={(e) => setSchoolSearch(e.target.value)}
                                    className="mb-2"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <ThemeSelect
                                        fullWidth
                                        onChange={(e) => setSchoolSort(parseInt(e.target.value))}
                                    >
                                        <option value={SortType.Name}>Name</option>
                                        <option value={SortType.Id}>ID</option>
                                    </ThemeSelect>
                                    <ThemeSelect
                                        fullWidth
                                        onChange={(e) => setSchoolSortDirection(parseInt(e.target.value))}
                                    >
                                        <option value={SortDirection.Ascending}>ASC</option>
                                        <option value={SortDirection.Descending}>DESC</option>
                                    </ThemeSelect>
                                </div>
                            </div>

                            {/* Schools Grid */}
                            {filteredAndSortedSchools.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredAndSortedSchools.map((school) => {
                                        const schoolDetail = schoolDetails?.[school.id];
                                        const studentCount = schoolDetail?.students?.length || 0;
                                        const totalPoints = schoolDetail?.students?.reduce((acc: number, student: any) => acc + (student.totalPoints || 0), 0) || 0;
                                        const groupCount = schoolDetail?.studentGroups?.length || 0;
                                        
                                        return (
                                            <MotionButton 
                                                href={`/admin/school/${school.id}`} 
                                                key={school.id}
                                                variant="secondary"
                                                className="bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-700 shadow-md transition-all duration-200 h-40"
                                            >
                                                <div className="flex flex-col items-center justify-center text-center w-full h-full p-4">
                                                    <div className="text-xl font-bold mb-2">{school.name}</div>
                                                    <div className="text-sm opacity-75 mb-2">School ID: {school.id}</div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="bg-slate-400 dark:bg-slate-800 px-2 py-1 rounded">
                                                            <div className="font-semibold">{studentCount}</div>
                                                            <div>Students</div>
                                                        </div>
                                                        <div className="bg-slate-400 dark:bg-slate-800 px-2 py-1 rounded">
                                                            <div className="font-semibold">{groupCount}</div>
                                                            <div>Groups</div>
                                                        </div>
                                                        <div className="bg-slate-400 dark:bg-slate-800 px-2 py-1 rounded col-span-2">
                                                            <div className="font-semibold">{totalPoints.toLocaleString()}</div>
                                                            <div>Total Points</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </MotionButton>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {schoolSearch ? 'No schools match your search criteria.' : 'No schools found.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Total Schools</h3>
                                <p className="text-3xl font-bold text-blue-600">{data.schools.length}</p>
                            </div>
                            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Total Students</h3>
                                <p className="text-3xl font-bold text-green-600">
                                    {Object.values(schoolDetails || {}).reduce((acc: number, school: any) => 
                                        acc + (school?.students?.length || 0), 0
                                    )}
                                </p>
                            </div>
                            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Total Points</h3>
                                <p className="text-3xl font-bold text-purple-600">
                                    {Object.values(schoolDetails || {}).reduce((acc: number, school: any) => 
                                        acc + (school?.students?.reduce((sAcc: number, student: any) => 
                                            sAcc + (student.totalPoints || 0), 0
                                        ) || 0), 0
                                    ).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Admin ID</h3>
                                <p className="text-3xl font-bold text-orange-600">{data.id}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </LoadingState>
    );
}