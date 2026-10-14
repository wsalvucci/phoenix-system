"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { approveDisplayPairing, convertThisBrowserToDisplay, getPairingSchools } from "../actions";
import { DisplayDevicesList } from "@/components/display/DisplayDevicesList";

// Staff screen: pair a hallway display in one step from a signed-in phone or laptop (UX plan §2).
// Every action here resolves the staff member from the Supabase session (D17 condition 4), and each
// button names the school it pairs to (condition 5).
// `requested` (from ?school=) is only a preference among the caller's own schools.
export function PairDisplay({ requested }: { requested: number | null }) {
    const schools = useQuery({ queryKey: ["pairingSchools"], queryFn: () => getPairingSchools() });

    const [picked, setPicked] = useState<number | null>(null);
    const [code, setCode] = useState("");
    const [label, setLabel] = useState("");
    const [busy, setBusy] = useState<"approve" | "convert" | null>(null);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [listKey, setListKey] = useState(0);

    const list = schools.data ?? [];
    const school =
        list.find((s) => s.id === picked) ?? list.find((s) => s.id === requested) ?? list[0] ?? null;
    const trimmedLabel = label.trim();
    const labelOk = trimmedLabel.length >= 1 && trimmedLabel.length <= 60;

    if (schools.isLoading) {
        return <div className="page-container"><div className="h-8 w-64 animate-pulse rounded bg-muted" aria-label="Loading" /></div>;
    }
    if (schools.isError) {
        return (
            <div className="page-container">
                <p role="alert" className="text-sm text-destructive">We could not load your school. Reload the page to try again.</p>
            </div>
        );
    }
    if (school === null) {
        return (
            <div className="page-container max-w-xl">
                <h1 className="page-title">Pair a display</h1>
                <p className="page-description">Sign in with your teacher or admin account on this phone or computer, then come back here.</p>
                <Link href={`/login?next=${encodeURIComponent("/display/pair")}`} className="button-primary mt-4 min-h-[44px]">Sign in</Link>
                <p className="mt-6 text-sm text-muted-foreground">
                    Setting up the screen itself? Open <span className="font-semibold">/display</span> on it to get a code.
                </p>
            </div>
        );
    }

    async function approve(e: React.FormEvent) {
        e.preventDefault();
        if (school === null || !labelOk || code.trim().length === 0) return;
        setBusy("approve");
        setMessage(null);
        try {
            const { ok } = await approveDisplayPairing(code, school.id, trimmedLabel);
            setMessage(ok
                ? { ok: true, text: `Paired. "${trimmedLabel}" will show ${school.name}'s displays in a few seconds.` }
                : { ok: false, text: "That code did not match a screen waiting to pair. Check the code on the screen and try again." });
            if (ok) {
                setCode("");
                setLabel("");
                setListKey((k) => k + 1);
            }
        } catch {
            setMessage({ ok: false, text: "Something went wrong. Try again." });
        } finally {
            setBusy(null);
        }
    }

    async function convert() {
        if (school === null || !labelOk) return;
        if (!window.confirm(`Turn this browser into a display for ${school.name}? You will be signed out here, and this screen will only show displays.`)) return;
        setBusy("convert");
        setMessage(null);
        try {
            const { ok } = await convertThisBrowserToDisplay(school.id, trimmedLabel);
            if (ok) {
                window.location.replace("/dashboard");
                return;
            }
            setMessage({ ok: false, text: "This browser could not be turned into a display. You are still signed in." });
        } catch {
            setMessage({ ok: false, text: "Something went wrong. Try again." });
        }
        setBusy(null);
    }

    return (
        <div className="page-container max-w-2xl">
            <Link href={`/dashboard?school=${school.id}`} className="inline-flex min-h-[44px] items-center text-sm font-medium hover:underline">← Displays</Link>
            <h1 className="page-title mt-2">Pair a display for {school.name}</h1>
            <p className="page-description">The screen shows only {school.name}&apos;s hallway displays. Nobody signs in on it.</p>

            {list.length > 1 && (
                <label className="mt-4 grid gap-1 text-sm font-medium">
                    School
                    <select className="field min-h-[44px]" value={school.id} onChange={(e) => setPicked(Number(e.target.value))}>
                        {list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </label>
            )}

            <label className="mt-4 grid gap-1 text-sm font-medium">
                Screen name
                <input
                    className="field min-h-[44px]"
                    value={label}
                    maxLength={60}
                    placeholder="Main hallway"
                    onChange={(e) => setLabel(e.target.value)}
                />
            </label>

            <form onSubmit={approve} className="surface mt-6 grid gap-3 p-5">
                <h2 className="text-lg font-semibold">Pair the screen showing a code</h2>
                <label className="grid gap-1 text-sm font-medium">
                    Code on the screen
                    <input
                        className="field min-h-[44px] font-mono uppercase tracking-widest"
                        value={code}
                        maxLength={12}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        placeholder="ABCD-1234"
                        onChange={(e) => setCode(e.target.value)}
                    />
                </label>
                <button
                    type="submit"
                    className="button-primary min-h-[44px]"
                    disabled={busy !== null || !labelOk || code.trim().length === 0}
                >
                    {busy === "approve" ? "Pairing…" : `Pair as a display for ${school.name}`}
                </button>
            </form>

            {message && (
                <p role={message.ok ? "status" : "alert"} className={`mt-4 text-sm ${message.ok ? "text-foreground" : "text-destructive"}`}>
                    {message.text}
                </p>
            )}

            <details className="mt-6">
                <summary className="cursor-pointer text-sm font-medium">Is this browser the screen itself?</summary>
                <div className="mt-3 grid gap-2">
                    <p className="text-sm text-muted-foreground">
                        Turn this browser into a display instead. You are signed out here in the same step, so your account is never left open on the screen.
                    </p>
                    <button
                        type="button"
                        className="button-secondary min-h-[44px]"
                        disabled={busy !== null || !labelOk}
                        onClick={convert}
                    >
                        {busy === "convert" ? "Switching…" : `Turn this browser into a display for ${school.name}`}
                    </button>
                </div>
            </details>

            <h2 className="mt-8 text-lg font-semibold">Paired displays</h2>
            <div className="mt-3">
                <DisplayDevicesList key={`${school.id}:${listKey}`} schoolId={school.id} />
            </div>
        </div>
    );
}
