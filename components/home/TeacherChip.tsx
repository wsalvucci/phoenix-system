"use client";
import { getOwnTeacherData } from "@/api/teacher";
import { useState } from "react";
import { Teacher } from "@/types/domain";
import { useEffect } from "react";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MotionButton from "@/components/MotionButton";

export default function TeacherChip() {
    const [isLoading, setIsLoading] = useState(true);
    const [teacher, setTeacher] = useState<Teacher | null>(null);

    useEffect(() => {
        const fetchTeacherData = async () => {
            const teacherData = await getOwnTeacherData();
            console.log(teacherData);
            setTeacher(teacherData);
            setIsLoading(false);
        };

        fetchTeacherData();
    }, []);

    if (isLoading) {

        return (
            <div className="w-full bg-gray-200 rounded-lg px-4 py-6 animate-pulse">
                Loading...
            </div>
        );
    }

    if (teacher === null) {
        return null;
    }

    return (
        <MotionButton href="/teacher" variant="primary" fullWidth>
            <div className="text-lg relative z-10">
                <div className="font-bold">
                    {teacher?.firstName} {teacher?.lastName}
                </div>
            </div>
            <div className="flex items-center justify-center relative z-10">
                Teacher Dashboard &nbsp; <FontAwesomeIcon icon={faArrowRight} />
            </div>
        </MotionButton>
    )
}