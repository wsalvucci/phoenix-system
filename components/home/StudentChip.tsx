"use client";
import { getStudentDataWithContext } from "@/api/student";
import { Student } from "@/types/domain";
import { faArrowRight, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { numberToOrdinal } from "@/app/dataClasses";
import MotionButton from "@/components/MotionButton";

export default function StudentChip() {
    const [isLoading, setIsLoading] = useState(true);
    const [student, setStudent] = useState<Student | null>(null);

    useEffect(() => {
        const fetchStudentData = async () => {
            try {
                const studentData = await getStudentDataWithContext();
                setStudent(studentData);
            } catch (error) {
                console.error("Error fetching student data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudentData();
    }, []);

    if (isLoading) {
        return (
            <div className="w-full bg-gray-200 rounded-lg px-4 py-6 animate-pulse">
                Loading...
            </div>
        );
    }

    if (!student) {
        return null;
    }

    return (
        <MotionButton href="/student" variant="primary" fullWidth>
            <div className="text-lg relative z-10">
                <div className="font-bold">
                    {student.firstName} {student.lastName}
                </div>
                <div className="text-sm">
                    {numberToOrdinal(student.grade)} Grade
                </div>
            </div>
            <div className="flex items-center justify-center relative z-10">
                View Your Stats &nbsp; <FontAwesomeIcon icon={faArrowRight} />
            </div>
        </MotionButton>
    );
}