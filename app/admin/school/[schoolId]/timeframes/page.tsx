"use client";

import { SchoolTimeframe } from "@/app/dataClasses";
import { activateSchoolTimeframe, addSchoolTimeframe, deleteSchoolTimeframe, editSchoolTimeframe, getSchoolTimeframes } from "@/app/supaApi/server/admin/adminApi";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";

type NewTimeframe = {
    name: string,
    startsAt: string,
    endsAt: string
}

type EditedTimeframe = {
    id: number,
    name: string,
    startsAt: string,
    endsAt: string
}

type TimeframeToDelete = {
    id: number,
    name: string
}

export default function TimeframesDashboard({ params: { schoolId } }: { params: { schoolId: string } }) {

    const [timeframes, setTimeframes] = useState<SchoolTimeframe[]>([])

    const [showNewTimeframeDialog, setShowNewTimeframeDialog] = useState<boolean>(false)
    const [newTimeframe, setNewTimeframe] = useState<NewTimeframe>({
        name: '',
        startsAt: '',
        endsAt: ''
    })

    const [showEditTimeframeDialog, setShowEditTimeframeDialog] = useState<boolean>(false)
    const [editedTimeframe, setEditedTimeframe] = useState<EditedTimeframe | null>(null)

    const [showDeleteTimeframeDialog, setShowDeleteTimeframeDialog] = useState<boolean>(false)
    const [timeframeToDelete, setTimeframeToDelete] = useState<TimeframeToDelete | null>(null)

    async function getTimeframeData() {
        const data = await getSchoolTimeframes(parseInt(schoolId))
        setTimeframes(data)
    }

    async function saveNewTimeframe() {
        setShowNewTimeframeDialog(false)
        await addSchoolTimeframe(
            parseInt(schoolId),
            newTimeframe.startsAt,
            newTimeframe.endsAt,
            newTimeframe.name
        )
        getTimeframeData()
    }

    async function updateTimeframe() {
        setShowEditTimeframeDialog(false)
        if (editedTimeframe === null) return
        await editSchoolTimeframe(
            parseInt(schoolId),
            editedTimeframe.id,
            editedTimeframe.startsAt,
            editedTimeframe.endsAt,
            editedTimeframe.name
        )
        getTimeframeData()
    }

    async function deleteTimeframe() {
        setShowDeleteTimeframeDialog(false)
        if (timeframeToDelete === null) return
        await deleteSchoolTimeframe(
            parseInt(schoolId),
            timeframeToDelete.id
        )
        getTimeframeData()
    }

    async function activateTimeframe(timeframeId: number) {
        await activateSchoolTimeframe(
            parseInt(schoolId),
            timeframeId
        )
        getTimeframeData()
    }

    useEffect(() => {
        getTimeframeData()
    }, [])

    function editTimeframeDialog() {
        return (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-fit h-fit">
                    <div className="text-xl pb-5">
                        Edit timeframe: {editedTimeframe?.name}
                    </div>
                    <div className="grid grid-cols-2 gap-x-5">
                        <input
                            className="p-3 my-1 col-span-2"
                            type='text'
                            placeholder="Name"
                            defaultValue={editedTimeframe?.name}
                            onChange={(e) => setEditedTimeframe((oldState => {
                                if (oldState === null) return oldState
                                return {
                                    ...oldState,
                                    name: e.target.value
                                }
                            }))}
                        />
                        Starts At
                        <input
                            className="p-3 my-1"
                            type='datetime-local'
                            defaultValue={DateTime.fromISO(editedTimeframe?.startsAt ?? '').toISO({ includeOffset: false }) ?? ''}
                            onChange={(e) => setEditedTimeframe((oldState => {
                                if (oldState === null) return oldState
                                return {
                                    ...oldState,
                                    startsAt: e.target.value
                                }
                            }))}
                        />
                        Ends At
                        <input
                            className="p-3 my-1"
                            type='datetime-local'
                            defaultValue={DateTime.fromISO(editedTimeframe?.endsAt ?? '').toISO({ includeOffset: false }) ?? ''}
                            onChange={(e) => setEditedTimeframe((oldState => {
                                if (oldState === null) return oldState
                                return {
                                    ...oldState,
                                    endsAt: e.target.value
                                }
                            }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div
                            className="bg-green-200 dark:bg-green-800 px-3 py-1 rounded-lg cursor-pointer"
                            onClick={(e) => {
                                updateTimeframe()
                            }}>
                            Save
                        </div>
                        <div
                            className="bg-red-200 dark:bg-red-800 px-3 py-1 rounded-lg cursor-pointer"
                            onClick={(e) => {
                                setShowEditTimeframeDialog(false)
                            }}
                        >Cancel</div>
                    </div>
                </div>
            </div>
        )
    }

    function addTimeframeDialog() {
        return (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-fit h-fit">
                    <div className="text-xl pb-5">
                        Add new timeframe
                    </div>
                    <div className="grid grid-cols-2 gap-x-5">
                        <input
                            className="p-3 my-1 col-span-2"
                            type='text'
                            placeholder="Name"
                            onChange={(e) => setNewTimeframe((oldState => {
                                return {
                                    ...oldState,
                                    name: e.target.value
                                }
                            }))}
                        />
                        Starts At
                        <input
                            className="p-3 my-1"
                            type='datetime-local'
                            onChange={(e) => setNewTimeframe((oldState => {
                                return {
                                    ...oldState,
                                    startsAt: e.target.value
                                }
                            }))}
                        />
                        Ends At
                        <input
                            className="p-3 my-1"
                            type='datetime-local'
                            onChange={(e) => setNewTimeframe((oldState => {
                                return {
                                    ...oldState,
                                    endsAt: e.target.value
                                }
                            }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div
                            className="bg-green-200 dark:bg-green-800 px-3 py-1 rounded-lg cursor-pointer"
                            onClick={(e) => {
                                saveNewTimeframe()
                            }}>
                            Save
                        </div>
                        <div
                            className="bg-red-200 dark:bg-red-800 px-3 py-1 rounded-lg cursor-pointer"
                            onClick={(e) => {
                                setShowNewTimeframeDialog(false)
                            }}
                        >Cancel</div>
                    </div>
                </div>
            </div>
        )
    }

    function deleteTimeframeDialog() {
        return (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-fit h-fit">
                    <div>Are you sure you want to delete this timeframe?</div>
                    <div className="text-2xl">{timeframeToDelete?.name}</div>
                    <div className="grid grid-col-2 gap-5">
                        <div
                            className="bg-green-200 dark:bg-green-800 px-3 py-1 rounded-lg cursor-pointer"
                            onClick={(e) => {
                                setShowDeleteTimeframeDialog(false)
                            }}>
                            No
                        </div>
                        <div
                            className="bg-red-200 dark:bg-red-800 px-3 py-1 rounded-lg cursor-pointer"
                            onClick={(e) => {
                                deleteTimeframe()
                            }}
                        >Yes, delete it</div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div>
            {showNewTimeframeDialog && addTimeframeDialog()}
            {showEditTimeframeDialog && editTimeframeDialog()}
            {showDeleteTimeframeDialog && deleteTimeframeDialog()}
            <div
                className="w-fit py-1 px-3 rounded-lg m-3 bg-blue-300 dark:bg-blue-700 cursor-pointer"
                onClick={(e) => {
                    setShowNewTimeframeDialog(true)
                }}
            >
                ADD NEW TIMEFRAME
            </div>
            <div className="px-3 text-sm text-slate-600 dark:text-slate-400">
                <div>The timeframe currently active is highlighted in green</div>
                <div>The active timeframe controls what students see and acts as the default view for all teacher scorebooks and dashboard data</div>
            </div>
            <div className="grid grid-cols-1 m-3">
                <div className="py-3 px-1 grid grid-cols-6">
                    <div>Name</div>
                    <div>Starts At</div>
                    <div>Ends At</div>
                </div>
                {
                    timeframes
                        .sort((a, b) => DateTime.fromISO(a.startsAt).toSeconds() - DateTime.fromISO(b.startsAt).toSeconds())
                        .map((timeframe, index) => (
                            <div className={`py-3 px-1 grid grid-cols-6 gap-x-3 ${timeframe.active ? `bg-green-300 dark:bg-green-700` : index % 2 === 0 ? `bg-slate-200 dark:bg-slate-800` : `bg-slate-300 dark:bg-slate-700`}`}>
                                <div>
                                    {timeframe.name}
                                </div>
                                <div>
                                    {DateTime.fromISO(timeframe.startsAt).toFormat('LLL dd, yyyy HH:mm')}
                                </div>
                                <div>
                                    {DateTime.fromISO(timeframe.endsAt).toFormat('LLL dd, yyyy HH:mm')}
                                </div>
                                <div
                                    className="bg-orange-200 dark:bg-orange-800 px-3 py-1 rounded-lg cursor-pointer flex justify-center"
                                    onClick={(e) => {
                                        setEditedTimeframe({ ...timeframe })
                                        setShowEditTimeframeDialog(true)
                                    }}
                                >
                                    Edit
                                </div>
                                <div>
                                    {
                                        !timeframe.active && <div className="bg-amber-200 dark:bg-amber-800 px-3 py-1 rounded-lg cursor-pointer flex justify-center"
                                            onClick={(e) => {
                                                activateTimeframe(timeframe.id)
                                            }}>SET ACTIVE</div>
                                    }
                                </div>
                                <div>
                                    {
                                        !timeframe.active && <div
                                            className="bg-red-200 dark:bg-red-800 px-3 py-1 rounded-lg cursor-pointer flex justify-center"
                                            onClick={(e) => {
                                                setTimeframeToDelete({
                                                    id: timeframe.id,
                                                    name: timeframe.name
                                                })
                                                setShowDeleteTimeframeDialog(true)
                                            }}
                                        >DELETE</div>
                                    }
                                </div>
                            </div>
                        ))
                }
            </div>
        </div>
    )
}