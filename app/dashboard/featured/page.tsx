import { getFeaturedDashData, newGetGlobalDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import TopStudents from "./screens/TopStudents";
import AnimatedFeatured from "./screens/AnimatedFeatured";
import { Quicksand } from "next/font/google";
import { getGlobalPointStats } from "@/app/supaApi/universal/universalApi";

const customFont = Quicksand({
  weight: "500",
  subsets: ["latin"]
});

export default async function FeaturedDashboard() {
  const featuredDashData = await getGlobalPointStats(12, null, null, null, null, null, null, null);

  if (!featuredDashData) {
    return (
      <div className="bg-slate-900 min-h-dvh max-h-dvh max-w-full min-w-full">
        <div className="flex justify-center items-center h-full w-full">
          <p className="text-white text-2xl">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-slate-900 min-h-dvh max-h-dvh max-w-full min-w-full ${customFont.className}`} >
      {/* <TopStudents
        initGlobalDashData={featuredDashData}
        groupFocusId={null}
        gradeFocus={null}
      /> */}
      <AnimatedFeatured
        initGlobalDashData={featuredDashData}
      />
    </div>
  )
}
