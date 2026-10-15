import type { CSSProperties } from "react";
import { Medallion } from "./Medallion";

/** Ranks 1 to 3. Rank 1 is the tallest plate with the largest name and the only gilt top edge. */
export function PodiumPlate({ rank, name, detail, points, index = 0 }: {
  rank: number; name: string; detail: string; points: string; index?: number;
}) {
  return (
    <div className="hb-plate hb-in" data-rank={Math.min(rank, 3)} style={{ "--i": index } as CSSProperties}>
      <Medallion rank={rank} />
      <div className="hb-plate-body">
        <h2 className="hb-name">{name}</h2>
        <div className="hb-plate-foot">
          <span className="hb-chip">{detail}</span>
          <span className="hb-points">{points}</span>
        </div>
      </div>
    </div>
  );
}
