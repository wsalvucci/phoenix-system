"use client";
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useReducedMotion } from "motion/react";
import "@/app/dashboard/honor-board.css";

export type WallStatus = "live" | "paused" | "offline";
type WallCtx = { term: string | null; status: WallStatus; clock: string | null };
const Ctx = createContext<WallCtx>({ term: null, status: "live", clock: null });
export const useWall = () => useContext(Ctx);

// 1u every 10 minutes, so a TV running all day never holds one frame position (burn-in).
const DRIFT: Array<[number, number]> = [[0, 0], [1, 0], [1, 1], [0, 1]];

/**
 * The wall owns its mode as a device setting: dark by default (hallway TVs are emissive), light
 * with ?mode=light. It does not follow the signed-in theme. Draws the stage, the one gilt corner
 * frame and the dwell progress line (`progress` is 0..1, or null for no line).
 */
export function WallStage({ term, status = "live", progress = null, children }: {
  term: string | null; status?: WallStatus; progress?: number | null; children: ReactNode;
}) {
  const light = useSearchParams().get("mode") === "light";
  const reduced = !!useReducedMotion();
  const [clock, setClock] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (reduced) { setStep(0); return; }
    const t = setInterval(() => setStep((s) => (s + 1) % DRIFT.length), 10 * 60_000);
    return () => clearInterval(t);
  }, [reduced]);

  const [dx, dy] = DRIFT[step];
  const drift = { "--hb-dx": `calc(var(--u) * ${dx})`, "--hb-dy": `calc(var(--u) * ${dy})` } as CSSProperties;

  return (
    <Ctx.Provider value={{ term, status, clock }}>
      <div className={`honor-board hb-wall ${light ? "" : "dark"}`} style={drift}>
        <div className="hb-canvas">
          <div className="hb-frame" aria-hidden="true">
            {(["tl", "tr", "bl", "br"] as const).map((c) => <span key={c} className="hb-corner" data-c={c} />)}
          </div>
          <div className="hb-scenes">{children}</div>
          {progress !== null && (
            <div className="hb-progress" aria-hidden="true"><i style={{ "--p": Math.min(1, Math.max(0, progress)) } as CSSProperties} /></div>
          )}
        </div>
      </div>
    </Ctx.Provider>
  );
}
