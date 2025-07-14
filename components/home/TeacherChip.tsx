"use client";
import { getTeacherDataWithContext } from "@/api/teacher";
import { useState, useEffect } from "react";
import { Teacher } from "@/types/domain";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MotionButton from "@/components/MotionButton";

export default function TeacherChip() {
    const [isLoading, setIsLoading] = useState(true);
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTeacherData = async () => {
            try {
                const teacherData = await getTeacherDataWithContext();
                setTeacher(teacherData);
                setError(null);
            } catch (err) {
                console.error('Failed to load teacher data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setTeacher(null);
            } finally {
                setIsLoading(false);
            }
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

    if (error) {
        // In development, show the error for debugging
        if (process.env.NODE_ENV === 'development') {
            return (
                <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Teacher Error:</strong> {error}
                </div>
            );
        }
        // In production, don't show anything
        return null;
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