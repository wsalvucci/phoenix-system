"use client";
import { useEffect, useState } from "react";

// Force static generation to reduce serverless functions
export const dynamic = 'force-static';
import { RankingGroupData, StudentGroup, Teacher } from "@/app/dataClasses";
import Link from "next/link";
import clientGetOwnTeacherData from "@/app/supaApi/client/teacher/clientGetOwnTeacherData";
import { clientGetOwnStudentGroups } from "@/app/supaApi/client/teacher/teacherApi";
import { getRankingGroups } from "../supaApi/server/teacher/teacherServerActions";

export default function TeacherHome() {

    const [teacherData, setTeacherData] = useState<Teacher | null>(null);
    const [groups, setGroups] = useState<StudentGroup[]>([]);
    const [rankingGroups, setRankingGroups] = useState<RankingGroupData[]>([]);

    const getTeacherData = async () => {
        setTeacherData(await clientGetOwnTeacherData())

        setGroups(await clientGetOwnStudentGroups());

        setRankingGroups(await getRankingGroups());
    }

    useEffect(() => {
        getTeacherData();
    }, []);

    const groupCard = (group: StudentGroup) => {
        return (
            <Link href={`/teacher/group/${group.id}`} key={group.id}>
                <div
                    className="bg-slate-300 dark:bg-slate-700 rounded-lg p-4 text-center"
                >
                    {group.name}
                </div>
            </Link>
        )
    }

    const rankingGroupCard = (group: RankingGroupData) => {
        return (
            <Link href={`/teacher/rankingGroup/${group.id}`} key={group.id}>
                <div
                    className="bg-slate-300 dark:bg-slate-700 rounded-lg p-4 text-center"
                >
                    {group.name}
                </div>
            </Link>
        )
    }

    return (
        <div className="animate-in mt-10">
            <div className="text-4xl mb-5 border-b">
                Hello, {teacherData?.firstName} {teacherData?.lastName}
            </div>
            <div className="text-2xl mb-3">
                Your groups
            </div>
            <div className="grid grid-cols-4 gap-3">
                {
                    groups.map((group) => {
                        return groupCard(group);
                    })
                }
            </div>
            <div className="text-2xl mb-3 mt-5">
                Your ranking groups
            </div>
            <div className="grid grid-cols-4 gap-3">
                {
                    rankingGroups.map((group) => {
                        return rankingGroupCard(group);
                    })
                }
            </div>
        </div>
    )
}