"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSchoolId, getDashboardSchools, getDashboardViewerSummary } from "@/app/supaApi/server/dashboard/dashboardSchool";
import { useTheme } from "@/components/ThemeProvider";

type Tile = { title: string; desc: string; endpoint: string };

const MAIN_TILES: Tile[] = [
    { title: "Featured board", desc: "Rotating highlights for a hallway screen.", endpoint: "featured" },
    { title: "Whole-school board", desc: "Whole-school highlights on one screen.", endpoint: "global" },
];
const QUIET_TILES: Tile[] = [
    { title: "Phone view", desc: "Highlights sized for a phone.", endpoint: "mobile" },
    { title: "Top cards", desc: "Top students as cards.", endpoint: "topCards" },
];

/** Flat block thumbnail of a scene: shapes only, no names, no numbers. */
function Thumb({ kind }: { kind: string }) {
    const bar = "h-1.5 rounded-sm bg-rule";
    const plate = "rounded-sm bg-card";
    return (
        <div aria-hidden="true" className="relative aspect-video w-full overflow-hidden rounded-md border border-rule bg-background p-2">
            {kind === "mobile" ? (
                <div className="mx-auto grid h-full w-1/3 content-start gap-1 rounded-md border border-rule bg-card p-1.5">
                    <div className="mx-auto h-1.5 w-1/2 rounded-sm bg-foreground/60" />
                    {[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex items-center gap-1"><span className="size-2 rounded-full bg-rank-ink/70" /><span className={`${bar} flex-1`} /></div>)}
                </div>
            ) : kind === "topCards" ? (
                <div className="mx-auto grid h-full w-1/2 content-center gap-1">
                    <div className={`${plate} h-1/3 border-t-2 border-t-gilt`} />
                    <div className={`${plate} h-1/4`} />
                    <div className={`${plate} h-1/4`} />
                </div>
            ) : (
                <div className="grid h-full grid-cols-[36fr_64fr] gap-2">
                    <div className="grid content-center gap-1">
                        <div className={`${plate} h-6 border-t-2 border-t-gilt`} />
                        <div className={`${plate} h-4`} />
                        <div className={`${plate} h-4`} />
                    </div>
                    <div className="grid content-center gap-1">
                        {[0, 1, 2, 3, 4].map((i) => <div key={i} className={`${plate} h-3`} />)}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Dashboard() {
    const router = useRouter();
    const { theme } = useTheme();
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
    const viewer = useQuery({
        queryKey: ["dashboardViewer"],
        queryFn: () => getDashboardViewerSummary(),
        staleTime: 5 * 60_000,
    });
    const display = viewer.data?.kind === "display" ? viewer.data : null;
    const isStaff = viewer.data?.kind === "staff";

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
            className={`block min-h-[44px] rounded-lg border bg-card p-4 text-card-foreground shadow-1 transition-shadow hover:shadow-2 ${
                primary ? "border-border border-t-[3px] border-t-gilt" : "border-border"
            }`}
        >
            <Thumb kind={tile.endpoint} />
            <div className={`mt-3 font-display ${primary ? "text-2xl font-semibold" : "text-lg font-semibold"}`}>{tile.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{tile.desc}</div>
        </Link>
    );

    return (
        <div className={`honor-board ${theme === "dark" ? "dark" : ""} min-h-screen w-full bg-background text-foreground`}>
        <div className="mx-auto w-full max-w-2xl px-5 py-6">
            {isStaff && (
                <Link href="/" className="inline-flex min-h-[44px] items-center text-sm font-medium hover:underline">← Home</Link>
            )}
            <h1 className="mt-2 font-display text-3xl font-semibold">Which display do you want to open?</h1>

            {loading ? (
                <div className="mt-3 h-6 w-48 animate-pulse rounded bg-muted" aria-label="Loading your school" />
            ) : failed || schoolId === null ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    We could not load your school. Reload the page to try again.
                </p>
            ) : (
                <>
                    <p className="mt-3 text-base">
                        Showing: <span className="font-semibold">{schoolName ?? "your school"}</span>
                    </p>
                    {display && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {display.label}
                            {display.pairedByName ? ` · Paired by ${display.pairedByName}` : ""}
                        </p>
                    )}
                    {fellBack && isStaff && (
                        <p role="status" className="mt-2 rounded-lg border border-warning bg-secondary p-3 text-sm text-foreground">
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
            {isStaff && schoolId !== null && (
                <div className="mt-6">
                    <Link
                        href={`/display/pair?school=${schoolId}`}
                        className="block min-h-[44px] rounded-lg border border-dashed border-border p-5 text-foreground"
                    >
                        <div className="text-lg font-semibold">Pair a new display</div>
                        <div className="mt-1 text-sm text-muted-foreground">Put a hallway screen up without signing in on it.</div>
                    </Link>
                </div>
            )}
        </div>
        </div>
    );
}
