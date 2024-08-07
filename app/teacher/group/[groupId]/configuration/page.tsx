"use client";

import { ClassConfigurationData } from "@/app/dataClasses";
import { getConfigurationData, createPointTemplate, createConversionRule } from "@/app/supaApi/server/teacher/teacherServerActions";
import { Fragment, useEffect, useState } from "react";

type NewPointTemplateData = {
    name: string,
    pointGroupId: number,
    templateTypeId: number,
    conversionRuleId: number,
    studentGroupId: number,
}

type NewConversionRuleData = {
    name: string,
    typeId: number,
    value: number,
    formula: string,
    target: number,
}

export default function TeacherGroupConfiguration({ params: { groupId } }: { params: { groupId: string } }) {


    const [configurationData, setConfigurationData] = useState<ClassConfigurationData | null>(null);
    const [loading, setLoading] = useState(true);

    const [showAddNewTemplateModal, setShowAddNewTemplateModal] = useState(false);
    const [newPointTemplateData, setNewPointTemplateData] = useState<NewPointTemplateData>({
        name: '',
        pointGroupId: -1,
        templateTypeId: -1,
        conversionRuleId: -1,
        studentGroupId: -1,
    });

    const [showAddNewConversionRuleModal, setShowAddNewConversionRuleModal] = useState(false);
    const [newConversionRuleData, setNewConversionRuleData] = useState<NewConversionRuleData>({
        name: '',
        typeId: -1,
        value: -1,
        formula: '',
        target: -1,
    });

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

    const addNewConversionRuleModal = () => (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-1/2">
                <div className="text-2xl font-bold">Create New Conversion Rule</div>
                <div className="flex flex-col gap-2">
                    <input
                        type="text"
                        placeholder="Rule Name"
                        className="border p-2 rounded dark:[color-scheme:dark]"
                        value={newConversionRuleData.name}
                        onChange={(e) => {
                            setNewConversionRuleData({
                                ...newConversionRuleData,
                                name: e.target.value,
                            });
                        }}
                    />
                    <select
                        className="border p-2 rounded dark:[color-scheme:dark]"
                        value={newConversionRuleData.typeId}
                        onChange={(e) => {
                            setNewConversionRuleData({
                                ...newConversionRuleData,
                                typeId: parseInt(e.target.value),
                            });
                        }}
                    >
                        <option value={-1}>Select Rule Type</option>
                        {
                            configurationData?.conversionRuleTypes.map((conversionRuleType) => (
                                <option value={conversionRuleType.id}>{conversionRuleType.name}</option>
                            ))
                        }
                    </select>
                    <input
                        type="number"
                        placeholder="Rule Value"
                        className="border p-2 rounded dark:[color-scheme:dark]"
                        value={newConversionRuleData.value}
                        onChange={(e) => {
                            setNewConversionRuleData({
                                ...newConversionRuleData,
                                value: parseInt(e.target.value),
                            });
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Rule Formula"
                        className="border p-2 rounded dark:[color-scheme:dark]"
                        value={newConversionRuleData.formula}
                        onChange={(e) => {
                            setNewConversionRuleData({
                                ...newConversionRuleData,
                                formula: e.target.value,
                            });
                        }}
                    />
                    <input
                        type="number"
                        placeholder="Rule Target"
                        className="border p-2 rounded dark:[color-scheme:dark]"
                        value={newConversionRuleData.target}
                        onChange={(e) => {
                            setNewConversionRuleData({
                                ...newConversionRuleData,
                                target: parseInt(e.target.value),
                            });
                        }}
                    />
                </div>

                <button
                    className="bg-blue-500 text-white rounded p-2"
                    onClick={async () => {
                        setLoading(true);
                        await createConversionRule(
                            parseInt(groupId),
                            newConversionRuleData.name,
                            newConversionRuleData.value,
                            newConversionRuleData.formula,
                            newConversionRuleData.typeId,
                            newConversionRuleData.target
                        )
                        setShowAddNewConversionRuleModal(false);
                        await fetchConfigurationData();
                        setLoading(false);
                    }}
                >
                    Create Conversion Rule
                </button>
                <button
                    className="bg-red-500 text-white rounded p-2"
                    onClick={() => {
                        setShowAddNewConversionRuleModal(false);
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    )

    const addNewTemplateModal = () => (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-1/2">
                <div className="text-2xl font-bold">Create New Template</div>
                <div className="flex flex-col gap-2">
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
                    <select
                        className="border p-2 rounded dark:[color-scheme:dark]"
                        value={newPointTemplateData.conversionRuleId}
                        onChange={(e) => {
                            setNewPointTemplateData({
                                ...newPointTemplateData,
                                conversionRuleId: parseInt(e.target.value),
                            });
                        }}
                    >
                        {
                            configurationData?.conversionRules.map((conversionRule) => (
                                <option value={conversionRule.id}>{conversionRule.name}</option>
                            ))
                        }
                    </select>
                </div>
                <button
                    className="bg-blue-500 text-white rounded p-2"
                    onClick={async () => {
                        setLoading(true);
                        await createPointTemplate(
                            parseInt(groupId),
                            newPointTemplateData.name,
                            newPointTemplateData.pointGroupId,
                            newPointTemplateData.conversionRuleId,
                            newPointTemplateData.templateTypeId,
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
            {showAddNewConversionRuleModal && addNewConversionRuleModal()}
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
            <div className="w-full grid grid-cols-9 pb-2">
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 col-span-4 border-b">Template</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 col-span-5 border-b border-x">Conversion Rule</div>

                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Name</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Point Group</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Type</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Max Points</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b border-s">Rule Name</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Rule Type</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Rule Value</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Rule Formula</div>
                <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Max Input Value</div>
                {
                    configurationData?.templates.map((pointTemplate, index) => (
                        <div
                            className="col-span-9 grid grid-cols-9 border-y cursor-pointer"
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
                            <div className="flex justify-center">{"pts"}</div>
                            <div className="flex justify-center border-s">{pointTemplate.conversionRule?.name}</div>
                            <div className="flex justify-center">{pointTemplate.conversionRule?.ruleType}</div>
                            <div className="flex justify-center">{pointTemplate.conversionRule?.value}</div>
                            <div className="flex justify-center">{pointTemplate.conversionRule?.formula ?? 'N/A'}</div>
                            <div className="flex justify-center">{pointTemplate.conversionRule?.target}</div>
                        </div>
                    ))
                }
            </div>
            <div>
                <div className="text-xl">
                    Conversion Rules
                </div>
                <button
                    className="bg-blue-500 text-white rounded p-2"
                    onClick={() => {
                        setShowAddNewConversionRuleModal(true);
                    }}
                >
                    Create New Conversion Rule
                </button>
                <div className="w-full grid grid-cols-5">
                    <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Name</div>
                    <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Type</div>
                    <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Value</div>
                    <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Formula</div>
                    <div className="flex justify-center bg-slate-300 dark:bg-slate-700 sticky top-0 border-b">Target</div>
                    {
                        configurationData?.conversionRules.map((conversionRule, index) => (
                            <div className="col-span-5 grid grid-cols-5 border-y cursor-pointer">
                                <div className="flex justify-center">{conversionRule.name}</div>
                                <div className="flex justify-center">{conversionRule.type}</div>
                                <div className="flex justify-center">{conversionRule.value}</div>
                                <div className="flex justify-center">{conversionRule.formula ?? 'N/A'}</div>
                                <div className="flex justify-center">{conversionRule.target}</div>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    )
}