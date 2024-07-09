"use client";
import { PointTemplate, StudentGroup } from "@/app/dataClasses";
import { clientGetPointTemplatesForStudentGroup } from "@/app/supaApi/client/teacher/pointTemplates/pointTemplatesApi";
import { clientGetStudentGroup } from "@/app/supaApi/client/teacher/teacherApi";
import { useEffect, useState } from "react";

export default function TeacherGroupConfiguration({ params: { groupId } }: { params: { groupId: string } }) {

    const [groupData, setGroupData] = useState<StudentGroup | null>(null);
    const [pointTemplates, setPointTemplates] = useState<PointTemplate[] | null>(null);

    const fetchGroupData = async () => {
        setGroupData(await clientGetStudentGroup(parseInt(groupId)))
        setPointTemplates(await clientGetPointTemplatesForStudentGroup(parseInt(groupId)))
    }


    useEffect(() => {
        fetchGroupData();
    }, []);

    const templateRow = (pointTemplate: PointTemplate) => (
        <div key={pointTemplate.id} className="grid grid-cols-7">
            <div>{pointTemplate.name}</div>
            <div>{pointTemplate.templateType.name}</div>
            <div>{pointTemplate.conversionRule.name}</div>
            <div>{pointTemplate.conversionRule.type.name}</div>
            <div>{pointTemplate.conversionRule.value}</div>
            <div>{pointTemplate.conversionRule.formula ? pointTemplate.conversionRule.formula : "N/A"}</div>
            <div>{pointTemplate.pointGroup.name}</div>
        </div>
    )

    return (
        <div className="animate-in m-3">
            <div className="text-2xl">Group Configuration</div>
            <div className="rounded-lg bg-slate-300 dark:bg-slate-700 p-3">
                {
                    pointTemplates && (
                        <div>
                            <div className="text-xl">Point Templates</div>
                            <div className="grid grid-cols-7 border-b">
                                <div>Name</div>
                                <div>Type</div>
                                <div>Rule</div>
                                <div>Rule Type</div>
                                <div>Rule Value</div>
                                <div>Formula</div>
                                <div>Group</div>
                            </div>
                            <ul>
                                {pointTemplates.map((pointTemplate) => (
                                    templateRow(pointTemplate)
                                ))}
                            </ul>
                        </div>
                    )
                }
            </div>
        </div>
    )
}