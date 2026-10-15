"use client";
import type { ReactNode } from "react";
import { DateTime } from "luxon";
import { formatPoints } from "@/app/dashboard/featured/screens/displayData";
import type { DisplayEvent, DisplayStudentRow } from "@/app/supaApi/universal/displayTypes";
import { Medallion } from "./Medallion";
import { OrnamentDivider } from "./OrnamentDivider";
import { SceneLayout } from "./SceneLayout";

/** One large plate for a student drawn from the overall board. Adds no data. */
export function SpotlightScene({ row, pulse = 0 }: { row: DisplayStudentRow; pulse?: number }) {
  return (
    <SceneLayout title="Student spotlight" subtitle="Know this student? Celebrate their effort." pulse={pulse}>
      <div className="hb-center">
        <div className="hb-spot hb-in">
          <Medallion rank={row.rank} />
          <div className="hb-spot-body">
            <h2 className="hb-name">{row.firstName} {row.lastName}</h2>
            <div className="hb-spot-line">
              <span className="hb-chip">Grade {row.grade}</span>
              <span className="hb-points">{formatPoints(row.totalPoints)}</span>
              <span className="hb-spot-note">points earned</span>
            </div>
          </div>
        </div>
      </div>
    </SceneLayout>
  );
}

/** Upcoming events: metadata only, soonest first. */
export function EventsScene({ events, pulse = 0 }: { events: readonly DisplayEvent[]; pulse?: number }) {
  return (
    <SceneLayout title="Coming up" subtitle="Chances to earn points" pulse={pulse}>
      <div className="hb-center">
        <div className="hb-events">
          {events.map((e, i) => (
            <div key={e.key} className="hb-row hb-in" style={{ ["--i" as string]: i }}>
              <span className="hb-date">{DateTime.fromISO(e.date).toFormat("LL/dd")}</span>
              <span className="hb-name">{e.name}</span>
              <span className="hb-points">up to {formatPoints(e.maxPoints)} points</span>
            </div>
          ))}
        </div>
      </div>
    </SceneLayout>
  );
}

/** Empty, new-term, loading and error states: the frame stays, a numberless seal and one message. */
export function MessageScene({ heading, sub, children }: { heading: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="hb-center hb-in">
      <div className="hb-seal-wrap" aria-hidden="true"><div className="hb-seal-static" /></div>
      <OrnamentDivider />
      <h1 className="hb-heading">{heading}</h1>
      {sub && <p className="hb-lede">{sub}</p>}
      {children}
    </div>
  );
}
