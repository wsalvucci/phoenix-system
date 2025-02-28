import { featuredDashGetGlobalStats, getStudentPointStats } from "@/app/supaApi/universal/universalApi";
import CompareContainer from "./components/CompareContainer";

export default async function StudentCompare() {

    const _studentData = await getStudentPointStats(null, null)
    if (_studentData === null) return
    const _globalData = await featuredDashGetGlobalStats(_studentData.schoolId, null)

    return (
        <CompareContainer _studentData={_studentData} _globalData={_globalData} />
    )
}