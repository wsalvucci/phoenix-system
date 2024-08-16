"use server";

import { GlobalDashboardData, rankToColor } from "@/app/dataClasses";
import { getGlobalDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import Color from "color";
import { DateTime } from "luxon";

export default async function GlobalDashboard() {

    const globalDashData: GlobalDashboardData = await getGlobalDashData(12);

    const fakeUpcomingPointEvents = [
        {
            id: 1,
            name: "Test Event 1",
            date: DateTime.now().plus({ days: 1 }).toISODate(),
            pointGroup: "Athletics",
            color: "#FF0000",
            points: 100
        },
        {
            id: 2,
            name: "Test Event 2",
            date: DateTime.now().plus({ days: 2 }).toISODate(),
            pointGroup: "Activities",
            color: "#00FF00",
            points: 200
        },
        {
            id: 3,
            name: "Test Event 3",
            date: DateTime.now().plus({ days: 3 }).toISODate(),
            pointGroup: "Academics",
            color: "#0000FF",
            points: 300
        },
        {
            id: 4,
            name: "Test Event 4",
            date: DateTime.now().plus({ days: 4 }).toISODate(),
            pointGroup: "Athletics",
            color: "#FF0000",
            points: 400
        },
        {
            id: 5,
            name: "Test Event 5",
            date: DateTime.now().plus({ days: 5 }).toISODate(),
            pointGroup: "Activities",
            color: "#00FF00",
            points: 500
        },
        {
            id: 6,
            name: "Test Event 6",
            date: DateTime.now().plus({ days: 6 }).toISODate(),
            pointGroup: "Academics",
            color: "#0000FF",
            points: 600
        },
        {
            id: 7,
            name: "Test Event 7",
            date: DateTime.now().plus({ days: 7 }).toISODate(),
            pointGroup: "Athletics",
            color: "#FF0000",
            points: 700
        },
        {
            id: 8,
            name: "Test Event 8",
            date: DateTime.now().plus({ days: 8 }).toISODate(),
            pointGroup: "Activities",
            color: "#00FF00",
            points: 800
        },
        {
            id: 9,
            name: "Test Event 9",
            date: DateTime.now().plus({ days: 9 }).toISODate(),
            pointGroup: "Academics",
            color: "#0000FF",
            points: 900
        },
        {
            id: 10,
            name: "Test Event 10",
            date: DateTime.now().plus({ days: 10 }).toISODate(),
            pointGroup: "Athletics",
            color: "#FF0000",
            points: 1000
        }
    ]

    const StudentDashTile = ({
        rank,
        pointGroup,
    }: {
        rank: number,
        pointGroup: number | null
    }) => {
        if (pointGroup === null) {
            return (

                <div className="rounded-sm border grid grid-cols-2 px-1" style={{
                    backgroundColor: rankToColor(rank + 1).alpha(0.25).rgb().string(),
                }}>
                    <div>
                        {globalDashData.topStudents.topOverall[rank]?.firstName + " " + globalDashData.topStudents.topOverall[rank]?.lastName}
                    </div>
                    <div className="flex justify-end">
                        {globalDashData.topStudents.topOverall[rank]?.totalPoints.toLocaleString()}pts
                    </div>
                </div>)
        } else {
            return (
                <div className="border grid grid-cols-2">
                    <div className="flex justify-start">
                        {globalDashData.topStudents.topByPointGroup[pointGroup]?.topStudents[rank]?.firstName + " " + globalDashData.topStudents.topByPointGroup[pointGroup]?.topStudents[rank]?.lastName}
                    </div>
                    <div className="flex justify-end">
                        {globalDashData.topStudents.topByPointGroup[pointGroup]?.topStudents[rank]?.totalPoints.toLocaleString()}pts
                    </div>
                </div>
            )
        }
    }

    return (
        <div className="grid grid-cols-5 gap-1 w-full min-h-screen">
            <div className="col-span-1 border rounded-xl p-5">
                <div className="text-2xl border-b mb-1">Upcoming</div>
                <div className="grid grid-cols-1 gap-1">
                    {fakeUpcomingPointEvents.map(event => (
                        <div key={event.id} className="rounded-xl p-2" style={{
                            backgroundColor: Color(event.color).alpha(0.25).string()
                        }}>
                            <div className="grid grid-cols-2">
                                <div className="text-2xl">{event.name}</div>
                                <div className="text-lg flex justify-end">{DateTime.fromISO(event.date).toFormat('MMM d')}</div>
                            </div>
                            <div className="text-lg flex">{event.pointGroup}</div>
                            <div className="text-lg">{event.points.toLocaleString()}pts</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="col-span-3 border rounded-xl p-5">
                <div className="grid grid-cols-2 gap-1">
                    <div>
                        <div className="text-2xl">Total Points</div>
                        <div style={{
                            fontSize: "6rem",
                            lineHeight: "5.5rem"
                        }}>
                            {/* {globalDashData.totals.allTime.totalPoints.toLocaleString()} */}
                            123,456
                        </div>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                            <div className="text-xl">This Month</div>
                            <div className="text-2xl">
                                {/* {globalDashData.totals.thisMonth.totalPoints.toLocaleString()} */}
                                12,345
                            </div>
                            <div className="text-xl">This Week</div>
                            <div className="text-2xl">
                                {/* {globalDashData.totals.thisWeek.totalPoints.toLocaleString()} */}
                                54,321
                            </div>
                            <div className="text-xl">Today</div>
                            <div className="text-2xl">
                                {/* {globalDashData.totals.today.totalPoints.toLocaleString()} */}
                                12,345
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
                <div>
                    <div className="text-2xl">Top Students</div>
                    <div className={`grid grid-cols-${globalDashData.totals.allTime.totalPointsByPointGroup.length + 1} gap-1`}>
                        <div className="border">Overall</div>
                        {
                            globalDashData.totals.allTime.totalPointsByPointGroup.map(pointGroup => (
                                <div key={pointGroup.id} className="border">{pointGroup.name}</div>
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
            </div>
            <div className="col-span-1 border rounded-xl"></div>
        </div>
    );
}