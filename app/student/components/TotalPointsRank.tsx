"use client";

import { customMetalStyle, rankToColor } from "@/app/dataClasses";
import Color from "color";
import { Azeret_Mono } from "next/font/google";

const azeret = Azeret_Mono({
    weight: "500",
    subsets: ["latin"]
});

const numberToOrdinal = (n: number) => {
    if (n === 0) return "0";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function TotalPointsRank(
    {
        studentId,
        studentName,
        totalPoints,
        totalRank,
        byPointGroup,
        nearbyStudents
    }: {
        studentId: number,
        studentName: string,
        totalPoints: number,
        totalRank: number,
        byPointGroup: {
            id: number,
            name: string,
            color: string,
            points: number,
        }[]
        nearbyStudents: {
            studentId: number,
            firstName: string,
            lastName: string,
            totalPoints: number,
            rank: number,
        }[]
    }) {

    const rankColor = rankToColor(totalRank);
    const rankColorIsDark = rankColor.darken(0.25).isDark();
    const textColor = rankColorIsDark ? "#FFF" : "#000";

    return (
        <div className="pb-20">
            <div className="rounded-3xl p-3" style={{
                background: `radial-gradient(ellipse at top, ${rankColor.lighten(0.25).toString()} 0%, ${rankColor.toString()} 50%, ${rankColor.darken(0.25).toString()} 100%)`,
                // background: `linear-gradient(180deg, ${rankColor.darken(0.25).toString()} 0%, ${rankColor.lighten(0.25).toString()} 75%, ${rankColor.lighten(0.9).toString()} 100%)`,
                border: `2px solid rgba(255, 255, 255, 0.3)`,
                borderBottom: `1px solid ${rankColor.darken(0.5).rgb().string()}`
            }}>
                <div className="flex justify-between">
                    <div className="text-lg" style={{color: textColor}}>
                        {studentName}
                    </div>
                    <div style={{color: textColor}}>
                        {numberToOrdinal(totalRank || 0)}
                    </div>
                </div>
                <div className="text-5xl" style={{color: textColor}}>
                    <span className={`${azeret.className}`} style={{
                        letterSpacing: "-0.1em"
                    }}> {totalPoints.toLocaleString()}</span> <span className="text-lg">PTS</span>
                </div>
                <div>
                    {
                        byPointGroup.map((pointGroup, index) => {
                            return (
                                <div key={pointGroup.id} className="flex justify-between text-md" style={{
                                    color: rankColorIsDark ? Color(pointGroup.color).lighten(0.75).toString() : Color(pointGroup.color).darken(0.75).toString(),
                                    textShadow: `0 0 0px ${rankColorIsDark ? "#000" : "#FFF"}`,
                    }}>
                                    <div>{pointGroup.name}</div>
                                    <div className={`${azeret.className}`}>{pointGroup.points.toLocaleString()}</div>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
            <div>
                <div className="py-3">
                    <div
                        className={`text-xl grid justify-center my-1 ps-3`}
                        style={{
                            borderLeft: `1px solid ${rankToColor(totalRank).toString()}`,
                            gridTemplateColumns: `3fr`
                        }}>
                        <div className="flex justify-start" style={
                            customMetalStyle(rankToColor(totalRank).toString())
                        }>OVERALL</div>
                    </div>
                    {
                        nearbyStudents.map((student, index) => {
                            return (
                                <div key={student.studentId} className="grid grid-cols-3 text-sm ps-3" style={{
                                    gridTemplateColumns: "2fr 1fr 1fr",
                                    color: rankToColor(student.rank).lighten(0.5).toString(),
                                    backgroundColor: student.studentId === studentId ? "#444444" : "transparent",
                                }}>
                                    <div className="flex justify-start">
                                        {student.firstName} {student.lastName}
                                    </div>
                                    <div className={`flex justify-end ${azeret.className}`}>
                                        {student.totalPoints.toLocaleString()}
                                    </div>
                                    <div className={`flex justify-end ${azeret.className}`}>
                                        {numberToOrdinal(student.rank)}
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        </div>
    )
}