"use server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import React from "react";
import getOwnUserData from "@/app/supaApi/server/getOwnUserData";
import { getOwnAdminData } from "@/api/admin";
import { TimeframeProvider } from "./TimeframeProvider";

export default async function AdminLayout({ children, params: { schoolId } }: { children: React.ReactNode, params: { schoolId: string } }) {

    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    const userData = await getOwnUserData();
    if (userData === null) {
        return (
            <div>
                <div className="flex items-center justify-center h-screen m-5 text-foreground">
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
        redirect("/")
    }

    const sideBarButton = (text: string, href: string) => {
        return (
            <Link href={`/admin/school/${schoolId}/${href}`} className="button-ghost w-full shrink-0 justify-start whitespace-nowrap md:w-auto">
                {text}
            </Link>
        )
    }

    return (
        <TimeframeProvider schoolId={schoolId}>
            <div className="app-page">
                <div className="flex min-h-dvh flex-col text-foreground">
                    <header className="app-header min-h-20 w-full">
                        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-4 sm:px-6">
                          <div>
                            <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground">← Schools</Link>
                            <h1 className="mt-1 text-xl font-bold text-foreground">School Administration</h1>
                          </div>
                          <div className="flex-1" />
                        </div>
                    </header>
                    <div className="flex min-h-0 flex-grow flex-col bg-muted md:flex-row">
                        <nav aria-label="School administration" className="flex w-full shrink-0 gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:w-56 md:flex-col md:border-b-0 md:border-r md:px-3 md:py-5">
                            {sideBarButton("Home", "")}
                            <div className="mx-2 hidden h-px bg-muted md:block" />
                            {sideBarButton("Student Groups", "groups")}
                            {sideBarButton("Students", "students")}
                            {sideBarButton("Teachers", "teachers")}
                            {sideBarButton("Point Groups", "pointGroups")}
                            {sideBarButton("Ranking Groups", "rankingGroups")}
                            {sideBarButton("Timeframes", "timeframes")}
                            {sideBarButton("Displays", "displays")}
                        </nav>
                        <div className="h-full w-full overflow-y-auto">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </TimeframeProvider>
    )
}
