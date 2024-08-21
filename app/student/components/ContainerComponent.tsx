"use client";

import { Student, StudentRankData } from "@/app/dataClasses";
import TotalPointsRank from "./TotalPointsRank";
import PointCategoryTotals from "./pointCategoryTotals";
import RecentPoints from "./recentPoints";
import Color from "color";
import StudentName from "./StudentName";
import { useEffect, useState } from "react";
import StudentCategoryTotals from "./studentCategoryTotals";

import { Quicksand } from "next/font/google";

const roboto = Quicksand({
    weight: "600",
    subsets: ["latin"]
});

const rankToColor = (rank: number) => {
    if (rank === 1) {
        return Color("#FFD700");
    } else if (rank === 2) {
        return Color("#C0C0C0");
    } else if (rank === 3) {
        return Color("#CD7F32");
    } else if (rank === 4) {
        return Color("#800080");
    } else if (rank === 5) {
        return Color("#008080");
    } else if (rank <= 10) {
        return Color("#DC143C");
    } else if (rank <= 20) {
        return Color("#1318C5")
    } else {
        return Color("#000000");
    }
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
            className={`animate-in w-full overflow-auto overscroll-y-none rounded-lg border ${Color(rankToColor(totalRank)).darken(0.4).alpha(0.5).isLight() ? 'text-black' : 'text-white'} ${roboto.className}`}
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
                    background: `linear-gradient(
                        ${rankToColor(totalRank).darken(0.4).alpha(0.5).rgb()} 0%,
                        ${rankToColor(totalRank).darken(0.4).alpha(0.5).rgb()} 40%,
                        ${rankToColor(totalRank).darken(0.4).alpha(0.5).rgb()} 100%
                    ),
                    url('https://cdn.midjourney.com/4e5b065b-2f7d-4141-a869-b14aebbc3b5b/0_0.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: `
                    inset 0 0 10px ${rankToColor(totalRank).darken(0.5).rgb().string()},
                    inset 0 0 20px ${rankToColor(totalRank).darken(0.5).rgb().string()},
                    `
                }}>
                <div className={`sticky top-0  ${Color(rankToColor(totalRank)).darken(0.1).alpha(0.75).isLight() ? 'text-black' : 'text-white'}`} style={{
                    background: `
                    linear-gradient(180deg,
                    ${rankToColor(totalRank).darken(0.1).alpha(0.75).rgb()} 90%,
                    ${rankToColor(totalRank).darken(0.1).alpha(1).rgb()} 100%),
                    url('https://cdn.midjourney.com/4e5b065b-2f7d-4141-a869-b14aebbc3b5b/0_0.png')`,
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
                <div className="p-6">
                    <div>
                        <TotalPointsRank
                            totalPoints={studentRankData?.ranks.totalPoints || 0}
                            totalRank={totalRank}
                        />
                    </div>
                    <PointCategoryTotals categories={studentRankData.ranks.pointGroupRanks} />
                    <StudentCategoryTotals
                        categories={studentRankData.ranks.studentGroupRanks}
                        grade={studentRankData.ranks.gradeRank}
                    />
                    <RecentPoints recentPoints={studentRankData.points} />
                </div>
            </div>
        </div>
    )
}