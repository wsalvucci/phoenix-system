import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { createTeacher } from "../actions";

class TeacherData {
    id: number;
    firstName: string;
    lastName: string;
    linkCode: string;

    constructor(id: number, firstName: string, lastName: string, linkCode: string) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.linkCode = linkCode;
    }
}

export default function TeachersDashboard({ schoolId, adminId }: { schoolId: number, adminId: number }) {

    const supabase = createClient();

    const [teachers, setTeachers] = useState<TeacherData[]>([]);
    const [addTeacherDialogOpen, setAddTeacherDialogOpen] = useState<boolean>(false);
    const [newTeacherFirstName, setNewTeacherFirstName] = useState<string>("");
    const [newTeacherLastName, setNewTeacherLastName] = useState<string>("");

    const fetchTeachers = async () => {
        const { data: teacherData, error } = await supabase.from("teacher").select("*").eq("school_id", schoolId);
        if (error) {
            console.error("Error fetching teachers", error);
        } else if (teacherData === null || teacherData.length === 0) {
            console.log("No teachers found for school: " + schoolId);
        } else {
            setTeachers(teacherData.map((teacher: any) => new TeacherData(teacher.id, teacher.first_name, teacher.last_name, teacher.link_code)));
        }
    }

    useEffect(() => {
        fetchTeachers();
    }, []);

    const addNewTeacher = async (firstName: string, lastName: string) => {
        await createTeacher(adminId, schoolId, firstName, lastName);
        setAddTeacherDialogOpen(false);
        await fetchTeachers();
    }

    const addTeacherDialog = () => {
        return (
            <div className="px-4 py-2 dark:bg-slate-700 border border-gray-300 rounded-md w-1/2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div>
                    Add New Teacher
                </div>
                <input
                    className="w-full p-3 my-1 dark:bg-slate-700 border border-gray-300 rounded-md"
                    type="text"
                    placeholder="First Name"
                    onChange={(e) => setNewTeacherFirstName(e.target.value)}
                />
                <input
                    className="w-full p-3 my-1 dark:bg-slate-700 border border-gray-300 rounded-md"
                    type="text"
                    placeholder="Last Name"
                    onChange={(e) => setNewTeacherLastName(e.target.value)}
                />
                <button
                    className="w-1/2 p-3 my-1 rounded-lg bg-green-300 dark:bg-green-700 hover:bg-green-400 dark:hover:bg-green-600"
                    onClick={() => addNewTeacher(newTeacherFirstName, newTeacherLastName)}
                >
                    Add Teacher
                </button>
                <button
                    className="w-1/2 p-3 my-1 rounded-lg bg-red-300 dark:bg-red-700 hover:bg-red-400 dark:hover:bg-red-600"
                    onClick={() => setAddTeacherDialogOpen(false)}
                >
                    Cancel
                </button>
            </div>
        )
    }

    const teacherContent = (teacher: TeacherData) => {
        return (
            <div className="p-3 rounded-lg bg-slate-300 dark:bg-slate-700">
                <div>
                    ID: {teacher.id}
                </div>
                <div>
                    Name: {teacher.firstName} {teacher.lastName}
                </div>
                <div>
                    Link Code: {teacher.linkCode}
                </div>
            </div>
        )
    }

    return (
        <div className="animate-in h-full w-full">
            <div className="h-1/6">
                <button
                    className="p-3 m-1 flex items-center justify-center rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                    onClick={() => setAddTeacherDialogOpen(true)}
                >
                    Add New Teacher
                </button>
            </div>
            <div className="w-full h-5/6 overflow-y-scroll">
                <table className="w-full border-separate table-fixed">
                    <thead>
                        <tr className="border border-slate-500 bg-slate-300 dark:bg-slate-700 sticky top-0">
                            <th className="border border-slate-500">ID</th>
                            <th className="border border-slate-500">First Name</th>
                            <th className="border border-slate-500">Last Name</th>
                            <th className="border border-slate-500">Link Code</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            teachers.map((teacher: TeacherData) => {
                                return (
                                    <tr key={teacher.id} className="border border-slate-500">
                                        <td className="border border-slate-500">{teacher.id}</td>
                                        <td className="border border-slate-500">{teacher.firstName}</td>
                                        <td className="border border-slate-500">{teacher.lastName}</td>
                                        <td className="border border-slate-500">{teacher.linkCode}</td>
                                    </tr>
                                )
                            })
                        }
                    </tbody>
                </table>
            </div>
            {addTeacherDialogOpen && addTeacherDialog()}
        </div>
    )
}