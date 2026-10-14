"use client";
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReducedMotion } from 'motion/react';
import { DateTime } from 'luxon';
import { FiActivity, FiAward, FiClock, FiMaximize, FiPause, FiPlay, FiSettings, FiTrendingUp } from 'react-icons/fi';
import { metalStyle, metalStyleGradient, metalTextShadow } from '@/app/dataClasses';
import { globalDashGetGlobalStats } from '@/app/supaApi/universal/universalApi';
import { createClient } from '@/utils/supabase/client';
import { buildSlides, formatPoints, type DisplaySlide } from '../featured/screens/displayData';
import ScrollingLeaderboard from '../featured/screens/ScrollingLeaderboard';
import '../featured/featured.css';
import './global.css';

const spectrum = [{ color: '#e4bb53', percent: 0 }, { color: '#8c75cf', percent: 50 }, { color: '#47bdb2', percent: 100 }];
const metal = (color: string): CSSProperties => ({ backgroundImage: metalStyle(color), textShadow: metalTextShadow });

function Standings({ slide, title, color, running, reduced, large = false, onCycle }: {
  slide?: DisplaySlide; title?: string; color: string; running: boolean; reduced: boolean; large?: boolean; onCycle?: () => void;
}) {
  const [cycle, setCycle] = useState(0);
  return <section className={`global-panel global-standings ${large ? 'global-overall' : ''}`}>
    <header className="global-metal-heading" style={metal(color)}><h2>{title ?? slide?.title ?? 'Standings'}</h2><span>{slide?.rows.length ?? 0} {slide?.id.startsWith('group-') ? 'teams' : 'students'}</span></header>
    {large && <div className="global-board-caption">THE SCHOOL LEADERBOARD <FiAward /></div>}
    {slide?.rows.length ? <ScrollingLeaderboard key={`${slide.id}-${cycle}`} rows={slide.rows} minimumDuration={25} running={running} reducedMotion={reduced} appearance="gloss" onComplete={() => { setCycle(value => value + 1); onCycle?.(); }} onDurationChange={() => {}} /> : <div className="global-empty">Achievements will appear here as points are earned.</div>}
    {large && <footer className="global-panel-note">Top third · maximum 20 students<br />Leader pinned. Standings scroll automatically.</footer>}
  </section>;
}

