"use client";
import { AdminStudentDashboardData, numberToOrdinal } from "@/app/dataClasses"
import { getAdminStudentDashboardData } from "@/app/supaApi/server/admin/adminApi"
import { getStudentPointStats } from "@/app/supaApi/universal/universalApi";
import { StudentPointsData } from "@/app/supaApi/universal/utils/types";
import Color from "color";
import { DateTime } from "luxon";
import { useEffect, useState } from "react"
import { Cell, Legend, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { useTimeframe } from "../../TimeframeProvider";

export default function AdminStudentPage({ params: { schoolId, studentId } }: { params: { schoolId: string, studentId: string } }) {

    const [newStudentData, setNewStudentData] = useState<StudentPointsData | null>(null)
    const { selectedTimeframeId } = useTimeframe();

    const getStudentData = async () => {
        const newerStudentData = await getStudentPointStats(parseInt(studentId), selectedTimeframeId)
        console.log(newerStudentData)
        setNewStudentData(newerStudentData)
    }

    const pointBreakdown = newStudentData?.pointGroups?.map((pointGroup) => {
        return {
            id: pointGroup.id,
            name: pointGroup.name,
            points: pointGroup.points,
            color: pointGroup.color,
        }
    })

    useEffect(() => {
        getStudentData();
    }, [selectedTimeframeId]);

    return (
        <div className="animate-in h-full w-full">
            <div className="text-4xl" style={{ height: '5%' }}>{newStudentData?.lastName + ", " + newStudentData?.firstName}</div>
            <div className="text-4xl" style={{ height: '5%' }}>{newStudentData?.totalPoints.toLocaleString()}pts</div>
            <div className="text-4xl" style={{ height: '5%' }}>Rank: {numberToOrdinal(newStudentData?.totalRank ?? -1)} / {newStudentData?.totalOutOf}</div>
            <div className="grid grid-cols-2 gap-1" style={{ height: '45%' }}>
                <div>
                    <div className="h-1/2 text-center text-xl">
                    <div className="grid grid-cols-5 border-b-2 my-1">
                        <div>Point Group</div>
                        <div>Rank</div>
                        <div>Percentile</div>
                        <div>Points</div>
                        <div>% of Total</div>
                    </div>
                        {newStudentData?.pointGroups?.map(pointGroup => {
                            return (
                                <div key={pointGroup.id} className="grid grid-cols-5 border-2 rounded-lg my-1" style={{
                                    borderColor: pointGroup.color,
                                }}>
                                    <div>{pointGroup.name}</div>
                                    <div>{numberToOrdinal(pointGroup.rank ?? -1)}</div>
                                    <div>{numberToOrdinal(Math.round((1 - pointGroup.rank / pointGroup.outOf) * 100))}</div>
                                    <div>{pointGroup.points.toLocaleString()}</div>
                                    <div>{Math.round(pointGroup.points / (newStudentData.totalPoints ?? 1) * 100)}%</div>
                                </div>
                            )
                        })
                        }
                    </div>
                    <div className="h-1/2 text-center text-xl">
                        <div className="grid grid-cols-3 border-b-2 my-1">
                            <div>Student Group</div>
                            <div>Rank</div>
                            <div>Percentile</div>
                        </div>
                        <div className="grid grid-cols-3 border-2 rounded-lg my-1">
                            <div>{numberToOrdinal(newStudentData?.grade ?? 0)} Grade</div>
                            <div>{numberToOrdinal(newStudentData?.gradeRank ?? -1)} / {newStudentData?.gradeOutOf}</div>
                            <div>{numberToOrdinal(Math.round((1 - (newStudentData?.gradeRank ?? 0)/ (newStudentData?.gradeOutOf ?? 0)) * 100))}</div>
                        </div>
                        {
                            newStudentData?.studentGroups.map(rankingGroup => {
                                return (
                                    <div key={rankingGroup.id} className="grid grid-cols-3 border-2 rounded-lg my-1">
                                        <div>{rankingGroup.name}</div>
                                        <div>{numberToOrdinal(rankingGroup.rank ?? -1)} / {rankingGroup.outOf}</div>
                                        <div>{numberToOrdinal(Math.round((1 - (rankingGroup.rank ?? 0) / (rankingGroup.outOf ?? 0)) * 100))}</div>
                                    </div>
                                )
                            })
                        }
                    </div>
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
            <div className="overflow-y-scroll" style={{ height: '40%' }}>
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
                        newStudentData?.pointEvents
                            .sort((a, b) => DateTime.fromISO(b.date).toUnixInteger() - DateTime.fromISO(a.date).toUnixInteger())
                            .map((pointEvent, index) => {
                                return (
                                    <div key={pointEvent.id} className={`grid grid-cols-3 border-s-4 my-1 px-3 ${index % 2 === 0 ? 'bg-slate-100' : 'bg-slate-200'}`} style={{
                                        borderColor: pointEvent.pointGroup.color,
                                    }}>
                                        <div>{pointEvent.name}</div>
                                        <div>{pointEvent.points} <span className="text-gray-400"> / {pointEvent.maxPoints}</span></div>
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