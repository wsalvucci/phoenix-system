"use client";
import { useEffect, useState } from "react";
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, YAxis, ZAxis } from "recharts";
import Link from "next/link";
import Color from "color";
import { Space_Mono } from "next/font/google"
import { adminGetGlobalPointStats, getGlobalPointStats } from "@/app/supaApi/universal/universalApi";
import { GlobalPoints } from "@/app/supaApi/universal/utils/types";

const customFont = Space_Mono({
    weight: "400",
    subsets: ["latin"]
});

enum SortType {
    FirstName,
    LastName,
    Grade,
    Points
}

enum SortDirection {
    Ascending,
    Descending
}

export default function AdminPage({ params: { schoolId } }: { params: { schoolId: string } }) {

    const [adminDashData, setAdminDashData] = useState<GlobalPoints | null>(null)

    const [studentSearch, setStudentSearch] = useState<string>("")
    const [studentSort, setStudentSort] = useState<SortType>(SortType.LastName)
    const [studentSortDirection, setStudentSortDirection] = useState<SortDirection>(SortDirection.Ascending)

    const [groupSearch, setGroupSearch] = useState<string>("")
    const [groupSort, setGroupSort] = useState<SortType>(SortType.LastName)

    const getAdminDashData = async () => {
        const testData = await adminGetGlobalPointStats(
            parseInt(schoolId),
            null,
        )
        setAdminDashData(testData)
    }

    useEffect(() => {
        getAdminDashData();
    }, []);

    return (
        <div className="animate-in w-full">
            <ResponsiveContainer width="100%" height={200}>
                <ScatterChart className="w-full h-full">
                    <YAxis hide dataKey="y" type="number" name="score" unit="pts" />
                    <ZAxis dataKey="name" type="category" name="student" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={
                        adminDashData?.students.sort((a, b) => a.totalPoints - b.totalPoints).map(student => {
                            return {
                                name: student.lastName + ", " + student.firstName,
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
                        let totalPoints = adminDashData.students.reduce((acc, student) => {
                            return acc + (student.pointGroups.find(pg => pg.id === pointGroup.id)?.points ?? 0)
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
                                <option value={SortType.LastName}>Last Name</option>
                                <option value={SortType.FirstName}>First Name</option>
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
                            <div>Last Name</div>
                            <div>First Name</div>
                            <div>Grade</div>
                            <div>Points</div>
                        </div>
                        <div className={`overflow-y-scroll max-h-96 ${customFont.className}`}>
                            {adminDashData?.students
                                .filter(student => student.firstName.toLowerCase().includes(studentSearch.toLowerCase()) || student.lastName.toLowerCase().includes(studentSearch.toLowerCase()))
                                .sort((a, b) => {
                                    switch (studentSort) {
                                        case SortType.LastName:
                                            return studentSortDirection === SortDirection.Ascending ? a.lastName.localeCompare(b.lastName) : b.lastName.localeCompare(a.lastName)
                                        case SortType.FirstName:
                                            return studentSortDirection === SortDirection.Ascending ? a.firstName.localeCompare(b.firstName) : b.firstName.localeCompare(a.firstName)
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
                                                <div>{student.lastName}</div>
                                                <div>{student.firstName}</div>
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