"use client";
import Link from "next/link";

// Force static generation to reduce serverless functions
export const dynamic = 'force-static';
import { getTeacherDashboardData } from "@/api/teacher";
import { LoadingState } from "@/components/LoadingLayout";
import { useQuery } from "@tanstack/react-query";
import { wrapServerAction } from "@/utils/serverActionWrapper";
import NotAllowed from "@/components/NotAllowed";
import MotionButton from "@/components/MotionButton";
import { useState } from "react";
import ThemeInput from "@/components/ThemeInput";

/** Search only earns its place once the list is long enough to need it. */
const SEARCH_THRESHOLD = 8;

export default function TeacherHome() {
    const [groupSearch, setGroupSearch] = useState<string>("");
    const [showArchivedGroups, setShowArchivedGroups] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ["teacherDashboard"],
        queryFn: () => wrapServerAction(getTeacherDashboardData)(),
        retry: false
    });

    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

    const activeGroups = data?.studentGroups.filter(group => !group.archived) ?? [];
    const archivedCount = (data?.studentGroups.length ?? 0) - activeGroups.length;
    const groups = (data?.studentGroups ?? [])
        .filter(group => (showArchivedGroups || !group.archived) && group.name.toLowerCase().includes(groupSearch.toLowerCase()))
        .sort(byName);
    const competitions = [...(data?.rankingGroups ?? [])].sort(byName);

    return (
        <LoadingState
            isLoading={isLoading}
            error={error}
            data={data}
            errorFallback={() => <NotAllowed what="the teacher dashboard" />}
        >
            {(data) => (
                <div className="app-page animate-in w-full">
                    <header className="app-header flex w-full items-center justify-between gap-4 px-5 py-4 text-slate-900 dark:text-slate-100">
                        <div className="flex flex-col">
                            <Link href="/" className="inline-flex min-h-[44px] items-center text-sm font-medium hover:underline">← Home</Link>
                            <Link href="/dashboard" className="inline-flex min-h-[44px] items-center text-sm text-slate-600 hover:underline dark:text-slate-300">Open hallway display</Link>
                        </div>
                        <div className="text-right">
                            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
                            <p className="text-sm mt-1 text-slate-600 dark:text-slate-300">{data.teacher.firstName} {data.teacher.lastName}</p>
                        </div>
                    </header>

                    <div className="m-5">
                        {data.studentGroups.length === 0 && competitions.length === 0 ? (
                            <div className="mx-auto max-w-md py-12 text-center">
                                <h2 className="text-2xl font-bold">You are not in any group yet</h2>
                                <p className="mt-2 text-slate-600 dark:text-slate-400">
                                    Your groups appear here once your school admin adds you to one. Ask them to add you, then reload this page.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Your groups: the thing a teacher came for */}
                                <section className="mb-8">
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-2xl font-bold">Your groups</h2>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">Pick a group to open its scorebook.</p>
                                        </div>
                                        {archivedCount > 0 && (
                                            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={showArchivedGroups}
                                                    onChange={(event) => setShowArchivedGroups(event.target.checked)}
                                                    className="h-4 w-4 rounded"
                                                />
                                                Show {archivedCount} archived
                                            </label>
                                        )}
                                    </div>

                                    {activeGroups.length >= SEARCH_THRESHOLD && (
                                        <ThemeInput
                                            type="search"
                                            placeholder="Search your groups"
                                            aria-label="Search your groups"
                                            fullWidth
                                            value={groupSearch}
                                            onChange={(e) => setGroupSearch(e.target.value)}
                                            className="mb-4"
                                        />
                                    )}

                                    {groups.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {groups.map((group) => (
                                                <MotionButton
                                                    href={`/teacher/group/${group.id}`}
                                                    key={group.id}
                                                    variant="secondary"
                                                    className="bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-700 shadow-md transition-all duration-200 h-28"
                                                >
                                                    <div className="flex flex-col items-center justify-center text-center w-full h-full p-4">
                                                        <div className="text-lg font-bold">{group.name}</div>
                                                        {group.archived && (
                                                            <div className="mt-2 text-xs bg-yellow-500 text-white px-2 py-1 rounded">
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
                                                {groupSearch
                                                    ? `No group matches "${groupSearch}". Clear the search to see all your groups.`
                                                    : archivedCount > 0
                                                        ? 'All your groups are archived. Tick "Show archived" to open them.'
                                                        : 'You are not in any group yet. Ask your school admin to add you to one.'}
                                            </p>
                                        </div>
                                    )}
                                </section>

                                {/* Competitions: secondary, only when the teacher has some */}
                                {competitions.length > 0 && (
                                    <section className="mb-8">
                                        <h2 className="text-2xl font-bold">Your competitions</h2>
                                        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Events scored across several groups.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {competitions.map((rankingGroup) => (
                                                <MotionButton
                                                    href={`/teacher/rankingGroup/${rankingGroup.id}`}
                                                    key={rankingGroup.id}
                                                    variant="secondary"
                                                    className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md transition-all duration-200 h-28"
                                                >
                                                    <div className="flex flex-col items-center justify-center text-center w-full h-full p-4">
                                                        <div className="text-lg font-bold mb-1">{rankingGroup.name}</div>
                                                        <div className="text-xs opacity-75">
                                                            {rankingGroup.studentGroups.length} group{rankingGroup.studentGroups.length !== 1 ? 's' : ''} competing
                                                        </div>
                                                    </div>
                                                </MotionButton>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </LoadingState>
    );
}
