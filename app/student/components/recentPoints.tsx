import { convertPointUsingRuleType, customMetalStyle, rankToColor, stringToRuleType } from "@/app/dataClasses";
import Color from "color";
import { DateTime } from "luxon";

export default function RecentPoints(
    {
        totalRank,
        recentPoints
    }: {
        totalRank: number,
        recentPoints: {
            id: number;
            value: number;
            date: string;
            pointEvent: {
                id: number;
                name: string;
                date: string;
                maxInput: number;
                studentGroup: {
                    id: number;
                    name: string;
                };
                pointTemplate: {
                    id: number;
                    name: string;
                    pointGroup: {
                        id: number;
                        name: string;
                        color: string;
                    };
                    pointConversionRule: {
                        pointConversionRuleType: {
                            id: number;
                            name: string;
                        };
                        ruleValue: number;
                    };
                };
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
                                    borderLeft: `3px solid ${point.pointEvent.pointTemplate.pointGroup.color}`,
                                    borderBottom: `1px solid #333`
                                }}
                            >
                                <div style={customMetalStyle(rankToColor(totalRank).toString())}>{point.pointEvent.name}</div>
                                <div className="grid col-span-2 grid-cols-2 gap-2 items-center" style={customMetalStyle(rankToColor(totalRank).toString())}>
                                    <div className="flex justify-end">{convertPointUsingRuleType(
                                        stringToRuleType(point.pointEvent.pointTemplate.pointConversionRule.pointConversionRuleType.name),
                                        point.pointEvent.pointTemplate.pointConversionRule.ruleValue,
                                        point.pointEvent.maxInput
                                    )}pts</div>
                                    <div className="flex justify-end">{DateTime.fromISO(point.date).toFormat("EEE MMM d")}</div>
                                </div>
                            </div>
                        )
                    })
            }
            <div className="text-xl border-b flex justify-start" style={
                customMetalStyle(rankToColor(totalRank).toString())
            }>
                RECENT
            </div>
            {
                recentPoints
                    .sort((a, b) => DateTime.fromISO(b.date).toMillis() - DateTime.fromISO(a.date).toMillis())
                    .filter((point) => DateTime.fromISO(point.date) < DateTime.now())
                    .slice(0, 7)
                    .map((point) => {
                        return (
                            <div
                                key={point.id}
                                className={`grid grid-cols-3 justify-center my-1 ps-3`}
                                style={{
                                    borderLeft: `3px solid ${point.pointEvent.pointTemplate.pointGroup.color}`,
                                    borderBottom: `1px solid #333`
                                }}
                            >
                                <div style={customMetalStyle(rankToColor(totalRank).toString())}>{point.pointEvent.name}</div>
                                <div className="grid col-span-2 grid-cols-2 gap-2 items-center" style={customMetalStyle(rankToColor(totalRank).toString())}>
                                    <div className="flex justify-end">{point.value}pts</div>
                                    <div className="flex justify-end">{DateTime.fromISO(point.date).toFormat("EEE MMM d")}</div>
                                </div>
                            </div>
                        )
                    })
            }
        </div>
    )
}