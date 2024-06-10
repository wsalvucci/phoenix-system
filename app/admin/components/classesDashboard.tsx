import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react";
import { createClass } from "../actions";

export default function ClassesDashboard({ schoolId, adminId }: { schoolId: number, adminId: number },) {

    const supabase = createClient();

    const [classes, setClasses] = useState<any[]>([]);
    const [addClassDialogOpen, setAddClassDialogOpen] = useState<boolean>(false);
    const [classNameTooShortError, setClassNameTooShortError] = useState<boolean>(true);
    const [newClassName, setNewClassName] = useState<string>("");

    const fetchClasses = async () => {
        const { data: classData, error } = await supabase.from("class").select("*").eq("school_id", schoolId);
        if (error) {
            console.error("Error fetching classes", error);
        } else if (classData === null || classData.length === 0) {
            console.log("No classes found for school: " + schoolId);
        } else {
            setClasses(classData);
        }
    }

    useEffect(() => {
        fetchClasses();
    }, []);

    const classContent = (className: string, classId: number) => {
        return (
            <div>
                <div>
                    ID: {classId}
                </div>
                <div>
                    Class: {className}
                </div>
            </div>
        )
    }

    const submitNewClassName = async (className: string) => {
        if (className.length > 3) {
            await createClass(adminId, schoolId, className);
            await fetchClasses();
            setAddClassDialogOpen(false);
        }
    }

    const addClassDialog = () => {
        return (
            <div className="px-4 py-2 dark:bg-slate-700 border border-gray-300 rounded-md w-1/2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div>
                    Add New Class
                </div>
                <input
                    className="w-full p-3 my-1 dark:bg-slate-700 border border-gray-300 rounded-md"
                    type="text"
                    placeholder="Class Name"
                    onChange={(e) => {
                        if (e.target.value.length < 3) {
                            setClassNameTooShortError(true);
                        } else {
                            setClassNameTooShortError(false);
                            setNewClassName(e.target.value);
                        }
                    }}
                />
                <button
                    className="w-1/2 p-3 my-1 rounded-lg bg-green-300 dark:bg-green-700 hover:bg-green-400 dark:hover:bg-green-600"
                    onClick={() => submitNewClassName(newClassName)}
                >
                    Confirm
                </button>
                <button
                    className="w-1/2 p-3 my-1 rounded-lg bg-red-300 dark:bg-red-700 hover:bg-red-400 dark:hover:bg-red-600"
                    onClick={() => setAddClassDialogOpen(!addClassDialogOpen)}
                >
                    Cancel
                </button>
                <div
                    className="w-full text-red-500"
                >
                    {classNameTooShortError && "Class name must be at least 3 characters long"}
                </div>
            </div>
        )
    }

    const addClassButton = () => {
        return (
            <button
                className="w-full p-3 flex items-center justify-center rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                onClick={() => setAddClassDialogOpen(!addClassDialogOpen)}
            >
                Add Class
            </button>
        )
    }

    return (
        <div className="grid grid-cols-3 gap-3 p-5">
            {classes.map((classData: any) => {
                return (
                    <div key={classData.id} className="bg-slate-300 dark:bg-slate-700 p-3 rounded-lg">
                        {classContent(classData.name, classData.id)}
                    </div>
                )
            })}
            {addClassButton()}
            {addClassDialogOpen && addClassDialog()}
        </div>
    )
}