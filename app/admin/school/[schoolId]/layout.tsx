import { createClient } from "@/utils/supabase/server";
import CreateSchool from "./components/createSchool";
import { redirect } from "next/navigation";
import Link from "next/link";
import React from "react";
import SchoolSelectComponent from "./schoolSelectComponent";
import { School } from "@/app/dataClasses";

export default async function AdminPage({ children, params: { schoolId } }: { children: React.ReactNode, params: { schoolId: string } }) {

    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    const userData = await supabase.from("user").select("*").eq("supabase_id", user.id);

    if (userData.data === null || userData.data.length === 0) {
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

    const adminData = await supabase.from("admin").select("*").eq("id", userData.data[0].admin_id);

    if (adminData.data === null || adminData.data.length === 0) {
        // User is not an admin and shouldn't be here
        redirect("/")
    }
    const adminId: number = adminData.data[0].id;

    let schoolIds: number[] = [];
    const adminSchools = await supabase.from("admin_school_pair").select("*").eq("admin_id", adminId);

    var schoolData: School[] = [];
    if (adminSchools.error) {
        console.error("Error fetching admin_school_pair", adminSchools.error);
    } else if (adminSchools.data === null || adminSchools.data.length === 0) {
        console.log("No schools found for admin: " + adminId);
    } else {
        schoolIds = adminSchools.data.map((pairing: any) => pairing.school_id);
        for (let i = 0; i < schoolIds.length; i++) {
            const { data: pulledData, error } = await supabase.from("school").select("*").eq("id", schoolIds[i]);
            if (error) {
                console.error("Error fetching school", error);
            } else if (pulledData === null || pulledData.length === 0) {
                console.log("No school found for id: " + schoolIds[i]);
            } else {
                schoolData.push(pulledData[0]);
            }
        }
    }


    const addNewSchoolPrompt = () => {
        return (
            <div>
                <div className="flex items-center justify-center h-screen m-5 text-slate-700 dark:text-slate-300">
                    <div>
                        <div>
                            It doesn't look like you have a school setup yet. Let's get started by creating a new school.
                        </div>
                        <div>
                            <CreateSchool adminId={adminId} />
                        </div>
                    </div>
                </div>
            </div>
        )
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
        <div>
            <div className="h-dvh flex flex-col text-slate-700 dark:text-slate-300">
                <header className="h-20 p-5 flex items-center justify-between w-screen bg-slate-300 dark:bg-slate-700">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <SchoolSelectComponent startingId={parseInt(schoolId)} schools={schoolData} />
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
                    </div>
                    {/* Main Content */}
                    <div className="w-full h-full">
                        {/* Children with schoolId and adminId props */}
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}