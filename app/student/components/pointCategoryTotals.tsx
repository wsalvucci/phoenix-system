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
    console.log(categories);

    return (
        <div className="mt-20">
            <div className="text-xl border-b">
                Points by Category
            </div>
            {
                categories.map((category) => {
                    console.log(category);
                    return (
                        <div
                            key={category.pointGroup.id}
                            className={`text-xl grid grid-cols-3 justify-center my-1 rounded-full ps-3`}
                            style={{
                                background: `linear-gradient(90deg, ${Color(category.pointGroup.color).fade(0.5).toString()} 0%, rgba(255,255,255,0) 100%)`
                            }}
                        >
                            <div>{category.pointGroup.name}</div>
                            <div className="flex justify-end">{category.totalPoints}</div>
                            <div className="flex justify-end">{numberToOrdinal(category.rank)}</div>
                        </div>
                    )
                })
            }
        </div>
    )
}