"use client";

import { ClassConfigurationData, convertPointUsingRuleType, stringToRuleType } from "@/app/dataClasses";
import { getConfigurationData, createPointTemplate, createConversionRule } from "@/app/supaApi/server/teacher/teacherServerActions";
import { Fragment, useEffect, useState } from "react";

type NewPointTemplateData = {
    name: string,
    pointGroupId: number,
    templateTypeId: number,
    conversionRuleTypeId: number,
    studentGroupId: number,
    conversionRuleValue: number,
    conversionRuleFormula: string | null,
    conversionRuleTarget: number,
}

export default function TeacherGroupConfiguration({ params: { groupId } }: { params: { groupId: string } }) {


    const [configurationData, setConfigurationData] = useState<ClassConfigurationData | null>(null);
    const [loading, setLoading] = useState(true);

    const [showAddNewTemplateModal, setShowAddNewTemplateModal] = useState(false);
    const [newPointTemplateData, setNewPointTemplateData] = useState<NewPointTemplateData>({
        name: '',
        pointGroupId: -1,
        templateTypeId: -1,
        conversionRuleTypeId: -1,
        studentGroupId: -1,
        conversionRuleValue: -1,
        conversionRuleFormula: null,
        conversionRuleTarget: 0,
    });

    const fetchConfigurationData = async () => {
        setLoading(true);
        const data = await getConfigurationData(parseInt(groupId));
        console.log(data);
        setConfigurationData(data);
        setNewPointTemplateData({
            name: '',
            pointGroupId: data.pointGroups[0].id,
            templateTypeId: data.templateTypes[0].id,
            conversionRuleTypeId: data.conversionRuleTypes[0].id,
            studentGroupId: parseInt(groupId),
            conversionRuleValue: 0,
            conversionRuleFormula: null,
            conversionRuleTarget: 0,
        });
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

    const addNewTemplateModal = () => (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-1/2">
                <div className="text-2xl font-bold">Create New Template</div>
                <div className="flex flex-col gap-2">
                    Name:
                    <input
                        type="text"
                        placeholder="Template Name"
                        className="border p-2 rounded dark:[color-scheme:dark]"
                        value={newPointTemplateData.name}
                        onChange={(e) => {
                            setNewPointTemplateData({
                                ...newPointTemplateData,
                                name: e.target.value,
                            });
                        }}
                    />
                    Point Group:
                    <select
                        className="border p-2 rounded dark:[color-scheme:dark]"
                        value={newPointTemplateData.pointGroupId}
                        onChange={(e) => {
                            setNewPointTemplateData({
                                ...newPointTemplateData,
                                pointGroupId: parseInt(e.target.value),
                            });
                        }}
                    >
                        {
                            configurationData?.pointGroups.map((pointGroup) => (
                                <option value={pointGroup.id}>{pointGroup.name}</option>
                            ))
                        }
                    </select>
                    Template Type:
                    <select
                        className="border p-2 rounded dark:[color-scheme:dark]"
                        value={newPointTemplateData.templateTypeId}
                        onChange={(e) => {
                            setNewPointTemplateData({
                                ...newPointTemplateData,
                                templateTypeId: parseInt(e.target.value),
                            });
                        }}
                    >
                        {
                            configurationData?.templateTypes.map((templateType) => (
                                <option value={templateType.id}>{templateType.name}</option>
                            ))
                        }
                    </select>
                    Rule Type:
                    <select
                        className="border p-2 rounded dark:[color-scheme:dark]"
                        value={newPointTemplateData.conversionRuleTypeId}
                        onChange={(e) => {
                            setNewPointTemplateData({
                                ...newPointTemplateData,
                                conversionRuleTypeId: parseInt(e.target.value),
                            });
                        }}
                    >
                        {
                            configurationData?.conversionRuleTypes.map((conversionRule) => (
                                <option value={conversionRule.id}>{conversionRule.name}</option>
                            ))
                        }
                    </select>
                    Value:
                    <input
                        type="number"
                        placeholder="Conversion Rule Value"
                        className="border p-2 rounded dark:[color-scheme:dark]"
                        value={newPointTemplateData.conversionRuleValue}
                        onChange={(e) => {
                            setNewPointTemplateData({
                                ...newPointTemplateData,
                                conversionRuleValue: parseInt(e.target.value),
                            });
                        }}
                    />
                </div>
                <button
                    className="bg-blue-500 text-white rounded p-2"
                    onClick={async () => {
                        setLoading(true);
                        await createPointTemplate(
                            parseInt(groupId),
                            newPointTemplateData.name,
                            newPointTemplateData.pointGroupId,
                            newPointTemplateData.templateTypeId,
                            newPointTemplateData.conversionRuleTypeId,
                            newPointTemplateData.conversionRuleValue,
                            newPointTemplateData.conversionRuleTarget,
                        )
                        setShowAddNewTemplateModal(false);
                        await fetchConfigurationData();
                        setLoading(false);
                    }}
                >
                    Create Template
                </button>
                <button
                    className="bg-red-500 text-white rounded p-2"
                    onClick={() => {
                        setShowAddNewTemplateModal(false);
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    )

    return (
        <div className="animate-in w-full h-full">
            {loading && loadingScreen()}
            {showAddNewTemplateModal && addNewTemplateModal()}
            <div>
                <div className="text-2xl font-bold">Configuration</div>
            </div>
            <div>
                <div className="text-xl">
                    Templates
                </div>
                <button
                    className="bg-blue-500 text-white rounded p-2"
                    onClick={() => {
                        setShowAddNewTemplateModal(true);
                    }}>
                    Create New Template
                </button>
            </div>
            <div className="w-full grid grid-cols-6 pb-2">
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 col-span-3 border-b">Template</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 col-span-3 border-b border-x">Conversion Rule</div>

                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Name</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Point Group</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Type</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b border-s">Rule Type</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Rule Value</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Rule Formula</div>
                {
                    configurationData?.templates.map((pointTemplate, index) => (
                        <div
                            className="col-span-6 grid grid-cols-6 border-y cursor-pointer"
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
                            <div className="flex justify-center border-s">{pointTemplate.conversionRuleType}</div>
                            <div className="flex justify-center">{pointTemplate.conversionRuleValue}</div>
                            <div className="flex justify-center">{pointTemplate.conversionRuleFormula ?? 'N/A'}</div>
                        </div>
                    ))
                }
            </div>
        </div>
    )
}