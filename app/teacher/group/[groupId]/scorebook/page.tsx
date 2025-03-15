"use client";

import { convertPointUsingRuleType, ImportedScorebook, NewScorebookData, NewScorebookPointEvent, ruleTypeAndValueToFormula, stringToRuleType } from "@/app/dataClasses";
import { clientCreatePointEvent } from "@/app/supaApi/client/teacher/teacherApi";
import importPhoenixScorebookData, { deletePointEvent, editPointEvent, newGetScorebookData } from "@/app/supaApi/server/teacher/teacherServerActions";
import { Fragment, useEffect, useState } from "react";
import { DateTime } from "luxon";
import CSVReader from "react-csv-reader";
import { createClient } from "@/utils/supabase/client";
import Color from "color";
import { saveAs } from "file-saver"

type NewPointEventData = {
  templateId: number,
  date: string,
  name: string,
  maxInput: number
}

type ExportScorebookTemplateData = {
  events: {
    id: number,
    name: string,
    date: string,
    students: {
      id: number,
      inputScore: number
    }[],
    pointGroupColor: string
  }[],
  students: {
    id: number,
    name: string,
  }[]
}

export default function TeacherGroupScorebook({ params: { groupId } }: { params: { groupId: string } }) {

  const [showLoadingScreen, setShowLoadingScreen] = useState(true)

  const [scorebookData, setScorebookData] = useState<NewScorebookData | null>(null)
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

  const [currentStudentOrder, setCurrentStudentOrder] = useState<{
    id: number,
    firstName: string,
    lastName: string
  }[]>([])

  const [editPointEventModalOpen, setEditPointEventModalOpen] = useState(false)
  const [currentlyEditedPointEvent, setCurrentlyEditedPointEvent] = useState<NewScorebookPointEvent | null>(null)
  const [updatedPointEvent, setUpdatedPointEvent] = useState<NewScorebookPointEvent | null>(null)

  const [confirmDeletePointEventDialogOpen, setConfirmDeletePointEventDialogOpen] = useState(false)

  const [scorebookDataToExport, setScorebookDataToExport] = useState<ExportScorebookTemplateData>({
    events: [],
    students: []
  })

  const supabase = createClient();
  const broadcastChannel = supabase.channel("student-points-channel");
  broadcastChannel.subscribe((message) => {
    console.log(message)
  })

  const sendBroadcastSignal = () => {
    broadcastChannel.send({
      type: 'broadcast',
      event: 'sync',
      payload: { message: "Syncing student points" }
    })
  }

  const fetchScorebookData = async () => {
    setShowLoadingScreen(true)
    const data = await newGetScorebookData(parseInt(groupId))
    console.log(data)
    setScorebookData(data)
    setCurrentStudentOrder(
      data.students
        .filter(student => student !== null)
        .sort((a, b) => a?.lastName.localeCompare(b?.lastName))
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

  const createScorebookTemplateExportFile = () => {
    const csvEventIds = scorebookDataToExport.events.flatMap((pointEvent) => {
      return pointEvent.id
    }).join(',')
    const csvEventNames = scorebookDataToExport.events.flatMap((pointEvent) => {
      return pointEvent.name
    }).join(',')
    const csvEventDates = scorebookDataToExport.events.flatMap((pointEvent) => {
      return DateTime.fromISO(pointEvent.date).toFormat('LLL dd yyyy')
    }).join(',')
    const csvStudentData = scorebookData?.students.flatMap((student) => {
      const data = student.id + ',' + student.lastName + ',' + student.firstName
      const scores = scorebookDataToExport.events.flatMap((pointEvent) => {
        return pointEvent.students.find((student2) => student2.id === student.id)?.inputScore
      }).join(',')
      return data + ',' + scores
    }).join('\n')

    const totalData = ',,,' + csvEventIds + '\n' + ',,,' + csvEventNames + '\n' + ',,,' + csvEventDates + '\n' + csvStudentData

    const blob = new Blob([totalData], { type: "text/csv;charset=utf-8;" })

    saveAs(blob, "data.csv")
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

  const exportScorebookTemplateButton = () => (
    <button
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
      onClick={(e) => {
        setShowExportScorebookTempateModal(true)
      }}>
      Export Scorebook Event Data
    </button>
  )

  const importScorebookTemplateButton = () => (
    <button
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
      onClick={(e) => {
        setShowImportScorebookTempateModal(true)
      }}>
      Import Scorebook Event Data
    </button>
  )

  const saveEditedPointEventData = async () => {
    if (updatedPointEvent === null) return
    if (scorebookData === null) return
    console.log(updatedPointEvent)
    const response = await editPointEvent(updatedPointEvent, scorebookData.studentGroup.id)
    if (!response) {
      console.error("Error editing point event")
    }
    console.log(updatedPointEvent)
    sendBroadcastSignal()
    setCurrentlyEditedPointEvent(null)
    setUpdatedPointEvent(null)
    setEditPointEventModalOpen(false)
    fetchScorebookData()
  }

  const sumAllAvailablePoints = (
    pointEvents: NewScorebookPointEvent[]
  ): {
    [key: string]: number
  } => {
    var pointMap: { [key: string]: number } = {
      "Total": 0,
    }
    pointEvents
      .forEach(pointEvent => {
        const pointAmount = convertPointUsingRuleType(
          stringToRuleType(pointEvent.template.conversionRuleType ?? "direct"),
          pointEvent.template.conversionRuleValue ?? 0,
          pointEvent.maxInput ?? 0
        )
        pointMap["Total"] += pointAmount
        const groupName = pointEvent.template.pointGroup?.name ?? ""
        if (pointMap[groupName] === undefined) {
          pointMap[groupName] = pointAmount
        } else {
          pointMap[groupName] += pointAmount
        }
      })
    return pointMap
  }

  const scorebookTable = () => {
    const studentsLookup: {
      [key: number]: {
        id: number,
        firstName: string,
        lastName: string
      }
    } = {}
    scorebookData?.students.forEach(student => {
      if (student !== null) {
        studentsLookup[student.id] = {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName
        }
      }
    })

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
              <div className="h-2 rounded-b-full" style={{ backgroundColor: pointEvent.template.pointGroup.color ?? "" }} />
              <div className="flex justify-center">{pointEvent.name ?? "-"}</div>
              <div className="grid grid-cols-1">
                <div className="flex justify-center">{DateTime.fromISO(pointEvent.date ?? "").toFormat("EEE, MMM d yyyy")}</div>
              </div>
              <div className="flex justify-center">
                {convertPointUsingRuleType(
                  stringToRuleType(pointEvent.template.conversionRuleType ?? "direct"),
                  pointEvent.template.conversionRuleValue ?? 0,
                  pointEvent.maxInput ?? 0
                )}pts
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
                  {student.firstName}
                </div>
                <div>
                  {student.lastName}
                </div>
              </div>
              {
                scorebookData?.pointEvents.map((pointEvent, pointEventIndex) => {
                  const studentPoint = pointEvent.studentPoints.find(studentPoint => studentPoint.student.id === student.id)
                  return (
                    <div
                      key={pointEvent.id}
                      className={`flex justify-center border-b border-x ${(!studentPoint?.pointData.input || studentPoint?.pointData.input === 0) ? "bg-red-100 dark:bg-red-900 dark:bg-opacity-50" : studentIndex % 2 === 0 ? "bg-slate-100 dark:bg-slate-900" : "bg-slate-200 dark:bg-slate-800"}`}
                      style={{
                        gridRowStart: studentIndex + 2,
                        gridColumnStart: pointEventIndex + 2
                      }}
                    >
                      {
                        pointEvent.template.conversionRuleType.toLowerCase() === "direct" ?
                          studentPoint?.pointData.input === 0 ? "0" : convertPointUsingRuleType(
                            stringToRuleType(pointEvent.template.conversionRuleType.toLowerCase() ?? "direct"),
                            pointEvent.template.conversionRuleValue ?? 0,
                            studentPoint?.pointData.input ?? 0
                          )
                          :
                          (
                            <div className="w-full grid grid-cols-3">
                              <div className="flex justify-center text-gray-500 opacity-50">{studentPoint?.pointData.input}</div>
                              <div className="flex justify-center text-gray-500 opacity-50">{"→"}</div>
                              <div className="flex justify-center">{
                                studentPoint?.pointData.input === 0 ? "0" : convertPointUsingRuleType(
                                  stringToRuleType(pointEvent.template.conversionRuleType.toLowerCase() ?? "direct"),
                                  pointEvent.template.conversionRuleValue ?? 0,
                                  studentPoint?.pointData.input ?? 0
                                )
                              }
                              </div>
                            </div>
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
                      const studentPoint = pointEvent.studentPoints.find(studentPoint => studentPoint.student.id === student.id)
                      return convertPointUsingRuleType(
                        stringToRuleType(pointEvent.template.conversionRuleType ?? "direct"),
                        pointEvent.template.conversionRuleValue ?? 0,
                        studentPoint?.pointData.input ?? 0
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

  const confirmDeletePointEvent = async () => {
    if (currentlyEditedPointEvent === null) return
    const result = deletePointEvent(currentlyEditedPointEvent.id)
    if (!result) {
      console.error("Error deleting point event")
    }
    setCurrentlyEditedPointEvent(null)
    setUpdatedPointEvent(null)
    setConfirmDeletePointEventDialogOpen(false)
    setEditPointEventModalOpen(false)
    fetchScorebookData()
  }

  const confirmDeletePointEventDialog = () => {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
        <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-fit h-fit">
          <div className="text-2xl">
            <div className="flex justify-center">Confirm Point Event Deletion</div>
            <div className="flex justify-center">{currentlyEditedPointEvent?.name}</div>
            <div className="flex justify-center">{DateTime.fromISO(currentlyEditedPointEvent?.date ?? "").toFormat('yyyy LLL dd').toString()}</div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <button className="bg-red-600 dark:bg-red-400 font-bold py-2 px-4 rounded-lg"
              onClick={() => {
                confirmDeletePointEvent()
              }}
            >Delete Event</button>
            <button className="bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded-lg" onClick={() => {
              setConfirmDeletePointEventDialogOpen(false)
            }}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  const editPointEventModal = () => {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
        <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-fit h-3/4 grid grid-cols-1 gap-1">
          <div className="grid" style={{
            gridTemplateColumns: "3fr 1fr"
          }}>
            <div className="text-2xl">Editing Point Event</div>
            <button className="bg-red-600 dark:bg-red-400 px-1 rounded-lg h-fit flex justify-center"
              onClick={() => {
                setConfirmDeletePointEventDialogOpen(true)
              }}
            >Delete Event</button>
          </div>
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
                        return studentData.powerSchoolId == studentPoint.student.powerschoolId;
                      });
                      console.log(studentScore)
                      if (studentScore) {
                        return {
                          student: studentPoint.student,
                          pointData: {
                            ...studentPoint.pointData,
                            input_score: studentScore.points,
                            point_value: convertPointUsingRuleType(
                              stringToRuleType(prevState.template.conversionRuleType ?? "direct"),
                              prevState.template.conversionRuleValue ?? 0,
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
          <select className="text-xl dark:[color-scheme:dark]" defaultValue={currentlyEditedPointEvent?.template.id} onChange={
            (e) => {
              const templateId = parseInt(e.target.value)
              updatedPointEvent && setUpdatedPointEvent({
                ...updatedPointEvent,
                template: {
                  ...updatedPointEvent.template,
                  id: templateId
                }
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
                  date: DateTime.fromISO(date).toISO() ?? "0"
                })
              }
            } />
          <input
            className="dark:[color-scheme:dark]"
            type="number"
            placeholder="Max Input"
            defaultValue={currentlyEditedPointEvent?.maxInput ?? 0}
            //value={updatedPointEvent?.maxInput ?? 0}
            onChange={
              (e) => {
                const maxInput = parseInt(e.target.value)
                updatedPointEvent && setUpdatedPointEvent({
                  ...updatedPointEvent,
                  maxInput: maxInput
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
                <div>{student.firstName} {student.lastName}</div>
                <input className="dark:[color-scheme:dark] px-2 rounded-full" type="number"
                  defaultValue={
                    currentlyEditedPointEvent?.studentPoints?.find(studentPoint => studentPoint.student.id === student.id)?.pointData.input ?? 0
                  }
                  onChange={
                    (e) => {
                      const pointValue = parseInt(e.target.value)
                      updatedPointEvent && updatedPointEvent.studentPoints && setUpdatedPointEvent({
                        ...updatedPointEvent,
                        studentPoints: updatedPointEvent.studentPoints.map(studentPoint => {
                          if (studentPoint.student.id === student.id) {
                            console.log("Setting point value")
                            console.log(studentPoint)
                            return {
                              ...studentPoint,
                              pointData: {
                                ...studentPoint.pointData,
                                input: pointValue,
                                value: convertPointUsingRuleType(
                                  stringToRuleType(updatedPointEvent?.template.conversionRuleType ?? "direct"),
                                  updatedPointEvent?.template.conversionRuleValue ?? 0,
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
                      stringToRuleType(updatedPointEvent?.template.conversionRuleType ?? "direct"),
                      updatedPointEvent?.template.conversionRuleValue ?? 0,
                      updatedPointEvent?.studentPoints?.find(studentPoint => studentPoint.student.id === student.id)?.pointData.input ?? 0,
                      null
                    )
                  }
                </div>
                <div className="flex justify-center">
                  {
                    convertPointUsingRuleType(
                      stringToRuleType(updatedPointEvent?.template.conversionRuleType ?? "direct"),
                      updatedPointEvent?.template.conversionRuleValue ?? 0,
                      updatedPointEvent?.studentPoints?.find(studentPoint => studentPoint.student.id === student.id)?.pointData.input ?? 0
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



  const [currentImportedScorebook, setCurrentImportedScorebook] = useState<ImportedScorebook | null>(null)
  const [showImportScorebookTemplateModal, setShowImportScorebookTempateModal] = useState<boolean>(false)

  const importScorebookData = async () => {
    const importedScorebook = currentImportedScorebook
    if (importedScorebook === null) return

    await importPhoenixScorebookData(
      parseInt(groupId),
      importedScorebook
    )

    fetchScorebookData()
    console.log(importedScorebook)
  }

  const importScorebookTemplateModal = () => (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-full mx-20 h-3/4">
        {
          currentImportedScorebook === null && <div className="flex">
            <CSVReader
              cssClass="flex justify-center"
              cssInputClass="dark:[color-scheme:dark]"
              cssLabelClass="px-1"
              label="Import Phoenix CSV"
              parserOptions={{ header: false }}
              onFileLoaded={(data: string[][]) => {
                // console.log(data)
                var eventData: ImportedScorebook = data[0].splice(3).map((eventId, index) => {
                  var existingEvent = scorebookData?.pointEvents.find((pointEvent) => pointEvent.id == parseInt(eventId))
                  return {
                    pointEventId: parseInt(eventId),
                    name: data[1][index + 3],
                    date: data[2][index + 3],
                    template: {
                      type: existingEvent?.template.conversionRuleType ?? "direct",
                      value: existingEvent?.template.conversionRuleValue ?? 0
                    },
                    studentPoints: []
                  }
                })
                // console.log(eventIds)
                // Students start on row index 3
                for (var i = 3; i < data.length; i++) {
                  const studentData = data[i]
                  const studentId = studentData[0]
                  const studentLastName = studentData[1]
                  const studentFirstName = studentData[2]
                  // Scores start on column index 3
                  for (var j = 3; j < studentData.length; j++) {
                    const studentInput = parseInt(studentData[j])
                    const templateData = eventData[j - 3].template
                    eventData[j - 3].studentPoints.push({
                      id: parseInt(studentId),
                      lastName: studentLastName,
                      firstName: studentFirstName,
                      input: !isNaN(studentInput) ? studentInput : 0,
                      value: convertPointUsingRuleType(
                        stringToRuleType(templateData.type),
                        templateData.value,
                        !isNaN(studentInput) ? studentInput : 0
                      )
                    })
                  }
                }
                console.log(eventData)
                setCurrentImportedScorebook(eventData)
              }}
            />
            <button
              className="bg-red-300 dark:bg-red-700 hover:bg-red-400 dark:hover:bg-red-600 rounded-lg px-3"
              onClick={(e) => {
                setShowImportScorebookTempateModal(false)
              }}>
              Cancel
            </button>
          </div>
        }
        {
          currentImportedScorebook !== null && (
            <div className="h-full">
              <div className="h-1/6 flex justify-between">
                <div className="flex justify-center bg-slate-400 dark:bg-slate-600 rounded-full h-fit p-3">Note: These are only input scores. The points the students earn will be calculated once you confirm the import.</div>
                <div className="flex gap-5">
                  <button
                    className="bg-green-300 dark:bg-green-700 hover:bg-green-400 dark:hover:bg-green-600 rounded-full h-fit px-3"
                    onClick={(e) => {
                      importScorebookData()
                      setCurrentImportedScorebook(null)
                      setShowImportScorebookTempateModal(false)
                    }}
                  >Confirm Import</button>
                  <button
                    className="bg-red-300 dark:bg-red-700 hover:bg-red-400 dark:hover:bg-red-600 rounded-full h-fit px-3"
                    onClick={(e) => {
                      setCurrentImportedScorebook(null)
                      setShowImportScorebookTempateModal(false)
                    }}
                  >Cancel</button>
                </div>
              </div>
              <div className="grid h-5/6 overflow-scroll" style={{
                gridTemplateColumns: `250px repeat(${currentImportedScorebook.length || 0}, 150px)`
              }}>
                {
                  <>
                    <div className="flex justify-center items-center border-e border-b sticky z-20 left-0 top-0 bg-slate-300 dark:bg-slate-700">Students</div>
                    {
                      currentImportedScorebook.map((pointEvent) =>
                        <div className="flex justify-center items-center border-b border-e sticky top-0 px-3 bg-slate-300 dark:bg-slate-700">
                          <div>
                            <div className="flex justify-center">{pointEvent.name}</div>
                            <div className="flex justify-center">{pointEvent.date}</div>
                          </div>
                        </div>
                      )
                    }
                  </>
                }
                {
                  <div className="border-e sticky z-10 left-0 bg-slate-300 dark:bg-slate-700">
                    {
                      scorebookData?.students.map((student) => (
                        <div className="border-b text-nowrap">
                          {student.lastName}, {student.firstName}
                        </div>
                      ))
                    }
                  </div>
                }
                {
                  currentImportedScorebook.map((pointEvent) => (
                    <div className="border-e">
                      {
                        scorebookData?.students.map((student) => {
                          const studentInput = pointEvent.studentPoints.find((student2) => student.id === student2.id)?.input ?? 0
                          const studentValue = pointEvent.studentPoints.find((student2) => student.id === student2.id)?.value ?? 0
                          const currentInput = scorebookData.pointEvents
                            .find((pointEvent2) => pointEvent.pointEventId === pointEvent2.id)?.studentPoints
                            .find((student2) => student.id === student2.student.id)?.pointData.input
                          const diff = currentInput !== studentInput
                          return (<div className="border-b text-nowrap px-3 flex justify-center" style={{
                            backgroundColor: diff ? '#FFFF00AA' : undefined
                          }}>
                            {
                              studentInput
                            }{
                              studentInput !== studentValue && (
                                <>
                                  {' → '}{studentValue}
                                </>
                              )
                            }
                          </div>)
                        })
                      }
                    </div>
                  ))
                }
              </div>
            </div>
          )
        }
      </div>
    </div>
  )

  const [currentExportPointGroupFilter, setCurrentExportPointGroupFilter] = useState<number | null>(null)
  const [showExportScorebookTemplateModal, setShowExportScorebookTempateModal] = useState<boolean>(false)

  const exportScorebookTemplateModal = () => (

    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-slate-300 dark:bg-slate-700 border p-3 rounded-lg w-full mx-20 h-3/4">
        <div className="h-1/6">
          <div className="flex">
            <div>Point Group</div>
            <select>
              <option onClick={(e) => {
                setCurrentExportPointGroupFilter(null)
              }}>All</option>
              {
                [...new Set(scorebookData?.pointGroups)].map((pointGroup) => (
                  <option
                    onClick={(e) => {
                      setCurrentExportPointGroupFilter(pointGroup.id)
                    }}>{pointGroup.name}</option>
                ))
              }
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 h-2/3 overflow-hidden">
          <div className="border overflow-scroll p-1">
            {
              scorebookData?.pointEvents
                .filter((pointEvent) => {
                  return scorebookDataToExport.events.find((pointEvent2) => pointEvent.id === pointEvent2.id) === undefined
                })
                .filter((pointEvent) => currentExportPointGroupFilter === null || pointEvent.template.pointGroup.id === currentExportPointGroupFilter)
                .map((pointEvent) => (
                  <div className="my-1 px-1 hover:bg-slate-500 hover:text-white hover:cursor-pointer" style={{
                    borderLeft: `solid ${Color(pointEvent.template.pointGroup.color).toString()}`
                  }}
                    onClick={(e) => {
                      setScorebookDataToExport((oldData) => {
                        return {
                          events: [
                            ...oldData.events,
                            {
                              id: pointEvent.id,
                              name: pointEvent.name,
                              date: pointEvent.date,
                              pointGroupColor: pointEvent.template.pointGroup.color,
                              students: pointEvent.studentPoints.map((student) => {
                                return {
                                  id: student.student.id,
                                  inputScore: student.pointData.input
                                }
                              })
                            }
                          ],
                          students: oldData.students
                        }
                      })
                    }}
                  >
                    <div className="grid grid-cols-4 gap-1">
                      <div className="col-span-3">
                        {pointEvent.name}
                      </div>
                      <div>
                        {DateTime.fromISO(pointEvent.date).toFormat('LLL dd')}
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>
          <div className="border">
            {
              scorebookDataToExport.events.map((pointEvent) => (
                <div className="my-1 px-1 hover:bg-slate-500 hover:text-white hover:cursor-pointer" style={{
                  borderLeft: `solid ${Color(pointEvent.pointGroupColor).toString()}`
                }}
                  onClick={(e) => {
                    setScorebookDataToExport((oldData) => {
                      return {
                        events: [
                          ...oldData.events.filter((pointEvent2) => {
                            return pointEvent2.id !== pointEvent.id
                          })
                        ],
                        students: oldData.students
                      }
                    })
                  }}>

                  <div className="grid grid-cols-4 gap-1">
                    <div className="col-span-3">
                      {pointEvent.name}
                    </div>
                    <div>
                      {DateTime.fromISO(pointEvent.date).toFormat('LLL dd')}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
        <div className="h-1/6 flex justify-around pt-5">
          <div
            className="bg-green-300 dark:bg-green-700 hover:bg-green-400 dark:hover:bg-green-600 rounded-lg w-fit h-fit px-3 py-1 hover:cursor-pointer"
            onClick={(e) => {
              createScorebookTemplateExportFile()
            }}>Export to CSV</div>
          <div
            className="bg-red-300 dark:bg-red-700 hover:bg-red-400 dark:hover:bg-red-600 rounded-lg w-fit h-fit px-3 py-1 hover:cursor-pointer"
            onClick={(e) => {
              setShowExportScorebookTempateModal(false)
            }}>Cancel</div>
        </div>
      </div>
    </div>
  )

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
      {confirmDeletePointEventDialogOpen && confirmDeletePointEventDialog()}
      {showExportScorebookTemplateModal && exportScorebookTemplateModal()}
      {showImportScorebookTemplateModal && importScorebookTemplateModal()}
      <div className="h-1/5 grid grid-cols-2 border-b">
        <div>
          <div className="text-xl">
            Scorebook
          </div>
          <div>
            {addNewPointEventButton()}
            {exportScorebookTemplateButton()}
            {importScorebookTemplateButton()}
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
