"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteStudentFromParent, getStudentsOfParent, linkStudentToParent } from "../supaApi/server/parent/parentApi";

export const dynamic = "force-static";

type LinkedStudent = { id: number; name: string };

export default function ParentDashboard() {
    const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
    const [newStudentData, setNewStudentData] = useState({ schoolId: "", linkCode: "" });
    const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
    const [addingStudent, setAddingStudent] = useState(false);
    const [showLinkForm, setShowLinkForm] = useState(false);
    const [confirmDisconnectData, setConfirmDisconnectData] = useState<LinkedStudent | null>(null);

    function retrieveStudents() {
        getStudentsOfParent().then(students => {
            setLinkedStudents(students.map(student => ({ id: student.id, name: student.fullName })));
        });
    }

    useEffect(() => {
        retrieveStudents();
    }, []);

    async function addStudent(event: React.FormEvent) {
        event.preventDefault();
        const schoolId = Number(newStudentData.schoolId);
        if (!Number.isInteger(schoolId) || !newStudentData.linkCode.trim()) {
            setFeedback({ tone: "error", text: "Enter the school ID and student link code." });
            return;
        }
        setAddingStudent(true);
        setFeedback(null);
        const data = await linkStudentToParent(schoolId, newStudentData.linkCode.trim());
        setAddingStudent(false);
        if (data.error) {
            setFeedback({ tone: "error", text: data.error });
            return;
        }
        setFeedback({ tone: "success", text: "Student linked successfully." });
        setNewStudentData({ schoolId: "", linkCode: "" });
        setShowLinkForm(false);
        retrieveStudents();
    }

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
                        <h1 className="mt-1 text-2xl font-bold">Parent Dashboard</h1>
                    </div>
                    <button onClick={() => setShowLinkForm(value => !value)} className={showLinkForm ? "button-secondary" : "button-primary"}>
                        {showLinkForm ? "Cancel" : "Add student"}
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
                {feedback && (
                    <div role="status" className={`rounded-lg border p-3 text-sm ${feedback.tone === "success" ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200" : "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"}`}>
                        {feedback.text}
                    </div>
                )}

                {showLinkForm && (
                    <form onSubmit={addStudent} className="surface p-5">
                        <h2 className="text-lg font-semibold">Link a student</h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Ask your school administrator for the school ID and student link code.</p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="grid gap-1 text-sm font-medium">
                                School ID
                                <input type="number" value={newStudentData.schoolId} onChange={event => setNewStudentData(value => ({ ...value, schoolId: event.target.value }))} className="field" required />
                            </label>
                            <label className="grid gap-1 text-sm font-medium">
                                Student link code
                                <input type="text" value={newStudentData.linkCode} onChange={event => setNewStudentData(value => ({ ...value, linkCode: event.target.value }))} className="field font-mono" required />
                            </label>
                        </div>
                        <button disabled={addingStudent} className="button-primary mt-4">
                            {addingStudent ? "Linking…" : "Link student"}
                        </button>
                    </form>
                )}

                <section>
                    <h2 className="text-xl font-semibold">Your students</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Open a student to review their points and progress.</p>
                    {linkedStudents.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed p-10 text-center text-slate-500">No students are linked yet.</div>
                    ) : (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {linkedStudents.map(student => (
                                <article key={student.id} className="surface p-5">
                                    <h3 className="text-lg font-semibold">{student.name}</h3>
                                    <div className="mt-5 flex items-center justify-between gap-3">
                                        <Link className="button-primary" href={`/parent/${student.id}`}>View progress</Link>
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
