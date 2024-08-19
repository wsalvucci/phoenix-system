"use client";

import { convertPointUsingRuleType, PointConversionRuleType, ruleTypeAndValueToFormula, ScorebookData, ScorebookPointEvent, stringToRuleType } from "@/app/dataClasses";
import { clientCreatePointEvent } from "@/app/supaApi/client/teacher/teacherApi";
import { editPointEvent, getScorebookData } from "@/app/supaApi/server/teacher/teacherServerActions";
import { Database } from "@/types/supabase";
import { Fragment, useEffect, useState } from "react";
import { DateTime } from "luxon";
import CSVReader from "react-csv-reader";

type NewPointEventData = {
    templateId: number,
    date: string,
    name: string,
    maxInput: number
}

export default function TeacherGroupScorebook({ params: { groupId } }: { params: { groupId: string } }) {

    const [showLoadingScreen, setShowLoadingScreen] = useState(true)

    const [scorebookData, setScorebookData] = useState<ScorebookData | null>(null)
    const [addNewPointEventModalOpen, setAddNewPointEventModalOpen] = useState(false)
    const [newPointEventData, setNewPointEventData] = useState<NewPointEventData>(
        {
            templateId: -1,
            date: DateTime.now().toISO(),
            name: "",
            maxInput: 0
        }
    )
    const [addPointEventError, setAddPointEventError] = useState<boolean>(false)

    const [currentStudentOrder, setCurrentStudentOrder] = useState<Database['public']['Tables']['student']['Row'][]>([])

    const [editPointEventModalOpen, setEditPointEventModalOpen] = useState(false)
    const [currentlyEditedPointEvent, setCurrentlyEditedPointEvent] = useState<ScorebookPointEvent | null>(null)
    const [updatedPointEvent, setUpdatedPointEvent] = useState<ScorebookPointEvent | null>(null)

    const fetchScorebookData = async () => {
        setShowLoadingScreen(true)
        const data = await getScorebookData(parseInt(groupId))
        console.log(data)
        setScorebookData(data)
        setCurrentStudentOrder(
            data.students
                .filter(student => student !== null)
                .sort((a, b) => a?.last_name.localeCompare(b?.last_name))
        )
        data.pointTemplates.length > 0 && setNewPointEventData({
            templateId: data.pointTemplates[0].id,
            date: DateTime.now().toISO(),
            name: "",
            maxInput: 0
        })
        setShowLoadingScreen(false)
    }

    useEffect(() => {
        fetchScorebookData()
    }, [])

    const updateNewPointEventData = (
        templateId: number,
        date: string,
        name: string,
        maxInput: number
    ) => {
        setNewPointEventData({
            templateId,
            date,
            name,
            maxInput
        })
    }

    const addNewPointEvent = async () => {
        setAddPointEventError(
            await clientCreatePointEvent(
                parseInt(groupId),
                newPointEventData.templateId,
                DateTime.fromISO(newPointEventData.date).toISO() ?? "",
                newPointEventData.name,
                newPointEventData.maxInput
            )
        )
        fetchScorebookData()
    }

    const addNewPointEventModal = () => (
        // Needs a date picker and a selector for the template
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-1/2">
                <h1 className="text-2xl">Add new point event</h1>
                <div className="grid grid-cols-1 gap-1 dark:[color-scheme:dark]">
                    <div className="grid grid-cols-2">
                        <label className="me-3" htmlFor="template">Template</label>
                        <select
                            id="template"
                            defaultValue={scorebookData?.pointTemplates[0]?.id}
                            onChange={
                                (e) => {
                                    const templateId = parseInt(e.target.value)
                                    updateNewPointEventData(
                                        templateId,
                                        newPointEventData.date,
                                        newPointEventData.name,
                                        newPointEventData.maxInput
                                    )
                                }
                            }>
                            {scorebookData?.pointTemplates.map(template => (
                                <option key={template.id} value={template.id}>{template.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2">
                        <label className="me-3" htmlFor="date">Date</label>
                        <input type="date" id="date"
                            defaultValue={DateTime.now().toFormat("yyyy-MM-dd")}
                            onChange={
                                (e) => {
                                    const date = e.target.value
                                    updateNewPointEventData(
                                        newPointEventData.templateId,
                                        DateTime.fromISO(date).toISO() ?? "",
                                        newPointEventData.name,
                                        newPointEventData.maxInput
                                    )
                                }
                            } />
                    </div>
                    <div className="grid grid-cols-2">
                        <label className="me-3" htmlFor="name">Name</label>
                        <input type="text" id="name"
                            onChange={
                                (e) => {
                                    const name = e.target.value
                                    updateNewPointEventData(
                                        newPointEventData.templateId,
                                        newPointEventData.date,
                                        name,
                                        newPointEventData.maxInput
                                    )
                                }
                            } />
                    </div>
                    <div className="grid grid-cols-2">
                        <label className="me-3" htmlFor="maxInput">Max Input Score</label>
                        <input type="number" id="maxInput"
                            onChange={
                                (e) => {
                                    const maxInput = parseInt(e.target.value)
                                    updateNewPointEventData(
                                        newPointEventData.templateId,
                                        newPointEventData.date,
                                        newPointEventData.name,
                                        maxInput
                                    )
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

    const saveEditedPointEventData = async () => {
        if (updatedPointEvent === null) return
        const response = await editPointEvent(updatedPointEvent)
        if (!response) {
            console.error("Error editing point event")
        }
        console.log(updatedPointEvent)
        setCurrentlyEditedPointEvent(null)
        setUpdatedPointEvent(null)
        setEditPointEventModalOpen(false)
        fetchScorebookData()
    }

    const sumAllAvailablePoints = (
        pointEvents: ScorebookPointEvent[]
    ): {
        [key: string]: number
    } => {
        var pointMap: { [key: string]: number } = {
            "Total": 0,
        }
        pointEvents
            .forEach(pointEvent => {
                const pointAmount = convertPointUsingRuleType(
                    stringToRuleType(pointEvent.linkedTemplateData.conversionRuleType?.name ?? "direct"),
                    pointEvent.linkedTemplateData.conversionRuleValue ?? 0,
                    pointEvent.linkedTemplateData.conversionRuleTarget ?? 0
                )
                pointMap["Total"] += pointAmount
                const groupName = pointEvent.linkedTemplateData.pointGroup?.name ?? ""
                if (pointMap[groupName] === undefined) {
                    pointMap[groupName] = pointAmount
                } else {
                    pointMap[groupName] += pointAmount
                }
            })
        return pointMap
    }

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

        console.log(scorebookData)

        return (
            <div
                className={`grid w-fit`}
                style={{
                    gridTemplateColumns: `250px repeat(${(scorebookData?.pointEvents.length || 0) + 2}, 150px)`
                }}
            >
                <div className="row-start-1 col-start-1 sticky z-30 top-0 left-0 bg-slate-100 dark:bg-slate-900 flex justify-center" />
                {
                    scorebookData?.pointEvents.map((pointEvent, index) => (
                        <div
                            className={`sticky z-20 top-0 bg-slate-100 dark:bg-slate-900 border pb-1`}
                            key={pointEvent.id}
                            style={{
                                gridRowStart: 1,
                                gridColumnStart: index + 2,
                            }}
                        >
                            <div className="h-2 rounded-b-full" style={{ backgroundColor: pointEvent.linkedTemplateData.pointGroup?.color ?? "" }} />
                            <div className="flex justify-center">{pointEvent.linkedTemplateData.name}</div>
                            <div className="flex justify-center">{pointEvent.name ?? "-"}</div>
                            <div className="grid grid-cols-1">
                                <div className="flex justify-center">{DateTime.fromISO(pointEvent.date ?? "").toFormat("EEE, MMM d yyyy")}</div>
                            </div>
                            <button
                                className="border rounded-lg w-full"
                                onClick={() => {
                                    setEditPointEventModalOpen(true)
                                    setCurrentlyEditedPointEvent(pointEvent)
                                    setUpdatedPointEvent(pointEvent)
                                }}
                            >Edit</button>
                        </div>
                    ))
                }
                <div
                    className="border sticky top-0 bg-slate-100 dark:bg-slate-900 flex justify-center"
                    style={{
                        gridRowStart: 1,
                        gridColumnStart: (scorebookData?.pointEvents.length || 0) + 2,
                    }}>
                    <div>Total</div>
                </div>
                {
                    currentStudentOrder.map((student, studentIndex) => (
                        <Fragment key={student.id}>
                            <div
                                className={`sticky z-10 left-0 ps-1 border-b row-start-${studentIndex + 2} col-start-1 grid grid-cols-2 ${studentIndex % 2 === 0 ? "bg-slate-100 dark:bg-slate-900" : "bg-slate-200 dark:bg-slate-800"}`}
                            >
                                <div>
                                    {student.first_name}
                                </div>
                                <div>
                                    {student.last_name}
                                </div>
                            </div>
                            {
                                pointEventsLookup && scorebookData?.pointEvents.map((pointEvent, pointEventIndex) => {
                                    const studentPoint = pointEventsLookup[pointEvent.id].studentPoints?.find(studentPoint => studentPoint.studentData?.id === student.id)
                                    return (
                                        <div
                                            key={pointEvent.id}
                                            className={`flex justify-center border-b border-x ${(!studentPoint?.pointData.input_score || studentPoint?.pointData.input_score === 0) ? "bg-red-100 dark:bg-red-900 dark:bg-opacity-50" : studentIndex % 2 === 0 ? "bg-slate-100 dark:bg-slate-900" : "bg-slate-200 dark:bg-slate-800"}`}
                                            style={{
                                                gridRowStart: studentIndex + 2,
                                                gridColumnStart: pointEventIndex + 2
                                            }}
                                        >
                                            {
                                                studentPoint?.pointData.input_score === 0 ? "0" : convertPointUsingRuleType(
                                                    stringToRuleType(pointEvent.linkedTemplateData.conversionRuleType?.name ?? "direct"),
                                                    pointEvent.linkedTemplateData.conversionRuleValue ?? 0,
                                                    studentPoint?.pointData.input_score ?? 0
                                                )
                                            }
                                        </div>
                                    )
                                })
                            }
                            {
                                /* Total points for student */
                                <div className={`flex justify-center border-b border-x ${studentIndex % 2 === 0 ? "bg-slate-100 dark:bg-slate-900" : "bg-slate-200 dark:bg-slate-800"}`} style={{
                                    gridRowStart: studentIndex + 2,
                                    gridColumnStart: (scorebookData?.pointEvents.length ?? 0) + 2
                                }}>
                                    {
                                        scorebookData?.pointEvents.map(pointEvent => {
                                            const studentPoint = pointEventsLookup[pointEvent.id].studentPoints?.find(studentPoint => studentPoint.studentData?.id === student.id)
                                            return convertPointUsingRuleType(
                                                stringToRuleType(pointEvent.linkedTemplateData.conversionRuleType?.name ?? "direct"),
                                                pointEvent.linkedTemplateData.conversionRuleValue ?? 0,
                                                studentPoint?.pointData.input_score ?? 0
                                            )
                                        }).reduce((a, b) => a + b, 0)
                                    }
                                </div>

                            }
                        </Fragment>
                    ))
                }
            </div>
        )
    }

    const editPointEventModal = () => {
        return (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-fit h-3/4 grid grid-cols-1 gap-1">
                    <div className="text-2xl">Edit Point Event</div>
                    <div className="grid grid-cols-1">
                        <CSVReader
                            cssClass="flex justify-center"
                            cssInputClass="dark:[color-scheme:dark]"
                            cssLabelClass="px-1"
                            label="Upload From PowerSchool"
                            parserOptions={{ header: false }}
                            onFileLoaded={(data: any) => {
                                // console.log(data)
                                for (var i = 8; i < data.length; i++) {
                                    console.log(data[i][1] + " : " + data[i][2])
                                }
                                const name = data[2][1]
                                const date = new Date(data[3][1]).toISOString()
                                const maxPts = data[4][1]
                                const type = data[6][1]
                                const studentScores: {
                                    powerSchoolId: number,
                                    firstName: string,
                                    lastName: string,
                                    points: number
                                }[] = data.slice(8).map((studentData: any) => {
                                    console.log(studentData)
                                    if (studentData[0] === undefined || studentData[0] === '') return null
                                    return {
                                        powerSchoolId: parseInt(studentData[0]),
                                        firstName: studentData[1].split(", ")[1],
                                        lastName: studentData[1].split(", ")[0],
                                        points: studentData[2]
                                    }
                                }).filter((studentData: any) => studentData !== null)
                                console.log(date, maxPts, name, type, studentScores)

                                setUpdatedPointEvent(prevState => {
                                    if (prevState === null) {
                                        return null;
                                    }
                                    return {
                                        ...prevState,
                                        date: date,
                                        name: name,
                                        maxInput: parseInt(maxPts),
                                        studentPoints: prevState.studentPoints?.map(studentPoint => {
                                            const studentScore = studentScores.find(studentData => {
                                                return studentData.powerSchoolId == studentPoint.studentData.powerschool_id;
                                            });
                                            console.log(studentScore)
                                            if (studentScore) {
                                                return {
                                                    studentData: studentPoint.studentData,
                                                    pointData: {
                                                        ...studentPoint.pointData,
                                                        input_score: studentScore.points,
                                                        point_value: convertPointUsingRuleType(
                                                            stringToRuleType(prevState.linkedTemplateData.conversionRuleType?.name ?? "direct"),
                                                            prevState.linkedTemplateData.conversionRuleValue ?? 0,
                                                            studentScore.points
                                                        )
                                                    }
                                                };
                                            }
                                            return studentPoint;
                                        }) || null
                                    };
                                });
                            }}
                        />
                    </div>
                    <select className="text-xl dark:[color-scheme:dark]" defaultValue={currentlyEditedPointEvent?.template_id} onChange={
                        (e) => {
                            const templateId = parseInt(e.target.value)
                            updatedPointEvent && setUpdatedPointEvent({
                                ...updatedPointEvent,
                                template_id: templateId
                            })
                        }
                    }>
                        {scorebookData?.pointTemplates.map(template => (
                            <option key={template.id} value={template.id}>{template.name}</option>
                        ))}
                    </select>
                    <input
                        className="text-xl dark:[color-scheme:dark]" type="text" placeholder="Event Name" defaultValue={currentlyEditedPointEvent?.name ?? ""}
                        value={updatedPointEvent?.name ?? ""}
                        onChange={
                            (e) => {
                                const name = e.target.value
                                updatedPointEvent && setUpdatedPointEvent({
                                    ...updatedPointEvent,
                                    name: name
                                })
                            }
                        } />
                    <input
                        className="dark:[color-scheme:dark]"
                        type="date"
                        defaultValue={DateTime.fromISO(currentlyEditedPointEvent?.date ?? "").toFormat("yyyy-MM-dd")}
                        value={
                            DateTime.fromISO(updatedPointEvent?.date ?? "").toFormat("yyyy-MM-dd")
                        }
                        onChange={
                            (e) => {
                                const date = e.target.value
                                updatedPointEvent && setUpdatedPointEvent({
                                    ...updatedPointEvent,
                                    date: DateTime.fromISO(date).toISO()
                                })
                            }
                        } />
                    <input
                        className="dark:[color-scheme:dark]"
                        type="number"
                        placeholder="Max Input"
                        defaultValue={currentlyEditedPointEvent?.linkedTemplateData.conversionRuleTarget ?? 0}
                        value={updatedPointEvent?.linkedTemplateData.conversionRuleTarget ?? 0}
                        onChange={
                            (e) => {
                                const maxInput = parseInt(e.target.value)
                                updatedPointEvent && setUpdatedPointEvent({
                                    ...updatedPointEvent,
                                    linkedTemplateData: {
                                        ...updatedPointEvent.linkedTemplateData,
                                        conversionRuleTarget: maxInput
                                    }
                                })
                            }
                        } />
                    <div className="h-full overflow-y-scroll">
                        <div className="bg-slate-300 dark:bg-slate-700 grid grid-cols-4 mb-1 py-1 border-b border-collapse sticky top-0">
                            <div className="flex justify-center">Student</div>
                            <div className="flex justify-center">Score</div>
                            <div className="flex justify-center">Formula</div>
                            <div className="flex justify-center">Points</div>
                        </div>
                        {currentStudentOrder.map(student => (
                            <div key={student.id} className="grid grid-cols-4 my-1 py-1 border-b border-collapse">
                                <div>{student.first_name} {student.last_name}</div>
                                <input className="dark:[color-scheme:dark] px-2 rounded-full" type="number" defaultValue={
                                    currentlyEditedPointEvent?.studentPoints?.find(studentPoint => studentPoint.studentData.id === student.id)?.pointData.input_score ?? 0
                                }
                                    value={
                                        updatedPointEvent?.studentPoints?.find(studentPoint => studentPoint.studentData.id === student.id)?.pointData.input_score ?? 0
                                    }
                                    onChange={
                                        (e) => {
                                            const pointValue = parseInt(e.target.value)
                                            updatedPointEvent && updatedPointEvent.studentPoints && setUpdatedPointEvent({
                                                ...updatedPointEvent,
                                                studentPoints: updatedPointEvent.studentPoints.map(studentPoint => {
                                                    if (studentPoint.studentData.id === student.id) {
                                                        console.log("Setting point value")
                                                        return {
                                                            studentData: studentPoint.studentData,
                                                            pointData: {
                                                                ...studentPoint.pointData,
                                                                input_score: pointValue,
                                                                point_value: convertPointUsingRuleType(
                                                                    stringToRuleType(updatedPointEvent?.linkedTemplateData.conversionRuleType?.name ?? "direct"),
                                                                    updatedPointEvent?.linkedTemplateData.conversionRuleValue ?? 0,
                                                                    pointValue
                                                                )
                                                            }
                                                        }
                                                    }
                                                    return studentPoint
                                                })
                                            })
                                        }
                                    } />
                                <div className="flex justify-center">
                                    {
                                        ruleTypeAndValueToFormula(
                                            stringToRuleType(updatedPointEvent?.linkedTemplateData.conversionRuleType?.name ?? "direct"),
                                            updatedPointEvent?.linkedTemplateData.conversionRuleValue ?? 0,
                                            updatedPointEvent?.studentPoints?.find(studentPoint => studentPoint.studentData.id === student.id)?.pointData.input_score ?? 0,
                                            null
                                        )
                                    }
                                </div>
                                <div className="flex justify-center">
                                    {
                                        convertPointUsingRuleType(
                                            stringToRuleType(updatedPointEvent?.linkedTemplateData.conversionRuleType?.name ?? "direct"),
                                            updatedPointEvent?.linkedTemplateData.conversionRuleValue ?? 0,
                                            updatedPointEvent?.studentPoints?.find(studentPoint => studentPoint.studentData.id === student.id)?.pointData.input_score ?? 0
                                        )
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-around">
                        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full" onClick={() => {
                            saveEditedPointEventData()
                        }}>Save</button>
                        <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full" onClick={() => {
                            setEditPointEventModalOpen(false)
                        }}>Cancel</button>
                    </div>
                </div>
            </div>
        )
    }

    const loadingScreen = () => (
        <div className="h-full w-full flex justify-center items-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
    )

    return (
        <div className="animate-in w-full h-full">
            {showLoadingScreen && loadingScreen()}
            {addNewPointEventModalOpen && addNewPointEventModal()}
            {editPointEventModalOpen && editPointEventModal()}
            <div className="h-1/5 grid grid-cols-2 border-b">
                <div>
                    <div className="text-xl">
                        Scorebook
                    </div>
                    <div>
                        {addNewPointEventButton()}
                    </div>
                </div>
                <div>
                    <div className="grid grid-cols-2">
                        <div className="text-lg col-span-2 flex justify-center">
                            Points available per student
                        </div>
                        {
                            sumAllAvailablePoints(scorebookData?.pointEvents || []).Total > 0 &&
                            Object.entries(sumAllAvailablePoints(scorebookData?.pointEvents || [])).map(([key, value]) => (
                                <Fragment key={key}>
                                    <div className="flex justify-center border-b">
                                        {key}
                                    </div>
                                    <div className="flex justify-center border-b">
                                        {value}
                                    </div>
                                </Fragment>
                            ))
                        }
                        <div className="rounded-full mx-10 flex h-6 col-span-2 overflow-clip my-1">
                            {
                                Object.entries(sumAllAvailablePoints(scorebookData?.pointEvents || []))
                                    .filter(([key, value]) => key !== "Total")
                                    .map(([key, value]) => (
                                        <div
                                            key={key}
                                            style={{
                                                width: `${(value / sumAllAvailablePoints(scorebookData?.pointEvents || []).Total) * 100}%`,
                                                backgroundColor: scorebookData?.pointGroups?.find(pointGroup => pointGroup.name === key)?.color ?? "",
                                                opacity: 0.5
                                            }} className="flex justify-center text-black dark:text-white">
                                            {key}
                                        </div>
                                    ))
                            }
                        </div>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto h-4/5">
                {scorebookData && scorebookTable()}
            </div>
        </div>
    )
}