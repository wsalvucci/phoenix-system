"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import ClassesDashboard from "./classesDashboard";

enum Content {
    HOME = "home",
    CLASSES = "classes",
    STUDENTS = "students",
    TEACHERS = "teachers",
    STUDENT_GROUPS = "student_groups",
    POINT_GROUPS = "point_groups"
}

export default function Dashboard({ schoolIds, adminId }: { schoolIds: number[], adminId: number }) {
    const supabase = createClient();

    const [schools, setSchools] = useState<any[]>([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState<number>(-1);

    const [selectedContent, setSelectedContent] = useState<Content>(Content.HOME);

    const fetchSchools = async () => {
        schoolIds.forEach(async (schoolId) => {
            const { data: schoolData, error } = await supabase.from("school").select("*").eq("id", schoolId);
            if (error) {
                console.error("Error fetching school", error);
            } else if (schoolData === null || schoolData.length === 0) {
                console.log("No school found for id: " + schoolId);
            } else {
                setSchools([...schools, schoolData[0]]);
            }
        });
        setSelectedSchoolId(schoolIds[0]);
    }

    useEffect(() => {
        fetchSchools();
    }, []);

    const sideBarButton = (text: string, onClick: () => void) => {
        return (
            <button
                className="w-full p-3 my-1 flex items-center justify-center rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                onClick={onClick}
            >
                {text}
            </button>
        )
    }

    return (
        <div>
            <div className="h-dvh flex flex-col text-slate-700 dark:text-slate-300">
                <header className="h-20 p-5 flex items-center justify-between w-screen bg-slate-300 dark:bg-slate-700">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                </header>
                <div className="flex flex-grow bg-slate-100 dark:bg-slate-900">
                    {/* Sidebar */}
                    <div className="h-full py-5 px-2 w-1/6 bg-slate-200 dark:bg-slate-800">
                        {sideBarButton("Home", () => setSelectedContent(Content.HOME))}
                        <div className="text-xl font-bold">
                            Entities
                        </div>
                        {sideBarButton("Classes", () => setSelectedContent(Content.CLASSES))}
                        {sideBarButton("Students", () => setSelectedContent(Content.STUDENTS))}
                        {sideBarButton("Teachers", () => setSelectedContent(Content.TEACHERS))}
                        <div className="text-xl font-bold">
                            Groupings
                        </div>
                        {sideBarButton("Student Groups", () => setSelectedContent(Content.STUDENT_GROUPS))}
                        {sideBarButton("Point Groups", () => setSelectedContent(Content.POINT_GROUPS))}
                    </div>
                    {/* Main Content */}
                    <div className="w-full">
                        {
                            selectedContent === Content.HOME && <div />
                        }
                        {
                            selectedContent === Content.CLASSES && <ClassesDashboard schoolId={selectedSchoolId} adminId={adminId} />
                        }
                        {
                            selectedContent === Content.STUDENTS && <div />
                        }
                        {
                            selectedContent === Content.TEACHERS && <div />
                        }
                        {
                            selectedContent === Content.STUDENT_GROUPS && <div />
                        }
                        {
                            selectedContent === Content.POINT_GROUPS && <div />
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}