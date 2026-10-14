"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSchoolId, getDashboardSchools } from "@/app/supaApi/server/dashboard/dashboardSchool";

type Tile = { title: string; desc: string; endpoint: string };

const MAIN_TILES: Tile[] = [
    { title: "Featured board", desc: "Rotating highlights for a hallway screen.", endpoint: "featured" },
    { title: "Whole-school board", desc: "Whole-school highlights on one screen.", endpoint: "global" },
];
const QUIET_TILES: Tile[] = [
    { title: "Phone view", desc: "Highlights sized for a phone.", endpoint: "mobile" },
    { title: "Top cards", desc: "Top students as cards.", endpoint: "topCards" },
];

export default function Dashboard() {
    const router = useRouter();
    const raw = useSearchParams().get("school");
    const requested = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;

    const selected = useQuery({
        queryKey: ["dashboardSchool", requested],
        queryFn: () => getDashboardSchoolId(requested),
        staleTime: 5 * 60_000,
    });
    const schools = useQuery({
        queryKey: ["dashboardSchools"],
        queryFn: () => getDashboardSchools(),
        staleTime: 5 * 60_000,
    });

    const schoolId = selected.data ?? null;
    const schoolName = schools.data?.find((s) => s.id === schoolId)?.name ?? null;
    const loading = selected.isLoading || schools.isLoading;
    const failed = selected.isError || schools.isError;
    // The caller asked for a school and was given a different one.
    // The notice names only the school being shown (DATA_DISCLOSURE.md §10.7).
    const fellBack = requested !== null && schoolId !== null && schoolId !== requested;
    const query = schoolId !== null ? `?school=${schoolId}` : "";

    const renderTile = (tile: Tile, primary: boolean) => (
        <Link
            key={tile.endpoint}
            href={`/dashboard/${tile.endpoint}${query}`}
            className={`block min-h-[44px] rounded-lg border p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                primary
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            }`}
        >
            <div className={primary ? "text-2xl font-bold" : "text-lg font-semibold"}>{tile.title}</div>
            <div className="mt-1 text-sm">{tile.desc}</div>
        </Link>
    );

    return (
        <div className="mx-auto w-full max-w-2xl px-5 py-6">
            <Link href="/" className="inline-flex min-h-[44px] items-center text-sm font-medium hover:underline">← Home</Link>
            <h1 className="mt-2 text-3xl font-bold">Which display do you want to open?</h1>

            {loading ? (
                <div className="mt-3 h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" aria-label="Loading your school" />
            ) : failed || schoolId === null ? (
                <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
                    We could not load your school. Reload the page to try again.
                </p>
            ) : (
                <>
                    <p className="mt-3 text-base">
                        Showing: <span className="font-semibold">{schoolName ?? "your school"}</span>
                    </p>
                    {fellBack && (
                        <p role="status" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            You do not have access to that school. Showing {schoolName ?? "your school"} instead.
                        </p>
                    )}
                    {(schools.data?.length ?? 0) > 1 && (
                        <label className="mt-3 grid gap-1 text-sm font-medium">
                            Switch school
                            <select
                                className="field min-h-[44px]"
                                value={schoolId}
                                onChange={(e) => router.replace(`/dashboard?school=${e.target.value}`)}
                            >
                                {schools.data!.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </label>
                    )}
                </>
            )}

            <div className="mt-6 grid gap-4">
                {MAIN_TILES.map((t, i) => renderTile(t, i === 0))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {QUIET_TILES.map((t) => renderTile(t, false))}
            </div>
        </div>
    );
}
