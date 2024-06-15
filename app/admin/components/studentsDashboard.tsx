import { useEffect, useState } from 'react'
import CSVReader from 'react-csv-reader'
import { createStudent } from '../actions';
import { createClient } from '@/utils/supabase/client';
import { link } from 'fs';

class StudentData {
    id: number | null;
    powerschoolId: number;
    lastName: string;
    firstName: string;
    grade: number;
    birthdate: Date;
    gender: string;
    linkCode: string | null;
    selected: boolean;
    edited: boolean;

    constructor(
        id: number | null,
        powerschoolId: number,
        lastName: string,
        firstName: string,
        grade: number,
        birthdate: string,
        gender: string,
        linkCode: string | null,
        selected: boolean,
        edited: boolean,
    ) {
        this.id = id;
        this.powerschoolId = powerschoolId;
        this.lastName = lastName;
        this.firstName = firstName;
        this.grade = grade;
        this.birthdate = new Date(birthdate);
        this.gender = gender;
        this.linkCode = linkCode;
        this.selected = selected;
        this.edited = edited;
    }
}

enum SortDirections {
    ASC = "ASC",
    DESC = "DESC"
}

enum SortFilterOptions {
    ID = "ID",
    POWERSCHOOL_ID = "POWERSCHOOL_ID",
    LAST_NAME = "LAST_NAME",
    FIRST_NAME = "FIRST_NAME",
    GRADE = "GRADE",
    BIRTHDATE = "BIRTHDATE",
    GENDER = "GENDER"
}

class StudentFilters {
    searchString: string;
    birthdateMin: Date | null;
    birthdateMax: Date | null;
    gradeMin: number | null;
    gradeMax: number | null;

    constructor(
        searchString: string,
        birthdateMin: Date | null,
        birthdateMax: Date | null,
        gradeMin: number | null,
        gradeMax: number | null,
    ) {
        this.searchString = searchString;
        this.birthdateMin = birthdateMin;
        this.birthdateMax = birthdateMax;
        this.gradeMin = gradeMin;
        this.gradeMax = gradeMax;
    }
}

