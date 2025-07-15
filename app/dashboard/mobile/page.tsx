"use client";
import { backgroundGradient, metalStyle, metalTextShadow, rankToColor } from "@/app/dataClasses";

// Force static generation to reduce serverless functions
export const dynamic = 'force-static';
import { useEffect, useState } from "react";
import { Azeret_Mono, Quicksand } from "next/font/google"
import Link from "next/link";
import { featuredDashGetGlobalStats } from "@/app/supaApi/universal/universalApi";
import { GlobalPoints } from "@/app/supaApi/universal/utils/types";
import Color from "color";

const customFont = Quicksand({
    weight: "400",
    subsets: ["latin"]
});

const azeret = Azeret_Mono({
    weight: "400",
    subsets: ["latin"]
});

export default function MobileDashboard() {
    const [mobileDashData, setMobileDashData] = useState<GlobalPoints | null>(null);

    const updateData = async () => {
        featuredDashGetGlobalStats(12, null).then((data) => {
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
                background: backgroundGradient([
                    {
                        color: rankToColor(rank).darken(0.5).toString(),
                        percent: 0
                    },
                    {
                        color: rankToColor(rank).darken(0.25).toString(),
                        percent: 50
                    },
                    {
                        color: rankToColor(rank).darken(0.5).toString(),
                        percent: 100
                    }
                ]),
                borderLeft: `1px solid ${rankToColor(rank).toString()}`,
                borderRight: `1px solid ${rankToColor(rank).toString()}`,
                gridTemplateColumns: "1fr 6fr 2fr",
                backgroundSize: "cover",
                textShadow: metalTextShadow,
            }}>
                <div className={`flex ${azeret.className}`}>{rank}</div>
                <div className="flex ">{fullName}</div>
                <div className={`flex justify-end ${azeret.className}`}>{points.toLocaleString()}</div>
            </div>
        );
    }

    return (
        <div className={`w-full h-svh px-10 text-white bg-slate-800 ${customFont.className} overflow-auto`}>
            <div className="pb-10">
                <div className="px-2 py-1 my-1 flex justify-center text-2xl border-b">Top Students</div>
                <div>
                    {
                        mobileDashData?.students
                        .slice(0, 20)
                        .map((student, index) => {
                            return (
                                <div key={student.id || index} className="my-1">{
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
            </div>
            <div className="flex justify-center">
                <Link
                    href="/student"
                    className="px-2 py-1 mb-10 text-2xl bg-slate-700 w-3/4 rounded-lg flex justify-center">View Your Page</Link>
            </div>
            <div className="pb-5">
                <div className="px-2 py-1 my-1 flex justify-center text-2xl border-b">Top Students by Grade</div>
                {
                    mobileDashData?.grades
                    .sort((a, b) => a - b)
                    .map((grade) => {
                        return (
                            <div key={grade} className="pb-3">
                                <div className="px-2 py-1 my-1 flex justify-center text-lg" style={{
                                    background: backgroundGradient([
                                        {
                                            color: Color('#555').darken(0.5).toString(),
                                            percent: 0
                                        },
                                        {
                                            color: Color('#555').darken(0.25).toString(),
                                            percent: 50
                                        },
                                        {
                                            color: Color('#555').darken(0.5).toString(),
                                            percent: 100
                                        }
                                    ]),
                                    borderLeft: `1px solid ${Color('#555').toString()}`,
                                    borderRight: `1px solid ${Color('#555').toString()}`,
                                    backgroundSize: "cover",
                                    textShadow: metalTextShadow
                                }}>Grade {grade}</div>
                                <div>
                                    {
                                        mobileDashData.students
                                        .filter(student => student.grade === grade)
                                        .map((student, index) => {
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
                            <div key={rankingGroup.id} className="pb-10">
                                <div className="px-2 py-1 my-1 flex justify-center text-2xl border-b">
                                    {rankingGroup.name}
                                </div>
                                {
                                    rankingGroup.studentGroups
                                    .sort((a, b) => {
                                        const groupAPoints = a.averagePoints + b.rawPoints;
                                        const groupBPoints = a.averagePoints + b.rawPoints;
                                        return groupBPoints - groupAPoints;
                                    })
                                    .map((group, index) => {
                                        const groupData = mobileDashData.studentGroups.find((studentGroup) => studentGroup.id === group.id);
                                        if (!groupData) {
                                            return null;
                                        }
                                        return (
                                            <div key={index}>
                                                <div className="grid grid-cols-3 px-2 py-1 my-1" style={{
                                                    background: backgroundGradient([
                                                        {
                                                            color: rankToColor(index + 1).darken(0.5).toString(),
                                                            percent: 0
                                                        },
                                                        {
                                                            color: rankToColor(index + 1).darken(0.25).toString(),
                                                            percent: 50
                                                        },
                                                        {
                                                            color: rankToColor(index + 1).darken(0.5).toString(),
                                                            percent: 100
                                                        }
                                                    ]),
                                                    borderLeft: `1px solid ${rankToColor(index + 1).toString()}`,
                                                    borderRight: `1px solid ${rankToColor(index + 1).toString()}`,
                                                    gridTemplateColumns: "1fr 4fr 1fr",
                                                    backgroundSize: "cover",
                                                    textShadow: metalTextShadow,
                                                }}>
                                                    <div className="flex ">{index + 1}</div>
                                                    <div className="flex ">{groupData.name}</div>
                                                    <div className={`flex justify-end ${azeret.className}`}>{Math.round(groupData.averagePoints + groupData.rawPoints).toLocaleString()}</div>
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