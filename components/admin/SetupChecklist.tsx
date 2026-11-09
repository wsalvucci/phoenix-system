"use client";

import Link from "next/link";
import { useSchoolGroups, useSchoolPointGroups, useSchoolStudents, useSchoolTeachers, useSchoolTimeframes } from "@/app/hooks/useAdminQueries";

type Step = { key: string; title: string; why: string; href: string; action: string; done: boolean };

/**
 * First-run guide for a school admin: the five things that must exist before teachers can award
 * points, in the order that works. Shows one primary action (the first step not yet done) and
 * disappears when everything is in place. Reads existing admin queries only.
 */
export default function SetupChecklist({ schoolId }: { schoolId: string }) {
    const id = parseInt(schoolId);
    const timeframes = useSchoolTimeframes(id);
    const pointGroups = useSchoolPointGroups(id);
    const groups = useSchoolGroups(id);
    const students = useSchoolStudents(id);
    const teachers = useSchoolTeachers(id);

    const queries = [timeframes, pointGroups, groups, students, teachers];
    if (queries.some(q => q.isLoading)) {
        return <div className="h-24 animate-pulse rounded-lg bg-muted" aria-label="Loading setup steps" />;
    }
    // If a count could not be read, say nothing rather than telling the admin a wrong thing.
    if (queries.some(q => q.error || q.data === undefined)) return null;

    const base = `/admin/school/${schoolId}`;
    const steps: Step[] = [
        { key: "timeframe", title: "Set the school term", why: "Points are counted inside a term.", href: `${base}/timeframes`, action: "Add a term", done: (timeframes.data?.length ?? 0) > 0 },
        { key: "categories", title: "Add point categories", why: "For example Kindness or Attendance. Teachers pick one when they award points.", href: `${base}/pointGroups`, action: "Add point categories", done: (pointGroups.data?.length ?? 0) > 0 },
        { key: "groups", title: "Create student groups", why: "A class or homeroom a teacher scores together.", href: `${base}/groups`, action: "Create a group", done: (groups.data?.length ?? 0) > 0 },
        { key: "students", title: "Add students", why: "Type them in or import a spreadsheet.", href: `${base}/students`, action: "Add students", done: (students.data?.length ?? 0) > 0 },
        { key: "teachers", title: "Add teachers", why: "Each teacher gets a code to connect their account.", href: `${base}/teachers`, action: "Add teachers", done: (teachers.data?.length ?? 0) > 0 },
    ];

    const remaining = steps.filter(step => !step.done);
    if (remaining.length === 0) return null;
    const next = remaining[0];

    return (
        <section aria-labelledby="setup-title" className="rounded-lg border border-border bg-card p-6">
            <h2 id="setup-title" className="text-xl font-semibold">Get your school ready</h2>
            <p className="text-sm text-muted-foreground">
                {steps.length - remaining.length} of {steps.length} done. Do these in order and teachers can start awarding points.
            </p>
            <ol className="mt-4 space-y-3">
                {steps.map((step, index) => (
                    <li key={step.key} className="flex items-start gap-3">
                        <span
                            aria-hidden="true"
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step.done ? "bg-green-600 text-white" : "border border-border text-muted-foreground"}`}
                        >
                            {step.done ? "✓" : index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className={`font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}>
                                {step.title}
                                {step.done && <span className="sr-only"> (done)</span>}
                            </p>
                            {!step.done && <p className="text-sm text-muted-foreground">{step.why}</p>}
                        </div>
                        {!step.done && step.key !== next.key && (
                            <Link href={step.href} className="inline-flex min-h-[44px] items-center text-sm underline">{step.action}</Link>
                        )}
                    </li>
                ))}
            </ol>
            <Link
                href={next.href}
                className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
                Next: {next.action}
            </Link>
        </section>
    );
}
