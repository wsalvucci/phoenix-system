"use client";

import { useState } from "react";
import { linkTeacher } from "../serverActions";
import { createClient } from "@/utils/supabase/client";
import clientLinkTeacher from "@/app/supaApi/client/clientLinkTeacher";

export default function LinkTeacher() {

    const [schoolId, setSchoolId] = useState<number>(-1)
    const [teacherLinkCode, setTeacherLinkCode] = useState<string>('')
    const [errorText, setErrorText] = useState<string | null>(null)

    const supabase = createClient();

    const handleLinkTeacher = async (schoolId: number, linkCode: string) => {
        const linkResult = await clientLinkTeacher(schoolId, linkCode);
        if (linkResult.success) {
            window.location.href = "/teacher/" + linkResult.linkId
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
                placeholder="Teacher Link Code"
                onChange={(e) => setTeacherLinkCode(e.target.value)}
            />
            <button
                className="w-full bg-blue-300 dark:bg-blue-700 rounded-lg"
                onClick={() => handleLinkTeacher(schoolId, teacherLinkCode)}
            >Link Teacher</button>
            {
                errorText && <div className="text-red-500">{errorText}</div>
            }
        </div>
    )
}