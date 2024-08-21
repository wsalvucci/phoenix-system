import { convertPointUsingRuleType, GlobalDashboardData, rankToColor, stringToRuleType } from "@/app/dataClasses";
import { getGlobalDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import Color from "color";
import { DateTime } from "luxon";
import { Quicksand } from "next/font/google";

const quicksand = Quicksand({
    weight: "400",
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
                <div className="border grid" style={{
                    backgroundColor: rankToColor(rank + 1).darken(0.75).rgb().string(),
                    gridTemplateColumns: "2fr 1fr"
                }}>
                    <div className="flex justify-start">
                        {globalDashData.topStudents.topByPointGroup[pointGroup]?.topStudents[rank]?.firstName + " " + globalDashData.topStudents.topByPointGroup[pointGroup]?.topStudents[rank]?.lastName}
                    </div>
                    <div className="flex justify-end">
                        {globalDashData.topStudents.topByPointGroup[pointGroup]?.topStudents[rank]?.totalPoints.toLocaleString()}pts
                    </div>
                </div>
            )
        } else {
            if (globalDashData.topStudents.topOverall[rank] === undefined) { return <div className="border"></div> }
            return (
                <div className="rounded-sm border grid px-1" style={{
                    backgroundColor: rankToColor(rank + 1).darken(0.75).rgb().string(),
                    gridTemplateColumns: "2fr 1fr"
                }}>
                    <div>
                        {globalDashData.topStudents.topOverall[rank]?.firstName + " " + globalDashData.topStudents.topOverall[rank]?.lastName}
                    </div>
                    <div className="flex justify-end">
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
            background: `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url('${thanksgivingImage}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
        }}>
            <div className="border rounded-xl p-5 overflow-auto">
                <div className="text-2xl border-b mb-1">Upcoming</div>
                <div className="grid grid-cols-1 gap-1 overflow-y-scroll">
                    {
                        globalDashData.pointEvents
                            .filter(event => DateTime.fromISO(event.date) > DateTime.now())
                            .sort((a, b) => DateTime.fromISO(a.date).toUnixInteger() - DateTime.fromISO(b.date).toUnixInteger())
                            .map(event => (
                                <div key={event.id} className="rounded-xl p-2" style={{
                                    backgroundColor: Color(event.pointGroup.color).darken(0.75).string()
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
                <div className="grid grid-cols-2 gap-1">
                    <div>
                        <div className="text-2xl">Total Points</div>
                        <div style={{
                            fontSize: "7rem",
                            lineHeight: "5.5rem"
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
                    <div className="text-2xl flex justify-center border-b mb-1">Top Students</div>
                    <div className={`grid grid-cols-${globalDashData.totals.allTime.totalPointsByPointGroup.length + 1} gap-1`}>
                        <div className="border px-1 flex justify-center">Overall</div>
                        {
                            globalDashData.totals.allTime.totalPointsByPointGroup.map(pointGroup => (
                                <div key={pointGroup.id} className="border px-1 flex justify-center" style={{
                                    backgroundColor: Color(pointGroup.color).darken(0.75).string(),
                                }}>{pointGroup.name}</div>
                            ))
                        }
                        <StudentDashTile rank={0} pointGroup={null} />
                        {
                            globalDashData.totals.allTime.totalPointsByPointGroup.map(pointGroup => (
                                <StudentDashTile key={pointGroup.id} rank={0} pointGroup={pointGroup.id} />
                            ))
                        }
                        <StudentDashTile rank={1} pointGroup={null} />
                        {
                            globalDashData.totals.allTime.totalPointsByPointGroup.map(pointGroup => (
                                <StudentDashTile key={pointGroup.id} rank={1} pointGroup={pointGroup.id} />
                            ))
                        }
                        <StudentDashTile rank={2} pointGroup={null} />
                        {
                            globalDashData.totals.allTime.totalPointsByPointGroup.map(pointGroup => (
                                <StudentDashTile key={pointGroup.id} rank={2} pointGroup={pointGroup.id} />
                            ))
                        }
                        <StudentDashTile rank={3} pointGroup={null} />
                        {
                            globalDashData.totals.allTime.totalPointsByPointGroup.map(pointGroup => (
                                <StudentDashTile key={pointGroup.id} rank={3} pointGroup={pointGroup.id} />
                            ))
                        }
                        <StudentDashTile rank={4} pointGroup={null} />
                        {
                            globalDashData.totals.allTime.totalPointsByPointGroup.map(pointGroup => (
                                <StudentDashTile key={pointGroup.id} rank={4} pointGroup={pointGroup.id} />
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
                            [...Array(5)].map((_, index) => (
                                globalDashData.topStudents.topByGrade.map(grade => (
                                    grade.topStudents[index] ? <div key={grade + ":" + index} className="rounded-sm border grid px-1" style={{
                                        backgroundColor: rankToColor(index + 1).darken(0.75).rgb().string(),
                                        gridTemplateColumns: "2fr 1fr"
                                    }}>
                                        <div className="flex justify-start">
                                            {grade.topStudents[index]?.firstName + " " + grade.topStudents[index]?.lastName}
                                        </div>
                                        <div className="flex justify-end">
                                            {grade.topStudents[index]?.totalPoints.toLocaleString()}pts
                                        </div>
                                    </div> : <div key={grade + ":" + index} className="border"></div>
                                ))
                            ))
                        }
                    </div>
                </div>
                <div>
                    <div className="text-2xl flex justify-center border-b mb-1">Top Groups</div>
                </div>
            </div>
            <div className="border rounded-xl"></div>
        </div>
    );
}