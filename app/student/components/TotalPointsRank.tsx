"use client";

const numberToOrdinal = (n: number) => {
    if (n === 0) return "0";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function TotalPointsRank(
    {
        totalPoints, totalRank
    }: {
        totalPoints: number,
        totalRank: number
    }) {
    return (
        <div>
            <div className="text-5xl flex justify-center">
                {totalPoints.toLocaleString()}pts
            </div>
            <div className="text-3xl flex justify-center">
                {numberToOrdinal(totalRank || 0)}
            </div>
        </div>
    )
}