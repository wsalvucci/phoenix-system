"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createClient } from '@/utils/supabase/client';
import type { DisplayBoards } from '@/app/supaApi/universal/displayTypes';
import { WallStage } from '@/components/display/WallStage';
import { BoardScene } from '@/components/display/BoardScene';
import { EventsScene, MessageScene, SpotlightScene } from '@/components/display/ExtraScenes';
import { WallControls } from '@/components/display/WallControls';
import { buildScenes, type Scene } from './displayData';

const TICK = 0.25;

/**
 * The rotating hallway wall. Each scene is one board, a spotlight or the upcoming events. New data
 * is held until the next scene boundary so a ledger never reshuffles in view.
 */
export default function AnimatedFeatured({ data, timeframe, onTimeframeChange, updatedAt, offline }: {
  data: DisplayBoards; timeframe: number | null; onTimeframeChange: (id: number | null) => void; updatedAt: number; refreshing: boolean; offline: boolean;
}) {
  const client = useQueryClient();
  const reducedMotion = !!useReducedMotion();
  const [sequence, setSequence] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dwell, setDwell] = useState(20);
  const [visible, setVisible] = useState(true);
  const [shown, setShown] = useState(data);
  const [pulse, setPulse] = useState(0);
  const latest = useRef(data);
  latest.current = data;

  const scenes = useMemo(() => buildScenes(shown), [shown]);
  const count = scenes.length;
  const index = ((sequence % count) + count) % count;
  const scene = scenes[index];
  const cycle = Math.floor(Math.max(sequence, 0) / count);
  const rotating = count > 1;
  const running = !paused && visible;
  const term = shown.timeframes.find(t => t.id === shown.timeframeId)?.name ?? null;

  // Live updates: the existing broadcast refetches; the data swaps in at the next scene boundary.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('student-points-channel').on('broadcast', { event: 'sync' }, () => {
      void client.invalidateQueries({ queryKey: ['featured'] });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client]);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  // Scene boundary: adopt the newest data and give the divider its 600 ms shimmer.
  useEffect(() => {
    if (latest.current === shown) return;
    setShown(latest.current);
    setPulse(p => p + 1);
    const t = setTimeout(() => setPulse(0), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence]);
  // With a single scene there is no boundary: adopt new data as it arrives.
  useEffect(() => {
    if (!rotating && latest.current !== shown) { setShown(latest.current); setPulse(p => p + 1); const t = setTimeout(() => setPulse(0), 700); return () => clearTimeout(t); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedAt]);

  useEffect(() => {
    if (!running || !rotating) return;
    const timer = setInterval(() => setElapsed(e => e + TICK), TICK * 1000);
    return () => clearInterval(timer);
  }, [running, rotating]);
  useEffect(() => {
    if (rotating && elapsed >= dwell) { setSequence(s => s + 1); setElapsed(0); }
  }, [elapsed, dwell, rotating]);

  const go = useCallback((delta: number) => { setSequence(s => s + delta); setElapsed(0); }, []);

  const renderScene = (s: Scene) => {
    switch (s.kind) {
      case 'board': return <BoardScene slide={s.slide} pulse={pulse} />;
      case 'spotlight': {
        const rows = shown.overall.rows;
        const row = rows[cycle % rows.length];
        return row ? <SpotlightScene row={row} pulse={pulse} /> : null;
      }
      case 'events': return <EventsScene events={s.events} pulse={pulse} />;
      case 'message': return <MessageScene heading={s.heading} sub={s.sub} />;
    }
  };

  const fade = { duration: reducedMotion ? 0 : 0.3, ease: 'easeOut' as const };
  return (
    <WallStage term={term} status={offline ? 'offline' : paused ? 'paused' : 'live'} progress={rotating ? elapsed / dwell : null}>
      <AnimatePresence initial={false}>
        <motion.div
          key={`${scene.id}-${cycle}`}
          className="hb-scene"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: fade }}
          exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : 0.2, ease: 'easeOut' } }}
        >
          {renderScene(scene)}
        </motion.div>
      </AnimatePresence>
      <WallControls
        timeframes={data.timeframes} timeframe={timeframe}
        onTimeframe={id => { setSequence(0); setElapsed(0); onTimeframeChange(id); }}
        dwell={dwell} onDwell={setDwell}
        paused={paused} onTogglePaused={() => setPaused(p => !p)} onPrev={() => go(-1)} onNext={() => go(1)}
      />
    </WallStage>
  );
}
