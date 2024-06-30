"use client";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { GroupData, Teacher } from "@/app/dataClasses";
import Link from "next/link";

export default function TeacherHome({ params: { teacherId } }: { params: { teacherId: string } }) {

    const supabase = createClient();

    const [teacherData, setTeacherData] = useState<Teacher | null>(null);
    const [groups, setGroups] = useState<GroupData[]>([]);

    const getTeacherData = async () => {
        const { data: teacherData, error } = await supabase
            .from("teacher")
            .select("*, pairings:teacher_student_group_pair (*), groups:student_group (*)")
            .eq("id", parseInt(teacherId))
            .maybeSingle();

        if (error) {
            console.error("Error fetching teacher data", error);
        } else if (teacherData === null || teacherData.length === 0) {
            console.log("No teacher found with id 1");
            window.location.href = "/";
        } else {
            console.log(teacherData);

            // Test
            const allGroups = await supabase
                .from("student_group")
                .select("*")

            console.log(allGroups);


            setTeacherData(new Teacher(teacherData.id, teacherData.first_name, teacherData.last_name));
            setGroups(teacherData.groups.map((group: any) => {
                return new GroupData(group.id, group.name, group.parent_id);
            }))
        }
    }

    useEffect(() => {
        getTeacherData();
    }, []);

    const groupCard = (group: GroupData) => {
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