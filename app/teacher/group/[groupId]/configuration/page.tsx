"use client";

import { ClassConfigurationData } from "@/app/dataClasses";
import { getConfigurationData } from "@/app/supaApi/server/teacher/teacherServerActions";
import { Fragment, useEffect, useState } from "react";

export default function TeacherGroupConfiguration({ params: { groupId } }: { params: { groupId: string } }) {


    const [configurationData, setConfigurationData] = useState<ClassConfigurationData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchConfigurationData = async () => {
        setLoading(true);
        const data = await getConfigurationData(parseInt(groupId));
        console.log(data);
        setConfigurationData(data);
        setLoading(false);
    }

    useEffect(() => {
        fetchConfigurationData();
    }, []);

    const loadingScreen = () => (
        <div className="h-full w-full flex justify-center items-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
    )

    return (
        <div className="animate-in w-full h-full">
            {loading && loadingScreen()}
            <div>
                <div className="text-2xl font-bold">Configuration</div>
            </div>
            <div>
                <div className="text-xl">
                    Templates
                </div>
                <button className="bg-blue-500 text-white rounded p-2">
                    Create New Template
                </button>
            </div>
            <div className="w-full grid grid-cols-8">
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 col-span-3 border-b">Template</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 col-span-5 border-b border-x">Conversion Rule</div>

                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Name</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Point Group</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Type</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b border-s">Rule Name</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Rule Type</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Rule Value</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Rule Formula</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Max Input Value</div>
                {
                    configurationData?.templates.map((pointTemplate, index) => (
                        <div
                            className="col-span-8 grid grid-cols-8 border-y cursor-pointer"
                            onClick={() => {
                                console.log(pointTemplate);
                            }}
                        >
                            <div className="flex justify-center">{pointTemplate.name}</div>
                            <div className="flex justify-center" style={{
                                background: 'linear-gradient(180deg, #00000000 90%, ' + pointTemplate.pointGroup?.color + ' 90%)'
                            }}>
                                {pointTemplate.pointGroup?.name}
                            </div>
                            <div className="flex justify-center">{pointTemplate.templateType}</div>
                            <div className="flex justify-center border-s">{pointTemplate.conversionRule?.name}</div>
                            <div className="flex justify-center">{pointTemplate.conversionRule?.ruleType}</div>
                            <div className="flex justify-center">{pointTemplate.conversionRule?.value}</div>
                            <div className="flex justify-center">{pointTemplate.conversionRule?.formula ?? 'N/A'}</div>
                            <div className="flex justify-center">{pointTemplate.conversionRule?.target}</div>
                        </div>
                    ))
                }
            </div>
        </div>
    )
}