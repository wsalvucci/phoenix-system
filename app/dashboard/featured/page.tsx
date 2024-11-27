import { getFeaturedDashData, newGetGlobalDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import TopStudents from "./screens/TopStudents";
import AnimatedFeatured from "./screens/AnimatedFeatured";
import { Quicksand } from "next/font/google";

const customFont = Quicksand({
  weight: "500",
  subsets: ["latin"]
});

export default async function FeaturedDashboard() {
  const featuredDashData = await getFeaturedDashData(12);


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
