import { getStudentDashboardDataById } from "@/api/student";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ParentStudentDashboard({ params: { studentId } }: { params: { studentId: string } }) {
    const studentData = await getStudentDashboardDataById(parseInt(studentId), null);

    if (!studentData) {
        redirect("/parent");
    }

    const { student, totalPoints, totalRank, totalOutOf, gradeRank, gradeOutOf } = studentData;

    const percentile = Math.max(0, Math.min(100, Math.round((1 - ((totalRank - 1) / Math.max(totalOutOf, 1))) * 100)));

    return (
        <div className="app-page">
            <header className="app-header">
                <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
                    <Link className="text-sm font-medium text-slate-500 hover:text-slate-950 dark:hover:text-white" href="/parent">← Parent dashboard</Link>
                    <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="eyebrow">Student progress</p>
                            <h1 className="page-title mt-1">{student.firstName} {student.lastName}</h1>
                            <p className="page-description">Grade {student.grade} performance overview</p>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-3xl font-bold tracking-tight">{totalPoints.toLocaleString()}</p>
                            <p className="text-sm text-slate-500">total points</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
                <section className="grid gap-4 sm:grid-cols-3" aria-label="Ranking summary">
                    <article className="surface p-5">
                        <p className="text-sm font-medium text-slate-500">Overall rank</p>
                        <p className="mt-2 text-3xl font-bold">#{totalRank}</p>
                        <p className="mt-1 text-sm text-slate-500">of {totalOutOf.toLocaleString()} students</p>
                    </article>
                    <article className="surface p-5">
                        <p className="text-sm font-medium text-slate-500">Grade {student.grade} rank</p>
                        <p className="mt-2 text-3xl font-bold">#{gradeRank}</p>
                        <p className="mt-1 text-sm text-slate-500">of {gradeOutOf.toLocaleString()} students</p>
                    </article>
                    <article className="surface p-5">
                        <p className="text-sm font-medium text-slate-500">Percentile</p>
                        <p className="mt-2 text-3xl font-bold">{percentile}%</p>
                        <p className="mt-1 text-sm text-slate-500">overall standing</p>
                    </article>
                </section>
            </main>
        </div>
    );
}
