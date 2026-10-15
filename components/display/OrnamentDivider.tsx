/**
 * The double gilt rule under a title. A three-slice mask in honor-board.css (--hb-divider-mask):
 * divider-left.svg and divider-right.svg caps at 2x the divider height, divider-mid.svg repeating
 * on x between them. `pulse` replays the 600 ms live-update shimmer under the same mask.
 */
export function OrnamentDivider({ pulse = 0, className = "" }: { pulse?: number; className?: string }) {
  return (
    <div className={`hb-divider-wrap ${className}`} key={pulse} data-pulse={pulse > 0 ? 1 : 0} aria-hidden="true">
      <div className="hb-divider" />
    </div>
  );
}
