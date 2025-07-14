"use client";

import { useState, useEffect } from "react"
import { DateTime } from "luxon"
import CSVReader from "react-csv-reader"
import { newGetScorebookData, editPointEvent, deletePointEvent, createPointEvent, getTeacherSchoolTimeframes } from "@/app/supaApi/server/teacher/teacherServerActions"
import importPhoenixScorebookData from "@/app/supaApi/server/teacher/teacherServerActions"
import { NewScorebookData, NewScorebookPointEvent, ImportedScorebook, TeacherTimeframe } from "@/types/domain"

type NewPointEventData = {
  pointGroupId: number,
  date: string,
  name: string,
  maxInput: number
}

type ExportScorebookTemplateData = {
  events: {
    id: number,
    name: string,
    date: string,
    studentPoints: {
      student: {
        id: number
      },
      pointData: {
        input: number
      }
    }[],
    pointGroupColor: string
  }[],
  students: {
    id: number,
    name: string,
  }[]
}

export default function TeacherGroup({ params: { groupId } }: { params: { groupId: string } }) {
  const [scorebookData, setScorebookData] = useState<NewScorebookData | null>(null)
  const [currentStudentOrder, setCurrentStudentOrder] = useState<{ id: number, firstName: string, lastName: string }[]>([])
  const [timeframes, setTimeframes] = useState<TeacherTimeframe[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const [newPointEventModalOpen, setNewPointEventModalOpen] = useState(false)
  const [newPointEventData, setNewPointEventData] = useState<NewPointEventData>({
    pointGroupId: 0,
    date: DateTime.now().toFormat("yyyy-MM-dd"),
    name: "",
    maxInput: 0
  })

  const [editPointEventModalOpen, setEditPointEventModalOpen] = useState(false)
  const [currentlyEditedPointEvent, setCurrentlyEditedPointEvent] = useState<NewScorebookPointEvent | null>(null)
  const [updatedPointEvent, setUpdatedPointEvent] = useState<NewScorebookPointEvent | null>(null)

  const [confirmDeletePointEventDialogOpen, setConfirmDeletePointEventDialogOpen] = useState(false)

  const sendBroadcastSignal = () => {
    // This function is just for the interactive tutorial.
    // Feel free to remove it once you have Supabase connected.
  }

  const fetchTimeframes = async () => {
    try {
      const timeframesData = await getTeacherSchoolTimeframes(parseInt(groupId))
      setTimeframes(timeframesData)
      
      // Set the active timeframe as default
      const activeTimeframe = timeframesData.find(tf => tf.active)
      if (activeTimeframe) {
        setSelectedTimeframe(activeTimeframe.id)
      }
    } catch (error) {
      console.error("Error fetching timeframes:", error)
    }
  }

  const fetchScorebookData = async () => {
    try {
      setLoading(true)
      const data = await newGetScorebookData(parseInt(groupId), selectedTimeframe)
      setScorebookData(data)
      setCurrentStudentOrder(data.students.sort((a, b) => a.lastName.localeCompare(b.lastName)))
    } catch (error) {
      console.error("Error fetching scorebook data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeframes()
  }, [])

  useEffect(() => {
    if (timeframes.length > 0) {
      fetchScorebookData()
    }
  }, [selectedTimeframe, timeframes])

  const updateNewPointEventData = (
    pointGroupId: number,
    date: string,
    name: string,
    maxInput: number
  ) => {
    setNewPointEventData({
      pointGroupId,
      date,
      name,
      maxInput
    })
  }

  const addNewPointEvent = async () => {
    await createPointEvent(
      parseInt(groupId),
      newPointEventData.pointGroupId,
      newPointEventData.date,
      newPointEventData.name,
      newPointEventData.maxInput
    )
    setNewPointEventModalOpen(false)
    setNewPointEventData({
      pointGroupId: 0,
      date: DateTime.now().toFormat("yyyy-MM-dd"),
      name: "",
      maxInput: 0
    })
    fetchScorebookData()
  }

  const createScorebookTemplateExportFile = () => {
    if (!scorebookData) return

    const exportData: ExportScorebookTemplateData = {
      events: scorebookData.pointEvents.map((pointEvent) => ({
        id: pointEvent.id,
        name: pointEvent.name,
        date: pointEvent.date,
        studentPoints: pointEvent.studentPoints.map((studentPoint) => ({
          student: {
            id: studentPoint.student.id
          },
          pointData: {
            input: studentPoint.pointData.input
          }
        })),
        pointGroupColor: pointEvent.pointGroup.color
      })),
      students: scorebookData.students.map((student) => ({
        id: student.id,
        name: `${student.lastName}, ${student.firstName}`
      }))
    }

    // Create CSV content manually
    const headers = ['Event ID', 'Event Name', 'Date', 'Student ID', 'Student Name', 'Points']
    const rows = exportData.events.flatMap(event => 
      event.studentPoints.map(sp => [
        event.id,
        event.name,
        event.date,
        sp.student.id,
        exportData.students.find(s => s.id === sp.student.id)?.name || '',
        sp.pointData.input
      ])
    )
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `scorebook_template_${DateTime.now().toFormat("yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const addNewPointEventModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-slate-300 dark:bg-slate-700 border p-6 rounded-lg w-1/2">
        <h2 className="text-xl font-bold mb-4">Add New Point Event</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Point Group</label>
            <select
              value={newPointEventData.pointGroupId}
              onChange={(e) => updateNewPointEventData(
                parseInt(e.target.value),
                newPointEventData.date,
                newPointEventData.name,
                newPointEventData.maxInput
              )}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-slate-700"
            >
              <option value={0}>Select a point group</option>
              {scorebookData?.pointGroups.map(pointGroup => (
                <option key={pointGroup.id} value={pointGroup.id}>
                  {pointGroup.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Event Name</label>
            <input
              type="text"
              value={newPointEventData.name}
              onChange={(e) => updateNewPointEventData(
                newPointEventData.pointGroupId,
                newPointEventData.date,
                e.target.value,
                newPointEventData.maxInput
              )}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={newPointEventData.date}
              onChange={(e) => updateNewPointEventData(
                newPointEventData.pointGroupId,
                e.target.value,
                newPointEventData.name,
                newPointEventData.maxInput
              )}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Input Score</label>
            <input
              type="number"
              value={newPointEventData.maxInput}
              onChange={(e) => updateNewPointEventData(
                newPointEventData.pointGroupId,
                newPointEventData.date,
                newPointEventData.name,
                parseInt(e.target.value) || 0
              )}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-slate-700"
            />
          </div>
        </div>
        <div className="flex space-x-4 mt-6">
          <button
            onClick={addNewPointEvent}
            disabled={newPointEventData.pointGroupId === 0 || newPointEventData.name === ""}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Add Event
          </button>
          <button
            onClick={() => setNewPointEventModalOpen(false)}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  const addNewPointEventButton = () => (
    <button
      onClick={() => setNewPointEventModalOpen(true)}
      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
    >
      Add Point Event
    </button>
  )

  const exportScorebookTemplateButton = () => (
    <button
      onClick={createScorebookTemplateExportFile}
      className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
    >
      Export Template
    </button>
  )

  const importScorebookTemplateButton = () => (
    <button
      onClick={() => setImportScorebookTemplateModalOpen(true)}
      className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
    >
      Import Template
    </button>
  )

  const saveEditedPointEventData = async () => {
    if (!updatedPointEvent) return
    await editPointEvent(updatedPointEvent, parseInt(groupId))
    setEditPointEventModalOpen(false)
    setCurrentlyEditedPointEvent(null)
    setUpdatedPointEvent(null)
    fetchScorebookData()
  }

  const scorebookTable = () => {
    if (!scorebookData) return <div>No data</div>
    return (
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden h-full">
        <div className="overflow-x-auto max-w-full h-full overflow-y-auto">
          <table className="min-w-full bg-white dark:bg-gray-800">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="border-r border-gray-300 dark:border-gray-600 px-4 py-2 text-left bg-gray-50 dark:bg-gray-700 sticky left-0 z-30 shadow-sm">
                  Student
                </th>
                {scorebookData.pointEvents.map((pointEvent) => (
                  <th key={pointEvent.id} className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center bg-gray-50 dark:bg-gray-700 w-[200px]">
                    <div className="flex flex-col items-center space-y-1">
                      <div className="text-sm font-bold text-center leading-tight min-h-[2.5rem] flex items-center justify-center">
                        {pointEvent.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {DateTime.fromISO(pointEvent.date).toFormat('MMM dd')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        Max: {pointEvent.maxInput}
                      </div>
                      <div 
                        className="w-full h-1 rounded"
                        style={{ backgroundColor: pointEvent.pointGroup.color }}
                      ></div>
                      <div className="flex space-x-1 mt-1">
                        <button
                          onClick={() => {
                            setCurrentlyEditedPointEvent(pointEvent)
                            setUpdatedPointEvent(pointEvent)
                            setEditPointEventModalOpen(true)
                          }}
                          className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setCurrentlyEditedPointEvent(pointEvent)
                            setConfirmDeletePointEventDialogOpen(true)
                          }}
                          className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentStudentOrder.map((student) => (
                <tr key={student.id}>
                  <td className="border-r border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-50 dark:bg-gray-700 sticky left-0 z-10 shadow-sm">
                    <div className="font-medium">
                      {student.lastName}, {student.firstName}
                    </div>
                  </td>
                  {scorebookData.pointEvents.map((pointEvent) => {
                    const studentPoint = Array.isArray(pointEvent.studentPoints) 
                      ? pointEvent.studentPoints.find(s => s.student.id === student.id)
                      : undefined
                    return (
                      <td key={`${student.id}-${pointEvent.id}`} className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center w-[200px]">
                        {studentPoint ? (
                          <span className="text-lg font-semibold">
                            {studentPoint.pointData.value} pts
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const confirmDeletePointEvent = async () => {
    if (currentlyEditedPointEvent === null) return
    await deletePointEvent(currentlyEditedPointEvent.id)
    setConfirmDeletePointEventDialogOpen(false)
    setCurrentlyEditedPointEvent(null)
    fetchScorebookData()
  }

  const confirmDeletePointEventDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-slate-300 dark:bg-slate-700 border p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
        <p className="mb-4">Are you sure you want to delete this point event?</p>
        <div className="flex space-x-4">
          <button
            onClick={confirmDeletePointEvent}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Delete
          </button>
          <button
            onClick={() => {
              setConfirmDeletePointEventDialogOpen(false)
              setCurrentlyEditedPointEvent(null)
            }}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  const editPointEventModal = () => {
    if (!updatedPointEvent || !scorebookData) return null
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-slate-300 dark:bg-slate-700 border p-6 rounded-lg w-3/4 max-h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Edit Point Event: {currentlyEditedPointEvent?.name}</h2>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Name</label>
                <input
                  type="text"
                  value={updatedPointEvent.name}
                  onChange={(e) => setUpdatedPointEvent(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={DateTime.fromISO(updatedPointEvent.date).toFormat('yyyy-MM-dd')}
                  onChange={(e) => setUpdatedPointEvent(prev => prev ? { ...prev, date: DateTime.fromISO(e.target.value).toISO() || "" } : null)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Input Score</label>
                <input
                  type="number"
                  value={updatedPointEvent.maxInput}
                  onChange={(e) => setUpdatedPointEvent(prev => prev ? { ...prev, maxInput: parseInt(e.target.value) || 0 } : null)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Point Group</label>
                <select
                  value={updatedPointEvent.pointGroup.id}
                  onChange={(e) => {
                    const pointGroupId = parseInt(e.target.value)
                    const pointGroup = scorebookData?.pointGroups.find(pg => pg.id === pointGroupId)
                    if (pointGroup) {
                      setUpdatedPointEvent(prev => prev ? { ...prev, pointGroup: pointGroup } : null)
                    }
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-slate-700"
                >
                  {scorebookData?.pointGroups.map(pointGroup => (
                    <option key={pointGroup.id} value={pointGroup.id}>{pointGroup.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Student Scores</h3>
              <div className="grid grid-cols-1 gap-2">
                {Array.isArray(updatedPointEvent.studentPoints) ? updatedPointEvent.studentPoints.map((studentPoint) => {
                  // Find the student name from the currentStudentOrder
                  const student = currentStudentOrder.find(s => s.id === studentPoint.student.id)
                  const studentName = student ? `${student.lastName}, ${student.firstName}` : `Student ${studentPoint.student.id}`
                  
                  return (
                    <div key={studentPoint.student.id} className="flex items-center space-x-4 p-2 border border-gray-300 dark:border-gray-600 rounded">
                      <div className="w-32 font-medium">
                        {studentName}
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm">Points:</label>
                        <input
                          type="number"
                          value={studentPoint.pointData.value}
                          onChange={(e) => {
                            const newPoints = parseInt(e.target.value) || 0
                            
                            setUpdatedPointEvent(prev => prev ? {
                              ...prev,
                              studentPoints: prev.studentPoints.map(sp => 
                                sp.student.id === studentPoint.student.id 
                                  ? { ...sp, pointData: { ...sp.pointData, value: newPoints } }
                                  : sp
                              )
                            } : null)
                          }}
                          className="w-20 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-slate-700"
                          min="0"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          points
                        </span>
                      </div>
                    </div>
                  )
                }) : null}
              </div>
            </div>
          </div>

          <div className="flex space-x-4 mt-6">
            <button
              onClick={saveEditedPointEventData}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                setEditPointEventModalOpen(false)
                setCurrentlyEditedPointEvent(null)
                setUpdatedPointEvent(null)
              }}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  const [importScorebookTemplateModalOpen, setImportScorebookTemplateModalOpen] = useState(false)
  const [importScorebookData, setImportScorebookData] = useState<ImportedScorebook | null>(null)

  const handleImportScorebookData = async () => {
    if (!importScorebookData) return
    await importPhoenixScorebookData(parseInt(groupId), importScorebookData)
    setImportScorebookTemplateModalOpen(false)
    setImportScorebookData(null)
    fetchScorebookData()
  }

  const importScorebookTemplateModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-slate-300 dark:bg-slate-700 border p-6 rounded-lg w-3/4">
        <h2 className="text-xl font-bold mb-4">Import Scorebook Template</h2>
        <CSVReader
          onFileLoaded={(data) => {
            setImportScorebookData(data as ImportedScorebook)
          }}
          parserOptions={{
            header: true,
            skipEmptyLines: true
          }}
        />
        {importScorebookData && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Preview:</h3>
            <div className="max-h-64 overflow-y-auto">
              <table className="min-w-full border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left">Student</th>
                    {importScorebookData[0] && Object.keys(importScorebookData[0]).slice(3).map((key, index) => (
                      <th key={index} className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importScorebookData.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                        {(row as any)[Object.keys(row)[1]]}, {(row as any)[Object.keys(row)[2]]}
                      </td>
                      {Object.keys(row).slice(3).map((key, keyIndex) => (
                        <td key={keyIndex} className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                          {(row as any)[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex space-x-4 mt-6">
          <button
            onClick={() => handleImportScorebookData()}
            disabled={!importScorebookData}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Import
          </button>
          <button
            onClick={() => {
              setImportScorebookTemplateModalOpen(false)
              setImportScorebookData(null)
            }}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  const loadingScreen = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-slate-300 dark:bg-slate-700 border p-6 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-center">Loading scorebook data...</p>
      </div>
    </div>
  )

  if (loading) {
    return loadingScreen()
  }

  return (
    <div className="h-dvh w-full flex flex-col text-slate-700 dark:text-slate-300">
      <header className="h-20 p-5 flex items-center justify-between w-screen bg-slate-300 dark:bg-slate-700">
        <div className="flex items-center space-x-4">
          <a
            href="/teacher"
            className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Teacher Dashboard</span>
          </a>
        </div>
        
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold">Group Scorebook</h1>
            {scorebookData?.studentGroup && (
              <div className="text-lg opacity-75">
                {scorebookData.studentGroup.name}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Timeframe Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="timeframe" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Timeframe:
            </label>
            <select
              id="timeframe"
              value={selectedTimeframe || ""}
              onChange={(e) => {
                const value = e.target.value
                setSelectedTimeframe(value ? parseInt(value) : null)
              }}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeframes.length === 0 ? (
                <option>Loading...</option>
              ) : (
                <>
                  <option value="">All Timeframes</option>
                  {timeframes.map((timeframe) => (
                    <option key={timeframe.id} value={timeframe.id}>
                      {timeframe.name} {timeframe.active ? "(Active)" : ""}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            {addNewPointEventButton()}
            {exportScorebookTemplateButton()}
            {importScorebookTemplateButton()}
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden p-6">
        {loading ? (
          loadingScreen()
        ) : (
          scorebookTable()
        )}
      </main>

      {/* Modals */}
      {newPointEventModalOpen && addNewPointEventModal()}
      {editPointEventModalOpen && editPointEventModal()}
      {confirmDeletePointEventDialogOpen && confirmDeletePointEventDialog()}
      {importScorebookTemplateModalOpen && importScorebookTemplateModal()}
    </div>
  )
}