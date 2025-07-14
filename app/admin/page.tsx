"use client";
import { getAdminHomeDashboard, getAdminSchoolDashboardData } from "@/api/admin";
import { LoadingState } from "@/components/LoadingLayout";
import { useQuery } from "@tanstack/react-query";
import { wrapServerAction } from "@/utils/serverActionWrapper";
import MotionButton from "@/components/MotionButton";
import { useState } from "react";

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
            
            const details: Record<number, unknown> = {};
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

    return (
        <LoadingState
            isLoading={isLoading}
            error={error}
            data={data}
            errorFallback={(err) => (
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Dashboard</h1>
                    <p className="text-gray-600 mb-4">{err.message}</p>
                    <MotionButton onClick={() => window.location.reload()} variant="primary">
                        Retry
                    </MotionButton>
                </div>
            )}
        >
            {(data) => {
                const filteredSchools = data.schools.filter(school =>
                    school.name.toLowerCase().includes(schoolSearch.toLowerCase())
                );

                const sortedSchools = [...filteredSchools].sort((a, b) => {
                    let comparison = 0;
                    
                    if (schoolSort === SortType.Name) {
                        comparison = a.name.localeCompare(b.name);
                    } else if (schoolSort === SortType.Id) {
                        comparison = a.id - b.id;
                    }
                    
                    return schoolSortDirection === SortDirection.Ascending ? comparison : -comparison;
                });

                return (
                    <div className="container mx-auto px-4 py-8">
                        <div className="flex justify-between items-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    placeholder="Search schools..."
                                    value={schoolSearch}
                                    onChange={(e) => setSchoolSearch(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                    value={schoolSort}
                                    onChange={(e) => setSchoolSort(Number(e.target.value) as SortType)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={SortType.Name}>Sort by Name</option>
                                    <option value={SortType.Id}>Sort by ID</option>
                                </select>
                                <button
                                    onClick={() => setSchoolSortDirection(
                                        schoolSortDirection === SortDirection.Ascending 
                                            ? SortDirection.Descending 
                                            : SortDirection.Ascending
                                    )}
                                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    {schoolSortDirection === SortDirection.Ascending ? '↑' : '↓'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sortedSchools.map((school) => {
                                const schoolDetail = schoolDetails?.[school.id];
                                const isLoadingDetail = schoolDetailsLoading;
                                
                                return (
                                    <div key={school.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                                        <div className="flex justify-between items-start mb-4">
                                            <h2 className="text-xl font-semibold text-gray-800">{school.name}</h2>
                                            <span className="text-sm text-gray-500">ID: {school.id}</span>
                                        </div>
                                        
                                        {isLoadingDetail ? (
                                            <div className="space-y-2">
                                                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                                                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                                            </div>
                                        ) : schoolDetail ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Students:</span>
                                                    <span className="font-medium">{(schoolDetail as { students?: unknown[] })?.students?.length || 0}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Groups:</span>
                                                    <span className="font-medium">{(schoolDetail as { studentGroups?: unknown[] })?.studentGroups?.length || 0}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Point Types:</span>
                                                    <span className="font-medium">{(schoolDetail as { pointTypes?: unknown[] })?.pointTypes?.length || 0}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm">Failed to load details</p>
                                        )}
                                        
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <MotionButton 
                                                href={`/admin/school/${school.id}`}
                                                variant="primary"
                                                fullWidth
                                            >
                                                Manage School
                                            </MotionButton>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {sortedSchools.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-lg">No schools found matching your search.</p>
                            </div>
                        )}
                    </div>
                );
            }}
        </LoadingState>
    );
}