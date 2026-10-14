"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteStudentFromParent, getStudentsOfParent } from "../supaApi/server/parent/parentApi";

export const dynamic = "force-static";

type LinkedStudent = { id: number; name: string };

export default function ParentDashboard() {
    const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[] | null>(null);
    const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
    const [confirmDisconnectData, setConfirmDisconnectData] = useState<LinkedStudent | null>(null);

    function retrieveStudents() {
        getStudentsOfParent().then(students => {
            setLinkedStudents(students.map(student => ({ id: student.id, name: student.fullName })));
        }).catch(() => {
            setLinkedStudents(current => current ?? []);
            setFeedback({ tone: "error", text: "We could not load your children. Reload the page to try again." });
        });
    }

    useEffect(() => {
        retrieveStudents();
    }, []);

    async function disconnectStudent(studentId: number) {
        setConfirmDisconnectData(null);
        const data = await deleteStudentFromParent(studentId);
        if (data.error) {
            setFeedback({ tone: "error", text: data.error });
            return;
        }
        setFeedback({ tone: "success", text: "Student disconnected." });
        retrieveStudents();
    }

    return (
        <div className="app-page text-slate-900 dark:text-slate-100">
            <header className="app-header">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
                    <div>
                        <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">← Home</Link>
                        <h1 className="mt-1 text-2xl font-bold">Your children</h1>
                    </div>
                    {linkedStudents !== null && linkedStudents.length > 0 && (
                        <Link href="/linkAccount/parent" className="button-secondary min-h-[44px]">Add another child</Link>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
                {feedback && (
                    <div role="status" className={`rounded-lg border p-3 text-sm ${feedback.tone === "success" ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200" : "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"}`}>
                        {feedback.text}
                    </div>
                )}

                <section>
                    <h2 className="text-xl font-semibold">Choose your child</h2>
                    {linkedStudents === null ? (
                        <div className="mt-4 h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" aria-label="Loading your children" />
                    ) : linkedStudents.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed p-10 text-center">
                            <p className="text-lg font-semibold">Connect your child to see their points.</p>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Your school gave you a code on a letter or email.</p>
                            <Link href="/linkAccount/parent" className="button-primary mt-4 min-h-[44px]">Connect my child</Link>
                        </div>
                    ) : (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {linkedStudents.map(student => (
                                <article key={student.id} className="surface p-5">
                                    <h3 className="text-lg font-semibold">{student.name}</h3>
                                    <div className="mt-5 flex items-center justify-between gap-3">
                                        <Link className="button-primary" href={`/parent/${student.id}`}>See {student.name.split(" ")[0]}&apos;s progress</Link>
                                        <button className="text-sm font-medium text-slate-500 hover:text-red-600" onClick={() => setConfirmDisconnectData(student)}>Disconnect</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {confirmDisconnectData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="disconnect-title">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
                        <h2 id="disconnect-title" className="text-xl font-bold">Disconnect {confirmDisconnectData.name}?</h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">You will need a new link code from an administrator to reconnect this student.</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button className="button-secondary" onClick={() => setConfirmDisconnectData(null)}>Cancel</button>
                            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700" onClick={() => disconnectStudent(confirmDisconnectData.id)}>Disconnect</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
