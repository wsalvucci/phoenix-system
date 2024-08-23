"use client";

import { metalStyleGradient } from "@/app/dataClasses";
import Color from "color"

const numberToOrdinal = (n: number) => {
    if (n === 0) return "0";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function PointCategoryTotals(
    {
        categories
    }: {
        categories: {
            pointGroup: {
                id: number;
                name: string;
                color: string;
            };
            totalPoints: number;
            rank: number;
        }[]
    }
) {

    return (
        <div className="mt-20">
            <div className="text-xl border-b flex justify-center">
                Points by Category
            </div>
            {
                categories.map((category) => {
                    return (
                        <div
                            key={category.pointGroup.id}
                            className={`text-xl grid grid-cols-3 justify-center my-1 ps-3`}
                            style={{
                                borderLeft: `1px solid ${category.pointGroup.color}`,
                                background: `linear-gradient(
                                    90deg,
                                    rgba(0, 0, 0, 0) 0%,
                                    rgba(0, 0, 0, 0.25) 25%,
                                    rgba(0, 0, 0, 0.25) 75%,
                                    rgba(0, 0, 0, 0) 100%
                                    )`
                            }}
                        >
                            <div>{category.pointGroup.name}</div>
                            <div className="flex justify-end">{category.totalPoints}pts</div>
                            <div className="flex justify-end">{numberToOrdinal(category.rank)}</div>
                        </div>
                    )
                })
            }
            {
                (() => {
                    const organizedCategories = categories.sort((a, b) => b.totalPoints - a.totalPoints);
                    const totalPoints = organizedCategories.reduce((acc, category) => acc + category.totalPoints, 0);
                    console.log(totalPoints);
                    const percentages = organizedCategories.map(category => category.totalPoints / totalPoints);
                    const colors = organizedCategories.map(category => category.pointGroup.color);
                    console.log(categories.reduce((acc, category) => {
                        const color = Color(category.pointGroup.color);
                        const percent = category.totalPoints / totalPoints;
                        acc.push({
                            color: color.hex(),
                            percent: acc[acc.length - 1]?.percent || 0
                        })
                        acc.push({
                            color: color.hex(),
                            percent: acc[acc.length - 1].percent + (percent * 100)
                        })
                        return acc;
                    }, [] as { color: string, percent: number }[]))
                    return (
                        <div className="grid rounded-full text-xl my-1 px-3" style={{

                            // Hard 0% stop between each color
                            background: metalStyleGradient(categories.reduce((acc, category, index) => {
                                const color = Color(category.pointGroup.color);
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
        </div>
    )
}