"use client";
import { useState } from "react";
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, YAxis, ZAxis } from "recharts";
import Link from "next/link";
import { Space_Mono } from "next/font/google"
import { useQuery } from "@tanstack/react-query";
import { getAdminSchoolDash } from "@/api/admin";
import { useTheme } from "@/components/ThemeProvider";
import ThemeInput from "@/components/ThemeInput";
import ThemeSelect from "@/components/ThemeSelect";
import { LoadingState } from "@/components/LoadingLayout";
import { wrapServerAction } from "@/utils/serverActionWrapper";

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
    const { theme } = useTheme();
    const {data: adminDashData, isLoading, error} = useQuery({
        queryKey: ["adminSchoolDash", schoolId],
        queryFn: () => wrapServerAction(getAdminSchoolDash)(parseInt(schoolId))
    })

    const [studentSearch, setStudentSearch] = useState<string>("")
    const [studentSort, setStudentSort] = useState<SortType>(SortType.LastName)
    const [studentSortDirection, setStudentSortDirection] = useState<SortDirection>(SortDirection.Ascending)

    const [studentHover, setStudentHover] = useState<number | null>(null)

    const [groupSearch, setGroupSearch] = useState<string>("")
    const [groupSort, setGroupSort] = useState<SortType>(SortType.LastName)
    const [groupSortDirection, setGroupSortDirection] = useState<SortDirection>(SortDirection.Ascending)

    return (
        <LoadingState
            isLoading={isLoading}
            error={error}
            data={adminDashData}
            errorFallback={(err) => <div>Error: {err.message}</div>}
        >
            {(data) => (
        <div className="animate-in w-full">
            <ResponsiveContainer width="100%" height={200}>
                <ScatterChart className="w-full h-full">
                    <YAxis hide dataKey="y" type="number" name="score" unit="pts" />
                    <ZAxis dataKey="name" type="category" name="student" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter 
                        data={
                            adminDashData?.students
                                .sort((a, b) => a.totalPoints - b.totalPoints)
                                .map(student => {
                                    return {
                                        name: student.lastName + ", " + student.firstName,
                                        y: student.totalPoints,
                                        id: student.id
                                    }
                                })
                        } 
                        shape={(props: any) => {
                            const { cx, cy, payload } = props;
                            const isHovered = payload.id === studentHover;
                            const color = isHovered 
                                ? (theme === 'dark' ? "#00ff00" : "#00ff00") // Blue - lighter for dark theme
                                : (theme === 'dark' ? "#9ca3af" : "#6b7280"); // Gray - lighter for dark theme
                            return (
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={4}
                                    fill={color}
                                />
                            );
                        }}
                    />
                </ScatterChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-1">
                <div>
                    <div className="text-xl">Students</div>
                    <div>
                        <ThemeInput
                            type="text"
                            placeholder="Search Students"
                            fullWidth
                            onChange={(e) => {
                                setStudentSearch(e.target.value)
                            }}
                        />
                        <div className="grid grid-cols-2 gap-1 my-1">
                            <ThemeSelect
                                fullWidth
                                onChange={(e) => {
                                    setStudentSort(parseInt(e.target.value))
                                }}
                            >
                                <option value={SortType.LastName}>Last Name</option>
                                <option value={SortType.FirstName}>First Name</option>
                                <option value={SortType.Grade}>Grade</option>
                                <option value={SortType.Points}>Points</option>
                            </ThemeSelect>
                            <ThemeSelect
                                fullWidth
                                onChange={(e) => {
                                    setStudentSortDirection(parseInt(e.target.value))
                                }}
                            >
                                <option value={SortDirection.Ascending}>ASC</option>
                                <option value={SortDirection.Descending}>DESC</option>
                            </ThemeSelect>
                        </div>
                        <div className="grid grid-cols-4 border-b-2">
                            <div>Last Name</div>
                            <div>First Name</div>
                            <div>Grade</div>
                            <div>Points</div>
                        </div>
                        <div className={`overflow-y-scroll max-h-96 ${customFont.className}`}
                        onMouseLeave={() => {
                            setStudentHover(null)
                        }}>
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
                                            <div 
                                                key={student.id} 
                                                className="grid grid-cols-4 hover:bg-slate-300 dark:hover:bg-slate-700"
                                                onMouseEnter={() => {
                                                    setStudentHover(student.id)
                                                }}
                                            >
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
                        <ThemeInput
                            type="text"
                            placeholder="Search Groups"
                            fullWidth
                            onChange={(e) => {
                                setGroupSearch(e.target.value)
                            }}
                        />
                        <div className="grid grid-cols-2 gap-1 my-1">
                            <ThemeSelect
                                fullWidth
                                onChange={(e) => {
                                    setGroupSort(parseInt(e.target.value))
                                }}
                            >
                                <option value={SortType.LastName}>Name</option>
                            </ThemeSelect>
                            <ThemeSelect
                                fullWidth
                                onChange={(e) => {
                                    setGroupSortDirection(parseInt(e.target.value))
                                }}
                            >
                                <option value={SortDirection.Ascending}>ASC</option>
                                <option value={SortDirection.Descending}>DESC</option>
                            </ThemeSelect>
                        </div>
                        <div className="grid grid-cols-1 border-b-2">
                            <div>Name</div>
                        </div>
                        <div className={`overflow-y-scroll max-h-96 ${customFont.className}`}>
                            {adminDashData?.studentGroups
                                .filter(group => group.name.toLowerCase().includes(groupSearch.toLowerCase()))
                                .sort((a, b) => {
                                    switch (groupSort) {
                                        case SortType.LastName:
                                            return groupSortDirection === SortDirection.Ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
                                        default:
                                            return a.name.localeCompare(b.name)
                                    }
                                })
                                .map(group => {
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
        )}
        </LoadingState>
    )
}