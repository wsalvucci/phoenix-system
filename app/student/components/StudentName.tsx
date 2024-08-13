"use client";

const numberToOrdinal = (n: number) => {
    if (n === 0) return "0";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function StudentName(
    {
        firstName, lastName, grade
    }: {
        firstName: string,
        lastName: string,
        grade: number
    }
) {
    return (
        <div>
            <div className="text-2xl flex justify-center">
                {firstName} {lastName}
            </div>
            <div className="text-xl flex justify-center mb-10">
                {numberToOrdinal(grade)} Grade
            </div>
        </div>
    )
}