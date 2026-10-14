"use client";
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FiArrowUpRight, FiAward, FiChevronLeft, FiChevronRight, FiMaximize, FiPause, FiPlay, FiSettings, FiTrendingUp } from 'react-icons/fi';
import { createClient } from '@/utils/supabase/client';
import type { DisplayBoards } from '@/app/supaApi/universal/displayTypes';
import { displayRankTier } from '@/lib/rankTier';
import ScrollingLeaderboard from './ScrollingLeaderboard';
import { buildSlides, formatPoints, studentName, toDisplayRows } from './displayData';

export default function AnimatedFeatured({ data, timeframe, onTimeframeChange, updatedAt, refreshing, offline }: {
  data: DisplayBoards; timeframe: number | null; onTimeframeChange: (id: number | null) => void; updatedAt: number; refreshing: boolean; offline: boolean;
}) {
  const client = useQueryClient();
  const reducedMotion = useReducedMotion();
  const [sequence, setSequence] = useState(0);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(20);
  const [screenDuration, setScreenDuration] = useState(20);
  const [settings, setSettings] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const [now, setNow] = useState<Date | null>(null);
  const [visible, setVisible] = useState(true);
  const slides = useMemo(() => buildSlides(data), [data]);
  const slideIndex = ((sequence % slides.length) + slides.length) % slides.length;
  const slide = slides[slideIndex];
  const running = !paused && visible;

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
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);


  // Spotlight and leader come from the overall board only (no cross-cohort joins, §7.1).
  const students = data.overall.rows;
  const spotlight = students[((sequence % Math.max(students.length, 1)) + students.length) % Math.max(students.length, 1)];
  const categories = data.pointGroups.slice((slideIndex % Math.max(1, Math.ceil(data.pointGroups.length / 4))) * 4).slice(0, 4);
  const gradePage = data.grades.slice((slideIndex % Math.max(1, Math.ceil(data.grades.length / 4))) * 4).slice(0, 4);
  const activeTimeframe = data.timeframes.find(t => t.id === data.timeframeId);
  const nextSlide = slides[(slideIndex + 1) % slides.length];
  const transition = { duration: reducedMotion ? 0 : 0.55, ease: 'easeOut' as const };

  return <div className="phoenix-display" data-paused={!running}>
    <div className="display-aurora" aria-hidden="true" />
    <header className="display-header">
      <div className="display-brand"><span className="brand-mark"><FiTrendingUp /></span><div><strong>PHOENIX<span> / </span></strong><small>Every achievement matters.</small></div></div>
      <div className="display-edition"><span className="display-eyebrow">THE RECOGNITION BOARD</span><b>{activeTimeframe?.name ?? 'Student achievements'}</b></div>
      <div className="display-clock"><b>{now?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) ?? '—'}</b><span>{now?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span></div>
      <button className="display-settings-button" aria-label="Display settings" aria-expanded={settings} onClick={() => setSettings(s => !s)}><FiSettings /></button>
    </header>

    <section className="display-summary" aria-label="At a glance">
      <div className="summary-intro"><span className="status-dot" /><b>{offline ? 'Reconnecting' : refreshing ? 'Refreshing achievements' : 'Celebrating our students'}</b><span>{offline ? 'Showing last available results' : 'Effort. Progress. Recognition.'}</span></div>
      <div><strong>{data.pointGroups.length}</strong><span>categories on the board</span></div>
      <div><strong>{data.upcomingEvents.length}</strong><span>upcoming events</span></div>
      <div className="summary-leader"><FiAward /><span>Overall leader<b>{students[0] ? studentName(students[0]) : 'Who will be first?'}</b></span></div>
    </section>

    <main className="display-main">
      <section className="display-panel leaderboard-panel">
        <div className="panel-heading"><div><span className="display-eyebrow">THE PEOPLE MAKING IT HAPPEN</span><h1>{slide.title}</h1><p>{slide.subtitle}</p></div><span className="panel-number">{String(slideIndex + 1).padStart(2, '0')}<small> / {slides.length}</small></span></div>
        <div className="leaderboard-labels"><span>RANK / STUDENT OR TEAM</span><span>POINTS</span></div>
        <ScrollingLeaderboard key={`${slide.id}-${sequence}-${timeframe}`} rows={slide.rows} minimumDuration={duration} running={running} reducedMotion={!!reducedMotion} onComplete={() => setSequence(s => s + 1)} onDurationChange={setScreenDuration} />
        <div className="leaderboard-footer"><span>{paused ? 'Rotation paused' : 'UP NEXT'} <b>{nextSlide.title}</b></span><span>{Math.ceil(screenDuration)}s / screen</span></div>

      </section>

      <section className="spotlight-column">
        <div className="spotlight-card">
          <div className="spotlight-orbit orbit-one" aria-hidden="true" /><div className="spotlight-orbit orbit-two" aria-hidden="true" />
          <span className="display-eyebrow"><FiAward /> STUDENT SPOTLIGHT</span>
          <AnimatePresence mode="wait" initial={false}><motion.div key={spotlight?.key ?? 'empty'} initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition} className="spotlight-content">
            <span className="spotlight-grade" data-rank-tier={displayRankTier(spotlight?.rank)} style={{ borderLeft: '0.35em solid hsl(var(--rank))', paddingLeft: '0.6em' }}>{spotlight ? `GRADE ${spotlight.grade} · OVERALL #${spotlight.rank}` : 'YOUR NEXT CHAPTER'}</span>
            <h2>{spotlight ? <>{spotlight.firstName}<br />{spotlight.lastName}</> : <>This could<br />be you.</>}</h2>
            <div className="spotlight-score">{formatPoints(spotlight?.totalPoints ?? 0)}<span>POINTS EARNED</span></div>
          </motion.div></AnimatePresence>
          <p className="teacher-prompt">Know this student? <strong>Celebrate their effort.</strong></p>
        </div>
      </section>

      <aside className="display-panel category-panel"><div className="panel-heading"><div><span className="display-eyebrow">MORE WAYS TO SHINE</span><h2>Category leaders</h2></div><FiAward /></div>
        <div className="category-list">{categories.map(group => {
          const leaders = toDisplayRows(group).slice(0, 3);
          return <div className="category-block" key={group.key} style={{ '--category-color': group.color || '#8bafff' } as CSSProperties}><h3><span />{group.title}</h3>{leaders.map((s) => <div className="category-student" key={s.key} data-rank-tier={displayRankTier(s.rank)}><span>{s.rank}</span><div><b>{s.name}</b><small>{s.detail}</small></div><strong>{formatPoints(s.points)}</strong></div>)}{!leaders.length && <p className="category-empty">The first points are still to come.</p>}</div>;
        })}{!categories.length && <p className="category-empty">New ways to shine are on the way.</p>}</div>
        <div className="category-note">Small actions. Lasting recognition.</div>
      </aside>
    </main>

    <section className="grade-strip" aria-label="Grade leaders"><div className="grade-strip-label"><span className="display-eyebrow">ACROSS THE SCHOOL</span><h2>Leading the way</h2></div>{gradePage.map(grade => {
      const leader = toDisplayRows(grade)[0];
      return <div className="grade-tile" key={grade.key} data-rank-tier={displayRankTier(leader?.rank)}><span>{grade.title.toUpperCase()}</span><b>{leader ? leader.name : 'Your name could be here'}</b><small>{leader ? `${formatPoints(leader.points)} points` : 'Start earning points'}</small></div>;
    })}</section>
    <footer className="display-footer"><span><span className="status-dot" /> {offline ? 'CONNECTION INTERRUPTED' : 'PHOENIX RECOGNITION'} <span className="footer-divider">/</span> {updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'Connecting'}</span><b>Show up. Get involved. Rise together. <FiArrowUpRight /></b></footer>

    {settings && <section className="display-controls" aria-label="Display controls"><div><strong>Display controls</strong><button onClick={() => setSettings(false)} aria-label="Close display controls">✕</button></div><nav><button onClick={() => setSequence(s => s - 1)} aria-label="Previous screen"><FiChevronLeft /></button><button onClick={() => setPaused(p => !p)}>{paused ? <FiPlay /> : <FiPause />}{paused ? 'Resume' : 'Pause'}</button><button onClick={() => setSequence(s => s + 1)} aria-label="Next screen"><FiChevronRight /></button></nav><label>Minimum screen duration<select value={duration} onChange={e => setDuration(Number(e.target.value))}>{[15, 20, 30, 45, 60].map(s => <option key={s} value={s}>{s} seconds</option>)}</select></label><label>Timeframe<select value={timeframe ?? ''} onChange={e => { setSequence(0); onTimeframeChange(e.target.value ? Number(e.target.value) : null); }}><option value="">Active timeframe</option>{data.timeframes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><button onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); setFullscreenError(''); } catch { setFullscreenError('Fullscreen is unavailable. Use your browser’s fullscreen command.'); } }}><FiMaximize /> Toggle fullscreen</button>{fullscreenError && <p role="status">{fullscreenError}</p>}<a href="/dashboard">Back to dashboards</a></section>}
  </div>;
}
