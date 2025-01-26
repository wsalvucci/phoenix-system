"use client";

import { customMetalStyle, rankToColor } from "@/app/dataClasses";
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

export default function StudentCategoryTotals(
    {
        studentId,
        totalRank,
        categories,
        grade
    }: {
        studentId: number,
        totalRank: number,
        categories: {
            studentGroup: {
                id: number;
                name: string;
            };
            totalPoints: number;
            rank: number;
            nearbyStudents: {
                studentId: number;
                firstName: string;
                lastName: string;
                points: number;
                rank: number;
            }[];
        }[],
        grade: {
            grade: number;
            rank: number;
            nearbyStudents: {
                studentId: number;
                firstName: string;
                lastName: string;
                points: number;
                rank: number;
            }[];
        }
    }
) {

    return (
        <div className="mt-20">
            <div className="text-3xl border-b flex justify-start" style={
                customMetalStyle(rankToColor(totalRank).toString())
            }>
                GROUPS
            </div>
            <div
                className={`text-xl grid justify-center my-1 ps-3`}
                style={{
                    borderLeft: `1px solid ${rankToColor(totalRank).toString()}`,
                    gridTemplateColumns: `3fr`
                }}
            >
                <div className="flex justify-start" style={
                    customMetalStyle(rankToColor(totalRank).toString())
                }>
                    {numberToOrdinal(grade.grade) + ' Grade'}
                </div>
            </div>
            <div>
                {
                    grade.nearbyStudents.map((student) => {
                        return (
                            <div
                                key={student.studentId}
                                className={`text-sm grid justify-center py-1 ps-3`}
                                style={{
                                    backgroundColor: student.studentId === studentId ? "#444444" : "transparent",
                                    gridTemplateColumns: `2fr 1fr 1fr`
                                }}
                            >
                                <div style={
                                    customMetalStyle(rankToColor(totalRank).toString())
                                }>{student.firstName} {student.lastName}</div>
                                <div className={`flex justify-end ${azeret.className}`} style={
                                    customMetalStyle(rankToColor(totalRank).toString())
                                }>{student.points}</div>
                                <div className={`flex justify-end ${azeret.className}`} style={
                                    customMetalStyle(rankToColor(totalRank).toString())
                                }>{numberToOrdinal(student.rank)}</div>
                            </div>
                        )
                    })
                }
            </div>
            {
                categories.map((category) => {
                    return (
                        <div
                        className="py-3"
                            key={category.studentGroup.id}
                        >
                        <div
                            className={`text-xl grid justify-center my-1 ps-3`}
                            style={{
                                borderLeft: `1px solid ${rankToColor(totalRank).toString()}`,
                                gridTemplateColumns: `3fr`
                            }}>
                            <div className="flex justify-start" style={
                                customMetalStyle(rankToColor(totalRank).toString())
                            }>{category.studentGroup.name}</div>
                        </div>
                        <div>
                            {
                                category.nearbyStudents.map((student) => {
                                    return (
                                        <div
                                            key={student.studentId}
                                            className={`text-sm grid justify-center py-1 ps-3`}
                                            style={{
                                                backgroundColor: student.studentId === studentId ? "#444444" : "transparent",
                                                gridTemplateColumns: `2fr 1fr 1fr`
                                            }}
                                        >
                                            <div style={
                                                customMetalStyle(rankToColor(totalRank).toString())
                                            }>{student.firstName} {student.lastName}</div>
                                            <div className={`flex justify-end ${azeret.className}`} style={
                                                customMetalStyle(rankToColor(totalRank).toString())
                                            }>{student.points.toLocaleString()}</div>
                                            <div className={`flex justify-end ${azeret.className}`} style={
                                                customMetalStyle(rankToColor(totalRank).toString())
                                            }>{numberToOrdinal(student.rank)}</div>
                                        </div>
                                    )
                                })
                            }
                        </div>
                        </div>

                    )
                })
            }
        </div>
    )
}