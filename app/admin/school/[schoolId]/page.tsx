"use client";
import { useEffect, useState } from "react";
import { AdminDashboardData, School } from "@/app/dataClasses";
import { getAdminDashboardData } from "@/app/supaApi/server/admin/adminApi";

export default function AdminPage({ params: { schoolId } }: { params: { schoolId: string } }) {

    const [adminDashData, setAdminDashData] = useState<AdminDashboardData | null>(null)

    const getAdminDashData = async () => {
        const adminDashData = await getAdminDashboardData(parseInt(schoolId))
        setAdminDashData(adminDashData)
    }

    useEffect(() => {
        getAdminDashData();
    }, []);

    return (
        <div>
            <div>
                <div className="text-xl">{adminDashData?.school.name}</div>
                <div>Teachers: {adminDashData?.teachers.length}</div>
                <div>Students: {adminDashData?.students.length}</div>
            </div>
        </div>
    )
}