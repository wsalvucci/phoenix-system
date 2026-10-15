"use client";
import { getAdminHomeDashboard, getAdminSchoolDashboardData } from "@/api/admin";
import { LoadingState } from "@/components/LoadingLayout";
import { useQuery } from "@tanstack/react-query";
import { wrapServerAction } from "@/utils/serverActionWrapper";
import NotAllowed from "@/components/NotAllowed";
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
        queryFn: () => wrapServerAction(getAdminHomeDashboard)(),
        retry: false
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
            errorFallback={() => <NotAllowed what="the administration dashboard" />}
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
                    <div className="app-page">
                      <header className="app-header">
                        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
                          <div>
                            <p className="eyebrow">Administration</p>
                            <h1 className="page-title mt-1">Schools</h1>
                            <p className="page-description">Choose a school to manage its people, groups, and settings.</p>
                          </div>
                        </div>
                      </header>
                      <main className="page-container">
                        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{sortedSchools.length} {sortedSchools.length === 1 ? "school" : "schools"}</p>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <input
                                    type="text"
                                    placeholder="Search schools..."
                                    value={schoolSearch}
                                    onChange={(e) => setSchoolSearch(e.target.value)}
                                    aria-label="Search schools"
                                    className="field sm:w-64"
                                />
                                <select
                                    value={schoolSort}
                                    onChange={(e) => setSchoolSort(Number(e.target.value) as SortType)}
                                    aria-label="Sort schools"
                                    className="field"
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
                                    className="button-secondary"
                                    aria-label={schoolSortDirection === SortDirection.Ascending ? "Sort descending" : "Sort ascending"}
                                >
                                    {schoolSortDirection === SortDirection.Ascending ? '↑' : '↓'}
                                </button>
                            </div>
                        </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {sortedSchools.map((school) => {
                                const schoolDetail = schoolDetails?.[school.id];
                                const isLoadingDetail = schoolDetailsLoading;
                                
                                return (
                                    <article key={school.id} className="surface flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-md">
                                        <div className="flex justify-between items-start mb-4">
                                            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{school.name}</h2>
                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">ID {school.id}</span>
                                        </div>
                                        
                                        {isLoadingDetail ? (
                                            <div className="space-y-2">
                                                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                                                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                                            </div>
                                        ) : schoolDetail ? (
                                            <dl className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <dt className="text-slate-600 dark:text-slate-400">Students</dt>
                                                    <dd className="font-semibold">{(schoolDetail as { students?: unknown[] })?.students?.length || 0}</dd>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <dt className="text-slate-600 dark:text-slate-400">Groups</dt>
                                                    <dd className="font-semibold">{(schoolDetail as { studentGroups?: unknown[] })?.studentGroups?.length || 0}</dd>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <dt className="text-slate-600 dark:text-slate-400">Point groups</dt>
                                                    <dd className="font-semibold">{(schoolDetail as { pointTypes?: unknown[] })?.pointTypes?.length || 0}</dd>
                                                </div>
                                            </dl>
                                        ) : (
                                            <p className="text-gray-500 text-sm">Failed to load details</p>
                                        )}
                                        
                                        <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800">
                                            <MotionButton 
                                                href={`/admin/school/${school.id}`}
                                                variant="primary"
                                                fullWidth
                                            >
                                                Manage School
                                            </MotionButton>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {sortedSchools.length === 0 && (
                            <div className="surface border-dashed py-12 text-center">
                                <p className="text-slate-500">No schools match your search.</p>
                            </div>
                        )}
                      </main>
                    </div>
                );
            }}
        </LoadingState>
    );
}
