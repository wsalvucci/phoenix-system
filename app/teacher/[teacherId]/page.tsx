"use client";
import { useEffect, useState } from "react";
import { StudentGroup, Teacher } from "@/app/dataClasses";
import Link from "next/link";

export default function TeacherHome({ params: { teacherId } }: { params: { teacherId: string } }) {

    const [teacherData, setTeacherData] = useState<Teacher | null>(null);
    const [groups, setGroups] = useState<StudentGroup[]>([]);

    const getTeacherData = async () => {
    }

    useEffect(() => {
        getTeacherData();
    }, []);

    const groupCard = (group: StudentGroup) => {
        return (
            <Link href={`/teacher/${teacherId}/group/${group.id}`} key={group.id}>
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
        </div>
    )
}