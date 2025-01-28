import { convertPointUsingRuleType, customMetalStyle, numberToOrdinal, rankToColor, stringToRuleType } from "@/app/dataClasses";
import Color from "color";
import { DateTime } from "luxon";
import { Azeret_Mono } from "next/font/google";

const azeret = Azeret_Mono({
    weight: "500",
    subsets: ["latin"]
});

export default function RecentPoints(
    {
        totalRank,
        recentPoints
    }: {
        totalRank: number,
        recentPoints: {
            id: number;
            name: string;
            date: string;
            maxPoints: number;
            points: number;
            rank: number;
            outOf: number;
            pointGroup: {
                id: number;
                name: string;
                color: string;
            };
        }[]
    }
) {

    return (
        <div className="mt-20">
            <div className="text-xl border-b flex justify-start" style={
                customMetalStyle(rankToColor(totalRank).toString())
            }>
                UPCOMING
            </div>
            {
                recentPoints
                    .sort((a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis())
                    .filter((point) => DateTime.fromISO(point.date) > DateTime.now())
                    .slice(0, 7)
                    .map((point) => {
                        return (
                            <div
                                key={point.id}
                                className={`grid grid-cols-3 justify-center my-1 ps-3`}
                                style={{
                                    borderLeft: `3px solid ${point.pointGroup.color}`,
                                    borderBottom: `1px solid #333`
                                }}
                            >
                                <div style={customMetalStyle(rankToColor(totalRank).toString())}>{point.name}</div>
                                <div className="grid col-span-2 grid-cols-2 gap-2 items-center" style={customMetalStyle(rankToColor(totalRank).toString())}>
                                    <div className={`flex justify-end ${azeret.className}`}>{point.points.toLocaleString()} / {point.maxPoints.toLocaleString()}</div>
                                    <div className={`flex justify-end`}>{DateTime.fromISO(point.date).toFormat("EEE MMM d")}</div>
                                </div>
                            </div>
                        )
                    })
            }
            <div className="text-xl border-b flex justify-start" style={
                customMetalStyle(rankToColor(totalRank).toString())
            }>
                PREVIOUS
            </div>
            {
                recentPoints
                    .sort((a, b) => DateTime.fromISO(b.date).toMillis() - DateTime.fromISO(a.date).toMillis())
                    .filter((point) => DateTime.fromISO(point.date) < DateTime.now())
                    .map((point) => {
                        return (
                            <div
                                key={point.id}
                                className={`justify-center my-2 ps-3`}
                                style={{
                                    borderLeft: `3px solid ${point.pointGroup.color}`,
                                    borderBottom: `1px solid #333`
                                }}
                            >
                                <div className="flex justify-between" style={customMetalStyle(rankToColor(totalRank).toString())}>
                                    <div className={`flex justify-end`}>{point.name}</div>
                                    <div className={`flex ${azeret.className}`}>
                                        {point.points.toLocaleString()}<span style={customMetalStyle('#222')}>/{point.maxPoints.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between" style={customMetalStyle(rankToColor(totalRank).toString())}>
                                    <div className={`flex justify-end`}>{DateTime.fromISO(point.date).toFormat("EEE MMM d")}</div>
                                    <div className={`flex ${azeret.className}`}>
                                        <div>{point.points !== 0 ? numberToOrdinal(point.rank) : "-"}<span style={customMetalStyle('#222')}>/{point.outOf}</span></div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
            }
        </div>
    )
}