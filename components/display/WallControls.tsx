"use client";
import { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiMaximize, FiPause, FiPlay, FiSettings } from "react-icons/fi";
import type { DisplayTimeframe } from "@/app/supaApi/universal/displayTypes";

/** Staff controls for a wall. Hidden until the pointer is near or the button takes focus; a hallway
 *  TV has no pointer (hand-off H3 moves these off-screen). */
export function WallControls({ timeframes, timeframe, onTimeframe, dwell, onDwell, paused, onTogglePaused, onPrev, onNext, backLabel = "Back to dashboards" }: {
  timeframes: readonly DisplayTimeframe[]; timeframe: number | null; onTimeframe: (id: number | null) => void;
  dwell?: number; onDwell?: (seconds: number) => void;
  paused?: boolean; onTogglePaused?: () => void; onPrev?: () => void; onNext?: () => void;
  backLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen();
      setNotice("");
    } catch { setNotice("Fullscreen is unavailable. Use your browser’s fullscreen command."); }
  };
  return (
    <div className="hb-controls-wrap">
      {open && (
        <section className="hb-controls" aria-label="Display controls">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Display controls</strong>
            <button onClick={() => setOpen(false)} aria-label="Close display controls">✕</button>
          </div>
          {onTogglePaused && (
            <nav>
              {onPrev && <button onClick={onPrev} aria-label="Previous screen"><FiChevronLeft /></button>}
              <button onClick={onTogglePaused}>{paused ? <FiPlay /> : <FiPause />}{paused ? "Resume" : "Pause"}</button>
              {onNext && <button onClick={onNext} aria-label="Next screen"><FiChevronRight /></button>}
            </nav>
          )}
          {onDwell && dwell !== undefined && (
            <label>Minimum screen duration
              <select value={dwell} onChange={(e) => onDwell(Number(e.target.value))}>
                {[12, 20, 30, 45, 60].map((s) => <option key={s} value={s}>{s} seconds</option>)}
              </select>
            </label>
          )}
          <label>Timeframe
            <select value={timeframe ?? ""} onChange={(e) => onTimeframe(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Active timeframe</option>
              {timeframes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <button onClick={toggleFullscreen}><FiMaximize /> Toggle fullscreen</button>
          {notice && <p role="status">{notice}</p>}
          <a href="/dashboard">{backLabel}</a>
        </section>
      )}
      <button className="hb-controls-toggle" aria-label="Display settings" aria-expanded={open} onClick={() => setOpen((o) => !o)}><FiSettings /></button>
    </div>
  );
}
