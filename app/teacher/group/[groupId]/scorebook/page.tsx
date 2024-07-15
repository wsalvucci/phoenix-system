"use client";

import { ScorebookData, ScorebookPointEvent } from "@/app/dataClasses";
import { clientCreatePointEvent } from "@/app/supaApi/client/teacher/teacherApi";
import { getScorebookData } from "@/app/supaApi/server/teacher/teacherServerActions";
import { Database } from "@/types/supabase";
import { Fragment, useEffect, useState } from "react";

type NewPointEventData = {
    templateId: number,
    date: string
}

export default function TeacherGroupScorebook({ params: { groupId } }: { params: { groupId: string } }) {

    const [scorebookData, setScorebookData] = useState<ScorebookData | null>(null)
    const [addNewPointEventModalOpen, setAddNewPointEventModalOpen] = useState(false)
    const [newPointEventData, setNewPointEventData] = useState<NewPointEventData>(
        {
            templateId: -1,
            date: Date.now().toString()
        }
    )
    const [addPointEventError, setAddPointEventError] = useState<boolean>(false)

    const [currentStudentOrder, setCurrentStudentOrder] = useState<Database['public']['Tables']['student']['Row'][]>([])

    const fetchScorebookData = async () => {
        const data = await getScorebookData(parseInt(groupId))
        console.log(data)
        setScorebookData(data)
        setCurrentStudentOrder(
            data.students
                .filter(student => student !== null)
                .sort((a, b) => a?.last_name.localeCompare(b?.last_name))
        )
        setNewPointEventData({
            templateId: data.pointTemplates[0].id,
            date: new Date().toISOString()
        })
    }

    useEffect(() => {
        fetchScorebookData()
    }, [])

    const updateNewPointEventData = (templateId: number, date: string) => {
        setNewPointEventData({
            templateId,
            date
        })
    }

    const addNewPointEvent = async () => {
        setAddPointEventError(
            !await clientCreatePointEvent(
                parseInt(groupId),
                newPointEventData.templateId,
                new Date(parseInt(newPointEventData.date)).toISOString()
            )
        )
        fetchScorebookData()
    }

    const addNewPointEventModal = () => (
        // Needs a date picker and a selector for the template
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-1/2">
                <h1 className="text-2xl">Add new point event</h1>
                <div className="flex justify-around dark:[color-scheme:dark]">
                    <div>
                        <label className="me-3" htmlFor="template">Template</label>
                        <select
                            id="template"
                            defaultValue={scorebookData?.pointTemplates[0]?.id}
                            onChange={
                                (e) => {
                                    const templateId = parseInt(e.target.value)
                                    updateNewPointEventData(templateId, newPointEventData.date)
                                }
                            }>
                            {scorebookData?.pointTemplates.map(template => (
                                <option key={template.id} value={template.id}>{template.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="me-3" htmlFor="date">Date</label>
                        <input type="date" id="date"
                            defaultValue={new Date().toISOString().split('T')[0]}
                            onChange={
                                (e) => {
                                    const date = e.target.value
                                    updateNewPointEventData(newPointEventData.templateId, date)
                                }
                            } />
                    </div>
                </div>
                {addPointEventError && <div className="text-red-500">Error adding point event</div>}
                <button
                    disabled={newPointEventData.date === null || newPointEventData.templateId === null}
                    onClick={() => {
                        if (newPointEventData.date === null || newPointEventData.templateId === null) return
                        addNewPointEvent()
                        setAddNewPointEventModalOpen(false)
                    }}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
                >
                    Add
                </button>
                <button
                    onClick={() => {
                        setAddNewPointEventModalOpen(false)
                    }}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full"
                >
                    Cancel
                </button>
            </div>
        </div>
    )

    const addNewPointEventButton = () => (
        <button
            onClick={() => {
                setAddNewPointEventModalOpen(true)
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
        >
            Add new point event
        </button>
    )

    const scorebookTable = () => {
        const studentsLookup: { [key: number]: Database['public']['Tables']['student']['Row'] } = {}
        scorebookData?.students.forEach(student => {
            if (student !== null) {
                studentsLookup[student.id] = student
            }
        })

        const pointEventsLookup: { [key: number]: ScorebookPointEvent } = {}
        scorebookData?.pointEvents.forEach(pointEvent => {
            pointEventsLookup[pointEvent.id] = pointEvent
        })

        return (
            <div
                className={`grid`}
                style={{
                    gridTemplateColumns: `250px repeat(${scorebookData?.pointEvents.length || 0}, 250px)`
                }}
            >
                <div className="row-start-1 col-start-1 sticky top-0 bg-slate-500">Student</div>
                {
                    scorebookData?.pointEvents.map((pointEvent, index) => (
                        <div
                            className={`sticky top-0 bg-slate-500`}
                            key={pointEvent.id}
                            style={{
                                gridRowStart: 1,
                                gridColumnStart: index + 2
                            }}
                        >{pointEvent.linkedTemplateData.name}</div>
                    ))
                }
                {
                    currentStudentOrder.map((student, studentIndex) => (
                        <Fragment key={student.id}>
                            <div
                                style={{
                                    gridRowStart: studentIndex + 2,
                                    gridColumnStart: 1
                                }}
                            >{student.first_name} {student.last_name}</div>
                            {
                                pointEventsLookup && scorebookData?.pointEvents.map((pointEvent, pointEventIndex) => {
                                    const studentPoint = pointEventsLookup[pointEvent.id].studentPoints?.find(studentPoint => studentPoint.studentData?.id === student.id)
                                    return (
                                        <div
                                            key={pointEvent.id}
                                            style={{
                                                gridRowStart: studentIndex + 2,
                                                gridColumnStart: pointEventIndex + 2
                                            }}
                                        >{studentPoint?.pointData.point_value || "-"}</div>
                                    )
                                })
                            }
                        </Fragment>
                    ))
                }
            </div>
        )
    }

    return (
        <div className="animate-in w-full h-full">
            <div className="h-1/6">
                {addNewPointEventModalOpen && addNewPointEventModal()}
                Scorebook
                {addNewPointEventButton()}
            </div>
            <div className="overflow-x-auto h-5/6">
                {scorebookData && scorebookTable()}
            </div>
        </div>
    )
}