import { newGetGlobalDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import TopStudents from "./screens/TopStudents";

export default async function FeaturedDashboard() {
  const featuredDashData = await newGetGlobalDashData(12);

  return (
    <div>
      <TopStudents
        initGlobalDashData={featuredDashData}
        groupFocusId={1}
        gradeFocus={null}
      />
    </div>
  )
}
