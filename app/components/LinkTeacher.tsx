"use client";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PhoenixUser, Student, Teacher } from "@/app/dataClasses";

export default function LinkTeacher({ user }: { user: User }) {
    const supabase = createClient();

    const [userData, setUserData] = useState<PhoenixUser | null>(null);

    const getUserData = async () => {
        const { data, error } = await supabase.from("user").select("*, teacherData: teacher (*), studentData: student (*)").eq("supabase_id", user.id);
        if (error) {
            console.error(error);
            return;
        }

        if (data.length === 0) {
            return;
        }

        const firstData = data[0];

        console.log(firstData);

        setUserData(
            new PhoenixUser(
                firstData.id,
                new Date(firstData.created_at),
                firstData.first_name,
                firstData.last_name,
                firstData.admin_id,
                firstData.student_id,
                firstData.supabase_id,
                null,
                firstData.teacherData.map(teacher =>
                    new Teacher(
                        teacher.id,
                        new Date(teacher.created_at),
                        teacher.first_name,
                        teacher.last_name,
                        teacher.link_code,
                        firstData.id,
                        null,
                        teacher.school_id
                    )
                ),
                firstData.studentData.map(student =>
                    new Student(
                        student.id,
                        student.link_code,
                        student.powerschool_id,
                        student.first_name,
                        student.last_name,
                        student.birthdate ? new Date(student.birthdate) : null,
                        student.grade,
                        student.gender
                    )
                )
            )
        );
    }

    useEffect(() => {
        getUserData();
    }, []);

    return (
        <div>
            {
                userData && userData.linkedTeachers !== null ? (
                    <Link href={`teacher/${userData.linkedTeachers[0].id}`}>
                        <button
                            className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700"
                        >
                            Teacher Portal
                        </button>
                    </Link>
                ) : (
                    <Link href="/linkAccount/teacher">
                        <button
                            className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700"
                        >
                            Link Teacher
                        </button>
                    </Link>
                )
            }
        </div>
    )
}