import { displayRankTier } from "@/lib/rankTier";

const WALL_TIERS = new Set(["1", "2", "3", "4", "5", "top10"]);

/**
 * The rank seal. One flat disc, one ring, a live numeral; the only place a rank color appears.
 * Size comes from --hb-medal (72 px on every wall surface, 36 px on the phone). The scalloped
 * outline is drawn through a single mask in honor-board.css (--hb-seal-mask) from the flat
 * public/display/seal-ring.svg (asset-03b; reads at 72 and 36 px). Ranks above 10 have no wall rendering.
 */
export function Medallion({ rank }: { rank: number }) {
  const tier = displayRankTier(rank);
  if (!WALL_TIERS.has(tier)) return null;
  return (
    <span className="hb-medallion" data-rank-tier={tier}>
      <span>{rank}</span>
    </span>
  );
}
