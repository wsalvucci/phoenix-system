"use client";

import { useEffect, useState } from "react";

// Force static generation to reduce serverless functions
export const dynamic = 'force-static';
import { deleteStudentFromParent, getStudentsOfParent, linkStudentToParent } from "../supaApi/server/parent/parentApi";
import Link from "next/link";

export default function ParentDashboard() {
    const [linkedStudents, setLinkedStudents] = useState<{ id: number, name: string }[]>([])
    const [newStudentData, setNewStudentData] = useState<{ schoolId: number, linkCode: string }>({
        schoolId: -1,
        linkCode: ""
    })
    const [addStudentResponseText, setAddStudentResponseText] = useState<string>("")
    const [addingStudent, setAddingStudent] = useState<boolean>(false)

    const [confirmDisconnectData, setConfirmDisconnectData] = useState<{ visible: boolean, id: number, name: string }>({
        visible: false,
        id: -1,
        name: ""
    })

    function retrieveStudents() {
        getStudentsOfParent().then((students) => {
            setLinkedStudents(
                students.map((student) => { return { id: student.id, name: student.fullName } })
            )
        })
    }

    useEffect(() => {
        retrieveStudents()
    }, [])

    function addStudent() {
        if (newStudentData.schoolId === -1) return
        setAddingStudent(true)
        linkStudentToParent(
            newStudentData.schoolId,
            newStudentData.linkCode
        ).then((data: { error?: string }) => {
            setAddingStudent(false)
            if (data.error !== undefined) {
                setAddStudentResponseText(data.error)
            } else {
                setAddStudentResponseText("Student Added!")
                retrieveStudents()
            }
        })
    }

    function disconnectStudent(
        studentId: number
    ) {
        setConfirmDisconnectData({
            visible: false,
            id: -1,
            name: ""
        })
        deleteStudentFromParent(studentId).then((data: { error?: string }) => {
            retrieveStudents()
        })
    }

    function ConfirmDisconnect() {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-1/2">
                    <div>
                        <div className="flex justify-center">Are you sure you want to disconnect from:</div>
                        <div className="flex justify-center">{confirmDisconnectData.name}</div>
                        <div className="flex justify-center">You&apos;ll have to ask an admin for their link code to connect to them again.</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            className="bg-red-500 rounded-lg px-3 py-1"
                            onClick={() => {
                                disconnectStudent(confirmDisconnectData.id)
                            }}
                        >
                            Confirm
                        </button>
                        <button
                            className="bg-green-500 rounded-lg px-3 py-1"
                            onClick={() => {
                                setConfirmDisconnectData({
                                    visible: false,
                                    id: -1,
                                    name: ""
                                })
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )
    }


    return (
        <div className="w-dvw h-dvh bg-slate-100 dark:bg-slate-900">
            {confirmDisconnectData.visible && ConfirmDisconnect()}
            {
                linkedStudents.map((student) =>
                    <div key={student.id} className="p-5 m-5 rounded-lg bg-slate-200 dark:bg-slate-800 flex justify-between">
                        <div>
                            <div>
                                {student.name}
                            </div>
                            <Link
                                className="px-3 py-1 bg-slate-300 dark:bg-slate-700 rounded-lg hover:bg-slate-400 dark:hover:bg-slate-600"
                                href={`parent/${student.id}`}>
                                View Stats
                            </Link>
                        </div>
                        <button
                            className="bg-red-500 rounded-lg px-3 py-1"
                            onClick={() => {
                                setConfirmDisconnectData({
                                    visible: true,
                                    id: student.id,
                                    name: student.name
                                })
                            }}>Disconnect</button>
                    </div>
                )
            }
            <div className="p-5 m-5 rounded-lg bg-green-200 dark:bg-green-800">
                Add New Student
                <div className="grid gap-1">
                    <input
                        type="number"
                        name="schoolId"
                        placeholder="School ID"
                        className="input dark:[color-scheme:dark]"
                        onChange={(e) => {
                            setNewStudentData({
                                ...newStudentData,
                                schoolId: parseInt(e.target.value)
                            })
                        }}
                    />
                    <input
                        type="text"
                        name="linkCode"
                        placeholder="Link Code"
                        className="input dark:[color-scheme:dark]"
                        onChange={(e) => {
                            setNewStudentData({
                                ...newStudentData,
                                linkCode: e.target.value
                            })
                        }}
                    />
                    <button
                        className="rounded-lg bg-green-400 dark:bg-green-600 hover:bg-green-300 dark:hover:bg-green-700"
                        disabled={addingStudent}
                        onClick={() => {
                            addStudent()
                        }}
                    >
                        {addingStudent ? "Adding..." : "Add Student"}
                    </button>
                    <div>
                        {addStudentResponseText}
                    </div>
                </div>
            </div>
        </div>
    )
}