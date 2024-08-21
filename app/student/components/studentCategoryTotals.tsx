"use client";

import Color from "color"

const numberToOrdinal = (n: number) => {
    if (n === 0) return "0";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function StudentCategoryTotals(
    {
        categories,
        grade
    }: {
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
            <div className="text-xl border-b flex justify-center">
                Group Rankings
            </div>
            <div
                className={`text-xl grid grid-cols-2 justify-center my-1 rounded-full ps-3`}
                style={{
                    background: `linear-gradient(
                        90deg,
                        rgba(0, 0, 0, 0) 0%,
                        rgba(0, 0, 0, 0.25) 25%,
                        rgba(0, 0, 0, 0.25) 75%,
                        rgba(0, 0, 0, 0) 100%
                        )`
                }}
            >
                <div className="flex justify-center">{numberToOrdinal(grade.grade) + ' Grade'}</div>
                <div className="flex justify-center">{numberToOrdinal(grade.rank)}</div>
            </div>
            {
                categories.map((category) => {
                    return (
                        <div
                            key={category.studentGroup.id}
                            className={`text-xl grid grid-cols-2 justify-center my-1 rounded-full ps-3`}
                            style={{
                                background: `linear-gradient(
                                    90deg,
                                    rgba(0, 0, 0, 0) 0%,
                                    rgba(0, 0, 0, 0.25) 25%,
                                    rgba(0, 0, 0, 0.25) 75%,
                                    rgba(0, 0, 0, 0) 100%
                                    )`
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