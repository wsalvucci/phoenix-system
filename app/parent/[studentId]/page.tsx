import { getStudentDashboardDataById } from "@/api/student";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ParentStudentDashboard({ params: { studentId } }: { params: { studentId: string } }) {
    const studentData = await getStudentDashboardDataById(parseInt(studentId), null);

    if (!studentData) {
        redirect("/parent");
    }

    const { student, totalPoints, totalRank, totalOutOf, gradeRank, gradeOutOf, nearbyStudents } = studentData;

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

                <section className="surface overflow-hidden">
                    <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                        <h2 className="text-lg font-semibold">Nearby students</h2>
                        <p className="page-description">Students closest to this position in the overall ranking.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/60">
                                <tr><th className="px-5 py-3">Student</th><th className="px-5 py-3 text-right">Points</th><th className="px-5 py-3 text-right">Rank</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {nearbyStudents.map((nearby) => {
                                    const isCurrentStudent = nearby.studentId === student.id;
                                    return (
                                        <tr key={nearby.studentId} className={isCurrentStudent ? "bg-blue-50/80 dark:bg-blue-950/30" : ""}>
                                            <td className="px-5 py-3 font-medium">{nearby.firstName} {nearby.lastName}{isCurrentStudent && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-200">Your student</span>}</td>
                                            <td className="px-5 py-3 text-right tabular-nums">{nearby.totalPoints.toLocaleString()}</td>
                                            <td className="px-5 py-3 text-right font-semibold tabular-nums">#{nearby.rank}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}