export default function StudentsDashboard({ schoolId, adminId }: { schoolId: number, adminId: number }) {

    const supabase = createClient();

    const [bulkAddStudentsDialogueOpen, setBulkAddStudentsDialogueOpen] = useState<boolean>(false)
    const [previewStudents, setPreviewStudents] = useState<StudentData[]>([])
    const [students, setStudents] = useState<StudentData[]>([])
    const [studentSearchString, setStudentSearchString] = useState<string>("")

    const [activelyBulkAddingStudents, setActivelyBulkAddingStudents] = useState<boolean>(false)

    const [currentSortDirection, setCurrentSortDirection] = useState<SortDirections>(SortDirections.ASC)
    const [currentSortFilter, setCurrentSortFilter] = useState<SortFilterOptions>(SortFilterOptions.ID)

    const [studentFilters, setStudentFilters] = useState<StudentFilters>(new StudentFilters("", null, null, null, null))

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
                    student.link_code,
                    false,
                    false
                ))
            })
            setStudents(studentArray);
        }
    }

    useEffect(() => {
        fetchStudents();
    }, []);

    const updateStudentState = async (student: StudentData) => {
        setStudents(students.map((s: StudentData) => {
            if (s.id === student.id) {
                return student
            }
            return s
        }))
    }

    const updateStudentFilterState = async () => {
        setStudentFilters(new StudentFilters(
            studentFilters.searchString,
            studentFilters.birthdateMin,
            studentFilters.birthdateMax,
            studentFilters.gradeMin,
            studentFilters.gradeMax,
        ))
    }

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

    const tableHeader = ({
        title,
        sortFilter,
    }: {
        title: string,
        sortFilter: SortFilterOptions,
    }) => {
        return (
            <th className="border border-slate-500 text-md">
                <div className="w-full">
                    {title}
                </div>
                <div className="w-full">
                    <button
                        className="w-full p-1 bg-slate-600 hover:bg-slate-500 rounded-t-lg"
                        onClick={
                            () => {
                                setCurrentSortFilter(sortFilter)
                                setCurrentSortDirection(currentSortDirection === SortDirections.ASC ? SortDirections.DESC : SortDirections.ASC)
                            }
                        }
                    >
                        Sort: {sortFilter === currentSortFilter ? currentSortDirection : "---"}
                    </button>
                </div>
            </th>
        )
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
                                null,
                                false,
                                false
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
        <div className="animate-in h-full w-full">
            <div className="h-1/6">
                <div className='flex justify-between'>
                    <div>
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
                                className="w-full p-3 m-1 flex items-center justify-center rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                                type="text"
                                placeholder="Search Students"
                                onChange={(e) => setStudentSearchString(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        {/* Filter on birthdate using date range */}
                        <div>
                            Filter by Birthdate Range
                            <div>
                                <div className="flex w-full my-1">
                                    <div className="w-1/4">
                                        Min
                                    </div>
                                    <input
                                        className="w-full mx-1 p-1 flex items-center justify-center rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                                        type="date"
                                        onChange={(e) => {
                                            studentFilters.birthdateMin = new Date(e.target.value)
                                            updateStudentFilterState()
                                        }}
                                    />
                                </div>
                                <div className="flex w-full my-1">
                                    <div className="w-1/4">
                                        Max
                                    </div>
                                    <input
                                        className="w-full mx-1 p-1 flex items-center justify-center rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                                        type="date"
                                        onChange={(e) => {
                                            studentFilters.birthdateMax = new Date(e.target.value)
                                            updateStudentFilterState()
                                        }}
                                    />
                                </div>
                                {/* <div>
                                    <button
                                        className="w-full p-1 m-1 rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                                        onClick={() => {
                                            studentFilters.birthdateMin = null
                                            studentFilters.birthdateMax = null
                                            updateStudentFilterState()
                                        }}
                                    >
                                        Clear
                                    </button>
                                </div> */}
                            </div>
                        </div>
                    </div>
                    <div>
                        {/* Filter on grade range */}
                        <div>
                            Filter by Grade Range
                            <div>
                                <div className="flex w-full my-1">
                                    <div className="w-1/4">
                                        Min
                                    </div>
                                    <input
                                        className="w-fit mx-1 p-1 rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                                        type="number"
                                        placeholder="Min Grade"
                                        min={9}
                                        max={12}
                                        onChange={(e) => {
                                            studentFilters.gradeMin = parseInt(e.target.value)
                                            updateStudentFilterState()
                                        }}
                                    />
                                </div>
                                <div className="flex w-full my-1">
                                    <div className="w-1/4">
                                        Max
                                    </div>
                                    <input
                                        className="w-fit mx-1 p-1 rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                                        type="number"
                                        placeholder="Max Grade"
                                        min={9}
                                        max={12}
                                        onChange={(e) => {
                                            studentFilters.gradeMax = parseInt(e.target.value)
                                            updateStudentFilterState()
                                        }}
                                    />
                                </div>
                                {/* <div>
                                    <button
                                        className="w-full p-1 m-1 rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                                        onClick={() => {
                                            studentFilters.gradeMin = null
                                            studentFilters.gradeMax = null
                                            updateStudentFilterState()
                                        }}
                                    >
                                        Clear
                                    </button>
                                </div> */}
                            </div>
                        </div>
                    </div>
                    <div>
                        {/* <button
                            className={`p-3 m-1 rounded-lg ${students.filter((student: StudentData) => student.selected).length === 0 ?
                                "bg-slate-500 text-slate-700" :
                                "bg-red-300 dark:bg-red-700 hover:bg-red-400 dark:hover:bg-red-600"
                                }`}
                            disabled={students.filter((student: StudentData) => student.selected).length === 0}
                            onClick={() => {
                                students.forEach(async (student: StudentData) => {
                                    if (student.selected) {
                                        await supabase.from("student").delete().eq("id", student.id)
                                    }
                                })
                                fetchStudents()
                            }}
                        >
                            Delete Selected
                        </button> */}
                        <button
                            className={`p-3 m-1 rounded-lg ${students.filter((student: StudentData) => student.edited).length === 0 ?
                                "bg-slate-500 text-slate-700" :
                                "bg-yellow-300 dark:bg-yellow-700 hover:bg-yellow-400 dark:hover:bg-yellow-600"
                                }`}
                            disabled={students.filter((student: StudentData) => student.edited).length === 0}
                            onClick={() => {
                                students.forEach(async (student: StudentData) => {
                                    if (student.edited) {
                                        console.log("Updating student: ", student)
                                        const result = await supabase.from("student").update({
                                            last_name: student.lastName,
                                            first_name: student.firstName,
                                            grade: student.grade,
                                            birthdate: student.birthdate,
                                            gender: student.gender,
                                        }).eq("id", student.id).select("*")
                                        console.log("Result: ", result)
                                    }
                                    student.edited = false
                                })
                                fetchStudents()
                                console.log("Successfully updated students")
                            }}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
            <div className="w-full h-5/6 overflow-y-scroll">
                <table className="w-full border-separate table-fixed">
                    <thead>
                        <tr className="border border-slate-500 bg-slate-300 dark:bg-slate-700 sticky top-0">
                            <th className="border border-slate-500">
                                Delete
                            </th>
                            {tableHeader({
                                title: "ID",
                                sortFilter: SortFilterOptions.ID,
                            })}
                            {tableHeader({
                                title: "Powerschool ID",
                                sortFilter: SortFilterOptions.POWERSCHOOL_ID,
                            })}
                            {tableHeader({
                                title: "Last Name",
                                sortFilter: SortFilterOptions.LAST_NAME,
                            })}
                            {tableHeader({
                                title: "First Name",
                                sortFilter: SortFilterOptions.FIRST_NAME,
                            })}
                            {tableHeader({
                                title: "Grade",
                                sortFilter: SortFilterOptions.GRADE,
                            })}
                            {tableHeader({
                                title: "Birthdate",
                                sortFilter: SortFilterOptions.BIRTHDATE,
                            })}
                            {tableHeader({
                                title: "Gender",
                                sortFilter: SortFilterOptions.GENDER,
                            })}
                            <th className="border border-slate-500 text-xl">Link Code</th>
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
                                .filter((student: StudentData) => {
                                    return (studentFilters.birthdateMin === null || student.birthdate >= studentFilters.birthdateMin)
                                        && (studentFilters.birthdateMax === null || student.birthdate <= studentFilters.birthdateMax)
                                        && (studentFilters.gradeMin === null || student.grade >= studentFilters.gradeMin)
                                        && (studentFilters.gradeMax === null || student.grade <= studentFilters.gradeMax)
                                })
                                .sort((a: StudentData, b: StudentData) => {
                                    if (currentSortDirection === SortDirections.ASC) {
                                        if (currentSortFilter === SortFilterOptions.ID) {
                                            return (a.id || 0) - (b.id || 0)
                                        } else if (currentSortFilter === SortFilterOptions.POWERSCHOOL_ID) {
                                            return a.powerschoolId - b.powerschoolId
                                        } else if (currentSortFilter === SortFilterOptions.LAST_NAME) {
                                            return a.lastName.localeCompare(b.lastName)
                                        } else if (currentSortFilter === SortFilterOptions.FIRST_NAME) {
                                            return a.firstName.localeCompare(b.firstName)
                                        } else if (currentSortFilter === SortFilterOptions.GRADE) {
                                            return a.grade - b.grade
                                        } else if (currentSortFilter === SortFilterOptions.BIRTHDATE) {
                                            return a.birthdate.getTime() - b.birthdate.getTime()
                                        } else {
                                            return 0
                                        }
                                    } else {
                                        if (currentSortFilter === SortFilterOptions.ID) {
                                            return (b.id || 0) - (a.id || 0)
                                        } else if (currentSortFilter === SortFilterOptions.POWERSCHOOL_ID) {
                                            return b.powerschoolId - a.powerschoolId
                                        } else if (currentSortFilter === SortFilterOptions.LAST_NAME) {
                                            return b.lastName.localeCompare(a.lastName)
                                        } else if (currentSortFilter === SortFilterOptions.FIRST_NAME) {
                                            return b.firstName.localeCompare(a.firstName)
                                        } else if (currentSortFilter === SortFilterOptions.GRADE) {
                                            return b.grade - a.grade
                                        } else if (currentSortFilter === SortFilterOptions.BIRTHDATE) {
                                            return b.birthdate.getTime() - a.birthdate.getTime()
                                        } else {
                                            return 0
                                        }
                                    }
                                })
                                .map((student: StudentData) => {
                                    return (
                                        <tr
                                            className={`${student.selected ? "bg-red-300 dark:bg-red-700" :
                                                student.edited ? "bg-yellow-300 dark:bg-yellow-700" : ""
                                                }`}
                                            key={student.powerschoolId}
                                        >
                                            <td className="border border-slate-500">
                                                <input
                                                    type="checkbox"
                                                    onChange={(e) => {
                                                        student.selected = e.target.checked
                                                        updateStudentState(student)
                                                    }}
                                                />
                                            </td>
                                            <td className="border border-slate-500">
                                                {student.id}
                                            </td>
                                            <td className="border border-slate-500">{student.powerschoolId}</td>
                                            <td className="border border-slate-500">
                                                <input
                                                    className='w-full bg-transparent border-none'
                                                    type="text"
                                                    value={student.lastName}
                                                    onChange={(e) => {
                                                        student.lastName = e.target.value
                                                        student.edited = true
                                                        updateStudentState(student)
                                                    }}
                                                />
                                            </td>
                                            <td className="border border-slate-500">
                                                <input
                                                    className='w-full bg-transparent border-none'
                                                    type="text"
                                                    value={student.firstName}
                                                    onChange={(e) => {
                                                        student.firstName = e.target.value
                                                        student.edited = true
                                                        updateStudentState(student)
                                                    }}
                                                />
                                            </td>
                                            <td className="border border-slate-500">
                                                <input
                                                    className='w-full bg-transparent border-none'
                                                    type="number"
                                                    value={student.grade}
                                                    onChange={(e) => {
                                                        student.grade = parseInt(e.target.value)
                                                        student.edited = true
                                                        updateStudentState(student)
                                                    }}
                                                />
                                            </td>
                                            <td className="border border-slate-500">
                                                <input
                                                    className='w-full bg-transparent border-none dark:[color-scheme:dark]'
                                                    type="date"
                                                    value={student.birthdate.toISOString().split("T")[0]}
                                                    onChange={(e) => {
                                                        student.birthdate = new Date(e.target.value)
                                                        student.edited = true
                                                        updateStudentState(student)
                                                    }}
                                                />
                                            </td>
                                            <td className="border border-slate-500">
                                                <select
                                                    className='w-full bg-transparent border-none'
                                                    value={student.gender}
                                                    onChange={(e) => {
                                                        student.gender = e.target.value
                                                        student.edited = true
                                                        updateStudentState(student)
                                                    }}
                                                >
                                                    <option value="M">M</option>
                                                    <option value="F">F</option>
                                                </select>
                                            </td>
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