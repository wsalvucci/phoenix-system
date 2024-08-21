"use client";

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
        </div>
    )
}