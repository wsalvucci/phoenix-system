"use client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { getDashboardSchoolId } from "@/app/supaApi/server/dashboard/dashboardSchool";

/**
 * School for the current dashboard, derived server-side from the staff session.
 * `?school=<id>` selects among the caller's schools (multi-school staff); an id the
 * caller is not staff of silently falls back to their default school.
 * `schoolId` is null until resolved; gate queries with `enabled: schoolId !== null`.
 */
export function useDashboardSchool(): { schoolId: number | null; isError: boolean } {
    const raw = useSearchParams().get("school");
    const parsed = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
    const query = useQuery({
        queryKey: ["dashboardSchool", parsed],
        queryFn: () => getDashboardSchoolId(parsed),
        staleTime: 5 * 60_000,
    });
    return { schoolId: query.data ?? null, isError: query.isError };
}
