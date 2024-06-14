import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react";
import { createClass } from "../actions";
import Link from "next/link";

class ClassData {
    id: number;
    name: string;
    selected: boolean;
    edited: boolean;

    constructor(
        id: number,
        name: string,
        selected: boolean,
        edited: boolean
    ) {
        this.id = id;
        this.name = name;
        this.selected = selected;
        this.edited = edited;
    }
}

export default function ClassesDashboard({ schoolId, adminId }: { schoolId: number, adminId: number },) {

    const supabase = createClient();

    const [classes, setClasses] = useState<ClassData[]>([]);
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
            setClasses(classData.map((classData: any) => {
                return new ClassData(classData.id, classData.name, false, false);
            }));
        }
    }

    useEffect(() => {
        fetchClasses();
    }, []);

    const updateClassState = async (classData: ClassData) => {
        setClasses(classes.map((mappedClass) => {
            if (mappedClass.id === classData.id) {
                return classData;
            }
            return mappedClass;
        }));
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


    return (
        // <div className="grid grid-cols-3 gap-3 p-5">
        //     {classes.map((classData: any) => {
        //         return (
        //             <div key={classData.id} className="bg-slate-300 dark:bg-slate-700 p-3 rounded-lg">
        //                 {classContent(classData.name, classData.id)}
        //             </div>
        //         )
        //     })}
        //     {addClassButton()}
        //     {addClassDialogOpen && addClassDialog()}
        // </div>
        <div className="h-full w-full">
            <div className="h-1/6 p-3">
                <div className="flex justify-between items-center">
                    <button
                        className="p-3 rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                        onClick={() => setAddClassDialogOpen(!addClassDialogOpen)}
                    >
                        Add Class
                    </button>
                    <button
                        className={`p-3 m-1 rounded-lg ${classes.filter((classData: ClassData) => classData.edited).length === 0 ?
                            "bg-slate-500 text-slate-700" :
                            "bg-yellow-300 dark:bg-yellow-700 hover:bg-yellow-400 dark:hover:bg-yellow-600"
                            }`}
                        disabled={classes.filter((classData: ClassData) => classData.edited).length === 0}
                        onClick={() => {
                            classes.forEach(async (classData: ClassData) => {
                                if (classData.edited) {
                                    console.log("Updating class: ", classData)
                                    const result = await supabase.from("class").update({
                                        name: classData.name
                                    }).eq("id", classData.id).select("*")
                                    console.log("Result: ", result)
                                }
                                classData.edited = false
                            })
                            fetchClasses()
                            console.log("Successfully updated students")
                        }}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
            <div className="h-5/6 overflow-y-scroll">
                <table className="my-5 border-separate border border-slate-500 w-full">
                    <thead>
                        <tr>
                            <th className="border border-slate-500">Delete</th>
                            <th className="border border-slate-500">ID</th>
                            <th className="border border-slate-500">Class</th>
                            <th className="border border-slate-500"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {classes.map((classData: ClassData) => {
                            return (
                                <tr key={classData.id} className={`${classData.selected ? "bg-red-300 dark:bg-red-700" :
                                    classData.edited ? "bg-yellow-300 dark:bg-yellow-700" : ""
                                    }`}>
                                    <td className="border border-slate-500">
                                        <input
                                            type="checkbox"
                                            onChange={(e) => {
                                                classData.selected = e.target.checked;
                                                updateClassState(classData);
                                            }}
                                        />
                                    </td>
                                    <td className="border border-slate-500">{classData.id}</td>
                                    <td className="border border-slate-500">
                                        <input
                                            className="w-full bg-transparent border-none"
                                            type="text"
                                            defaultValue={classData.name}
                                            onChange={(e) => {
                                                classData.name = e.target.value;
                                                classData.edited = true;
                                                updateClassState(classData);
                                            }}
                                        />
                                    </td>
                                    <td className="border border-slate-500">
                                        <button
                                            className="p-1 rounded-lg bg-orange-300 dark:bg-orange-700 w-full"
                                        >
                                            <Link href={`/admin/editClass/${classData.id}`}>
                                                Edit
                                            </Link>
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {addClassDialogOpen && addClassDialog()}
        </div>
    )
}