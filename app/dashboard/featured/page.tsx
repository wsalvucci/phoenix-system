import React, { Suspense } from 'react';
import AnimatedFeatured from "./screens/AnimatedFeatured";
import { Quicksand } from "next/font/google";
import { featuredDashGetGlobalStats } from "@/app/supaApi/universal/universalApi";

const customFont = Quicksand({
  weight: "500",
  subsets: ["latin"]
});

// Component to display loading state
const LoadingIndicator = () => (
  <div className="bg-slate-900 min-h-dvh max-h-dvh max-w-full min-w-full flex justify-center items-center">
    <p className={`text-white text-3xl ${customFont.className}`}>Loading Featured Dashboard...</p>
    {/* You can replace this with a more sophisticated spinner */}
  </div>
);

// New async component to fetch data and render content
async function FeaturedContent() {
  try {
    const featuredDashData = await featuredDashGetGlobalStats(12, null);

    if (!featuredDashData) {
      // Handle case where data is successfully fetched but empty/invalid
      return (
        <div className="flex justify-center items-center h-full w-full">
          <p className="text-white text-2xl">No featured data available at this time.</p>
        </div>
      );
    }

    // Render the actual content when data is ready
    return (
      <AnimatedFeatured
        initGlobalDashData={featuredDashData}
      />
    );
  } catch (error) {
    console.error("Failed to fetch featured stats:", error);
    // Handle fetch error
    return (
      <div className="flex flex-col justify-center items-center h-full w-full text-red-400">
        <p className="text-2xl">Error loading featured dashboard.</p>
        <p className="text-lg mt-2">{error instanceof Error ? error.message : 'An unknown error occurred'}</p>
        {/* Optionally add a retry mechanism, though it's more complex with RSCs */}
      </div>
    );
  }
}

// Main page component using Suspense
export default function FeaturedDashboard() {
  return (
    <div className={`bg-slate-900 min-h-dvh max-h-dvh max-w-full min-w-full ${customFont.className}`} >
      <Suspense fallback={<LoadingIndicator />}>
        <FeaturedContent />
      </Suspense>
    </div>
  )
}
