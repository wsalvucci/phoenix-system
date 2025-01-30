import { convertPointUsingRuleType, numberToOrdinal, stringToRuleType } from "@/app/dataClasses";
import { getStudentDataForParent } from "@/app/supaApi/server/parent/parentApi"
import { getStudentPointStats } from "@/app/supaApi/universal/universalApi";
import Color from "color";
import { DateTime } from "luxon";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ParentStudentDashboard({ params: { studentId } }: { params: { studentId: string } }) {

    const studentData = await getStudentPointStats(parseInt(studentId), null)

    if (studentData == null) {
        redirect("/parent")
    }

    return (
        <div className="w-full h-full">
            <div className="absolute top-20 left-10">
                <Link className="bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 rounded-lg px-3 py-1" href={'/parent'}>Back</Link>
            </div>
            <div className="mt-5">
                <div className="text-3xl flex justify-center">{studentData.firstName + " " + studentData.lastName}</div>
                <div className="text-3xl flex justify-center">{studentData.totalPoints.toLocaleString()}pts</div>
                <div className="text-xl flex justify-center">{numberToOrdinal(studentData.totalRank)} / {studentData.totalOutOf.toLocaleString()} students</div>
                <div className="text-lg flex justify-center">{numberToOrdinal(Math.round((1 - (studentData.totalRank / studentData.totalOutOf)) * 100))} percentile</div>
            </div>
            <div className="border-t-2 m-5 p-5">
                <div className="flex justify-center text-3xl py-3">Point Groups</div>
                <div className="grid grid-cols-4">
                    <div className="flex justify-center">Point Group</div>
                    <div className="flex justify-center">Points</div>
                    <div className="flex justify-center">Rank</div>
                    <div className="flex justify-center">Percentile</div>
                    {
                        studentData.pointGroups.map((pointGroup) => {
                            return (
                                <div key={pointGroup.id} className="col-span-4 grid grid-cols-4 border-t p-2" style={{
                                    backgroundColor: Color(pointGroup.color).alpha(0.25).toString()
                                }}>
                                    <div className="flex justify-center">{pointGroup.name}</div>
                                    <div className="flex justify-center">{pointGroup.points.toLocaleString()}</div>
                                    <div className="flex justify-center">{numberToOrdinal(pointGroup.rank)}</div>
                                    <div className="flex justify-center">{numberToOrdinal(Math.round((1 - (pointGroup.rank / pointGroup.outOf)) * 100))}</div>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
            <div className="border-t-2 m-5 p-5">
                <div className="flex justify-center text-3xl py-3">Student Groups</div>
                <div className="grid grid-cols-2">
                    <div className="flex justify-center">Student Group</div>
                    <div className="flex justify-center">Rank</div>
                                <div className="col-span-2 grid grid-cols-2 border-t p-2">
                                    <div className="flex justify-center">{numberToOrdinal(studentData.grade)} Grade</div>
                                    <div className="flex justify-center">{numberToOrdinal(studentData.gradeRank)} / {studentData.gradeOutOf} students</div>
                                </div>
                    {
                        studentData.studentGroups.map((studentGroup) => {
                            return (
                                <div key={studentGroup.id} className="col-span-2 grid grid-cols-2 border-t p-2">
                                    <div className="flex justify-center">{studentGroup.name}</div>
                                    <div className="flex justify-center">{numberToOrdinal(studentGroup.rank)} / {studentGroup.outOf} students</div>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
            <div className="border-t-2 m-5 p-5">
                <div className="flex justify-center text-3xl py-3">Recent Points</div>
                <div className="grid grid-cols-3 gap-1">
                    <div className="col-span-3 grid grid-cols-3">
                        <div className="flex justify-center">Event</div>
                        <div className="flex justify-center">Date</div>
                        <div className="flex justify-center">Points</div>
                    </div>
                    {
                        studentData.pointEvents.sort((a, b) => {
                            return DateTime.fromISO(b.date).toSeconds() - DateTime.fromISO(a.date).toSeconds()
                        }).map((pointEvent) => {
                            return (
                                <div key={pointEvent.id} className="col-span-3 grid grid-cols-3 p-2" style={{
                                    backgroundColor: Color(pointEvent.pointGroup.color).alpha(0.15).toString()
                                }}>
                                    <div className="flex justify-start">{pointEvent.name}</div>
                                    <div className="flex justify-center">{DateTime.fromISO(pointEvent.date).toFormat('EEE, LLL dd')}</div>
                                    <div>
                                        <div className="flex justify-end">{pointEvent.points} /  {pointEvent.maxPoints}</div>
                                        <div className="flex justify-end">{pointEvent.points !== 0 ? numberToOrdinal(pointEvent.rank) : "-"} /  {pointEvent.outOf}</div>
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        </div>
    )
}