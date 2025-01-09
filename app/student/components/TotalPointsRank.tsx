"use client";

import { metalStyle, metalTextShadow, metalTextStyle, rankToColor } from "@/app/dataClasses";
import Color from "color";

const numberToOrdinal = (n: number) => {
    if (n === 0) return "0";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function TotalPointsRank(
    {
        fullName, totalPoints, totalRank
    }: {
        fullName: string,
        totalPoints: number,
        totalRank: number
    }) {
    return (
        <div className="pt-10 pb-20">
            <div
                className={`text-5xl`}
                style={{
                    backgroundImage: metalTextStyle(rankToColor(totalRank).toString()),
                    backgroundSize: 'cover',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    //WebkitTextStroke: 'thin ' + rankToColor(totalRank).darken(0.5).toString()
                }}>
                {fullName.toLocaleUpperCase()}
            </div>
            <div className="text-4xl flex justify-between">
                <div style={{
                    backgroundImage: metalTextStyle(rankToColor(totalRank).toString()),
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    //WebkitTextStroke: 'thin ' + rankToColor(totalRank).darken(0.5).toString()
                }}>
                    {totalPoints.toLocaleString()} PTS
                </div>
                <div style={{
                    backgroundImage: metalTextStyle(rankToColor(totalRank).toString()),
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    //WebkitTextStroke: 'thin ' + rankToColor(totalRank).darken(0.5).toString()
                }}>
                    {numberToOrdinal(totalRank || 0)}
                </div>
            </div>
        </div>
    )
}