export default function GlobalDashboard() {
  const [timeframe, setTimeframe] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [settings, setSettings] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [teamIndex, setTeamIndex] = useState(0);
  const [now, setNow] = useState<DateTime | null>(null);
  const [notice, setNotice] = useState('');
  const reduced = !!useReducedMotion();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['global-display', timeframe], queryFn: async () => {
    const data = await globalDashGetGlobalStats(12, timeframe);
    if (!data) throw new Error('No dashboard data available');
    return data;
  }, refetchInterval: 60_000 });
  useEffect(() => {
    const supabase = createClient();
    const pointsChannel = supabase.channel('student-points-channel').on('broadcast', { event: 'sync' }, () => void queryClient.invalidateQueries({ queryKey: ['global-display'] })).subscribe();
    return () => { void supabase.removeChannel(pointsChannel); };
  }, [queryClient]);
  useEffect(() => {
    const updateVisibility = () => setVisible(!document.hidden);
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    setNow(DateTime.now());
    const clock = setInterval(() => setNow(DateTime.now()), 30_000);
    return () => { clearInterval(clock); document.removeEventListener('visibilitychange', updateVisibility); };
  }, []);
  const running = !paused && visible;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setRotation(value => value + 1), 90_000);
    return () => clearInterval(timer);
  }, [running]);
  const data = query.data;
  const slides = useMemo(() => data ? buildSlides(data) : [], [data]);
  const overall = slides.find(slide => slide.id === 'overall');
  const categories = data?.pointGroups ?? [];
  const categoryPage = categories.slice((rotation % Math.max(1, Math.ceil(categories.length / 3))) * 3).slice(0, 3);
  const grades = [...(data?.grades ?? [])].sort((a, b) => a - b);
  const gradePage = grades.slice((rotation % Math.max(1, Math.ceil(grades.length / 4))) * 4).slice(0, 4);
  const teams = slides.filter(slide => slide.id.startsWith('group-'));
  const team = teams[teamIndex % Math.max(1, teams.length)];
  const upcoming = [...(data?.pointEvents ?? [])].filter(event => DateTime.fromISO(event.date).endOf('day').toMillis() >= (now?.startOf('day').toMillis() ?? Infinity)).sort((a, b) => a.date.localeCompare(b.date));
  const eventPage = upcoming.slice((rotation % Math.max(1, Math.ceil(upcoming.length / 3))) * 3).slice(0, 3);
  const eligible = new Set(overall?.rows.map(row => row.id));
  const risers = [...(data?.students ?? [])].filter(student => eligible.has(student.id) && student.lastMonthRank > student.rank && student.lastMonthRank > 0).sort((a, b) => (b.lastMonthRank - b.rank) - (a.lastMonthRank - a.rank)).slice(0, 3);
  const timeframeName = data?.timeframes.find(item => timeframe === null ? item.isActive : item.id === timeframe)?.name;

  if (!data) return <div className="global-board global-loading"><FiActivity /><span>PHOENIX / GLOBAL</span><h1>{query.isError ? 'The board is reconnecting.' : 'A whole school of achievement.'}</h1><p>{query.isError ? 'Check the connection or try again.' : 'Loading the latest standings…'}</p>{query.isError && <button onClick={() => void query.refetch()}>Retry</button>}</div>;

  return <div className="global-board" data-paused={!running}>
    <div className="global-glow" aria-hidden="true" />
    <header className="global-header"><div className="global-wordmark"><FiActivity /><div><b>PHOENIX <span>GLOBAL</span></b><p>The whole school. Every achievement.</p></div></div><div className="global-period"><span>THE BIG PICTURE</span><b>{timeframeName ?? 'Student recognition'}</b></div><div className="global-clock"><strong>{now?.toFormat('h:mm a') ?? '—'}</strong><span>{now?.toFormat('cccc, LLL d')}</span></div><button aria-label="Global display settings" aria-expanded={settings} onClick={() => setSettings(value => !value)}><FiSettings /></button></header>
    <section className="global-summary" aria-label="School overview" style={{ backgroundImage: metalStyleGradient(spectrum) }}><div><span className="global-live-dot" /><b>{query.isError ? 'Reconnecting · saved results' : query.isFetching ? 'Refreshing standings' : 'Schoolwide recognition'}</b></div><div><strong>{data.totalStudents}</strong><span>students</span></div><div><strong>{categories.length}</strong><span>point categories</span></div><div><strong>{data.rankingGroups.length}</strong><span>ranking groups</span></div><div><strong>{upcoming.length}</strong><span>upcoming events</span></div></section>
    <main className="global-layout">
      <Standings slide={overall} title="Overall leaders" color="#d6b55d" running={running} reduced={reduced} large />
      <div className="global-center">
        <section className="global-category-section"><div className="global-section-label"><span>01 / CATEGORY STANDINGS</span><b>Different strengths. Shared ambition.</b></div><div className="global-category-grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, categoryPage.length)}, minmax(0, 1fr))` }}>{categoryPage.map(category => <Standings key={`${timeframe}-${category.id}`} slide={slides.find(slide => slide.id === `category-${category.id}`)} title={category.name} color={category.color} running={running} reduced={reduced} />)}{!categories.length && <div className="global-empty">Point categories will appear here.</div>}</div></section>
        <section className="global-grade-section"><div className="global-section-label"><span>02 / GRADE STANDINGS</span><b>Recognize someone in your class?</b></div><div className="global-grade-grid">{gradePage.map(grade => <Standings key={`${timeframe}-${grade}`} slide={slides.find(slide => slide.id === `grade-${grade}`)} title={`Grade ${grade}`} color="#658caa" running={running} reduced={reduced} />)}{!grades.length && <div className="global-empty">Grade standings are on their way.</div>}</div></section>
      </div>
      <aside className="global-sidebar">
        <Standings key={timeframe ?? 'active'} slide={team} title={team?.title ?? 'Team standings'} color="#9c78ca" running={running} reduced={reduced} onCycle={() => setTeamIndex(value => value + 1)} />
        <section className="global-panel global-events"><header className="global-metal-heading" style={metal('#448d86')}><h2><FiClock /> On the horizon</h2><span>{upcoming.length} events</span></header><div className="global-event-list">{eventPage.map(event => {
          const category = categories.find(category => category.id === event.pointGroup);
          const date = DateTime.fromISO(event.date);
          return <article key={event.id} className="global-event" style={metal(category?.color ?? '#526c83')}><div className="global-event-date"><b>{date.toFormat('dd')}</b><span>{date.toFormat('LLL')}</span></div><div><h3>{event.name}</h3><p>{category?.name ?? 'School event'} · up to {formatPoints(event.maxPoints)} pts</p></div></article>;
        })}{!upcoming.length && <div className="global-empty">No upcoming events in this timeframe.<span>Keep an eye out for your next opportunity.</span></div>}</div></section>
        <section className="global-panel global-momentum"><header className="global-metal-heading" style={metal('#a36b3d')}><h2><FiTrendingUp /> Moving up</h2><span>vs. last month</span></header><div className="global-risers">{risers.map(student => <article key={student.id}><div><b>{student.firstName} {student.lastName}</b><span>Grade {student.grade} · now #{student.rank}</span></div><strong>↑ {student.lastMonthRank - student.rank}</strong></article>)}{!risers.length && <div className="global-empty">The next rise starts here.<span>Rank gains will appear as standings change.</span></div>}</div></section>
      </aside>
    </main>
    <footer className="global-footer"><span><span className="global-live-dot" /> {paused ? 'DISPLAY PAUSED' : 'PHOENIX / LIVE STANDINGS'} · Updated {DateTime.fromMillis(query.dataUpdatedAt).toFormat('h:mm a')}</span><b>Earn points. Build momentum. Rise together.</b><a href="/dashboard/featured">Featured display ↗</a></footer>
    {settings && <section className="global-controls" aria-label="Global display controls"><div><b>Display controls</b><button aria-label="Close display controls" onClick={() => setSettings(false)}>✕</button></div><label>Timeframe<select value={timeframe ?? ''} onChange={event => { setTimeframe(event.target.value ? Number(event.target.value) : null); setTeamIndex(0); setRotation(0); }}><option value="">Active timeframe</option>{data.timeframes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button onClick={() => setPaused(value => !value)}>{paused ? <FiPlay /> : <FiPause />}{paused ? 'Resume display' : 'Pause display'}</button><button onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); setNotice(''); } catch { setNotice('Use your browser’s fullscreen command.'); } }}><FiMaximize /> Toggle fullscreen</button>{notice && <p role="status">{notice}</p>}<a href="/dashboard">All dashboards</a></section>}
  </div>;
}
