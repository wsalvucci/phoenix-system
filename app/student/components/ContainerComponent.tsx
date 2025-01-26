"use client";

import { rankToColor, Student, StudentRankData } from "@/app/dataClasses";
import TotalPointsRank from "./TotalPointsRank";
import PointCategoryTotals from "./pointCategoryTotals";
import RecentPoints from "./recentPoints";
import Color from "color";
import StudentName from "./StudentName";
import { useEffect, useState } from "react";
import StudentCategoryTotals from "./studentCategoryTotals";
import { DateTime } from "luxon";
import { Quicksand, Roboto, Anta } from "next/font/google";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { getStudentDashboardData } from "@/app/supaApi/server/student/studentApi";
import { StudentPointsData } from "@/app/supaApi/universal/utils/types";
import { getStudentPointStats } from "@/app/supaApi/universal/universalApi";

const roboto = Anta({
    weight: "400",
    subsets: ["latin"]
});

function isBirthday(birthdate: DateTime) {
    return birthdate.day === DateTime.now().day && birthdate.month === DateTime.now().month;
}

export default function ContainerComponent(
    {
        studentRankData
    }: {
        studentRankData: StudentPointsData
    }
) {
    const [pointHeaderOpacity, setPointHeaderOpacity] = useState(0);
    const [liveStudentData, setLiveStudentData] = useState<StudentPointsData>(studentRankData)
    const [totalRank, setTotalRank] = useState<number>(studentRankData.totalRank)

    const updateData = async () => {
        const newData = await getStudentPointStats(studentRankData.studentId, null);
        if (newData === null) return;
        setLiveStudentData(newData)
        setTotalRank(newData.totalRank)
    }


    const supabase = createClient();
    const broadcastChannel = supabase.channel("student-points-channel");

    broadcastChannel.on(
        'broadcast',
        { event: 'sync' },
        (payload) => {
            console.log('Received broadcast:', payload);
            updateData();
        }
    ).subscribe();

    return (
        <div
            className={`animate-in w-full overflow-auto overscroll-y-none border text-white} ${roboto.className}`}
            style={{
                height: '100svh',
                maxHeight: '100svh',
                overflow: 'scroll',
                backgroundImage: `
                linear-gradient(135deg,
                ${rankToColor(totalRank).alpha(0.75).rgb()} 0%,
                #fcfbfa 20%,
                ${rankToColor(totalRank).darken(0.05).alpha(0.75).rgb()} 40%,
                #fcfbfa 80%,
                ${rankToColor(totalRank).darken(0.1).alpha(0.75).rgb()} 100%),
                    url('https://cdn.midjourney.com/4e5b065b-2f7d-4141-a869-b14aebbc3b5b/0_0.png')
                `,
                boxShadow: `inset 0 0 10px #000000`
            }}
        >
            <div className="bg-zinc-900 overscroll-y-none text-white"
                onScroll={(e) => {
                    const opacity = e.currentTarget.scrollTop / 150;
                    setPointHeaderOpacity(opacity);
                }}
                style={{
                    minHeight: '100svh',
                    maxHeight: '100svh',
                    overflow: 'auto',
                    boxShadow: `
                    inset 0 0 10px ${rankToColor(totalRank).darken(0.5).rgb().string()},
                    inset 0 0 20px ${rankToColor(totalRank).darken(0.5).rgb().string()},
                    `
                }}>
                <div className={`sticky top-0 text-white bg-black`}>
                    <StudentName
                        firstName={liveStudentData?.firstName || ""}
                        lastName={liveStudentData?.lastName || ""}
                        grade={liveStudentData?.grade || 0}
                        totalPoints={liveStudentData?.totalPoints || 0}
                        totalRank={totalRank}
                        opacity={pointHeaderOpacity}
                    />
                </div>
                {/* {
                    studentData.birthdate && isBirthday(DateTime.fromJSDate(studentData.birthdate, { zone: 'utc' })) && (
                        <div className="flex justify-center items-center p-2" style={{
                            color: totalRank > 20 ? '#000' : '#FFF'
                        }}>
                            <div className="text-3xl">Happy Birthday {studentData.firstName}!</div>
                        </div>
                    )
                } */}
                <div className="px-6 pb-6">
                    <TotalPointsRank
                        studentId={liveStudentData.studentId}
                        totalPoints={liveStudentData?.totalPoints || 0}
                        totalRank={totalRank}
                        nearbyStudents={liveStudentData.nearbyStudents}
                    />
                    <PointCategoryTotals
                    studentId={liveStudentData.studentId}
                    totalRank={totalRank}
                    categories={
                        liveStudentData.pointGroups.map((pointGroup) => ({
                            pointGroup: {
                                id: pointGroup.id,
                                name: pointGroup.name,
                                color: pointGroup.color,
                            },
                            totalPoints: pointGroup.points,
                            rank: pointGroup.rank,
                            nearbyStudents: pointGroup.nearbyStudents
                        }))
                    }
                     />
                    <StudentCategoryTotals
                        studentId={liveStudentData.studentId}
                        totalRank={totalRank}
                        categories={liveStudentData.studentGroups.map((studentGroup) => ({
                            studentGroup: {
                                id: studentGroup.id,
                                name: studentGroup.name,
                            },
                            totalPoints: liveStudentData.totalPoints,
                            rank: studentGroup.rank,
                            nearbyStudents: studentGroup.nearbyStudents
                        }))}
                        grade={{
                            grade: liveStudentData.grade,
                            rank: liveStudentData.gradeRank,
                            nearbyStudents: liveStudentData.nearbyGradeStudents
                        }}
                    />
                    <div className="flex justify-center">
                        <Link
                            href="/dashboard/mobile"
                            className="px-2 py-1 my-10 text-2xl bg-slate-700 w-3/4 rounded-lg flex justify-center">View Global Stats</Link>
                    </div>
                    {/* <RecentPoints
                        totalRank={totalRank}
                        recentPoints={liveStudentData.pointEvents.map((pointEvent) => ({

                        }))} /> */}
                </div>
            </div>
        </div>
    )
}