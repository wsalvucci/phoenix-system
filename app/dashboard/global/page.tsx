"use client";
import { convertPointUsingRuleType, GlobalDashboardData, metalStyle, metalStyleGradient, rankToColor, stringToRuleType } from "@/app/dataClasses";
import { getGlobalDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import { createClient } from "@/utils/supabase/client";
import Color from "color";
import { DateTime } from "luxon";
import { Quicksand, Russo_One, Montserrat, Staatliches } from "next/font/google";
import { useEffect, useState } from "react";
const Quote = require("inspirational-quotes");

const customFont = Quicksand({
    weight: "400",
    subsets: ["latin"]
});

const metalTextShadow = `1px 1px 2px rgba(0, 0, 0, 1),
                         -1px -1px 2px rgba(255, 255, 255, 0.2),
                         2px 2px 4px rgba(0, 0, 0, 1),
                         -2px -2px 4px rgba(255, 255, 255, 0.3)`

export default function GlobalDashboard() {

    const [globalDashData, setGlobalDashData] = useState<GlobalDashboardData | null>(null);

    const updateData = async () => {
        console.log("Updating data");
        getGlobalDashData(12).then((data) => {
            setGlobalDashData(data);
        })
    }

    const supabase = createClient();
    const broadcastChannel = supabase.channel("student-points-channel");

    broadcastChannel.on(
        'broadcast',
        { event: 'sync' },
        (payload) => {
            console.log('Received broadcast:', payload);
            updateData();
        }
    ).subscribe();

    useEffect(() => {
        updateData();
    }, [])

    const StudentPointTile = ({
        fullName,
        points,
        rank
    }: {
        fullName: string,
        points: number,
        rank: number
    }) => (
        <div className="text-lg border grid py-1 px-2 mx-2" style={{
            background: metalStyle(rankToColor(rank + 1).toString()),
            backgroundSize: "cover",
            backgroundPosition: "center",
            //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
            gridTemplateColumns: "2fr 1fr",
            textShadow: metalTextShadow
        }}>
            <div className="flex justify-start place-items-center" style={{
                textWrap: "nowrap"
            }}>
                {fullName}
            </div>
            <div className="flex justify-end place-items-center">
                {points?.toLocaleString()}pts
            </div>
        </div>
    )

    const summerImage = "https://cdn.midjourney.com/25cb2c71-19ba-4df8-b4ce-87fd9c61c400/0_0.png"
    const autumnImage = "https://cdn.midjourney.com/9238d38f-7e5d-404a-8348-94aa6862e583/0_1.png"
    const halloweenImage = "https://cdn.midjourney.com/dcff86bf-6e0a-490c-8d9a-dabf8b57bebd/0_2.png"
    const thanksgivingImage = "https://cdn.midjourney.com/d8260d25-7f96-48b6-82c8-10adf86793b4/0_2.png"
    const christmasImage = "https://cdn.midjourney.com/e9a1702e-8700-4256-b5de-b5c86dbd7347/0_2.png"
    const winterImage = "https://cdn.midjourney.com/7864ac3b-9750-49c4-b7b0-ffb134b73a00/0_3.png"

    const seasonalImage = (): string => {
        const currentTime = DateTime.now();
        const currentMonth = currentTime.month;
        const currentDay = currentTime.day;
        switch (currentMonth) {
            case 6:
                if (currentDay >= 21) {
                    return summerImage;
                } else {
                    return "";
                }
            case 7:
            case 8:
                return summerImage;
            case 9:
                if (currentDay < 22) {
                    return summerImage;
                } else {
                    return autumnImage;
                }
            case 10:
                if (currentDay < 24) {
                    return autumnImage;
                } else {
                    return halloweenImage;
                }
            case 11:
                if (currentDay < 15) {
                    return autumnImage;
                } else {
                    return thanksgivingImage;
                }
            case 12:
                if (currentDay < 15) {
                    return autumnImage
                } else {
                    return christmasImage;
                }
            case 1: {
                return winterImage;
            }
            default: return "";
        }
    }

    return (
        <div className={`grid gap-1 w-full min-h-screen max-h-screen overflow-clip ${customFont.className}`} style={{
            gridTemplateColumns: "1fr 4fr 1fr",
            background: `linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url('${seasonalImage()}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: "#eee"
        }}>
            <div className="border rounded-xl p-5 overflow-auto">
                <div className="text-2xl border-b mb-1 flex justify-center">Upcoming</div>
                <div className="grid grid-cols-1 gap-5">
                    {
                        globalDashData?.pointEvents
                            .filter(event => DateTime.fromISO(event.date) > DateTime.now())
                            .sort((a, b) => DateTime.fromISO(a.date).toUnixInteger() - DateTime.fromISO(b.date).toUnixInteger())
                            .map(event => (
                                <div key={event.id} className="p-2" style={{
                                    background: metalStyle(event.pointGroup.color),
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                    textShadow: metalTextShadow
                                }}>
                                    <div className="grid grid-cols-2">
                                        <div>
                                            <div className="text-2xl">{event.name}</div>
                                            <div className="text-lg">{
                                                convertPointUsingRuleType(
                                                    stringToRuleType(event.pointTemplate.conversionRuleType.name),
                                                    event.pointTemplate.conversionRuleValue,
                                                    event.maxInput
                                                )
                                            }pts</div>
                                        </div>
                                        <div className="text-lg flex justify-end place-items-center">
                                            <div className="grid grid-cols-1">
                                                {
                                                    event.date <= DateTime.now().plus({ days: 7 }).toISODate() ?

                                                        <div className="flex justify-end">
                                                            {DateTime.fromISO(event.date).toFormat('EEEE')}
                                                        </div> :
                                                        <div className="flex justify-end">
                                                            {DateTime.fromISO(event.date).toFormat('MMM d')}
                                                        </div>

                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                    }
                </div>
            </div>
            <div className="border rounded-xl p-5">
                {/* <div className="grid grid-cols-2 gap-10 mb-5">
                    <div>
                        <div className="text-2xl">Total Points Scored This Year</div>
                        <div className="p-4 border flex justify-end" style={{
                            fontSize: "7rem",
                            lineHeight: "5.5rem",
                            background: metalStyle(`#000`),
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            textShadow: metalTextShadow
                        }}>
                            {globalDashData.totals.allTime.totalPoints.toLocaleString()}
                        </div>
                    </div>
                    <div>
                        <div className="grid grid-cols-3 pb-3 gap-1">
                            <div className="grid grid-cols-1 place-items-center border-t-2">
                                <div className="text-xl">This Month</div>
                                <div className="text-2xl">
                                    {globalDashData.totals.thisMonth.totalPoints.toLocaleString()}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 place-items-center border-t-2">
                                <div className="text-xl">This Week</div>
                                <div className="text-2xl">
                                    {globalDashData.totals.thisWeek.totalPoints.toLocaleString()}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 place-items-center border-t-2">
                                <div className="text-xl">Today</div>
                                <div className="text-2xl">
                                    {globalDashData.totals.today.totalPoints.toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <div className={`grid grid-cols-${globalDashData.totals.allTime.totalPointsByPointGroup.length} gap-1`}>
                            {globalDashData.totals.allTime.totalPointsByPointGroup.map(pointGroup => (
                                <div key={pointGroup.id} className="border-t-2" style={{
                                    borderColor: pointGroup.color,
                                }}>
                                    <div className="flex justify-center text-xl">{pointGroup.name}</div>
                                    <div className="flex justify-center text-3xl">{pointGroup.totalPoints.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                        <div className="grid rounded-full border my-1" style={{
                            background: metalStyleGradient(globalDashData.totals.allTime.totalPointsByPointGroup.reduce((acc, group, index) => {
                                const color = Color(group.color);
                                const percent = group.totalPoints / globalDashData.totals.allTime.totalPoints;
                                acc.push({
                                    color: color.hex(),
                                    percent: acc[acc.length - 1]?.percent || 0
                                })
                                acc.push({
                                    color: color.hex(),
                                    percent: index === globalDashData.totals.allTime.totalPointsByPointGroup.length - 1 ? 100 : acc[acc.length - 1].percent + (percent * 100)
                                })
                                return acc;
                            }, [] as { color: string, percent: number }[])),
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            gridTemplateColumns: globalDashData.totals.allTime.totalPointsByPointGroup.map(group => `${group.totalPoints / globalDashData.totals.allTime.totalPoints * 100}%`).join(" "),
                            textShadow: metalTextShadow
                        }}>
                            {
                                globalDashData.totals.allTime.totalPointsByPointGroup.map((group, index) => {
                                    return (
                                        <div key={group.id} className="text-sm flex justify-center">
                                            {group.totalPoints / globalDashData.totals.allTime.totalPoints >= 0.05 && <div>{Math.round(group.totalPoints / globalDashData.totals.allTime.totalPoints * 100)}%</div>}
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div> */}
                <div>
                    <div className="text-2xl flex justify-center border-b mb-1">Top Groups</div>
                    {
                        globalDashData?.rankingGroups.map((rankingGroup, index) => (
                            <div key={rankingGroup.id} className="grid grid-cols-6 px-1 my-1 gap-1">
                                <div className="flex justify-center place-items-center text-2xl" style={{
                                    background: metalStyle('#000'),
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                    textShadow: metalTextShadow
                                }}>
                                    {rankingGroup.name}
                                </div>
                                {
                                    rankingGroup.studentGroups.sort((a, b) =>
                                        (b.totalPoints / b.students.length) - (a.totalPoints / a.students.length)
                                    )
                                        .slice(0, 5)
                                        .map((studentGroup, rankIndex) => (
                                            <div key={studentGroup.id} className="text-lg grid grid-cols-1 place-items-center" style={{
                                                background: metalStyle(rankToColor(rankIndex + 1).toString()),
                                                backgroundSize: "cover",
                                                backgroundPosition: "center",
                                                //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                                textShadow: metalTextShadow
                                            }}>
                                                <div>
                                                    <div className="flex justify-center">
                                                        {studentGroup.name}
                                                    </div>
                                                    <div className="flex justify-center">
                                                        {Math.round(studentGroup.totalPoints / studentGroup.students.length).toLocaleString()}pts
                                                    </div>
                                                    <div className="flex justify-center">
                                                        {
                                                            (() => {
                                                                const topStudent = studentGroup.students.sort((a, b) => b.totalPoints - a.totalPoints)[0]
                                                                return topStudent ? topStudent.firstName + " " + topStudent.lastName : ""
                                                            })()
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                }
                            </div>
                        ))
                    }
                </div>
                <div>
                    <div className="text-2xl flex justify-center border-b mb-1">Top Students</div>
                    <div className={`grid grid-cols-${(globalDashData?.totals.allTime.totalPointsByPointGroup.length ?? 0) + 1} gap-1`}>
                        <div className="text-xl border px-1 flex justify-center place-items-center" style={{
                            background: metalStyleGradient([
                                { color: '#ff0000', percent: 0 },
                                { color: '#ffa500', percent: 17 },
                                { color: '#ffff00', percent: 34 },
                                { color: '#00ff00', percent: 50 },
                                { color: '#0000ff', percent: 67 },
                                { color: '#4b0082', percent: 84 },
                                { color: '#ee82ee', percent: 100 },
                            ]),
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            textShadow: metalTextShadow
                        }}>Overall</div>
                        {
                            globalDashData?.totals.allTime.totalPointsByPointGroup.map(pointGroup => (
                                <div key={pointGroup.id} className="text-xl border px-1 flex justify-center place-items-center" style={{
                                    background: metalStyle(pointGroup.color),
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                    textShadow: metalTextShadow
                                }}>{pointGroup.name}</div>
                            ))
                        }
                        {
                            [...Array(10)].map((_, index) => (
                                <>
                                    <StudentPointTile
                                        key={index}
                                        fullName={globalDashData?.topStudents.topOverall[index]?.firstName + " " + globalDashData?.topStudents.topOverall[index]?.lastName}
                                        points={globalDashData?.topStudents.topOverall[index]?.totalPoints || 0}
                                        rank={index}
                                    />
                                    {
                                        globalDashData?.totals.allTime.totalPointsByPointGroup.map(pointGroup => {
                                            const student = globalDashData.topStudents.topByPointGroup.find(topByPointGroup => topByPointGroup.id === pointGroup.id)?.topStudents[index]
                                            return (
                                                <StudentPointTile
                                                    key={pointGroup.id + ":" + index}
                                                    fullName={student?.firstName + " " + student?.lastName}
                                                    points={student?.totalPoints || 0}
                                                    rank={index}
                                                />
                                            )
                                        })
                                    }
                                </>
                            ))
                        }
                    </div>
                </div>
                <div>
                    <div className="grid my-5 gap-1" style={{
                        gridTemplateColumns: `repeat(${globalDashData?.topStudents.topByGrade.length}, 1fr)`
                    }}>
                        {
                            globalDashData?.topStudents.topByGrade.map(grade => (
                                <div key={grade.grade} className="text-xl border flex justify-center" style={{
                                    background: metalStyle('#000'),
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                    textShadow: metalTextShadow
                                }}>Grade {grade.grade}</div>
                            ))
                        }
                        {
                            globalDashData?.topStudents.topByGrade.map(grade => (
                                <div className="grid grid-cols-1 gap-1">{
                                    [...Array(10)].map((_, index) => (
                                        <>
                                            {
                                                grade.topStudents[index] ? <StudentPointTile
                                                    key={grade.grade + ":" + index}
                                                    fullName={grade.topStudents[index]?.firstName + " " + grade.topStudents[index]?.lastName}
                                                    points={grade.topStudents[index]?.totalPoints || 0}
                                                    rank={index}
                                                /> : <div key={grade.grade + ":" + index} className="border mx-2"></div>
                                            }
                                        </>
                                    ))}
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
            <div className="border rounded-xl p-5 grid" style={{
                gridTemplateRows: "3fr 1fr",
            }}>
                <div>
                    <div className="text-2xl border-b mb-1 flex justify-center">Weekly Trends</div>
                    {
                        globalDashData?.topStudents.topTrending.map(student => (
                            <div key={student.id} className="text-lg border grid py-1 px-2 mx-2 my-1" style={{
                                background: metalStyle('#000'),
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                gridTemplateColumns: "3fr 1fr",
                                textShadow: metalTextShadow,
                                textWrap: "nowrap"
                            }}>
                                <div className="flex justify-start">
                                    {student.firstName + " " + student.lastName}
                                </div>
                                <div className="flex justify-end text-green-500">
                                    +{(student.totalPoints - student.lastWeekTotalPoints).toLocaleString()}pts
                                </div>
                            </div>
                        ))
                    }
                </div>
                <div>
                    <div className="text-2xl flex justify-center">
                        {
                            Quote.getQuote().text
                        }
                    </div>
                    <div className="text-xl flex justify-center align-middle">
                        {
                            "- " + Quote.getQuote().author
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}