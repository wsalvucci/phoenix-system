import { useEffect, useState } from 'react'
import CSVReader from 'react-csv-reader'
import { createStudent } from '../actions';
import { createClient } from '@/utils/supabase/client';

class StudentData {
    id: number | null;
    powerschoolId: number;
    lastName: string;
    firstName: string;
    grade: number;
    birthdate: Date;
    gender: string;
    linkCode: string | null;

    constructor(
        id: number | null,
        powerschoolId: number,
        lastName: string,
        firstName: string,
        grade: number,
        birthdate: string,
        gender: string,
        linkCode: string | null,
    ) {
        this.id = id;
        this.powerschoolId = powerschoolId;
        this.lastName = lastName;
        this.firstName = firstName;
        this.grade = grade;
        this.birthdate = new Date(birthdate);
        this.gender = gender;
        this.linkCode = linkCode;
    }
}

export default function StudentsDashboard({ schoolId, adminId }: { schoolId: number, adminId: number }) {

    const supabase = createClient();

    const [bulkAddStudentsDialogueOpen, setBulkAddStudentsDialogueOpen] = useState<boolean>(false)
    const [previewStudents, setPreviewStudents] = useState<StudentData[]>([])
    const [students, setStudents] = useState<StudentData[]>([])
    const [studentSearchString, setStudentSearchString] = useState<string>("")

    const [activelyBulkAddingStudents, setActivelyBulkAddingStudents] = useState<boolean>(false)

    const fetchStudents = async () => {
        const { data: studentData, error } = await supabase.from("student").select("*").eq("school_id", schoolId);
        if (error) {
            console.error("Error fetching students", error);
        } else if (studentData === null || studentData.length === 0) {
            console.log("No students found for school: " + schoolId);
        } else {
            console.log(studentData)
            var studentArray: StudentData[] = []
            studentData.forEach((student: any) => {
                studentArray.push(new StudentData(
                    student.id,
                    student.powerschool_id,
                    student.last_name,
                    student.first_name,
                    student.grade,
                    student.birthdate,
                    student.gender,
                    student.link_code
                ))
            })
            setStudents(studentArray);
        }
    }

    useEffect(() => {
        fetchStudents();
    }, []);

    const bulkAddStudents = async (students: StudentData[]) => {
        if (activelyBulkAddingStudents) {
            return
        }
        setActivelyBulkAddingStudents(true)
        await students.forEach(async (student: StudentData) => {
            await createStudent(
                adminId,
                schoolId,
                student.powerschoolId,
                student.firstName,
                student.lastName,
                student.grade,
                student.birthdate,
                student.gender
            )
        })
        setActivelyBulkAddingStudents(false)
        console.log("Successfully bulk added students")
        setPreviewStudents([])
        setBulkAddStudentsDialogueOpen(false)
        fetchStudents()
    }

    const bulkAddStudentsDialogue = () => {
        return (
            <div className="bg-slate-200 dark:bg-slate-800 p-5 rounded-lg w-1/2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div>
                    Import a CSV file from Powerschool of your students and you will see a preview of the data below.
                </div>
                <CSVReader
                    parserOptions={{
                        header: true
                    }}
                    onFileLoaded={(data: any, fileInfo: any) => {
                        setPreviewStudents([])
                        var studentData: StudentData[] = []
                        data.forEach((student: any) => {
                            if (student.Id === "" || student.Id === null || student.Id === undefined) {
                                return
                            }
                            console.log(student)
                            studentData.push(new StudentData(
                                null,
                                student.Id,
                                student.Name.split(",")[0],
                                student.Name.split(",")[1],
                                student.Grade,
                                student.Birthday,
                                student.Gender,
                                null
                            ))
                        })
                        setPreviewStudents(studentData)
                    }}
                />
                <div className="flex justify-center content-center">
                    <button
                        className="p-1 m-1 w-1/3 rounded-lg bg-green-300 dark:bg-green-700 hover:bg-green-400 dark:hover:bg-green-600"
                        onClick={() => bulkAddStudents(previewStudents)}
                    >
                        {activelyBulkAddingStudents ? "Adding..." : "Bulk Add"}
                    </button>
                    <button
                        className="p-1 m-1 w-1/3 rounded-lg bg-red-300 dark:bg-red-700 hover:bg-red-400 dark:hover:bg-red-600"
                        onClick={() => setBulkAddStudentsDialogueOpen(false)}
                    >
                        Cancel
                    </button>
                </div>
                <div className=" max-h-60 overflow-y-scroll">
                    <table className="my-5 border-collapse border border-slate-500 w-full">
                        <thead>
                            <tr>
                                <th className="border border-slate-500">Powerschool ID</th>
                                <th className="border border-slate-500">Last Name</th>
                                <th className="border border-slate-500">First Name</th>
                                <th className="border border-slate-500">Grade</th>
                                <th className="border border-slate-500">Birthday</th>
                                <th className="border border-slate-500">Gender</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                previewStudents
                                    .map((student: StudentData) => {
                                        return (
                                            <tr key={student.powerschoolId}>
                                                <td className="border border-slate-500">{student.powerschoolId}</td>
                                                <td className="border border-slate-500">{student.lastName}</td>
                                                <td className="border border-slate-500">{student.firstName}</td>
                                                <td className="border border-slate-500">{student.grade}</td>
                                                <td className="border border-slate-500">{student.birthdate.toDateString()}</td>
                                                <td className="border border-slate-500">{student.gender}</td>
                                            </tr>
                                        )
                                    })
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full w-full">
            <div className="h-1/6">
                <div>
                    {/* <button className="p-3 m-1 rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600">
                        Add Student
                    </button> */}
                    <button
                        className="p-3 m-1 rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                        onClick={() => {
                            setBulkAddStudentsDialogueOpen(!bulkAddStudentsDialogueOpen)
                            setPreviewStudents([])
                        }}
                    >
                        Bulk Add Students (CSV)
                    </button>
                </div>
                <div>
                    <input
                        className="w-1/2 p-3 m-1 flex items-center justify-center rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                        type="text"
                        placeholder="Search Students"
                        onChange={(e) => setStudentSearchString(e.target.value)}
                    />
                </div>
            </div>
            <div className="w-full h-5/6 overflow-y-scroll">
                <table className="w-full border-collapse border border-slate-500">
                    <thead>
                        <tr>
                            <th className="border border-slate-500">ID</th>
                            <th className="border border-slate-500">Powerschool ID</th>
                            <th className="border border-slate-500">Last Name</th>
                            <th className="border border-slate-500">First Name</th>
                            <th className="border border-slate-500">Grade</th>
                            <th className="border border-slate-500">Birthday</th>
                            <th className="border border-slate-500">Gender</th>
                            <th className="border border-slate-500">Link Code</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            students
                                .filter((student: StudentData) => {
                                    return student.lastName.toLowerCase().includes(studentSearchString.toLowerCase()) ||
                                        student.firstName.toLowerCase().includes(studentSearchString.toLowerCase()) ||
                                        studentSearchString === ""
                                })
                                .map((student: StudentData) => {
                                    return (
                                        <tr key={student.powerschoolId}>
                                            <td className="border border-slate-500">{student.id}</td>
                                            <td className="border border-slate-500">{student.powerschoolId}</td>
                                            <td className="border border-slate-500">{student.lastName}</td>
                                            <td className="border border-slate-500">{student.firstName}</td>
                                            <td className="border border-slate-500">{student.grade}</td>
                                            <td className="border border-slate-500">{student.birthdate.toDateString()}</td>
                                            <td className="border border-slate-500">{student.gender}</td>
                                            <td className="border border-slate-500">{student.linkCode}</td>
                                        </tr>
                                    )
                                })
                        }
                    </tbody>
                </table>
            </div>
            {bulkAddStudentsDialogueOpen && bulkAddStudentsDialogue()}
        </div>
    )
}