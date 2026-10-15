'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDisplayBoards } from '@/app/supaApi/server/dashboard/displayBoards';
import { createClient } from '@/utils/supabase/client';
import { buildSlides } from '../featured/screens/displayData';
import { WallStage } from '@/components/display/WallStage';
import { BoardScene } from '@/components/display/BoardScene';
import { MessageScene } from '@/components/display/ExtraScenes';
import { WallControls } from '@/components/display/WallControls';
import { useDashboardSchool } from "@/app/dashboard/useDashboardSchool";

/** The Hall of Honor: the overall top ten as one fixed scene. It never rotates. */
export default function GlobalDashboard() {
  const [timeframe, setTimeframe] = useState<number | null>(null);
  const [pulse, setPulse] = useState(0);
  const queryClient = useQueryClient();
  const { schoolId } = useDashboardSchool();
  const query = useQuery({ queryKey: ['global-display', schoolId, timeframe], enabled: schoolId !== null, queryFn: async () => {
    const data = await getDisplayBoards(schoolId, timeframe);
    if (!data) throw new Error('No dashboard data available');
    return data;
  }, refetchInterval: 60_000 });
  useEffect(() => {
    const supabase = createClient();
    const pointsChannel = supabase.channel('student-points-channel').on('broadcast', { event: 'sync' }, () => void queryClient.invalidateQueries({ queryKey: ['global-display'] })).subscribe();
    return () => { void supabase.removeChannel(pointsChannel); };
  }, [queryClient]);

  // A live update replays the divider shimmer once.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setPulse(p => p + 1);
    const t = setTimeout(() => setPulse(0), 700);
    return () => clearTimeout(t);
  }, [query.dataUpdatedAt]);

  const data = query.data;
  const slide = useMemo(() => (data ? buildSlides(data).find(s => s.id === 'overall') : undefined), [data]);

  if (!data) return (
    <WallStage term={null}>
      <div className="hb-scene">
        <MessageScene
          heading={query.isError ? 'We’ll be right back.' : 'A whole school of achievement.'}
          sub={query.isError ? 'Check the connection or try again.' : 'Loading the latest standings…'}
        >
          {query.isError && <button className="hb-btn" onClick={() => void query.refetch()}>Retry</button>}
        </MessageScene>
      </div>
    </WallStage>
  );

  const term = data.timeframes.find(t => t.id === data.timeframeId)?.name ?? null;
  const message = data.timeframeId === null
    ? { heading: 'A new term is about to begin.', sub: 'Student achievements will appear as points are earned.' }
    : !slide ? { heading: 'Your story starts here.', sub: 'Student achievements will appear as points are earned.' } : null;
  return (
    <WallStage term={term} status={query.isError ? 'offline' : 'live'} progress={null}>
      <div className="hb-scene">
        {message ? <MessageScene heading={message.heading} sub={message.sub} /> : slide && <BoardScene slide={slide} pulse={pulse} />}
      </div>
      <WallControls timeframes={data.timeframes} timeframe={timeframe} onTimeframe={setTimeframe} backLabel="All dashboards" />
    </WallStage>
  );
}
