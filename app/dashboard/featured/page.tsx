"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDisplayBoards } from '@/app/supaApi/server/dashboard/displayBoards';
import AnimatedFeatured from './screens/AnimatedFeatured';
import { WallStage } from '@/components/display/WallStage';
import { MessageScene } from '@/components/display/ExtraScenes';
import { useDashboardSchool } from "@/app/dashboard/useDashboardSchool";

export default function FeaturedDashboard() {
  const [timeframe, setTimeframe] = useState<number | null>(null);
  const { schoolId } = useDashboardSchool();
  const query = useQuery({
    queryKey: ['featured', schoolId, timeframe],
    enabled: schoolId !== null,
    queryFn: async () => {
      const data = await getDisplayBoards(schoolId, timeframe);
      if (!data) throw new Error('No dashboard data returned');
      return data;
    },
    refetchInterval: 60_000,
  });
  if (!query.data) return (
    <WallStage term={null}>
      <div className="hb-scene">
        <MessageScene
          heading={query.isError ? 'We’ll be right back.' : 'Great things are happening.'}
          sub={query.isError ? 'The board is reconnecting. Please check the connection if this continues.' : 'Getting the latest student achievements…'}
        >
          {query.isError && <button className="hb-btn" onClick={() => void query.refetch()}>Try again</button>}
        </MessageScene>
      </div>
    </WallStage>
  );
  return <AnimatedFeatured data={query.data} timeframe={timeframe} onTimeframeChange={setTimeframe} updatedAt={query.dataUpdatedAt} refreshing={query.isFetching} offline={query.isError} />;
}
