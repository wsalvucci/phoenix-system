"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { School } from "./school/[schoolId]/dataClasses";
import Link from "next/link";

export default function AdminHome() {

    const supabase = createClient();
    const [schoolData, setSchoolData] = useState<School[] | null>(null);

    const getSchoolData = async () => {
        const { data: schoolData, error } = await supabase.from("school").select("*");
        if (error) {
            console.error("Error fetching school", error);
        } else if (schoolData === null || schoolData.length === 0) {
            console.log("No school found");
        } else {
            setSchoolData(schoolData);
        }
    }

    useEffect(() => {
        getSchoolData();
    }, []);

    const schoolCard = (school: School) => {
        return (
            <Link href={`/admin/school/${school.id}`} key={school.id}>
                <div className="bg-slate-500 shadow-md rounded p-3 mb-4">
                    <div className="flex items-center justify-center text-3xl font-bold">{school.name}</div>
                </div>
            </Link>
        )
    }

    return (
        <div className="w-full h-full">
            <header className="flex items-center justify-center w-full p-5 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                <div>
                    <div>
                        <div>
                            <h1 className="text-3xl font-bold">Welcome to the admin dashboard</h1>
                        </div>
                    </div>
                </div>
            </header>
            <div className="m-5">
                <div>
                    <div>
                        <h1 className="text-3xl font-bold">Your Schools</h1>
                        <div className="grid grid-cols-4 gap-5">
                            {schoolData?.map((school) => {
                                return (
                                    schoolCard(school)
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}