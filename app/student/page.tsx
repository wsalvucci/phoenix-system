import { createClient } from "@/utils/supabase/server";
import { getOwnStudentData, getStudentRankData } from "../supaApi/server/student/studentApi";
import HeaderRank from "./components/headerRank";
import PointCategoryTotals from "./components/pointCategoryTotals";
import RecentPoints from "./components/recentPoints";
import StudentCategoryTotals from "./components/studentCategoryTotals";
import Color from "color";

const rankToColor = (rank: number) => {
    switch (rank) {
        case 1:
            return Color("#FFD700");
        case 2:
            return Color("#C0C0C0");
        case 3:
            return Color("#CD7F32");
        case 4:
            return Color("#800080");
        case 5:
            return Color("#008080");
        default:
            return Color("#000000");
    }
}

export default async function StudentDashboard() {

    const supabaseClient = createClient();

    const studentData = await getOwnStudentData();
    const studentRankData = await getStudentRankData();

    console.log(studentData);

    supabaseClient.channel("student_point").subscribe((payload) => {
        console.log("Realtime update", payload);
    });

    return (
        <div
            className="animate-in w-full h-full rounded-3xl border"
            style={{
                //boxShadow: `0px 0px 50px inset ${rankToColor(1).toString()}`,
                //background: `linear-gradient(-45deg, ${rankToColor(1).fade(0.5).toString()} 0%, ${rankToColor(1).toString()} 50%, ${rankToColor(1).fade(0.5).toString()} 100%)`
            }}
        >
            {/* A background div that never moves */}
            {/* <div
                className="w-full h-full absolute"
                style={{
                    background: `linear-gradient(-45deg, ${rankToColor(1).fade(0.5).toString()} 0%, ${rankToColor(1).toString()} 50%, ${rankToColor(1).fade(0.5).toString()} 100%)`
                }}
            /> */}
            <div className="m-10 max-h-20 overflow-y-scroll">
                <HeaderRank
                    firstName={studentData?.firstName || ""}
                    grade={studentData?.grade || 0}
                    lastName={studentData?.lastName || ""}
                    totalPoints={studentRankData?.ranks.totalPoints || 0}
                    totalRank={studentRankData?.ranks.totalRank || 0}
                />
                <PointCategoryTotals categories={studentRankData.ranks.pointGroupRanks} />
                {/* <StudentCategoryTotals categories={studentRankData.ranks.studentGroupRanks} /> */}
                <RecentPoints recentPoints={studentRankData.points} />
            </div>
        </div>
    )
}