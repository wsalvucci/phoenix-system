"use client";
import type { ReactNode } from "react";
import { OrnamentDivider } from "./OrnamentDivider";
import { chipColors } from "./chipColor";
import { useWall } from "./WallStage";

/**
 * Header band (title, subtitle, term, clock, quiet status mark), the gilt rule and the scene body.
 * `chip` is the point-group color: a small chip beside the subtitle, never a row color.
 */
export function SceneLayout({ title, subtitle, chipColor, pulse = 0, children }: {
  title: string; subtitle?: string; chipColor?: string | null; pulse?: number; children: ReactNode;
}) {
  const { term, status, clock } = useWall();
  const chip = chipColors(chipColor);
  return (
    <>
      <header className="hb-head">
        <div className="hb-titleblock">
          <h1 className="hb-title" data-long={title.length > 22 ? 1 : 0}>{title}</h1>
          {subtitle && (
            <p className="hb-sub">
              {chip ? <span className="hb-chip" style={chip}>{subtitle}</span> : subtitle}
            </p>
          )}
        </div>
        <div className="hb-meta">
          {term && term !== subtitle && <span className="hb-meta-term">{term}</span>}
          {status === "paused" && <span className="hb-meta-mark">Paused</span>}
          {status === "offline" && <span className="hb-meta-mark" role="status">Reconnecting</span>}
          <span className="hb-meta-clock">{clock ?? " "}</span>
        </div>
      </header>
      <OrnamentDivider pulse={pulse} className="hb-headrule" />
      {children}
    </>
  );
}
