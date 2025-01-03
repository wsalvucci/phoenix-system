"use client";
import { AdminStudentDashboardData } from "@/app/dataClasses"
import { getAdminStudentDashboardData } from "@/app/supaApi/server/admin/adminApi"
import Color from "color";
import { DateTime } from "luxon";
import { useEffect, useState } from "react"
import { Cell, Legend, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

export default function AdminStudentPage({ params: { schoolId, studentId } }: { params: { schoolId: string, studentId: string } }) {

    const [studentData, setStudentData] = useState<AdminStudentDashboardData | null>(null)

    const getStudentData = async () => {
        const newStudentData = await getAdminStudentDashboardData(parseInt(schoolId), parseInt(studentId))
        setStudentData(newStudentData)
        console.log(newStudentData)
    }

    const pointBreakdown = studentData?.pointEvents.reduce((pointGroups, pointEvent) => {
        const pointGroup = pointGroups.find(pointGroup => pointEvent.pointGroup.id === pointGroup.id)
        if (pointGroup) {
            pointGroup.points += pointEvent.pointsEarned.value
        } else {
            pointGroups.push({
                id: pointEvent.pointGroup.id,
                name: pointEvent.pointGroup.name,
                points: pointEvent.pointsEarned.value,
                color: pointEvent.pointGroup.color
            })
        }
        return pointGroups
    }, [] as {
        id: number,
        name: string,
        points: number,
        color: string
    }[])

    useEffect(() => {
        getStudentData();
    }, []);

    return (
        <div className="animate-in h-full w-full">
            <div className="text-4xl" style={{ height: '5%' }}>{studentData?.student.name}</div>
            <div className="text-4xl" style={{ height: '5%' }}>{studentData?.student.totalPoints.toLocaleString()}pts</div>
            <div className="grid grid-cols-2 gap-1" style={{ height: '45%' }}>
                <div className="h-full text-center text-xl">
                    {pointBreakdown?.map(pointGroup => {
                        return (
                            <div key={pointGroup.id} className="grid grid-cols-3 border-2 rounded-lg my-1" style={{
                                borderColor: pointGroup.color,
                            }}>
                                <div>{pointGroup.name}</div>
                                <div>{pointGroup.points.toLocaleString()}</div>
                                <div>{Math.round(pointGroup.points / (studentData?.student.totalPoints ?? 1) * 100)}%</div>
                            </div>
                        )
                    })
                    }
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={pointBreakdown} name="Points" dataKey="points" nameKey="name">
                            {pointBreakdown?.map(pointGroup => {
                                return (
                                    <Cell key={pointGroup.id} fill={Color(pointGroup.color).darken(0.25).toString()} />
                                )
                            })}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="overflow-y-scroll" style={{ height: '45%' }}>
                <div className="sticky top-0 left-0 w-full bg-slate-100">
                    <div className="text-2xl">Recent Points</div>
                    <div className="grid grid-cols-3 text-lg">
                        <div>Event</div>
                        <div>Points</div>
                        <div>Date</div>
                    </div>
                </div>
                <div>
                    {
                        studentData?.pointEvents
                            .sort((a, b) => DateTime.fromISO(b.date).toUnixInteger() - DateTime.fromISO(a.date).toUnixInteger())
                            .map((pointEvent, index) => {
                                return (
                                    <div key={pointEvent.id} className={`grid grid-cols-3 border-s-4 my-1 px-3 ${index % 2 === 0 ? 'bg-slate-100' : 'bg-slate-200'}`} style={{
                                        borderColor: pointEvent.pointGroup.color,
                                    }}>
                                        <div>{pointEvent.name}</div>
                                        <div>{pointEvent.pointsEarned.value.toLocaleString()}</div>
                                        <div>{DateTime.fromISO(pointEvent.date).toFormat('LLL dd')}</div>
                                    </div>
                                )
                            })
                    }
                </div>
            </div>
        </div>
    )
}