"use client";
import { backgroundGradient, metalStyle, metalTextShadow } from "@/app/dataClasses";
import { displayRankTier } from "@/lib/rankTier";

import { useEffect, useState } from "react";
import { Azeret_Mono, Quicksand } from "next/font/google"
import Link from "next/link";
import { getDisplayBoards } from "@/app/supaApi/server/dashboard/displayBoards";
import type { DisplayBoards } from "@/app/supaApi/universal/displayTypes";
import Color from "color";
import { useDashboardSchool } from "@/app/dashboard/useDashboardSchool";

const customFont = Quicksand({
    weight: "400",
    subsets: ["latin"]
});

const azeret = Azeret_Mono({
    weight: "400",
    subsets: ["latin"]
});

export default function MobileDashboard() {
    const [mobileDashData, setMobileDashData] = useState<DisplayBoards | null>(null);

    const { schoolId } = useDashboardSchool();

    useEffect(() => {
        if (schoolId === null) return;
        getDisplayBoards(schoolId, null).then((data) => {
            setMobileDashData(data);
        });
    }, [schoolId]);

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
            <div className="grid grid-cols-3 px-2 py-1 my-1" data-rank-tier={displayRankTier(rank)} style={{
                background: 'hsl(var(--rank))',
                color: 'hsl(var(--rank-foreground))',
                gridTemplateColumns: "1fr 6fr 2fr",
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
                        mobileDashData?.overall.rows
                        .map((student) => {
                            return (
                                <div key={student.key} className="my-1">{
                                        topStudentCard(
                                            {
                                                fullName: student.firstName + " " + student.lastName,
                                                points: student.totalPoints,
                                                rank: student.rank
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
                    .map((grade) => {
                        return (
                            <div key={grade.key} className="pb-3">
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
                                }}>{grade.title}</div>
                                <div>
                                    {
                                        grade.rows
                                        .map((student) => {
                                            return <div key={student.key}>{topStudentCard(
                                                {
                                                    fullName: student.firstName + " " + student.lastName,
                                                    points: student.totalPoints,
                                                    rank: student.rank
                                                }
                                            )}</div>;
                                        })
                                    }
                                </div>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}