import type { CSSProperties } from "react";
import { Medallion } from "./Medallion";

/** Ranks 4 to 10 on the wall, and every row on the phone. Names never change face with rank. */
export function LedgerRow({ rank, name, detail, points, index = 0 }: {
  rank: number; name: string; detail?: string; points: string; index?: number;
}) {
  return (
    <div className="hb-row hb-in" style={{ "--i": index } as CSSProperties}>
      <Medallion rank={rank} />
      <span className="hb-name">{name}</span>
      {detail && <span className="hb-chip">{detail}</span>}
      <span className="hb-points">{points}</span>
    </div>
  );
}
