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
import { Quicksand, Roboto } from "next/font/google";
import Link from "next/link";

const roboto = Roboto({
    weight: "700",
    subsets: ["latin"]
});

function isBirthday(birthdate: DateTime) {
    return birthdate.day === DateTime.now().day && birthdate.month === DateTime.now().month;
}

export default function ContainerComponent(
    {
        studentData, studentRankData
    }: {
        studentData: Student,
        studentRankData: StudentRankData
    }
) {
    const totalRank = studentRankData.ranks.totalRank;
    const [pointHeaderOpacity, setPointHeaderOpacity] = useState(0);

    return (
        <div
            className={`animate-in w-full overflow-auto overscroll-y-none border ${Color(rankToColor(totalRank)).darken(0.4).alpha(0.5).isLight() ? 'text-black' : 'text-white'} ${roboto.className}`}
            style={{
                height: '100svh',
                maxHeight: '100svh',
                overflow: 'scroll',
                background: `
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
            <div className="bg-black overscroll-y-none"
                onScroll={(e) => {
                    const opacity = e.currentTarget.scrollTop / 150;
                    setPointHeaderOpacity(opacity);
                }}
                style={{
                    minHeight: '100svh',
                    maxHeight: '100svh',
                    overflow: 'auto',
                    background: totalRank > 20 ? '#EEE' : '#111',
                    boxShadow: `
                    inset 0 0 10px ${rankToColor(totalRank).darken(0.5).rgb().string()},
                    inset 0 0 20px ${rankToColor(totalRank).darken(0.5).rgb().string()},
                    `
                }}>
                <div className={`sticky top-0  ${Color(rankToColor(totalRank)).darken(0.5).alpha(0.75).isLight() ? 'text-black' : 'text-white'}`} style={{
                    background: `
                    linear-gradient(180deg,
                    ${rankToColor(totalRank).darken(0.5).alpha(0.5).rgb()} 90%,
                    ${rankToColor(totalRank).darken(0.5).alpha(1).rgb()} 100%),
                    url('https://cdn.midjourney.com/4e5b065b-2f7d-4141-a869-b14aebbc3b5b/0_0.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}>
                    <StudentName
                        firstName={studentData?.firstName || ""}
                        lastName={studentData?.lastName || ""}
                        grade={studentData?.grade || 0}
                        totalPoints={studentRankData?.ranks.totalPoints || 0}
                        totalRank={totalRank}
                        opacity={pointHeaderOpacity}
                    />
                </div>
                {
                    studentData.birthdate && isBirthday(DateTime.fromJSDate(studentData.birthdate, { zone: 'utc' })) && (
                        <div className="flex justify-center items-center p-2" style={{
                            color: totalRank > 20 ? '#000' : '#FFF'
                        }}>
                            <div className="text-3xl">Happy Birthday {studentData.firstName}!</div>
                        </div>
                    )
                }
                <div className="px-6 pb-6">
                    <TotalPointsRank
                        fullName={studentData?.firstName + " " + studentData?.lastName}
                        totalPoints={studentRankData?.ranks.totalPoints || 0}
                        totalRank={totalRank}
                    />
                    <PointCategoryTotals totalRank={totalRank} categories={studentRankData.ranks.pointGroupRanks} />
                    <StudentCategoryTotals
                        totalRank={totalRank}
                        categories={studentRankData.ranks.studentGroupRanks}
                        grade={studentRankData.ranks.gradeRank}
                    />
                    {/* <div className="flex justify-center">
                        <Link
                            href="/dashboard/mobile"
                            className="px-2 py-1 my-10 text-2xl bg-slate-700 w-3/4 rounded-lg flex justify-center">View Global Stats</Link>
                    </div> */}
                    <RecentPoints
                        totalRank={totalRank}
                        recentPoints={studentRankData.points} />
                </div>
            </div>
        </div>
    )
}