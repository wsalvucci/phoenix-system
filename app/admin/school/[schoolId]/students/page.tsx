"use client";

import { useEffect, useState } from 'react'
import CSVReader from 'react-csv-reader'
import { Student } from '@/app/dataClasses';
import { clientGetSchoolStudents } from '@/app/supaApi/client/admin/students/adminStudentsApi';
import { DateTime } from 'luxon';
import { bulkAddStudentsToSchool } from '@/app/supaApi/server/admin/adminApi';

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

class PreviewStudent {
    powerschoolId: number;
    firstName: string;
    lastName: string;
    grade: number;
    birthdate: DateTime;
    gender: string;

    constructor(
        powerschoolId: number,
        firstName: string,
        lastName: string,
        grade: number,
        birthdate: DateTime,
        gender: string,
    ) {
        this.powerschoolId = powerschoolId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.grade = grade;
        this.birthdate = birthdate;
        this.gender = gender;
    }
}

export default function StudentsDashboard({ params: { schoolId } }: { params: { schoolId: string } }) {

    const [bulkAddStudentsDialogueOpen, setBulkAddStudentsDialogueOpen] = useState<boolean>(false)
    const [previewStudents, setPreviewStudents] = useState<PreviewStudent[]>([])
    const [initialStudents, setInitialStudents] = useState<Student[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [studentSearchString, setStudentSearchString] = useState<string>("")

    const [activelyBulkAddingStudents, setActivelyBulkAddingStudents] = useState<boolean>(false)

    const [currentSortDirection, setCurrentSortDirection] = useState<SortDirections>(SortDirections.ASC)
    const [currentSortFilter, setCurrentSortFilter] = useState<SortFilterOptions>(SortFilterOptions.ID)

    const [studentFilters, setStudentFilters] = useState<StudentFilters>(new StudentFilters("", null, null, null, null))

    const fetchStudents = async () => {
        const fetchedStudents = await clientGetSchoolStudents(parseInt(schoolId))
        if (fetchedStudents === null) {
            console.error("Error fetching students")
        } else {
            setStudents(fetchedStudents.map((student: Student) => ({ ...student })))
            setInitialStudents(fetchedStudents.map((student: Student) => ({ ...student })))
        }
    }

    useEffect(() => {
        fetchStudents();
    }, []);

    const updateStudentFilterState = async () => {
        setStudentFilters(new StudentFilters(
            studentFilters.searchString,
            studentFilters.birthdateMin,
            studentFilters.birthdateMax,
            studentFilters.gradeMin,
            studentFilters.gradeMax,
        ))
    }

    const bulkAddStudents = async (students: PreviewStudent[]) => {
        if (activelyBulkAddingStudents) {
            return
        }
        setActivelyBulkAddingStudents(true)
        bulkAddStudentsToSchool(
            students.map((student: PreviewStudent) => ({
                powerschoolId: student.powerschoolId,
                firstName: student.firstName,
                lastName: student.lastName,
                grade: student.grade,
                birthdate: student.birthdate.toISODate() ?? "",
                gender: student.gender,
                schoolId: parseInt(schoolId)
            })),
            parseInt(schoolId)
        )
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
        sortFilter: SortFilterOptions | null,
    }) => {
        return (
            <div className="text-md">
                <div className="w-full flex justify-center">
                    {title}
                </div>
                {sortFilter !== null &&
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
                    </div>}
            </div>
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
                    onFileLoaded={(data: any) => {
                        setPreviewStudents([])
                        var studentData: PreviewStudent[] = []
                        data.forEach((student: any) => {
                            if (student.Id === "" || student.Id === null || student.Id === undefined) {
                                return
                            }
                            console.log(student)
                            studentData.push(new PreviewStudent(
                                student.Id,
                                student.Name.split(",")[1],
                                student.Name.split(",")[0],
                                student.Grade,
                                DateTime.fromFormat(student.Birthday, "MM/dd/yy"),
                                student.Gender
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
                                    .map((student: PreviewStudent) => {
                                        return (
                                            <tr key={student.powerschoolId}>
                                                <td className="border border-slate-500">{student.powerschoolId}</td>
                                                <td className="border border-slate-500">{student.lastName}</td>
                                                <td className="border border-slate-500">{student.firstName}</td>
                                                <td className="border border-slate-500">{student.grade}</td>
                                                <td className="border border-slate-500">{student.birthdate.toFormat("MMM dd yyyy")}</td>
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
                <div className='flex justify-around'>
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
                                        className="w-full mx-1 p-1 rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
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
                                        className="w-full mx-1 p-1 rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full h-5/6 overflow-y-scroll">
                <div className="w-full grid grid-cols-8">
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
                    {tableHeader({
                        title: "Link Code",
                        sortFilter: null,
                    })}
                    {
                        students
                            .filter((student: Student) => {
                                return student.lastName.toLowerCase().includes(studentSearchString.toLowerCase()) ||
                                    student.firstName.toLowerCase().includes(studentSearchString.toLowerCase()) ||
                                    studentSearchString === ""
                            })
                            .filter((student: Student) => {
                                return (studentFilters.birthdateMin === null || (student.birthdate ?? new Date(0)) >= studentFilters.birthdateMin)
                                    && (studentFilters.birthdateMax === null || (student.birthdate ?? new Date(0)) <= studentFilters.birthdateMax)
                                    && (studentFilters.gradeMin === null || student.grade >= studentFilters.gradeMin)
                                    && (studentFilters.gradeMax === null || student.grade <= studentFilters.gradeMax)
                            })
                            .sort((a: Student, b: Student) => {
                                if (currentSortDirection === SortDirections.ASC) {
                                    if (currentSortFilter === SortFilterOptions.ID) {
                                        return (a.id || 0) - (b.id || 0)
                                    } else if (currentSortFilter === SortFilterOptions.POWERSCHOOL_ID) {
                                        return a.powerSchoolId - b.powerSchoolId
                                    } else if (currentSortFilter === SortFilterOptions.LAST_NAME) {
                                        return a.lastName.localeCompare(b.lastName)
                                    } else if (currentSortFilter === SortFilterOptions.FIRST_NAME) {
                                        return a.firstName.localeCompare(b.firstName)
                                    } else if (currentSortFilter === SortFilterOptions.GRADE) {
                                        return a.grade - b.grade
                                    } else if (currentSortFilter === SortFilterOptions.BIRTHDATE) {
                                        return (a.birthdate ? a.birthdate.getTime() : 0) - (b.birthdate ? b.birthdate.getTime() : 0)
                                    } else if (currentSortFilter === SortFilterOptions.GENDER) {
                                        return (a.gender ?? "").localeCompare(b.gender ?? "")
                                    } else {
                                        return 0
                                    }
                                } else {
                                    if (currentSortFilter === SortFilterOptions.ID) {
                                        return (b.id || 0) - (a.id || 0)
                                    } else if (currentSortFilter === SortFilterOptions.POWERSCHOOL_ID) {
                                        return b.powerSchoolId - a.powerSchoolId
                                    } else if (currentSortFilter === SortFilterOptions.LAST_NAME) {
                                        return b.lastName.localeCompare(a.lastName)
                                    } else if (currentSortFilter === SortFilterOptions.FIRST_NAME) {
                                        return b.firstName.localeCompare(a.firstName)
                                    } else if (currentSortFilter === SortFilterOptions.GRADE) {
                                        return b.grade - a.grade
                                    } else if (currentSortFilter === SortFilterOptions.BIRTHDATE) {
                                        return (b.birthdate ? b.birthdate.getTime() : 0) - (a.birthdate ? a.birthdate.getTime() : 0)
                                    } else if (currentSortFilter === SortFilterOptions.GENDER) {
                                        return (b.gender ?? "").localeCompare(a.gender ?? "")
                                    } else {
                                        return 0
                                    }
                                }
                            })
                            .map((student: Student) => {
                                return (
                                    <div className='grid col-span-8 grid-cols-8 hover:bg-slate-200 dark:hover:bg-slate-800'>
                                        <div>{student.id}</div>
                                        <div>{student.powerSchoolId}</div>
                                        <div>{student.lastName}</div>
                                        <div>{student.firstName}</div>
                                        <div>{student.grade}</div>
                                        <div>{student.birthdate?.toISOString().split("T")[0]}</div>
                                        <div>{student.gender}</div>
                                        <div>{student.linkCode}</div>
                                    </div>
                                )
                            })
                    }
                </div>
            </div>
            {bulkAddStudentsDialogueOpen && bulkAddStudentsDialogue()}
        </div>
    )
}