"use client";
import { useEffect, useState } from "react";
import { School } from "@/app/dataClasses";
import { getSchoolsAsAdmin } from "@/app/supaApi/client/admin/schools/adminSchoolsApi";

export default function AdminPage({ params: { schoolId } }: { params: { schoolId: string } }) {

    const [schoolData, setSchoolData] = useState<School | null>(null);

    const getSchoolData = async () => {
        const schoolsData = await getSchoolsAsAdmin();
        const schoolData = schoolsData?.find(school => school.id === parseInt(schoolId));
        if (!schoolData) {
            console.error("School not found");
            return
        }
        setSchoolData(schoolData);
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