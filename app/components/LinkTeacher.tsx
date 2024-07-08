"use client";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PhoenixUser } from "@/app/dataClasses";

export default function LinkTeacher({ user }: { user: User }) {
    const supabase = createClient();

    const [userData, setUserData] = useState<PhoenixUser | null>(null);

    const getUserData = async () => {
        const { data, error } = await supabase.from("user").select("*").eq("supabase_id", user.id);
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
                firstData.first_name,
                firstData.last_name,
                firstData.admin_id,
                firstData.teacher_id,
                firstData.student_id,
                firstData.supabase_id
            )
        );
    }

    useEffect(() => {
        getUserData();
    }, []);

    return (
        <div>
            {
                userData && userData.teacherId !== null ? (
                    <Link href={`teacher/${userData.teacherId}`}>
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