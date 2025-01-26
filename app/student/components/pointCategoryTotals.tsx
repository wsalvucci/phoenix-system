"use client";

import { customMetalStyle, metalStyleGradient, metalTextStyle, rankToBackgroundColor, rankToColor } from "@/app/dataClasses";
import Color from "color"

const numberToOrdinal = (n: number) => {
    if (n === 0) return "0";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function PointCategoryTotals(
    {
        studentId, totalRank, categories
    }: {
        studentId: number,
        totalRank: number,
        categories: {
            pointGroup: {
                id: number;
                name: string;
                color: string;
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
    }
) {

    return (
        <div>
            <div className="text-3xl border-b flex justify-start" style={
                customMetalStyle(rankToColor(totalRank).toString())
            }>
                CATEGORIES
            </div>
            {
                (() => {
                    const organizedCategories = categories.sort((a, b) => b.totalPoints - a.totalPoints);
                    const totalPoints = organizedCategories.reduce((acc, category) => acc + category.totalPoints, 0);
                    const percentages = organizedCategories.map(category => category.totalPoints / totalPoints);
                    const colors = organizedCategories.map(category => category.pointGroup.color);
                    return (
                        <div className="grid rounded-full text-xl my-1 px-3" style={{

                            // Hard 0% stop between each color
                            backgroundImage: metalStyleGradient(categories.reduce((acc, category, index) => {
                                const color = Color(category.pointGroup.color).lighten(0.95);
                                const percent = category.totalPoints / totalPoints;
                                acc.push({
                                    color: color.hex(),
                                    percent: acc[acc.length - 1]?.percent || 0
                                })
                                acc.push({
                                    color: color.hex(),
                                    percent: index == categories.length - 1 ? 100 : acc[acc.length - 1].percent + (percent * 100)
                                })
                                return acc;
                            }, [] as { color: string, percent: number }[])),
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            gridTemplateColumns: percentages.map(percent => `${percent * 100}%`).join(" ")
                        }}>
                            {
                                organizedCategories.map((category, index) => {
                                    return (
                                        <div key={category.pointGroup.id} className="text-sm text-center">
                                            {category.totalPoints / totalPoints >= 0.05 && <div>{Math.round(category.totalPoints / totalPoints * 100)}%</div>}
                                        </div>
                                    )
                                })
                            }
                        </div>
                    )
                })()
            }
            {
                categories.map((category) => {
                    return (
                        <div className="py-3">
                        <div
                            key={category.pointGroup.id}
                            className={`text-xl grid justify-center my-1 ps-3`}
                            style={{
                                borderLeft: `1px solid ${category.pointGroup.color}`,
                                borderBottom: `1px solid ${rankToColor(totalRank).toString()}`,
                                gridTemplateColumns: `2fr 1fr 1fr`
                            }}
                        >
                            <div style={
                                customMetalStyle(rankToColor(totalRank).toString())
                            }>{category.pointGroup.name.toLocaleUpperCase()}</div>
                            <div className="flex justify-end" style={
                                customMetalStyle(rankToColor(totalRank).toString())
                            }>{category.totalPoints}pts</div>
                            <div className="flex justify-end" style={
                                customMetalStyle(rankToColor(totalRank).toString())
                            }>{numberToOrdinal(category.rank)}</div>
                        </div>
                        <div>
                            {
                                category.nearbyStudents.map((student) => {
                                    return (
                                        <div
                                            key={student.studentId}
                                            className={`text-sm grid justify-center py-1 ps-3`}
                                            style={{
                                                backgroundColor: student.studentId == studentId ? "#444444" : "transparent",
                                                borderBottom: `1px solid ${rankToColor(totalRank).toString()}`,
                                                gridTemplateColumns: `2fr 1fr 1fr`
                                            }}
                                        >
                                            <div style={
                                                customMetalStyle(rankToColor(totalRank).toString())
                                            }>{student.firstName} {student.lastName}</div>
                                            <div className="flex justify-end" style={
                                                customMetalStyle(rankToColor(totalRank).toString())
                                            }>{student.points}pts</div>
                                            <div className="flex justify-end" style={
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