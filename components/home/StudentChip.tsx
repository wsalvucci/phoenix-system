"use client";
import { getStudentDataWithContext } from "@/api/student";
import { Student } from "@/types/domain";
import { faArrowRight, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import MotionButton from "@/components/MotionButton";

export default function StudentChip({ isSignedIn = false }: { isSignedIn?: boolean }) {
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
            <div className="h-16 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" aria-label="Loading student access">
            </div>
        );
    }

    if (!student) {
        // A signed-in user with no linked student (new account, `linkedUser`
        // not yet set) needs a way to link one.
        if (isSignedIn) {
            return (
                <MotionButton href="/linkAccount/student" variant="outline" fullWidth>
                    <div className="relative z-10 font-semibold">Link student account</div>
                    <div className="flex items-center justify-center relative z-10">
                        <FontAwesomeIcon icon={faUser} />
                    </div>
                </MotionButton>
            );
        }
        return null;
    }

    return (
        <MotionButton href="/student" variant="primary" fullWidth className="min-h-16 !justify-between">
            <div className="relative z-10 text-left">
                <div className="font-bold">
                    {student.firstName} {student.lastName}
                </div>
                <div className="text-sm">
                    Grade {student.grade}
                </div>
            </div>
            <div className="flex items-center justify-center relative z-10">
                View progress <FontAwesomeIcon icon={faArrowRight} />
            </div>
        </MotionButton>
    );
}
