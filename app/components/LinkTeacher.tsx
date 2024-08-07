"use client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";
import getOwnTeacherData from "../supaApi/server/teacher/getOwnTeacherData";
import { LinkedTeacher } from "../supaApi/mappers/dataTypes";

export default function LinkTeacher({ user }: { user: User }) {
    const [userData, setUserData] = useState<LinkedTeacher | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const getUserData = async () => {
        const teacherData = await getOwnTeacherData()
        setUserData(teacherData)
        setLoading(false)
    }

    useEffect(() => {
        getUserData();
    }, []);

    return (
        <div>
            {
                !loading && (
                    userData !== null ? (
                        <Link href={`teacher`}>
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
                )
            }
        </div>
    )
}