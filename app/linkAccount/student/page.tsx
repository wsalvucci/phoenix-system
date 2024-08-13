"use client";

import { useState } from "react";
import linkStudent from "@/app/supaApi/server/linkStudent";

export default function LinkStudent() {

    const [schoolId, setSchoolId] = useState<number>(-1)
    const [studentLinkCode, setStudentLinkCode] = useState<string>('')
    const [errorText, setErrorText] = useState<string | null>(null)

    const handleLinkStudent = async (schoolId: number, linkCode: string) => {
        const linkResult = await linkStudent(schoolId, linkCode);
        if (linkResult.success) {
            window.location.href = "/student"
        } else {
            setErrorText(linkResult.message)
        }
    }

    return (
        <div>
            <input
                className="w-full dark:[color-scheme:dark]"
                type="number"
                placeholder="School ID"
                onChange={(e) => setSchoolId(parseInt(e.target.value))}
            />
            <input
                className="w-full dark:[color-scheme:dark]"
                type="text"
                placeholder="Student Link Code"
                onChange={(e) => setStudentLinkCode(e.target.value)}
            />
            <button
                className="w-full bg-blue-300 dark:bg-blue-700 rounded-lg"
                onClick={() => handleLinkStudent(schoolId, studentLinkCode)}
            >Link Student</button>
            {
                errorText && <div className="text-red-500">{errorText}</div>
            }
        </div>
    )
}