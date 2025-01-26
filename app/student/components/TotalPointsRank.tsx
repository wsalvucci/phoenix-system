"use client";

import { customMetalStyle, metalTextStyle, rankToColor } from "@/app/dataClasses";
import Color from "color";

const numberToOrdinal = (n: number) => {
    if (n === 0) return "0";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function TotalPointsRank(
    {
        studentId, totalPoints, totalRank, nearbyStudents
    }: {
        studentId: number,
        totalPoints: number,
        totalRank: number,
        nearbyStudents: {
            studentId: number,
            firstName: string,
            lastName: string,
            totalPoints: number,
            rank: number,
        }[]
    }) {
    return (
        <div className="pb-20">
            <div className="text-4xl flex justify-between" style={{
                borderBottom: `1px solid ${rankToColor(totalRank).darken(0.5).rgb().string()}`
            }}>
                <div style={customMetalStyle(rankToColor(totalRank).toString())}>
                    {totalPoints.toLocaleString()} PTS
                </div>
                <div style={customMetalStyle(rankToColor(totalRank).toString())}>
                    {numberToOrdinal(totalRank || 0)}
                </div>
            </div>
            <div>
                {
                    nearbyStudents.map((student, index) => {
                        return (
                            <div key={student.studentId} className="grid grid-cols-3 text-sm" style={{
                                gridTemplateColumns: "3fr 2fr 1fr",
                                color: rankToColor(student.rank).lighten(0.5).toString(),
                                backgroundColor: student.studentId === studentId ? "#444444" : "transparent",
                            }}>
                                <div className="flex justify-start px-2">
                                    {student.firstName} {student.lastName}
                                </div>
                                <div className="flex justify-end px-2">
                                    {student.totalPoints.toLocaleString()} pts
                                </div>
                                <div className="flex justify-end px-2">
                                    {numberToOrdinal(student.rank)}
                                </div>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}