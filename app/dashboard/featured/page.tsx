import { getFeaturedDashData, newGetGlobalDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import TopStudents from "./screens/TopStudents";

export default async function FeaturedDashboard() {
  const featuredDashData = await getFeaturedDashData(12);

  return (
    <div>
      <TopStudents
        initGlobalDashData={featuredDashData}
        groupFocusId={null}
        gradeFocus={null}
      />
    </div>
  )
}
