"use client";

import { createRankingGroupPointEvent, editRankingGroupPointEvent, getRankingGroupPoints } from "@/app/supaApi/server/teacher/teacherServerActions";
import { DateTime } from "luxon";
import { Fragment, useEffect, useState } from "react";
import { RankingGroupScorebookData } from "@/app/dataClasses";

type NewRankingGroupPointEvent = {
    name: string,
    date: string
}

type CurrentlyEditedPointEvent = {
    id: number,
    name: string,
    date: string,
    points: {
        pointId: number,
        studentGroupId: number,
        studentGroupName: string,
        value: number
    }[]
}

export default function RankingGroupPage({ params: { groupId } }: { params: { groupId: string } }) {

    const [rankingGroupPointData, setRankingGroupPointData] = useState<RankingGroupScorebookData | null>(null);
    const [isEditPointEventModalOpen, setIsEditPointEventModalOpen] = useState(false);
    const [currentlyEditedPointEvent, setCurrentlyEditedPointEvent] = useState<CurrentlyEditedPointEvent>({
        id: -1,
        name: "",
        date: "",
        points: []
    });

    useEffect(() => {
        getRankingGroupData();
    }, []);

    const getRankingGroupData = async () => {
        const points = await getRankingGroupPoints(parseInt(groupId));
        console.log(points);
        setRankingGroupPointData(points);
    }

    const [isCreateNewPointEventModalOpen, setIsCreateNewPointEventModalOpen] = useState(false);
    const [newPointEvent, setNewPointEvent] = useState<NewRankingGroupPointEvent>({
        name: "",
        date: DateTime.now().toISODate()
    });

    const submitNewPointEvent = async (newPointEvent: NewRankingGroupPointEvent) => {
        createRankingGroupPointEvent(parseInt(groupId), newPointEvent.name, newPointEvent.date);
        getRankingGroupData();
    }

    const submitEditedPointEvent = async (currentlyEditedPointEvent: CurrentlyEditedPointEvent) => {
        editRankingGroupPointEvent(
            parseInt(groupId),
            currentlyEditedPointEvent.id,
            currentlyEditedPointEvent.name,
            currentlyEditedPointEvent.date,
            currentlyEditedPointEvent.points.map((p) => {
                return {
                    studentGroupId: p.studentGroupId,
                    value: p.value,
                    pointId: p.pointId
                }
            })
        )
        getRankingGroupData();
    }

    const editPointEvent = ({ id, name, date, points }: CurrentlyEditedPointEvent) => {
        return (
            <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-slate-300 dark:bg-slate-700 p-5 rounded-lg">
                    <div className="text-2xl mb-5">
                        Edit point event
                    </div>
                    <div className="mb-5">
                        <input
                            type="text"
                            placeholder="Name"
                            className="w-full dark:[color-scheme:dark] p-2 border border-slate-300 dark:border-slate-700 rounded-lg"
                            value={name}
                            onChange={(e) => setCurrentlyEditedPointEvent({ ...currentlyEditedPointEvent, name: e.target.value })}
                        />
                    </div>
                    <div className="mb-5">
                        <input
                            type="date"
                            className="w-full dark:[color-scheme:dark] p-2 border border-slate-300 dark:border-slate-700 rounded-lg"
                            defaultValue={date}
                            onChange={(e) => setCurrentlyEditedPointEvent({ ...currentlyEditedPointEvent, date: e.target.value })}
                        />
                    </div>
                    <div className="mb-5">
                        {
                            points.sort((a, b) => {
                                return a.studentGroupName.localeCompare(b.studentGroupName);
                            }).map((point) => {
                                return (
                                    <div className="flex justify-between gap-3">
                                        <div>{point.studentGroupName}</div>
                                        <input
                                            type="number"
                                            value={point.value}
                                            className="px-1 dark:[color-scheme:dark]"
                                            onChange={(e) => {
                                                setCurrentlyEditedPointEvent({
                                                    ...currentlyEditedPointEvent,
                                                    points: points.map((p) => {
                                                        if (p.studentGroupId === point.studentGroupId) {
                                                            return {
                                                                ...p,
                                                                value: parseInt(e.target.value)
                                                            }
                                                        }
                                                        return p;
                                                    })
                                                })
                                            }}
                                        />
                                    </div>
                                )
                            })
                        }
                    </div>
                    <div>
                        <button
                            className="bg-green-300 dark:bg-green-700 p-2 rounded-lg"
                            onClick={() => {
                                setIsEditPointEventModalOpen(false)
                                submitEditedPointEvent(currentlyEditedPointEvent)
                            }}
                        >
                            Save
                        </button>
                        <button
                            className="bg-red-300 dark:bg-red-700 p-2 rounded-lg ml-5"
                            onClick={() => setIsEditPointEventModalOpen(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const createNewPointEventModal = () => {
        return (
            <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-slate-300 dark:bg-slate-700 p-5 rounded-lg">
                    <div className="text-2xl mb-5">
                        Create new point event
                    </div>
                    <div className="mb-5">
                        <input
                            type="text"
                            placeholder="Name"
                            className="w-full dark:[color-scheme:dark] p-2 border border-slate-300 dark:border-slate-700 rounded-lg"
                            onChange={(e) => setNewPointEvent({ ...newPointEvent, name: e.target.value })}
                        />
                    </div>
                    <div className="mb-5">
                        <input
                            type="date"
                            className="w-full dark:[color-scheme:dark] p-2 border border-slate-300 dark:border-slate-700 rounded-lg"
                            defaultValue={newPointEvent.date}
                            onChange={(e) => setNewPointEvent({ ...newPointEvent, date: e.target.value })}
                        />
                    </div>
                    <div>
                        <button
                            className="bg-green-300 dark:bg-green-700 p-2 rounded-lg"
                            onClick={() => {
                                setIsCreateNewPointEventModalOpen(false)
                                submitNewPointEvent(newPointEvent)
                            }}
                        >
                            Create
                        </button>
                        <button
                            className="bg-red-300 dark:bg-red-700 p-2 rounded-lg ml-5"
                            onClick={() => setIsCreateNewPointEventModalOpen(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full p-5">
            {isCreateNewPointEventModalOpen && createNewPointEventModal()}
            {isEditPointEventModalOpen && editPointEvent(currentlyEditedPointEvent)}
            <div className="text-4xl mb-5 flex justify-start">
                {rankingGroupPointData?.name}
                <button className="bg-slate-300 dark:bg-slate-700 p-2 rounded-lg ml-5" onClick={() => setIsCreateNewPointEventModalOpen(true)}>Create new point event</button>
            </div>
            <div className="w-full h-full p-5">
                <div className={`grid w-fit`} style={{
                    gridTemplateColumns: `250px repeat(${rankingGroupPointData?.pointEvents.length}, 150px)`
                }}>
                    <div />
                    {
                        rankingGroupPointData?.pointEvents.sort((a, b) => {
                            return DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis();
                        }).map((pointEvent) => {
                            return (
                                <div className="bg-slate-300 dark:bg-slate-700 rounded-lg p-4 text-center">
                                    <div>{pointEvent.name}</div>
                                    <div>{DateTime.fromISO(pointEvent.date).toFormat("MMM dd")}</div>
                                    <button className="bg-green-300 dark:bg-green-700 p-2 rounded-lg" onClick={() => {
                                        setCurrentlyEditedPointEvent({
                                            id: pointEvent.id,
                                            name: pointEvent.name,
                                            date: pointEvent.date,
                                            points: rankingGroupPointData.studentGroups.map((sg) => {
                                                return {
                                                    studentGroupId: sg.id,
                                                    studentGroupName: sg.name,
                                                    value: pointEvent.studentGroupPoints.find((sgp) => sgp.studentGroupId === sg.id)?.value || 0,
                                                    pointId: pointEvent.studentGroupPoints.find((sgp) => sgp.studentGroupId === sg.id)?.pointId || -1
                                                }
                                            })
                                        })
                                        setIsEditPointEventModalOpen(true)
                                    }}>Edit</button>
                                </div>
                            )
                        })
                    }
                    {
                        rankingGroupPointData?.studentGroups.sort((a, b) => {
                            return a.name.localeCompare(b.name);
                        }).map((studentGroup) => {
                            return (
                                <Fragment >
                                    <div key={studentGroup.id} className="bg-slate-300 dark:bg-slate-700 rounded-lg p-1 text-center text-2xl">{studentGroup.name}</div>
                                    {
                                        rankingGroupPointData.pointEvents.sort((a, b) => {
                                            return DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis();
                                        }).map((pointEvent) => {
                                            return (
                                                <div className="flex justify-center">
                                                    {
                                                        pointEvent.studentGroupPoints.find((sgp) => sgp.studentGroupId === studentGroup.id)?.value
                                                    }
                                                </div>
                                            )
                                        })
                                    }
                                </Fragment>
                            )
                        })
                    }
                </div>
            </div>
        </div>
    )
}
