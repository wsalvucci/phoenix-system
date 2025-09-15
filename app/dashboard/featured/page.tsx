"use client";
import React from 'react';
import { useQuery } from "@tanstack/react-query";
import AnimatedFeatured from "./screens/AnimatedFeatured";
import { Quicksand } from "next/font/google";
import { featuredDashGetGlobalStats } from "@/app/supaApi/universal/universalApi";
import { LoadingState } from "@/components/LoadingLayout";

const customFont = Quicksand({
  weight: "500",
  subsets: ["latin"]
});

export default function FeaturedDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["featured", null],
    queryFn: () => featuredDashGetGlobalStats(12, null)
  });

  console.log("=== CLIENT-SIDE FEATURED DASHBOARD ===");
  console.log("Timeframes count:", data?.timeframes?.length);
  console.log("Timeframes:", data?.timeframes);
  console.log("Active timeframes:", data?.timeframes?.filter(tf => tf.isActive));
  console.log("=====================================");

  return (
    <div className={`bg-slate-900 min-h-dvh max-h-dvh max-w-full min-w-full ${customFont.className}`}>
      <LoadingState
        isLoading={isLoading}
        error={error}
        data={data}
        errorFallback={(err) => (
          <div className="flex flex-col justify-center items-center h-full w-full text-red-400">
            <p className="text-2xl">Error loading featured dashboard.</p>
            <p className="text-lg mt-2">{err.message}</p>
          </div>
        )}
      >
        {(data) => <AnimatedFeatured initGlobalDashData={data} />}
      </LoadingState>
    </div>
  );
}
