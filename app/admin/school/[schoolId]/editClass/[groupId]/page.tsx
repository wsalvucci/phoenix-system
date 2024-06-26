"use client";

import { createClient } from "@/utils/supabase/client"
import Link from "next/link";
import { useEffect, useState } from "react";
import { Student } from "../../dataClasses";
import { start } from "repl";

class ClassData {
    id: number;
    name: string;
    schoolId: number;

    constructor(
        id: number,
        name: string,
        schoolId: number,
    ) {
        this.id = id;
        this.name = name;
        this.schoolId = schoolId;
    }
}

export default function AdminEditClass({ params: { classId } }: { params: { classId: string } }) {

    const supabase = createClient();

    const [classData, setClassData] = useState<ClassData | null>(null);
    const [studentsModalOpen, setStudentsModalOpen] = useState<boolean>(false);

    const [startingClassRoster, setStartingClassRoster] = useState<Student[]>([]);
    const [startingStudentRoster, setStartingStudentRoster] = useState<Student[]>([]);

    const [studentRoster, setStudentRoster] = useState<Student[]>([]);
    const [classRoster, setClassRoster] = useState<Student[]>([]);

    const [searchStudentRosterText, setSearchStudentRosterText] = useState<string>("");
    const [searchClassRosterText, setSearchClassRosterText] = useState<string>("");
    const [selectedStudentRoster, setSelectedStudentRoster] = useState<Student[]>([]);
    const [selectedClassRoster, setSelectedClassRoster] = useState<Student[]>([]);

    const fetchClass = async () => {
        const { data: classData, error } = await supabase.from("class").select("*").eq("id", classId);
        if (error) {
            console.error("Error fetching class", error);
        } else if (classData === null || classData.length === 0) {
            console.log("No class found for id: " + classId);
        } else {
            setClassData(new ClassData(classData[0].id, classData[0].name, classData[0].school_id));
        }
        fetchClassStudents();
    }

    const fetchClassStudents = async () => {
        const { data: classStudents, error } = await supabase.from("student_class_pair").select("student_id").eq("class_id", classId);
        var students: Student[] = []
        if (error) {
            console.error("Error fetching students for class", error);
        } else if (classStudents === null || classStudents.length === 0) {
            console.log("No students found for class: " + classId);
        } else {
            await Promise.all(classStudents.map(async (student) => {
                const { data: studentData, error } = await supabase.from("student").select("*").eq("id", student.student_id);
                if (error) {
                    console.error("Error fetching student", error);
                } else if (studentData === null || studentData.length === 0) {
                    console.log("No student found for id: " + student.student_id);
                } else {
                    const newStudent = new Student(
                        studentData[0].id,
                        studentData[0].link_code,
                        studentData[0].powerschool_id,
                        studentData[0].first_name,
                        studentData[0].last_name,
                        studentData[0].birthdate,
                        studentData[0].grade,
                        studentData[0].gender,
                    )
                    students.push(newStudent);
                }
            }))
            console.log("Students: ", students);
            setStartingClassRoster(students);
            setClassRoster(students);
        }
        fetchStudents(students);
    }

    const fetchStudents = async (classStudents: Student[]) => {
        const { data: students, error } = await supabase.from("student").select("*");
        if (error) {
            console.error("Error fetching students", error);
        } else if (students === null || students.length === 0) {
            console.log("No students found");
        } else {
            var fullRoster = students
                .filter(
                    (filteredStudent) => !classStudents.map((mappedStudent) => mappedStudent.id).includes(filteredStudent.id)
                )
                .map((student) => {
                    return new Student(
                        student.id,
                        student.link_code,
                        student.powerschool_id,
                        student.first_name,
                        student.last_name,
                        student.birthdate,
                        student.grade,
                        student.gender
                    );
                })
            setStudentRoster(fullRoster);
            setStartingStudentRoster(fullRoster);
        }
    }

    useEffect(() => {
        fetchClass();
    }, []);

    const commitChanges = async () => {
        // Compare startingClassRoster to classRoster
        // If a student was removed, delete the student_class_pair
        // If a student was added, add a student_class_pair

        // Remove students
        await Promise.all(startingClassRoster.map(async (student) => {
            if (!classRoster.includes(student)) {
                const { error } = await supabase.from("student_class_pair").delete().eq("student_id", student.id).eq("class_id", classData?.id);
                if (error) {
                    console.error("Error deleting student_class_pair", error);
                }
            }
        }))

        // Add students
        await Promise.all(classRoster.map(async (student) => {
            if (!startingClassRoster.includes(student)) {
                const { error } = await supabase.from("student_class_pair").insert([
                    {
                        student_id: student.id,
                        class_id: classData?.id
                    }
                ]);
                if (error) {
                    console.error("Error inserting student_class_pair", error);
                }
            }
        }))

        setStudentsModalOpen(false);
        fetchClassStudents();

        return
    }

    const manageStudentsModal = () => {
        return (
            <div className="px-4 py-2 dark:bg-slate-700 border border-gray-300 rounded-md w-2/3 h-fit absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="flex justify-between items-center">
                    <div className="text-2xl">Manage Students for {classData?.name}</div>
                    <button
                        className="bg-red-500 text-white rounded p-2"
                        onClick={() => setStudentsModalOpen(false)}
                    >
                        Close
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-1 m-1">
                    <div className="border border-slate-500 p-1">
                        <div>School Roster</div>
                        <input
                            className="w-full rounded-lg dark:[color-scheme:dark]"
                            type="text"
                            placeholder="Search"
                            onChange={(e) => setSearchStudentRosterText(e.target.value)}
                        />
                        <div className="py-2 mt-1 max-h-96 min-h-96 overflow-y-scroll">
                            {
                                studentRoster
                                    .filter((student) => student.firstName.toLowerCase().includes(searchStudentRosterText.toLowerCase()) || student.lastName.toLowerCase().includes(searchStudentRosterText.toLowerCase()))
                                    .map((student) => {
                                        return (
                                            <div
                                                className={`grid grid-cols-3 p-1 rounded-lg hover:bg-slate-500 ${selectedStudentRoster.includes(student) ? "bg-slate-500" : !startingStudentRoster.includes(student) ? "bg-orange-200 dark:bg-orange-800" : ""}`}
                                                key={student.id}
                                                onClick={() => {
                                                    if (selectedStudentRoster.includes(student)) {
                                                        setSelectedStudentRoster(selectedStudentRoster.filter((filteredStudent) => filteredStudent.id !== student.id));
                                                    } else {
                                                        setSelectedStudentRoster([...selectedStudentRoster, student]);
                                                    }
                                                }}
                                            >
                                                <div>{student.firstName}</div>
                                                <div>{student.lastName}</div>
                                                <div>{student.grade}</div>
                                            </div>
                                        )
                                    })
                            }
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-2">
                            <button
                                className="bg-slate-500 text-white rounded p-1"
                                onClick={() => {
                                    setSelectedStudentRoster(studentRoster);
                                }}
                            >
                                Select All
                            </button>
                            <button
                                className="bg-slate-500 text-white rounded p-1"
                                onClick={() => {
                                    setSelectedStudentRoster([]);
                                }}
                            >
                                Deselect All
                            </button>
                            <button
                                className="bg-orange-300 dark:bg-orange-700 text-white rounded p-1"
                                onClick={() => {
                                    setClassRoster([...classRoster, ...selectedStudentRoster]);
                                    setStudentRoster(studentRoster.filter((student) => !selectedStudentRoster.includes(student)));
                                    setSelectedStudentRoster([]);
                                }}
                            >Add to Class</button>
                        </div>
                    </div>
                    <div className="border border-slate-500 p-1">
                        <div>Class Roster</div>
                        <input
                            className="w-full rounded-lg dark:[color-scheme:dark]"
                            type="text"
                            placeholder="Search"
                            onChange={(e) => setSearchClassRosterText(e.target.value)}
                        />
                        <div className="py-2 mt-1 max-h-96 min-h-96 overflow-y-scroll">
                            {
                                classRoster
                                    .filter((student) => student.firstName.toLowerCase().includes(searchClassRosterText.toLowerCase()) || student.lastName.toLowerCase().includes(searchClassRosterText.toLowerCase()))
                                    .map((student) => {
                                        return (
                                            <div
                                                className={`grid grid-cols-3 p-1 rounded-lg hover:bg-slate-500 ${selectedClassRoster.includes(student) ? "bg-slate-500" : !startingClassRoster.includes(student) ? "bg-orange-200 dark:bg-orange-800" : ""}`}
                                                key={student.id}
                                                onClick={() => {
                                                    if (selectedClassRoster.includes(student)) {
                                                        setSelectedClassRoster(selectedClassRoster.filter((filteredStudent) => filteredStudent.id !== student.id));
                                                    } else {
                                                        setSelectedClassRoster([...selectedClassRoster, student]);
                                                    }
                                                }}
                                            >
                                                <div>{student.firstName}</div>
                                                <div>{student.lastName}</div>
                                                <div>{student.grade}</div>
                                            </div>
                                        )
                                    })
                            }
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-2">
                            <button
                                className="bg-slate-500 text-white rounded p-1"
                                onClick={() => {
                                    setSelectedClassRoster(classRoster);
                                }}
                            >
                                Select All
                            </button>
                            <button
                                className="bg-slate-500 text-white rounded p-1"
                                onClick={() => {
                                    setSelectedClassRoster([]);
                                }}
                            >
                                Deselect All
                            </button>
                            <button
                                className="bg-orange-300 dark:bg-orange-700 text-white rounded p-1"
                                onClick={() => {
                                    setStudentRoster([...studentRoster, ...selectedClassRoster]);
                                    setClassRoster(classRoster.filter((student) => !selectedClassRoster.includes(student)));
                                    setSelectedClassRoster([]);
                                }}
                            >Remove from Class</button>
                        </div>
                    </div>
                </div>
                <div className="w-full mt-2">
                    <button
                        className="w-full bg-green-300 dark:bg-green-700 hover:bg-green-200 dark:hover:bg-green-600 text-white rounded p-2"
                        onClick={() => commitChanges()}
                    >Commit Changes</button>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-in p-5 h-full w-full">
            <h2 className="text-xl font-bold h-1/6">Editing {classData?.name}</h2>
            <div className="grid grid-cols-3 h-5/6">
                <div className="w-full h-full">
                    <button
                        className="bg-slate-500 text-white rounded p-2 w-full hover:bg-slate-400"
                        onClick={() => setStudentsModalOpen(true)}
                    >
                        Manage Students
                    </button>
                    <div className="overflow-y-scroll max-h-96">
                        <table className="w-full border-separate table-fixed">
                            <thead>
                                <tr className="border border-slate-500 bg-slate-300 dark:bg-slate-700 sticky top-0">
                                    <th>First Name</th>
                                    <th>Last Name</th>
                                    <th>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classRoster.map((student) => {
                                    return (
                                        <tr key={student.id}>
                                            <td>{student.firstName}</td>
                                            <td>{student.lastName}</td>
                                            <td>{student.grade}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {studentsModalOpen && manageStudentsModal()}
        </div>
    )
}