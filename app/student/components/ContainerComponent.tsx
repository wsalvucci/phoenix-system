"use client";

import { Student, StudentRankData } from "@/app/dataClasses";
import TotalPointsRank from "./TotalPointsRank";
import PointCategoryTotals from "./pointCategoryTotals";
import RecentPoints from "./recentPoints";
import Color from "color";
import StudentName from "./StudentName";
import { useEffect, useState } from "react";
import StudentCategoryTotals from "./studentCategoryTotals";

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
    //const totalRank = 17
    const totalRank = studentRankData.ranks.totalRank;
    return (
        <div
            className="animate-in w-full overflow-auto rounded-lg border text-white"
            style={{
                height: '100svh',
                maxHeight: '100svh',
                overflow: 'scroll',
                background: `
                linear-gradient(135deg,
                ${rankToColor(totalRank).hex()} 0%,
                #fcfbfa 20%,
                ${rankToColor(totalRank).darken(0.05).hex()} 40%,
                #fcfbfa 80%,
                ${rankToColor(totalRank).darken(0.1).hex()} 100%)
                `,
                boxShadow: `inset 0 0 10px #000000`
            }}
        >
            <div className="m-3 p-6 bg-black rounded-3xl"
                style={{
                    minHeight: 'calc(100svh - 48px)',
                    maxHeight: 'calc(100svh - 48px)',
                    overflow: 'auto',
                    background: `
                    linear-gradient(135deg,
                    ${rankToColor(totalRank).darken(0.1).hex()} 0%,
                    ${rankToColor(totalRank).darken(0.4).hex()} 40%,
                    ${rankToColor(totalRank).darken(0.1).hex()} 100%)`,
                    boxShadow: `
                    inset 0 0 10px ${rankToColor(totalRank).darken(0.5).rgb().string()},
                    inset 0 0 20px ${rankToColor(totalRank).darken(0.5).rgb().string()},
                    `
                }}>
                <StudentName
                    firstName={studentData?.firstName || ""}
                    lastName={studentData?.lastName || ""}
                    grade={studentData?.grade || 0}
                />
                <TotalPointsRank
                    totalPoints={studentRankData?.ranks.totalPoints || 0}
                    totalRank={totalRank}
                />
                <PointCategoryTotals categories={studentRankData.ranks.pointGroupRanks} />
                <StudentCategoryTotals categories={studentRankData.ranks.studentGroupRanks} />
                <RecentPoints recentPoints={studentRankData.points} />
            </div>
        </div>
    )
}