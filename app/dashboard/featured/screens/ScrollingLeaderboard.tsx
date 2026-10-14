"use client";
import { useEffect, useRef, type CSSProperties } from 'react';
import { metalTextShadow } from '@/app/dataClasses';
import { displayRankTier } from '@/lib/rankTier';
import { FiAward } from 'react-icons/fi';
import { type DisplayRow, formatPoints } from './displayData';

// Hold both ends long enough to read; travel at one row every three seconds.
export function scrollTiming(distance: number, rowHeight: number, minimum: number) {
  const travel = distance > 0 ? distance / Math.max(rowHeight, 1) * 3 : 0;
  return { duration: Math.max(minimum, travel + 8), travel };
}

export default function ScrollingLeaderboard({ rows, minimumDuration, running, reducedMotion, onComplete, onDurationChange, appearance }: {
  appearance?: 'gloss';
  rows: DisplayRow[]; minimumDuration: number; running: boolean; reducedMotion: boolean;
  onComplete: () => void; onDurationChange: (seconds: number) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const animations = useRef<Animation[]>([]);
  const callbacks = useRef({ onComplete, onDurationChange, running });
  callbacks.current = { onComplete, onDurationChange, running };

  useEffect(() => {
    const windowElement = viewport.current;
    const trackElement = track.current;
    const progressElement = progress.current;
    if (!windowElement || !trackElement || !progressElement) return;
    let lastGeometry = '';
    const measure = () => {
      const distance = Math.max(0, trackElement.scrollHeight - windowElement.clientHeight);
      const rowHeight = trackElement.firstElementChild?.getBoundingClientRect().height ?? 40;
      const geometry = `${distance}-${rowHeight}-${windowElement.clientHeight}`;
      if (geometry === lastGeometry) return;
      lastGeometry = geometry;
      animations.current.forEach(animation => animation.cancel());
      const { duration } = scrollTiming(distance, rowHeight, minimumDuration);
      callbacks.current.onDurationChange(duration);
      const hold = Math.min(4 / duration, 0.25);
      // Reduced motion advances in viewport-sized steps, keeping every row readable.
      const easing = reducedMotion ? `steps(${Math.max(1, Math.ceil(distance / Math.max(1, windowElement.clientHeight - rowHeight)))}, end)` : 'linear';
      const scroll = trackElement.animate([
        { transform: 'translate3d(0,0,0)', offset: 0 },
        { transform: 'translate3d(0,0,0)', offset: hold, easing },
        { transform: `translate3d(0,-${distance}px,0)`, offset: 1 - hold },
        { transform: `translate3d(0,-${distance}px,0)`, offset: 1 },
      ], { duration: duration * 1000, fill: 'forwards' });
      const meter = progressElement.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: duration * 1000, fill: 'forwards' });
      animations.current = [scroll, meter];
      if (!callbacks.current.running) animations.current.forEach(animation => animation.pause());
      scroll.onfinish = () => callbacks.current.onComplete();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(windowElement);
    observer.observe(trackElement);
    measure();
    return () => { observer.disconnect(); animations.current.forEach(animation => animation.cancel()); };
  }, [minimumDuration, reducedMotion, rows.length]);

  useEffect(() => {
    animations.current.forEach(animation => running ? animation.play() : animation.pause());
  }, [running]);

  const renderRow = (row: DisplayRow, pinned = false) => <div className={`leaderboard-row ${row.rank <= 3 ? 'podium-row' : ''} ${pinned ? 'pinned-leader' : ''}`} key={row.id} data-rank-tier={displayRankTier(row.rank)} style={(appearance === 'gloss' ? { background: 'linear-gradient(90deg, color-mix(in srgb, hsl(var(--rank)) 25%, #000), color-mix(in srgb, hsl(var(--rank)) 50%, #000) 50%, color-mix(in srgb, hsl(var(--rank)) 25%, #000))', borderLeft: '1px solid hsl(var(--rank))', borderRight: '1px solid hsl(var(--rank))', textShadow: metalTextShadow } : undefined) as CSSProperties}>
    <span className="row-rank">{String(row.rank).padStart(2, '0')}</span>
    <div className="row-person"><b>{row.name}</b><small>{row.detail}{pinned && <span className="pinned-label"> · LEADING THE WAY</span>}{row.change !== undefined && row.change > 0 && <span className="rank-rise"> ↑ {row.change} ranks vs. last month</span>}</small></div>
    <strong className="row-points">{formatPoints(row.points)}</strong>
    <span aria-hidden="true" className="row-meter" style={{ transform: `scaleX(${Math.max(0, Math.min(1, row.points / (rows[0]?.points || 1)))})` }} />
  </div>;

  return <>
    <div className="scrolling-leaderboard">
      {rows[0] && renderRow(rows[0], true)}
      <div className="leaderboard-scroll-window" ref={viewport}>
        <div className="leaderboard-scroll-track" ref={track}>{rows.slice(1).map(row => renderRow(row))}</div>
        {!rows.length && <div className="board-empty"><FiAward /><h2>Make your first mark.</h2><p>Earn points. Build momentum. See your name here.</p></div>}
      </div>
    </div>
    <div className="display-progress scrolling-progress" aria-hidden="true"><span ref={progress} /></div>
  </>;
}
