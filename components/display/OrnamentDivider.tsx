/**
 * The double gilt rule under a title. The artwork is applied by one mask variable in
 * honor-board.css (--hb-divider-mask), so replacing public/display/divider-double.svg (or the
 * three-slice redo) replaces the rule. `pulse` replays the 600 ms live-update shimmer.
 */
export function OrnamentDivider({ pulse = 0, className = "" }: { pulse?: number; className?: string }) {
  return (
    <div className={`hb-divider-wrap ${className}`} key={pulse} data-pulse={pulse > 0 ? 1 : 0} aria-hidden="true">
      <div className="hb-divider" />
    </div>
  );
}
