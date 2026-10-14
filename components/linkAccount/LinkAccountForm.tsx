"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import linkStudent from "@/app/supaApi/server/linkStudent";
import { linkStudentToParent } from "@/app/supaApi/server/parent/parentApi";
import clientLinkTeacher from "@/app/supaApi/client/clientLinkTeacher";

export type LinkKind = "student" | "parent" | "teacher";

const COPY: Record<LinkKind, { heading: string; button: string; sending: string; next: string }> = {
    student: { heading: "Connect your student account", button: "Connect account", sending: "Connecting...", next: "/student" },
    parent: { heading: "Connect your child", button: "Connect my child", sending: "Connecting...", next: "/parent" },
    teacher: { heading: "Connect your teacher account", button: "Connect account", sending: "Connecting...", next: "/teacher" },
};

const NO_REACH = "Could not reach Phoenix. Try again.";

/** One link screen for all three roles. The code is typed, never read from the URL. */
export default function LinkAccountForm({ kind }: { kind: LinkKind }) {
    const copy = COPY[kind];
    const presetRaw = useSearchParams().get("school");
    const preset = presetRaw !== null && /^\d+$/.test(presetRaw) ? presetRaw : null;

    const [school, setSchool] = useState(preset ?? "");
    const [editingSchool, setEditingSchool] = useState(preset === null);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const schoolId = /^\d+$/.test(school.trim()) ? Number(school.trim()) : NaN;
    const cleanCode = code.trim().toUpperCase();
    const missing = cleanCode === "" ? "Enter the code from your school." : Number.isNaN(schoolId) ? "Enter your school number." : null;

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (missing || busy) return;
        setBusy(true);
        setError(null);
        try {
            let failure: string | null = null;
            if (kind === "student") {
                const r = await linkStudent(schoolId, cleanCode);
                if (!r.success) failure = r.message;
            } else if (kind === "teacher") {
                const r = await clientLinkTeacher(schoolId, cleanCode);
                if (!r.success) failure = r.message;
            } else {
                const r = await linkStudentToParent(schoolId, cleanCode);
                if (r.error) failure = r.error;
            }
            if (failure) {
                setError(failure);
                setBusy(false);
                return;
            }
            window.location.href = copy.next;
        } catch {
            setError(NO_REACH);
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="surface mx-auto w-full max-w-md p-5 sm:p-6">
            <h1 className="text-2xl font-bold">{copy.heading}</h1>
            <label className="mt-5 grid gap-1 text-sm font-medium">
                Code from your school
                <input
                    className="field min-h-[44px] font-mono uppercase"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                />
                <span className="text-xs font-normal text-slate-600 dark:text-slate-400">
                    Your school gave you this on a letter or email.
                </span>
            </label>

            {editingSchool ? (
                <label className="mt-4 grid gap-1 text-sm font-medium">
                    School number
                    <input
                        className="field min-h-[44px]"
                        type="text"
                        inputMode="numeric"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        autoComplete="off"
                    />
                </label>
            ) : (
                <p className="mt-4 text-sm">
                    School {school}{" "}
                    <button type="button" className="min-h-[44px] px-2 underline" onClick={() => setEditingSchool(true)}>
                        change
                    </button>
                </p>
            )}

            {error && (
                <div role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                    {error} Check for look-alike letters (O and 0, I and 1) or ask your school for a new code.
                </div>
            )}

            <button type="submit" disabled={busy || missing !== null} className="button-primary mt-5 min-h-[44px] w-full">
                {busy ? copy.sending : copy.button}
            </button>
            {missing && !busy && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{missing}</p>}
            <Link href="/" className="mt-3 inline-flex min-h-[44px] items-center text-sm underline">Back to home</Link>
        </form>
    );
}
