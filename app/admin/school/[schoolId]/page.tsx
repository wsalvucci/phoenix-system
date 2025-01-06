"use client";
import { useEffect, useState } from "react";
import { AdminDashboardData } from "@/app/dataClasses";
import { getAdminDashboardData } from "@/app/supaApi/server/admin/adminApi";
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, YAxis, ZAxis } from "recharts";
import Link from "next/link";
import Color from "color";
import { Space_Mono } from "next/font/google"

const customFont = Space_Mono({
    weight: "400",
    subsets: ["latin"]
});

enum SortType {
    Name,
    Grade,
    Points
}

enum SortDirection {
    Ascending,
    Descending
}

export default function AdminPage({ params: { schoolId } }: { params: { schoolId: string } }) {

    const [adminDashData, setAdminDashData] = useState<AdminDashboardData | null>(null)

    const [studentSearch, setStudentSearch] = useState<string>("")
    const [studentSort, setStudentSort] = useState<SortType>(SortType.Name)
    const [studentSortDirection, setStudentSortDirection] = useState<SortDirection>(SortDirection.Ascending)

    const [groupSearch, setGroupSearch] = useState<string>("")
    const [groupSort, setGroupSort] = useState<SortType>(SortType.Name)

    const getAdminDashData = async () => {
        const adminDashData = await getAdminDashboardData(parseInt(schoolId))
        setAdminDashData(adminDashData)
        console.log(adminDashData)
    }

    useEffect(() => {
        getAdminDashData();
    }, []);

    return (
        <div className="animate-in w-full">
            {/* <div className="text-xl">{adminDashData?.school.name}</div>
                <div>Teachers: {adminDashData?.teachers.length}</div>
                <div>Students: {adminDashData?.students.length}</div> */}

            <ResponsiveContainer width="100%" height={200}>
                <ScatterChart className="w-full h-full">
                    <YAxis hide dataKey="y" type="number" name="score" unit="pts" />
                    <ZAxis dataKey="name" type="category" name="student" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={
                        adminDashData?.students.sort((a, b) => a.totalPoints - b.totalPoints).map(student => {
                            return {
                                name: student.name,
                                y: student.totalPoints
                            }
                        })
                    } />
                </ScatterChart>
            </ResponsiveContainer>
            <div>
                <div className="text-xl text-center w-full">Avg Points Per Point Group Per Student</div>
                {
                    // Average points by point group per student
                    adminDashData?.pointGroups.map(pointGroup => {
                        let totalPoints = adminDashData.studentGroups.reduce((total, group) => {
                            return total + group.pointEvents.reduce((groupTotal, event) => {
                                return groupTotal + (event.pointGroupId === pointGroup.id ? event.studentPoints.reduce((eventTotal, studentPoint) => {
                                    return eventTotal + studentPoint.value
                                }, 0) : 0)
                            }, 0)
                        }, 0)

                        return (
                            <div key={pointGroup.id} className="grid grid-cols-2 text-center" style={{
                                color: Color(pointGroup.color).darken(0.25).toString()
                            }}>
                                <div>{pointGroup.name}</div>
                                <div>{Math.round(totalPoints / adminDashData.students.length)}</div>
                            </div>
                        )
                    })
                }
            </div>
            <div className="grid grid-cols-3 gap-1">
                <div>
                    <div className="text-xl">Students</div>
                    <div>
                        <input type="text" placeholder="Search Students" className="w-full rounded-lg px-3"
                            onChange={(e) => {
                                setStudentSearch(e.target.value)
                            }}
                        />
                        <div className="grid grid-cols-2 gap-1 my-1">
                            <select className="rounded-lg px-3" onChange={(e) => {
                                setStudentSort(parseInt(e.target.value))
                            }}>
                                <option value={SortType.Name}>Name</option>
                                <option value={SortType.Grade}>Grade</option>
                                <option value={SortType.Points}>Points</option>
                            </select>
                            <select className="rounded-lg px-3" onChange={(e) => {
                                setStudentSortDirection(parseInt(e.target.value))
                            }}>
                                <option value={SortDirection.Ascending}>ASC</option>
                                <option value={SortDirection.Descending}>DESC</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-4 border-b-2">
                            <div className="col-span-2">Name</div>
                            <div>Grade</div>
                            <div>Points</div>
                        </div>
                        <div className={`overflow-y-scroll max-h-96 ${customFont.className}`}>
                            {adminDashData?.students
                                .filter(student => student.name.toLowerCase().includes(studentSearch.toLowerCase()))
                                .sort((a, b) => {
                                    switch (studentSort) {
                                        case SortType.Name:
                                            return studentSortDirection === SortDirection.Ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
                                        case SortType.Grade:
                                            return studentSortDirection === SortDirection.Ascending ? a.grade - b.grade : b.grade - a.grade
                                        case SortType.Points:
                                            return studentSortDirection === SortDirection.Ascending ? a.totalPoints - b.totalPoints : b.totalPoints - a.totalPoints
                                    }
                                })
                                .map(student => {
                                    return (
                                        <Link href={`/admin/school/${schoolId}/student/${student.id}`}>
                                            <div key={student.id} className="grid grid-cols-4 hover:bg-slate-300 dark:hover:bg-slate-700">
                                                <div className="col-span-2">{student.name}</div>
                                                <div>{student.grade}</div>
                                                <div>{student.totalPoints}</div>
                                            </div>
                                        </Link>
                                    )
                                })}
                        </div>
                    </div>
                </div>
                <div>
                    <div className="text-xl">Groups</div>
                    <div>
                        <div className="grid grid-cols-1 border-b-2">
                            <div>Name</div>
                        </div>
                        <div className={`overflow-y-scroll max-h-96 ${customFont.className}`}>
                            {adminDashData?.studentGroups.sort((a, b) => a.name.localeCompare(b.name)).map(group => {
                                return (
                                    <Link href={`/admin/school/${schoolId}/editGroup/${group.id}`}>
                                        <div key={group.id} className="grid grid-cols-1 hover:bg-slate-300 dark:hover:bg-slate-700">
                                            {group.name}
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}