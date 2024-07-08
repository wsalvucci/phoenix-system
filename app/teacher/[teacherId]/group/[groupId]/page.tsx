"use client";
import { StudentGroup } from "@/app/dataClasses";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";

export default function TeacherGroup({ params: { teacherId, groupId } }: { params: { teacherId: string, groupId: string } }) {
    const supabase = createClient();

    const [groupData, setGroupData] = useState<StudentGroup | null>(null);

    const fetchGroupData = async () => {
        const { data, error } = await supabase
            .from("student_group")
            .select("*, student (*)")
            .eq("id", parseInt(groupId))
            .maybeSingle();

        if (error) {
            console.error("Error fetching group data", error);
        } else if (data === null) {
            console.log("No group found with id", groupId);
            window.location.href = "/";
        } else {
            console.log(data);
            setGroupData(new StudentGroup(data.id, data.name, data.parent_id));
        }
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