"use client";
import { createClient } from "@/utils/supabase/client"
import { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { School } from "@/app/dataClasses";

export default function AdminPage({ params: { schoolId } }: { params: { schoolId: string } }) {
    const supabase = createClient();

    const [schoolData, setSchoolData] = useState<School | null>(null);

    const getSchoolData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return redirect("/login");
        }
        const { data: schoolData, error } = await supabase.from("school").select("*").eq("id", schoolId);
        if (error) {
            console.error("Error fetching school", error);
            window.location.href = "/admin";
        } else if (schoolData === null || schoolData.length === 0) {
            console.log("No school found for id: " + schoolId);
            window.location.href = "/admin";
        } else {
            setSchoolData(schoolData[0]);
        }
    }

    useEffect(() => {
        getSchoolData();
    }, []);

    return (
        <div>
            <div className="flex items-center justify-center h-screen m-5 text-slate-700 dark:text-slate-300">
                <div>
                    <div>
                        <h1 className="text-3xl font-bold">Welcome to the admin dashboard</h1>
                        <p className="text-lg">School Name: {schoolData?.name}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}