"use client";
import { GlobalDashboardData, metalStyle, metalTextShadow, MobileDashboardData, rankToColor } from "@/app/dataClasses";
import { newGetGlobalDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import { useEffect, useState } from "react";
import { Quicksand } from "next/font/google"
import Link from "next/link";

const customFont = Quicksand({
    weight: "400",
    subsets: ["latin"]
});

export default function MobileDashboard() {
    const [mobileDashData, setMobileDashData] = useState<GlobalDashboardData | null>(null);

    const updateData = async () => {
        newGetGlobalDashData(12).then((data) => {
            setMobileDashData(data);
            console.log(data);
        });
    }

    useEffect(() => {
        updateData();
    }, []);

    const topStudentCard = ({
        fullName,
        points,
        rank
    }: {
        fullName: string;
        points: number;
        rank: number;
    }) => {
        return (
            <div className="grid grid-cols-3 px-2 py-1 my-1" style={{
                background: metalStyle(rankToColor(rank).toString()),
                gridTemplateColumns: "1fr 4fr 1fr",
                backgroundSize: "cover",
                textShadow: metalTextShadow,
                backgroundPositionX: `${(Math.random() * 20) - 40}em`,
            }}>
                <div className="flex ">{rank}</div>
                <div className="flex ">{fullName}</div>
                <div className="flex justify-end">{points}</div>
            </div>
        );
    }

    return (
        <div className={`w-full h-svh px-10 text-white bg-slate-800 ${customFont.className} overflow-auto`}>
            <div className="pb-10">
                <div className="px-2 py-1 my-1 flex justify-center text-2xl border-b">Top Students</div>
                <div>
                    {
                        mobileDashData?.topStudents.topOverall.map((student, index) => {
                            return (
                                <div className="my-1" style={{
                                    border: `${student.id === mobileDashData.topStudents.studentData?.id ? "2px solid #fff" : "none"}`,
                                }}>{
                                        topStudentCard(
                                            {
                                                fullName: student.firstName + " " + student.lastName,
                                                points: student.totalPoints,
                                                rank: index + 1
                                            }
                                        )
                                    }
                                </div>
                            );
                        })
                    }
                </div>
                <div className="py-3">
                    {
                        mobileDashData?.topStudents.studentData && mobileDashData?.topStudents.topOverall.find((student) => student.id === mobileDashData?.topStudents.studentData?.id) === undefined && topStudentCard(
                            {
                                fullName: mobileDashData.topStudents.studentData.firstName + " " + mobileDashData.topStudents.studentData.lastName,
                                points: mobileDashData.topStudents.studentData.totalPoints,
                                rank: mobileDashData.topStudents.studentData.rank
                            }
                        )
                    }
                </div>
            </div>
            <div className="flex justify-center">
                <Link
                    href="/student"
                    className="px-2 py-1 mb-10 text-2xl bg-slate-700 w-3/4 rounded-lg flex justify-center">View Your Page</Link>
            </div>
            <div className="pb-5">
                <div className="px-2 py-1 my-1 flex justify-center text-2xl border-b">Top Students by Grade</div>
                {
                    mobileDashData?.topStudents.topByGrade.map((grade) => {
                        return (
                            <div className="pb-3">
                                <div className="px-2 py-1 my-1 flex justify-center text-lg" style={{
                                    background: metalStyle("#000"),
                                    backgroundSize: "cover",
                                    textShadow: metalTextShadow
                                }}>Grade {grade.grade}</div>
                                <div>
                                    {
                                        grade.topStudents.map((student, index) => {
                                            return topStudentCard(
                                                {
                                                    fullName: student.firstName + " " + student.lastName,
                                                    points: student.totalPoints,
                                                    rank: index + 1
                                                }
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        )
                    })
                }
            </div>
            <div>
                {
                    mobileDashData?.rankingGroups.map((rankingGroup) => {
                        return (
                            <div className="pb-10">
                                <div className="px-2 py-1 my-1 flex justify-center text-2xl border-b">
                                    {rankingGroup.name}
                                </div>
                                {
                                    rankingGroup.studentGroups.map((group, index) => {
                                        return (
                                            <div key={index}>
                                                <div className="grid grid-cols-3 px-2 py-1 my-1" style={{
                                                    background: metalStyle(rankToColor(index + 1).toString()),
                                                    gridTemplateColumns: "1fr 4fr 1fr",
                                                    backgroundSize: "cover",
                                                    textShadow: metalTextShadow,
                                                    backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                                }}>
                                                    <div className="flex ">{index + 1}</div>
                                                    <div className="flex ">{group.name}</div>
                                                    <div className="flex justify-end">{Math.round(group.averagePoints)}</div>
                                                </div>
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        );
                    })
                }
            </div>
        </div>
    )
}