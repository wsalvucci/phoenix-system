"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { pollDisplayPairing, startDisplayPairing } from "./actions";

type State =
    | { kind: "starting" }
    | { kind: "code"; userCode: string; expiresAt: string }
    | { kind: "paired" }
    | { kind: "error"; message: string };

const POLL_MS = 3_000;
const RETRY_MS = 60_000;

function formatCode(code: string): string {
    return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Shows a pairing code and waits for a staff member to approve it. Needs no keyboard: an expired
 *  code is replaced automatically, and a failure retries on its own. */
export function KioskPairing() {
    const [state, setState] = useState<State>({ kind: "starting" });
    const [host, setHost] = useState("");
    const starting = useRef(false);

    const start = useCallback(async () => {
        if (starting.current) return;
        starting.current = true;
        setState({ kind: "starting" });
        try {
            const result = await startDisplayPairing();
            if ("error" in result) {
                setState({
                    kind: "error",
                    message: result.error === "rate_limited"
                        ? "Too many codes were requested from this screen. A new one will appear in a minute."
                        : "Pairing is not available right now. Trying again in a minute.",
                });
            } else {
                setState({ kind: "code", userCode: result.userCode, expiresAt: result.expiresAt });
            }
        } catch {
            setState({ kind: "error", message: "We could not reach Phoenix. Trying again in a minute." });
        } finally {
            starting.current = false;
        }
    }, []);

    useEffect(() => {
        setHost(window.location.host);
        void start();
    }, [start]);

    useEffect(() => {
        if (state.kind === "error") {
            const t = setTimeout(() => void start(), RETRY_MS);
            return () => clearTimeout(t);
        }
        if (state.kind !== "code") return;
        let stopped = false;
        const t = setInterval(async () => {
            try {
                const { status } = await pollDisplayPairing();
                if (stopped) return;
                if (status === "paired") {
                    setState({ kind: "paired" });
                    window.location.replace("/dashboard");
                } else if (status === "expired") {
                    void start();
                }
            } catch {
                // Network blip: keep polling.
            }
        }, POLL_MS);
        return () => {
            stopped = true;
            clearInterval(t);
        };
    }, [state, start]);

    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-10 text-center">
            <p className="eyebrow">Phoenix display</p>
            {state.kind === "starting" && (
                <p className="text-xl text-muted-foreground" role="status">Getting a pairing code…</p>
            )}
            {state.kind === "paired" && (
                <p className="text-2xl font-semibold" role="status">Paired. Opening the displays…</p>
            )}
            {state.kind === "error" && (
                <p className="text-xl text-muted-foreground" role="alert">{state.message}</p>
            )}
            {state.kind === "code" && (
                <>
                    <h1 className="page-title">Pair this screen</h1>
                    <div
                        className="surface px-10 py-6 font-mono text-6xl font-bold tracking-[0.2em] text-foreground sm:text-7xl"
                        aria-label={`Pairing code ${state.userCode.split("").join(" ")}`}
                    >
                        {formatCode(state.userCode)}
                    </div>
                    <ol className="grid max-w-xl gap-2 text-left text-lg text-foreground">
                        <li>1. On your own phone or computer, sign in to Phoenix as staff.</li>
                        <li>2. Open <span className="font-semibold">{host ? `${host}/display/pair` : "/display/pair"}</span>.</li>
                        <li>3. Type this code and tap Pair.</li>
                    </ol>
                    <p className="text-sm text-muted-foreground">
                        A new code appears every 10 minutes. Nobody needs to sign in on this screen.
                    </p>
                </>
            )}
        </div>
    );
}
