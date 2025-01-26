"use client";

const numberToOrdinal = (n: number) => {
    if (n === 0) return "0";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function StudentName(
    {
        firstName, lastName, grade, totalPoints, totalRank, opacity
    }: {
        firstName: string,
        lastName: string,
        grade: number,
        totalPoints: number,
        totalRank: number,
        opacity: number
    }
) {
    return (
        <div className="px-8 grid grid-cols-2 py-2 mb-10" style={{
            gridTemplateColumns: "3fr 1fr"
        }}>
            <div>
                <div className="text-xxl flex justify-start">
                    {firstName} {lastName}
                </div>
                <div className="text-lg flex justify-start">
                    {numberToOrdinal(grade)} Grade
                </div>
            </div>
            <div style={{
                opacity: opacity
            }}>
                <div className="text-xl flex justify-end">
                    {totalPoints.toLocaleString()}pts
                </div>
                <div className="text-lg flex justify-end">
                    {numberToOrdinal(totalRank)}
                </div>
            </div>
        </div>
    )
}