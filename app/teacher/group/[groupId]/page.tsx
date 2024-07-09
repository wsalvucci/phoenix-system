"use client";
import { StudentGroup } from "@/app/dataClasses";
import { clientGetStudentGroup } from "@/app/supaApi/client/teacher/teacherApi";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";

export default function TeacherGroup({ params: { groupId } }: { params: { groupId: string } }) {
    const supabase = createClient();

    const [groupData, setGroupData] = useState<StudentGroup | null>(null);

    const fetchGroupData = async () => {
        setGroupData(await clientGetStudentGroup(parseInt(groupId)))
    }

    useEffect(() => {
        fetchGroupData();
    }, []);

    return (
        <div>
            {groupData && (
                <div>
                    <h1>{groupData.name}</h1>
                </div>
            )}
        </div>
    )
}