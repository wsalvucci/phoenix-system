"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { pollDisplayPairing, startDisplayPairing } from "./actions";
import { WallStage } from "@/components/display/WallStage";

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

    // A quiet 3 px expiry line: the share of the 10 minute code life that is left. No number.
    const [left, setLeft] = useState<number | null>(null);
    useEffect(() => {
        if (state.kind !== "code") { setLeft(null); return; }
        const tick = () => setLeft(Math.max(0, Math.min(1, (new Date(state.expiresAt).getTime() - Date.now()) / (10 * 60_000))));
        tick();
        const t = setInterval(tick, 5_000);
        return () => clearInterval(t);
    }, [state]);

    return (
        <WallStage term={null} progress={left}>
            <div className="hb-scene">
                <span className="hb-wordmark">Phoenix</span>
                <div className="hb-center">
                    <p className="hb-note">Phoenix display</p>
                    {state.kind === "starting" && (
                        <p className="hb-lede" role="status">Getting a pairing code…</p>
                    )}
                    {state.kind === "paired" && (
                        <p className="hb-paired" role="status">Paired. Opening the displays…</p>
                    )}
                    {state.kind === "error" && (
                        <p className="hb-lede" role="alert">{state.message}</p>
                    )}
                    {state.kind === "code" && (
                        <>
                            <h1 className="hb-heading">Pair this screen</h1>
                            <div className="hb-pair-plate">
                                <div className="hb-code" aria-label={`Pairing code ${state.userCode.split("").join(" ")}`}>
                                    {formatCode(state.userCode)}
                                </div>
                            </div>
                            <ol className="hb-steps">
                                <li>1. On your own phone or computer, sign in to Phoenix as staff.</li>
                                <li>2. Open <b>{host ? `${host}/display/pair` : "/display/pair"}</b>.</li>
                                <li>3. Type this code and tap Pair.</li>
                            </ol>
                            <p className="hb-note">
                                A new code appears every 10 minutes. Nobody needs to sign in on this screen.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </WallStage>
    );
}
