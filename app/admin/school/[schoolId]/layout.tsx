"use server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import React from "react";
import getOwnUserData from "@/app/supaApi/server/getOwnUserData";
import { getOwnAdminData } from "@/api/admin";
import { TimeframeProvider, TimeframeDropdown } from "./TimeframeProvider";

export default async function AdminLayout({ children, params: { schoolId } }: { children: React.ReactNode, params: { schoolId: string } }) {

    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    const userData = await getOwnUserData();
    console.log(userData);

    if (userData === null) {
        return (
            <div>
                <div className="flex items-center justify-center h-screen m-5 text-slate-700 dark:text-slate-300">
                    <div>
                        <div>
                            Fatal Error: User has an account but no user data. Contact support.
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const adminData = await getOwnAdminData();

    if (adminData === null) {
        // User is not an admin and shouldn't be here
        console.log("User is not an admin");
        redirect("/")
    }

    const sideBarButton = (text: string, href: string) => {
        return (
            <Link href={`/admin/school/${schoolId}/${href}`}>
                <button
                    className="w-full p-3 my-1 flex items-center justify-center rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                >
                    {text}
                </button>
            </Link>
        )
    }

    return (
        <TimeframeProvider>
            <div>
                <div className="h-dvh flex flex-col text-slate-700 dark:text-slate-300">
                    <header className="h-20 p-5 flex items-center justify-between w-screen bg-slate-300 dark:bg-slate-700">
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                        <div className="flex-1 flex justify-center">
                            <TimeframeDropdown />
                        </div>
                        <div className="w-32"></div> {/* Spacer to balance the layout */}
                    </header>
                    <div className="h-full overflow-hidden flex flex-grow bg-slate-100 dark:bg-slate-900">
                        {/* Sidebar */}
                        <div className="h-full py-5 px-2 w-1/6 bg-slate-200 dark:bg-slate-800">
                            {sideBarButton("Home", "")}
                            {/* Divider */}
                            <div className="h-1 bg-slate-300 dark:bg-slate-700 my-2" />
                            {sideBarButton("Student Groups", "/groups")}
                            {sideBarButton("Students", "/students")}
                            {sideBarButton("Teachers", "/teachers")}
                            {sideBarButton("Point Groups", "/pointGroups")}
                            {sideBarButton("Ranking Groups", "/rankingGroups")}
                            {sideBarButton("Timeframes", "/timeframes")}
                        </div>
                        {/* Main Content */}
                        <div className="w-full h-full">
                            {/* Children with schoolId and adminId props */}
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </TimeframeProvider>
    )
}