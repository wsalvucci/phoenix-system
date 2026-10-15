"use client";
import { formatPoints, visibleRows, type DisplaySlide } from "@/app/dashboard/featured/screens/displayData";
import { LedgerRow } from "./LedgerRow";
import { PodiumPlate } from "./PodiumPlate";
import { SceneLayout } from "./SceneLayout";

/**
 * One cohort as one scene: ranks 1 to 3 as plates, 4 to 10 as a static ledger. Short boards render
 * only their rows (calm blank space, no placeholders). No list scrolls and nothing counts rows.
 */
export function BoardScene({ slide, pulse = 0 }: { slide: DisplaySlide; pulse?: number }) {
  const rows = visibleRows(slide.rows);
  const podium = rows.filter((r) => r.rank <= 3);
  const ledger = rows.filter((r) => r.rank > 3);
  // Entrance order: ranks 2 and 3 first, rank 1 last (the reveal), then the ledger.
  const order = [...podium.filter((r) => r.rank > 1), ...podium.filter((r) => r.rank === 1)];
  const at = (key: string) => order.findIndex((r) => r.key === key);
  const layout = !ledger.length ? "podium" : !podium.length ? "ledger" : "both";

  return (
    <SceneLayout title={slide.title} subtitle={slide.subtitle} chipColor={slide.color} pulse={pulse}>
      <div className="hb-body" data-layout={layout}>
        {podium.length > 0 && (
          <div className="hb-podium" data-dense={podium.length > 3 ? "" : undefined}>
            {podium.map((r) => (
              <PodiumPlate key={r.key} rank={r.rank} name={r.name} detail={r.detail} points={formatPoints(r.points)} index={at(r.key)} />
            ))}
          </div>
        )}
        {ledger.length > 0 && (
          <div className="hb-ledger">
            {ledger.map((r, i) => (
              <LedgerRow key={r.key} rank={r.rank} name={r.name} detail={r.detail} points={formatPoints(r.points)} index={podium.length + i} />
            ))}
          </div>
        )}
      </div>
    </SceneLayout>
  );
}
