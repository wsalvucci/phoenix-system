import Color from "color";
import { DateTime } from "luxon";

export default function RecentPoints(
    {
        recentPoints
    }: {
        recentPoints: {
            id: number;
            value: number;
            date: string;
            pointEvent: {
                id: number;
                name: string;
                date: string;
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
                };
            };
        }[]
    }
) {
    console.log(recentPoints);

    return (
        <div className="mt-20">
            <div className="text-xl border-b">
                Recent Points
            </div>
            {
                recentPoints
                    .sort((a, b) => DateTime.fromISO(b.date).toMillis() - DateTime.fromISO(a.date).toMillis())
                    .map((point) => {
                        console.log(point);
                        return (
                            <div
                                key={point.id}
                                className={`text-lg grid grid-cols-2 justify-center my-1 ps-1`}
                                style={{
                                    borderLeft: `3px solid ${point.pointEvent.pointTemplate.pointGroup.color}`
                                }}
                            >
                                <div>{point.pointEvent.pointTemplate.name}</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex justify-end">{point.value}pts</div>
                                    <div className="flex justify-end">{DateTime.fromISO(point.date).toFormat("MMM d")}</div>
                                </div>
                            </div>
                        )
                    })
            }
        </div>
    )
}