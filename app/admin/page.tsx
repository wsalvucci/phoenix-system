import { createClient } from "@/utils/supabase/server";
import CreateSchool from "./components/createSchool";
import { redirect } from "next/navigation";
import { createSchool } from "./actions";
import { useState } from "react";
import Dashboard from "./components/dashboard";

export default async function AdminPage() {

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
    if (adminSchools.error) {
        console.error("Error fetching admin_school_pair", adminSchools.error);
    } else if (adminSchools.data === null || adminSchools.data.length === 0) {
        console.log("No schools found for admin: " + adminId);
    } else {
        // adminSchools.data.forEach(async (pairing: any) => {
        //     console.log(pairing);
        //     const schoolData = await supabase.from("school").select("*").eq("id", pairing.school_id);
        //     if (schoolData.error) {
        //         console.error("Error fetching school", schoolData.error);
        //     } else if (schoolData.data === null || schoolData.data.length === 0) {
        //         console.log("No school found for id: " + pairing.school_id);
        //     } else {
        //         console.log("School found: " + schoolData.data[0].name);
        //         setSchools([...schools, schoolData.data[0]]);
        //     }
        // });
        schoolIds = adminSchools.data.map((pairing: any) => pairing.school_id);
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

    return (
        <div>
            {schoolIds.length === 0 ? addNewSchoolPrompt() : <Dashboard schoolIds={schoolIds} adminId={adminId} />}
        </div>
    )
}