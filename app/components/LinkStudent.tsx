"use client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LinkedTeacher } from "../supaApi/mappers/dataTypes";

export default function LinkStudent({ user }: { user: User }) {
    const [userData, setUserData] = useState<LinkedTeacher | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const getUserData = async () => {
        //const teacherData = await getOwnTeacherData()
        //setUserData(teacherData)
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
                        <Link href={`student`}>
                            <button
                                className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700"
                            >
                                Student Portal
                            </button>
                        </Link>
                    ) : (
                        <Link href="/linkAccount/student">
                            <button
                                className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700"
                            >
                                Link Student
                            </button>
                        </Link>
                    )
                )
            }
        </div>
    )
}