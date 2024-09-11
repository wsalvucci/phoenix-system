"use client";

import { customMetalStyle, rankToColor } from "@/app/dataClasses";
import Color from "color"

const numberToOrdinal = (n: number) => {
    if (n === 0) return "0";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function StudentCategoryTotals(
    {
        totalRank,
        categories,
        grade
    }: {
        totalRank: number,
        categories: {
            studentGroup: {
                id: number;
                name: string;
            };
            totalPoints: number;
            rank: number;
        }[],
        grade: {
            grade: number;
            rank: number;
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
                    borderBottom: `1px solid ${rankToColor(totalRank).toString()}`,
                    gridTemplateColumns: `3fr 1fr`
                }}
            >
                <div className="flex justify-start" style={
                    customMetalStyle(rankToColor(totalRank).toString())
                    }>
                        {numberToOrdinal(grade.grade) + ' Grade'}
                </div>
                <div className="flex justify-start" style={
                    customMetalStyle(rankToColor(totalRank).toString())
                    }>
                        {numberToOrdinal(grade.rank)}
                </div>
            </div>
            {
                categories.map((category) => {
                    return (
                        <div
                            key={category.studentGroup.id}
                            className={`text-xl grid justify-center my-1 rounded-full ps-3`}
                            style={{
                                borderBottom: `1px solid ${rankToColor(totalRank).toString()}`,
                                gridTemplateColumns: `3fr 1fr`
                            }}
                        >
                            <div className="flex justify-center">{category.studentGroup.name}</div>
                            <div className="flex justify-center">{numberToOrdinal(category.rank)}</div>
                        </div>
                    )
                })
            }
        </div>
    )
}