"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { featuredDashGetGlobalStats } from '@/app/supaApi/universal/universalApi';
import AnimatedFeatured from './screens/AnimatedFeatured';
import './featured.css';
import { useDashboardSchool } from "@/app/dashboard/useDashboardSchool";

export default function FeaturedDashboard() {
  const [timeframe, setTimeframe] = useState<number | null>(null);
  const { schoolId } = useDashboardSchool();
  const query = useQuery({
    queryKey: ['featured', schoolId, timeframe],
    enabled: schoolId !== null,
    queryFn: async () => {
      const data = await featuredDashGetGlobalStats(schoolId as number, timeframe);
      if (!data) throw new Error('No dashboard data returned');
      return data;
    },
    refetchInterval: 60_000,
  });
  if (!query.data) return <div className="phoenix-display display-loading"><span className="display-eyebrow">PHOENIX / STUDENT RECOGNITION</span><h1>{query.isError ? 'We’ll be right back.' : 'Great things are happening.'}</h1><p>{query.isError ? 'The board is reconnecting. Please check the connection if this continues.' : 'Getting the latest student achievements…'}</p>{query.isError && <button onClick={() => void query.refetch()}>Try again</button>}</div>;
  return <AnimatedFeatured data={query.data} timeframe={timeframe} onTimeframeChange={setTimeframe} updatedAt={query.dataUpdatedAt} refreshing={query.isFetching} offline={query.isError} />;
}
