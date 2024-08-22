import { convertPointUsingRuleType, GlobalDashboardData, metalStyle, metalStyleGradient, rankToColor, stringToRuleType } from "@/app/dataClasses";
import { getGlobalDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import Color from "color";
import { DateTime } from "luxon";
import { Quicksand } from "next/font/google";
const Quote = require("inspirational-quotes");

const quicksand = Quicksand({
    weight: "700",
    subsets: ["latin"]
});

export default async function GlobalDashboard() {

    const globalDashData: GlobalDashboardData = await getGlobalDashData(12);

    const StudentDashTile = ({
        rank,
        pointGroup,
    }: {
        rank: number,
        pointGroup: number | null,
    }) => {
        if (pointGroup !== null) {
            if (globalDashData.topStudents.topByPointGroup[pointGroup]?.topStudents[rank] === undefined) { return <div className="border"></div> }
            return (
                <div className="border grid px-1 text-sm" style={{
                    background: metalStyle(rankToColor(rank + 1).toString()),
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                    gridTemplateColumns: "2fr 1fr"
                }}>
                    <div className="flex justify-start place-items-center">
                        {globalDashData.topStudents.topByPointGroup[pointGroup]?.topStudents[rank]?.firstName + " " + globalDashData.topStudents.topByPointGroup[pointGroup]?.topStudents[rank]?.lastName}
                    </div>
                    <div className="flex justify-end place-items-center">
                        {globalDashData.topStudents.topByPointGroup[pointGroup]?.topStudents[rank]?.totalPoints.toLocaleString()}pts
                    </div>
                </div>
            )
        } else {
            if (globalDashData.topStudents.topOverall[rank] === undefined) { return <div className="border"></div> }
            return (
                <div className="border grid px-1 text-sm" style={{
                    background: metalStyle(rankToColor(rank + 1).toString()),
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                    gridTemplateColumns: "2fr 1fr"
                }}>
                    <div className="flex justify-start place-items-center">
                        {globalDashData.topStudents.topOverall[rank]?.firstName + " " + globalDashData.topStudents.topOverall[rank]?.lastName}
                    </div>
                    <div className="flex justify-end place-items-center">
                        {globalDashData.topStudents.topOverall[rank]?.totalPoints.toLocaleString()}pts
                    </div>
                </div>)
        }
    }

    const summerImage = "https://cdn.midjourney.com/25cb2c71-19ba-4df8-b4ce-87fd9c61c400/0_0.png"
    const autumnImage = "https://cdn.midjourney.com/9238d38f-7e5d-404a-8348-94aa6862e583/0_1.png"
    const halloweenImage = "https://cdn.midjourney.com/dcff86bf-6e0a-490c-8d9a-dabf8b57bebd/0_2.png"
    const thanksgivingImage = "https://cdn.midjourney.com/d8260d25-7f96-48b6-82c8-10adf86793b4/0_2.png"

    return (
        <div className={`grid gap-1 w-full min-h-screen max-h-screen overflow-clip ${quicksand.className}`} style={{
            gridTemplateColumns: "1fr 4fr 1fr",
            background: `linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url('${summerImage}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
        }}>
            <div className="border rounded-xl p-5 overflow-auto">
                <div className="text-2xl border-b mb-1 flex justify-center">Upcoming</div>
                <div className="grid grid-cols-1 gap-1">
                    {
                        globalDashData.pointEvents
                            .filter(event => DateTime.fromISO(event.date) > DateTime.now())
                            .sort((a, b) => DateTime.fromISO(a.date).toUnixInteger() - DateTime.fromISO(b.date).toUnixInteger())
                            .map(event => (
                                <div key={event.id} className="p-2" style={{
                                    background: metalStyle(event.pointGroup.color),
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                }}>
                                    <div className="grid grid-cols-2">
                                        <div>
                                            <div className="text-2xl">{event.name}</div>

                                            <div className="text-lg flex">{event.pointGroup.name}</div>
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
                <div className="grid grid-cols-2 gap-10 mb-5">
                    <div>
                        <div className="text-2xl">Total Points Scored This Year</div>
                        <div className="p-4 border flex justify-end" style={{
                            fontSize: "7rem",
                            lineHeight: "5.5rem",
                            background: metalStyle(`#000`),
                            backgroundSize: "cover",
                            backgroundPosition: "center",
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
                    </div>
                </div>
                <div>
                    <div className="text-2xl flex justify-center border-b mb-1">Top Groups</div>
                    {
                        globalDashData.rankingGroups.map((rankingGroup, index) => (
                            <div key={rankingGroup.id} className="grid grid-cols-6 px-1 my-1 gap-1">
                                <div className="flex justify-center place-items-center text-2xl" style={{
                                    background: metalStyle('#000'),
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                }}>
                                    {rankingGroup.name}
                                </div>
                                {
                                    rankingGroup.studentGroups.sort((a, b) =>
                                        (b.totalPoints / b.students.length) - (a.totalPoints / a.students.length)
                                    )
                                        .slice(0, 5)
                                        .map((studentGroup, rankIndex) => (
                                            <div key={studentGroup.id} className="grid grid-cols-1 place-items-center" style={{
                                                background: metalStyle(rankToColor(rankIndex + 1).toString()),
                                                backgroundSize: "cover",
                                                backgroundPosition: "center",
                                                backgroundPositionX: `${(Math.random() * 20) - 40}em`,
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
                                                                return topStudent ? topStudent.firstName + " " + topStudent.lastName + " " + topStudent.totalPoints.toLocaleString() + "pts" : ""
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
                    <div className={`grid grid-cols-${globalDashData.totals.allTime.totalPointsByPointGroup.length + 1} gap-1`}>
                        <div className="border px-1 flex justify-center" style={{
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
                        }}>Overall</div>
                        {
                            globalDashData.totals.allTime.totalPointsByPointGroup.map(pointGroup => (
                                <div key={pointGroup.id} className="border px-1 flex justify-center text-sm" style={{
                                    background: metalStyle(pointGroup.color),
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                }}>{pointGroup.name}</div>
                            ))
                        }
                        {
                            [...Array(10)].map((_, index) => (
                                <>
                                    <StudentDashTile key={index} rank={index} pointGroup={null} />
                                    {
                                        globalDashData.totals.allTime.totalPointsByPointGroup.map(pointGroup => (
                                            <StudentDashTile key={pointGroup.id + ":" + index} rank={index} pointGroup={pointGroup.id} />
                                        ))
                                    }
                                </>
                            ))
                        }
                    </div>
                </div>
                <div>
                    <div className="grid my-5 gap-1" style={{
                        gridTemplateColumns: `repeat(${globalDashData.topStudents.topByGrade.length}, 1fr)`
                    }}>
                        {
                            globalDashData.topStudents.topByGrade.map(grade => (
                                <div key={grade.grade} className="text-2xl flex justify-center">Grade {grade.grade}</div>
                            ))
                        }
                        {
                            [...Array(10)].map((_, index) => (
                                globalDashData.topStudents.topByGrade.map(grade => (
                                    grade.topStudents[index] ? <div key={grade + ":" + index} className="border grid px-1 text-sm" style={{
                                        background: metalStyle(rankToColor(index + 1).toString()),
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                        backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                        gridTemplateColumns: "2fr 1fr"
                                    }}>
                                        <div className="flex justify-start place-items-center">
                                            {grade.topStudents[index]?.firstName + " " + grade.topStudents[index]?.lastName}
                                        </div>
                                        <div className="flex justify-end place-items-center">
                                            {grade.topStudents[index]?.totalPoints.toLocaleString()}pts
                                        </div>
                                    </div> : <div key={grade + ":" + index} className="border"></div>
                                ))
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
                        globalDashData.topStudents.topTrending.map(student => (
                            <div key={student.id} className="border grid px-1 my-2" style={{
                                background: metalStyle('#000'),
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                gridTemplateColumns: "3fr 1fr"
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