"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DateTime } from "luxon"
import CSVReader from "react-csv-reader"
import Papa from 'papaparse';
import { newGetScorebookData, editPointEvent, deletePointEvent, createPointEvent, getTeacherSchoolTimeframes } from "@/app/supaApi/server/teacher/teacherServerActions"
import importPhoenixScorebookData from "@/app/supaApi/server/teacher/teacherServerActions"
import { getTeachingAssistantData, assignTeachingAssistant, updateTeachingAssistant, removeTeachingAssistant, clearTeachingAssistantPointEvents } from "@/api/teacher"
import { getScorebookAccess } from "@/api/scorebook"
import { NewScorebookData, NewScorebookPointEvent, ImportedScorebook, TeacherTimeframe, ImportPreviewTableRow, TeachingAssistant, TeachingAssistantManagementData } from "@/types/domain"

type NewPointEventData = {
  pointGroupId: number,
  date: string,
  name: string,
  maxInput: number
}

type TeachingAssistantModalData = {
  studentId: number,
  fullAccess: boolean,
  pointEventIds: number[]
}


export default function TeacherGroup({ params: { groupId } }: { params: { groupId: string } }) {
  const router = useRouter()
  const [isTooSmall, setIsTooSmall] = useState<boolean>(false)
  const MIN_WIDTH = 768

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

  // New state for parsed import preview
  const [importPreview, setImportPreview] = useState<{
    eventIds: string[];
    eventNames: string[];
    students: ImportPreviewTableRow[];
  } | null>(null);

  const [importLoading, setImportLoading] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [showPercent, setShowPercent] = useState(false);

  const [selectedPointGroupId, setSelectedPointGroupId] = useState<string>('');
  const [focusedStudentId, setFocusedStudentId] = useState<number | null>(null);
  // Role awareness: teacher vs TA
  const [accessRole, setAccessRole] = useState<"teacher" | "assistantFull" | "assistantLimited" | "none">("none")
  const isTeacher = accessRole === "teacher"

  // TA inline edits: map of eventId -> studentId -> value
  const [taEdits, setTaEdits] = useState<Record<number, Record<number, number>>>({})

  // Teaching Assistant Management
  const [teachingAssistantData, setTeachingAssistantData] = useState<TeachingAssistantManagementData | null>(null);
  const [teachingAssistantModalOpen, setTeachingAssistantModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<TeachingAssistant | null>(null);
  const [isAddingAssistant, setIsAddingAssistant] = useState(false);
  const [teachingAssistantModalData, setTeachingAssistantModalData] = useState<TeachingAssistantModalData>({
    studentId: 0,
    fullAccess: false,
    pointEventIds: []
  });
  
  // Search states for teaching assistant modal
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [pointEventSearchTerm, setPointEventSearchTerm] = useState('');
  const [selectedPointGroupFilter, setSelectedPointGroupFilter] = useState<number>(0);

  useEffect(() => {
    const check = () => setIsTooSmall(window.innerWidth < MIN_WIDTH)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Conditional rendering instead of early return to avoid hooks issues
  const renderContent = () => {
    if (isTooSmall) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-semibold">Use a larger screen</h1>
            <p className="text-slate-600 dark:text-slate-300">The scorebook is only available on tablets and larger devices. Please switch to a larger screen.</p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center rounded bg-blue-600 text-white px-4 py-2"
            >
              Go Back
            </button>
          </div>
        </div>
      )
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
            {/* Timeframe Filter (teacher only) */}
            {isTeacher && (
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
            )}
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              {isTeacher && addNewPointEventButton()}
              {isTeacher && openUnifiedScorebookButton()}
              {isTeacher && exportScorebookTemplateButton()}
              {isTeacher && importScorebookTemplateButton()}
              {isTeacher && teachingAssistantButton()}
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
        {teachingAssistantModalOpen && !isAddingAssistant && !editingAssistant && teachingAssistantManagementModal()}
        {teachingAssistantModalOpen && (isAddingAssistant || editingAssistant) && teachingAssistantModal()}
      </div>
    )
  }

  // Helper: Determine which students/events have changes
  function getChangedMatrix() {
    if (!importPreview || !scorebookData) return { changedStudents: [], changedEvents: [] };
    const changedStudents: boolean[] = importPreview.students.map((student, sIdx) => {
      return importPreview.eventIds.some((eventId, eIdx) => {
        const event = scorebookData.pointEvents.find(e => e.id.toString() === eventId);
        let currentValue = '';
        if (event) {
          const sp = event.studentPoints.find(sp => sp.student.id === parseInt(student.studentId));
          if (sp) currentValue = sp.pointData.value.toString();
        }
        return (student.scores[eIdx] || '') !== (currentValue || '');
      });
    });
    const changedEvents: boolean[] = importPreview.eventIds.map((eventId, eIdx) => {
      return importPreview.students.some((student, sIdx) => {
        const event = scorebookData.pointEvents.find(e => e.id.toString() === eventId);
        let currentValue = '';
        if (event) {
          const sp = event.studentPoints.find(sp => sp.student.id === parseInt(student.studentId));
          if (sp) currentValue = sp.pointData.value.toString();
        }
        return (student.scores[eIdx] || '') !== (currentValue || '');
      });
    });
    return { changedStudents, changedEvents };
  }

  const getCellBgClass = (percentNum: number) => {
    if (percentNum > 75) return 'bg-green-50 dark:bg-green-900';
    if (percentNum > 25) return 'bg-yellow-50 dark:bg-yellow-900';
    if (percentNum > 0) return 'bg-orange-50 dark:bg-orange-900';
    return 'bg-red-50 dark:bg-red-900';
  };


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

  const fetchTeachingAssistantData = async () => {
    try {
      const data = await getTeachingAssistantData(parseInt(groupId))
      setTeachingAssistantData(data)
    } catch (error) {
      console.error("Error fetching teaching assistant data:", error)
    }
  }

  useEffect(() => {
    fetchTimeframes()
  }, [])

  useEffect(() => {
    if (timeframes.length > 0) {
      fetchScorebookData()
      fetchTeachingAssistantData()
    }
  }, [selectedTimeframe, timeframes])

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const access = await getScorebookAccess(parseInt(groupId))
        setAccessRole(access.role)
      } catch {}
    }
    loadAccess()
  }, [groupId])

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

    // Create table-like format
    // First row: Point event IDs (for reference when importing)
    // Second row: Point event names
    // First column: Student names
    // Data cells: Student scores

    const eventIds = scorebookData.pointEvents.map(event => event.id.toString())
    const eventNames = scorebookData.pointEvents.map(event => event.name)
    
    // Create header rows
    const headerRow1 = ['Student Name', 'Student ID', ...eventIds]
    const headerRow2 = ['', '', ...eventNames]
    
    // Create data rows
    const dataRows = scorebookData.students.map(student => {
      const studentName = `${student.lastName}, ${student.firstName}`
      const studentId = student.id
      
      // Get scores for each event
      const scores = scorebookData.pointEvents.map(event => {
        const studentPoint = event.studentPoints.find(sp => sp.student.id === student.id)
        return studentPoint ? studentPoint.pointData.value.toString() : ''
      })
      
      return [studentName, studentId.toString(), ...scores]
    })
    
    // Combine all rows
    const csvContent = [headerRow1, headerRow2, ...dataRows]
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
      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
    >
      Add New Point Event
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

  const openUnifiedScorebookButton = () => (
    <a
      href={`/scorebook/group/${groupId}`}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Open Unified Scorebook
    </a>
  )

  const teachingAssistantButton = () => (
    <button
      onClick={() => setTeachingAssistantModalOpen(true)}
      className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
    >
      Manage Teaching Assistants
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
    // Filter point events by selected point group
    const filteredPointEvents = selectedPointGroupId
      ? scorebookData.pointEvents.filter(pe => pe.pointGroup.id.toString() === selectedPointGroupId)
      : scorebookData.pointEvents;
    // Filter students by focus
    const studentsToShow = focusedStudentId
      ? scorebookData.students.filter(s => s.id === focusedStudentId)
      : scorebookData.students;
    return (
      <>
        {focusedStudentId && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">Showing only selected student</span>
          </div>
        )}
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium">
            Filter by Point Group:
            <select
              className="ml-2 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              value={selectedPointGroupId}
              onChange={e => setSelectedPointGroupId(e.target.value)}
            >
              <option value="">All</option>
              {scorebookData.pointGroups.map(pg => (
                <option key={pg.id} value={pg.id}>{pg.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <label className="flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPercent}
              onChange={() => setShowPercent(v => !v)}
              className="sr-only"
            />
            <span
              className={`w-10 h-6 flex items-center bg-gray-300 dark:bg-gray-600 rounded-full p-1 duration-300 ease-in-out ${showPercent ? 'bg-blue-500' : ''}`}
            >
              <span
                className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${showPercent ? 'translate-x-4' : ''}`}
              />
            </span>
            <span className="ml-3 text-sm font-medium">
              {showPercent ? 'Percent of Max Points' : 'Raw Point Values'}
            </span>
          </label>
          <span className="text-xs text-slate-600 dark:text-slate-400 ml-2">
            {showPercent ? 'Showing percent out of max points' : 'Showing raw point values'}
          </span>
        </div>
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden h-full">
          <div className="overflow-x-auto max-w-full h-full overflow-y-auto">
            <table className="min-w-full bg-white dark:bg-gray-800">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="border-r border-gray-300 dark:border-gray-600 px-4 py-2 text-left bg-gray-50 dark:bg-gray-700 sticky left-0 z-30 shadow-sm">
                    Student
                  </th>
                  {filteredPointEvents.map((pointEvent) => (
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
                          className="w-full h-1 rounded mt-1 mb-1"
                          style={{ backgroundColor: pointEvent.pointGroup.color }}
                        ></div>
                        {isTeacher ? (
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
                        ) : (
                          <div className="flex space-x-1 mt-1">
                            <button
                              onClick={async () => {
                                if (!scorebookData) return
                                const current = scorebookData.pointEvents.find(e => e.id === pointEvent.id)
                                if (!current) return
                                const updates = current.studentPoints.map(sp => ({
                                  studentId: sp.student.id,
                                  input: sp.pointData.value, // Use point_value as input since input_score is no longer used
                                  value: (taEdits[pointEvent.id]?.[sp.student.id] ?? sp.pointData.value) as number,
                                  notes: sp.pointData.notes,
                                }))
                                const ok = await import("@/app/supaApi/server/teacher/teacherServerActions").then(m => m.updateStudentPointsByAssistant(parseInt(groupId), pointEvent.id, updates as any))
                                if (ok) fetchScorebookData()
                              }}
                              className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                            >
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studentsToShow.map((student) => (
                  <tr
                    key={student.id}
                    className={
                      focusedStudentId === student.id
                        ? 'ring-2 ring-blue-400 dark:ring-blue-600 bg-blue-50 dark:bg-blue-950'
                        : ''
                    }
                  >
                    <td className="border-r border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-50 dark:bg-gray-700 sticky left-0 z-10 shadow-sm font-medium">
                      <div className="flex items-center gap-2">
                        <span>{student.lastName}, {student.firstName}</span>
                        <button
                          type="button"
                          onClick={() => setFocusedStudentId(prev => prev === student.id ? null : student.id)}
                          aria-label={`${focusedStudentId === student.id ? 'Unfocus' : 'Focus on'} ${student.lastName}, ${student.firstName}`}
                          className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded border border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800"
                          title={focusedStudentId === student.id ? 'Unfocus' : 'Focus'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm0-6a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm0 18a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM3 11a1 1 0 011-1h2a1 1 0 110 2H4a1 1 0 01-1-1zm14 0a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM5.636 5.636a1 1 0 011.414 0l1.414 1.414a1 1 0 11-1.414 1.414L5.636 7.05a1 1 0 010-1.414zm10.9 10.9a1 1 0 011.414 0l1.414 1.414a1 1 0 01-1.414 1.414l-1.414-1.414a1 1 0 010-1.414zM5.636 18.364a1 1 0 010-1.414l1.414-1.414a1 1 0 111.414 1.414L7.05 18.364a1 1 0 01-1.414 0zm10.9-10.9a1 1 0 010-1.414l1.414-1.414a1 1 0 111.414 1.414L17.95 7.05a1 1 0 01-1.414 0z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                    {filteredPointEvents.map((pointEvent) => {
                      const studentPoint = pointEvent.studentPoints.find(sp => sp.student.id === student.id)
                      const value = studentPoint ? (isTeacher ? studentPoint.pointData.value : (taEdits[pointEvent.id]?.[student.id] ?? studentPoint.pointData.value)) : ''
                      let percentNum = 0;
                      if (typeof (studentPoint?.pointData.value) === 'number' && pointEvent.maxInput !== 0) {
                        percentNum = ((studentPoint?.pointData.value as number) / pointEvent.maxInput) * 100;
                      }
                      const percent = (typeof (studentPoint?.pointData.value) === 'number' && pointEvent.maxInput !== 0)
                        ? percentNum.toFixed(1) + '%'
                        : ''
                      const bgClass = getCellBgClass(percentNum);
                      return (
                        <td key={pointEvent.id} className={`border border-gray-300 dark:border-gray-600 px-3 py-2 text-center ${bgClass}`}>
                          {isTeacher ? (
                            showPercent ? percent : (value as any)
                          ) : (
                            <input
                              type="number"
                              className="w-20 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-slate-700"
                              value={typeof value === 'number' ? value : (typeof value === 'string' ? value : 0)}
                              onChange={(e) => {
                                const num = parseFloat(e.target.value) || 0
                                setTaEdits(prev => ({
                                  ...prev,
                                  [pointEvent.id]: { ...(prev[pointEvent.id] || {}), [student.id]: num }
                                }))
                              }}
                            />
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
      </>
    )
  }

  const confirmDeletePointEvent = async () => {
    if (currentlyEditedPointEvent === null) return
    await deletePointEvent(currentlyEditedPointEvent.id)
    setConfirmDeletePointEventDialogOpen(false)
    setCurrentlyEditedPointEvent(null)
    fetchScorebookData()
  }

  const openTeachingAssistantModal = (assistant?: TeachingAssistant) => {
    if (assistant) {
      setEditingAssistant(assistant)
      setIsAddingAssistant(false)
      setTeachingAssistantModalData({
        studentId: assistant.studentId,
        fullAccess: assistant.fullAccess,
        pointEventIds: [] // Will be fetched separately
      })
    } else {
      setEditingAssistant(null)
      setIsAddingAssistant(true)
      setTeachingAssistantModalData({
        studentId: 0,
        fullAccess: false,
        pointEventIds: []
      })
    }
    // Reset search terms
    setStudentSearchTerm('')
    setPointEventSearchTerm('')
    setSelectedPointGroupFilter(0)
    setTeachingAssistantModalOpen(true)
  }

  const saveTeachingAssistant = async () => {
    try {
      if (editingAssistant) {
        await updateTeachingAssistant(
          parseInt(groupId),
          editingAssistant.id,
          teachingAssistantModalData.fullAccess,
          teachingAssistantModalData.pointEventIds
        )
      } else {
        await assignTeachingAssistant(
          parseInt(groupId),
          teachingAssistantModalData.studentId,
          teachingAssistantModalData.fullAccess,
          teachingAssistantModalData.pointEventIds
        )
      }
      setTeachingAssistantModalOpen(false)
      setEditingAssistant(null)
      setIsAddingAssistant(false)
      // Reset search terms
      setStudentSearchTerm('')
      setPointEventSearchTerm('')
      setSelectedPointGroupFilter(0)
      fetchTeachingAssistantData()
    } catch (error) {
      console.error("Error saving teaching assistant:", error)
      alert("Error saving teaching assistant: " + (error instanceof Error ? error.message : "Unknown error"))
    }
  }

  const removeTeachingAssistantFromGroup = async (assistantId: number) => {
    if (confirm("Are you sure you want to remove this teaching assistant?")) {
      try {
        await removeTeachingAssistant(parseInt(groupId), assistantId)
        fetchTeachingAssistantData()
      } catch (error) {
        console.error("Error removing teaching assistant:", error)
        alert("Error removing teaching assistant: " + (error instanceof Error ? error.message : "Unknown error"))
      }
    }
  }

  const clearTeachingAssistantEvents = async (assistantId: number) => {
    if (confirm("Are you sure you want to clear all point event assignments for this teaching assistant?")) {
      try {
        await clearTeachingAssistantPointEvents(parseInt(groupId), assistantId)
        fetchTeachingAssistantData()
      } catch (error) {
        console.error("Error clearing teaching assistant events:", error)
        alert("Error clearing teaching assistant events: " + (error instanceof Error ? error.message : "Unknown error"))
      }
    }
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
    if (!importPreview) return;
    setImportLoading(true);
    // Convert importPreview to ImportedScorebook (array of event objects)
    const imported: ImportedScorebook = importPreview.eventIds.map((eventId, eventIdx) => ({
      pointEventId: parseInt(eventId),
      name: importPreview.eventNames[eventIdx] || '',
      date: '', // Not available from import
      template: { type: '', value: 0 }, // Not available from import
      studentPoints: importPreview.students.map(student => ({
        id: parseInt(student.studentId),
        lastName: student.studentName.split(',')[0]?.trim() || '',
        firstName: student.studentName.split(',')[1]?.trim() || '',
        input: student.scores[eventIdx] ? parseFloat(student.scores[eventIdx]) : 0,
        value: student.scores[eventIdx] ? parseFloat(student.scores[eventIdx]) : 0
      }))
    }));
    try {
      const result = await importPhoenixScorebookData(parseInt(groupId), imported);
      if (typeof result === 'string') {
        alert(`Import failed: ${result}`);
        setImportLoading(false);
        return;
      }
      setImportScorebookTemplateModalOpen(false);
      setImportPreview(null);
      fetchScorebookData();
    } catch (error) {
      console.error('Import error:', error);
      alert('An error occurred during import. Please try again.');
    } finally {
      setImportLoading(false);
    }
  }

  // Custom CSV file handler
  const handleCSVFile = (file: File) => {
    Papa.parse(file, {
      complete: (results) => {
        const rows = results.data as string[][];
        if (!rows || rows.length < 3) {
          setImportPreview(null);
          return;
        }
        // First row: headers (Student Name, Student ID, event IDs...)
        // Second row: sub-headers (blank, blank, event names...)
        const eventIds = rows[0].slice(2);
        const eventNames = rows[1].slice(2);
        const students = rows.slice(2).filter(r => r.length > 1).map(row => ({
          studentName: row[0],
          studentId: row[1],
          scores: row.slice(2)
        }));
        setImportPreview({ eventIds, eventNames, students });
      },
      skipEmptyLines: true
    });
  };

  const teachingAssistantModal = () => {
    if (!teachingAssistantData) return null;

    const availableStudents = teachingAssistantData.availableStudents.filter(
      student => !teachingAssistantData.assistants.some(assistant => assistant.studentId === student.id)
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-slate-300 dark:bg-slate-700 border p-6 rounded-lg w-3/4 max-h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">
            {editingAssistant ? 'Edit Teaching Assistant' : 'Add Teaching Assistant'}
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {!editingAssistant && (
              <div>
                <label className="block text-sm font-medium mb-1">Student</label>
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-slate-700 text-sm"
                  />
                </div>
                <div className="h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-2">
                  {availableStudents
                    .filter(student => 
                      studentSearchTerm === '' || 
                      student.firstName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                      student.lastName.toLowerCase().includes(studentSearchTerm.toLowerCase())
                    )
                    .map(student => (
                      <label key={student.id} className="flex items-center space-x-2 p-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                        <input
                          type="radio"
                          name="selectedStudent"
                          checked={teachingAssistantModalData.studentId === student.id}
                          onChange={() => setTeachingAssistantModalData(prev => ({
                            ...prev,
                            studentId: student.id
                          }))}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {student.lastName}, {student.firstName}
                        </span>
                      </label>
                    ))}
                  {availableStudents.filter(student => 
                    studentSearchTerm === '' || 
                    student.firstName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                    student.lastName.toLowerCase().includes(studentSearchTerm.toLowerCase())
                  ).length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                      No students found matching your search.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={teachingAssistantModalData.fullAccess}
                  onChange={(e) => setTeachingAssistantModalData(prev => ({
                    ...prev,
                    fullAccess: e.target.checked
                  }))}
                  className="sr-only"
                />
                <span
                  className={`w-10 h-6 flex items-center bg-gray-300 dark:bg-gray-600 rounded-full p-1 duration-300 ease-in-out ${teachingAssistantModalData.fullAccess ? 'bg-blue-500' : ''}`}
                >
                  <span
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${teachingAssistantModalData.fullAccess ? 'translate-x-4' : ''}`}
                  />
                </span>
                <span className="ml-3 text-sm font-medium">
                  Full Access to All Point Events
                </span>
              </label>
            </div>

            {!teachingAssistantModalData.fullAccess && (
              <div>
                <label className="block text-sm font-medium mb-1">Assigned Point Events</label>
                
                {/* Search and filter controls */}
                <div className="mb-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Search point events..."
                    value={pointEventSearchTerm}
                    onChange={(e) => setPointEventSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-slate-700 text-sm"
                  />
                  <select
                    value={selectedPointGroupFilter}
                    onChange={(e) => setSelectedPointGroupFilter(parseInt(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-slate-700 text-sm"
                  >
                    <option value={0}>All Point Groups</option>
                    {teachingAssistantData.pointGroups?.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    )) || []}
                  </select>
                </div>

                <div className="h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-2">
                  {teachingAssistantData.pointEvents
                    .filter(event => {
                      // Filter by search term
                      const matchesSearch = pointEventSearchTerm === '' || 
                        event.name.toLowerCase().includes(pointEventSearchTerm.toLowerCase());
                      
                      // Filter by point group
                      const matchesGroup = selectedPointGroupFilter === 0 || 
                        event.pointGroupId === selectedPointGroupFilter;
                      
                      return matchesSearch && matchesGroup;
                    })
                    .map(event => (
                      <label key={event.id} className="flex items-center space-x-2 p-1">
                        <input
                          type="checkbox"
                          checked={teachingAssistantModalData.pointEventIds.includes(event.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTeachingAssistantModalData(prev => ({
                                ...prev,
                                pointEventIds: [...prev.pointEventIds, event.id]
                              }))
                            } else {
                              setTeachingAssistantModalData(prev => ({
                                ...prev,
                                pointEventIds: prev.pointEventIds.filter(id => id !== event.id)
                              }))
                            }
                          }}
                          className="rounded"
                        />
                        <div className="flex items-center space-x-2">
                          {event.pointGroup && (
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: event.pointGroup.color }}
                            />
                          )}
                          <span className="text-sm">
                            {event.name} ({DateTime.fromISO(event.date).toFormat('MMM dd')})
                          </span>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-4 mt-6">
            <button
              onClick={saveTeachingAssistant}
              disabled={!editingAssistant && teachingAssistantModalData.studentId === 0}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {editingAssistant ? 'Update' : 'Add'} Assistant
            </button>
            <button
              onClick={() => {
                setTeachingAssistantModalOpen(false)
                setEditingAssistant(null)
                setIsAddingAssistant(false)
                // Reset search terms
                setStudentSearchTerm('')
                setPointEventSearchTerm('')
                setSelectedPointGroupFilter(0)
              }}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const teachingAssistantManagementModal = () => {
    if (!teachingAssistantData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-slate-300 dark:bg-slate-700 border p-6 rounded-lg w-3/4 max-h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Teaching Assistant Management</h2>
          
          <div className="mb-4">
            <button
              onClick={() => openTeachingAssistantModal()}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Add New Teaching Assistant
            </button>
          </div>

          <div className="space-y-4">
            {teachingAssistantData.assistants.map(assistant => (
              <div key={assistant.id} className="border border-gray-300 dark:border-gray-600 rounded p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">
                      {assistant.student.lastName}, {assistant.student.firstName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {assistant.fullAccess ? 'Full Access' : 'Limited Access'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openTeachingAssistantModal(assistant)}
                      className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                    {!assistant.fullAccess && (
                      <button
                        onClick={() => clearTeachingAssistantEvents(assistant.id)}
                        className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Clear Events
                      </button>
                    )}
                    <button
                      onClick={() => removeTeachingAssistantFromGroup(assistant.id)}
                      className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {teachingAssistantData.assistants.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                No teaching assistants assigned to this group.
              </p>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setTeachingAssistantModalOpen(false)}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const importScorebookTemplateModal = () => {
    const changedMatrix = getChangedMatrix();
    // Filter students/events if showUnchanged is false
    const filteredStudents = importPreview && !showUnchanged && changedMatrix
      ? importPreview.students.filter((_, idx) => changedMatrix.changedStudents[idx])
      : importPreview?.students || [];
    const filteredEventIds = importPreview && !showUnchanged && changedMatrix
      ? importPreview.eventIds.filter((_, idx) => changedMatrix.changedEvents[idx])
      : importPreview?.eventIds || [];
    const filteredEventNames = importPreview && !showUnchanged && changedMatrix
      ? importPreview.eventNames.filter((_, idx) => changedMatrix.changedEvents[idx])
      : importPreview?.eventNames || [];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-slate-300 dark:bg-slate-700 border p-6 rounded-lg w-3/4">
          <h2 className="text-xl font-bold mb-4">Import Scorebook Template</h2>
          <div className="mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Import a CSV file with the following format:
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside mb-4">
              <li>First column: Student Name (LastName, FirstName)</li>
              <li>Second column: Student ID</li>
              <li>First row: Point Event IDs (for reference)</li>
              <li>Second row: Point Event Names</li>
              <li>Data cells: Student scores for each event</li>
            </ul>
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleCSVFile(e.target.files[0]);
              }
            }}
            className="mb-4"
          />
          {importPreview && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-4">
                <button
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-600 text-sm font-medium"
                  onClick={() => setShowUnchanged(v => !v)}
                >
                  {showUnchanged ? 'Hide' : 'Show'} Unchanged Rows/Columns
                </button>
                <span className="text-xs text-slate-600 dark:text-slate-400">{!showUnchanged && 'Only showing changed students/events.'}</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Preview:</h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="min-w-full border border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr className="bg-gray-200 dark:bg-gray-800">
                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left text-xs">Student Name</th>
                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left text-xs">Student ID</th>
                      {filteredEventIds.map((id, idx) => (
                        <th key={`id-${idx}`} className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-xs">{id}</th>
                      ))}
                    </tr>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left text-xs">(Event Names)</th>
                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left text-xs"></th>
                      {filteredEventNames.map((name, idx) => (
                        <th key={`name-${idx}`} className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-xs">{name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.slice(0, 5).map((student, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm">{student.studentName}</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm">{student.studentId}</td>
                        {filteredEventIds.map((eventId, sidx) => {
                          // Compare to current scorebookData
                          let highlight = false;
                          let tooltip = '';
                          if (scorebookData) {
                            const event = scorebookData.pointEvents.find(e => e.id.toString() === eventId);
                            let currentValue = '';
                            if (event) {
                              const sp = event.studentPoints.find(sp => sp.student.id === parseInt(student.studentId));
                              if (sp) currentValue = sp.pointData.value.toString();
                            }
                            if ((student.scores[sidx] || '') !== (currentValue || '')) {
                              highlight = true;
                              tooltip = `Current: ${currentValue || '(none)'}`;
                            }
                          }
                          return (
                            <td
                              key={sidx}
                              className={`border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-sm ${highlight ? 'bg-yellow-200 dark:bg-yellow-700' : ''}`}
                              title={highlight ? tooltip : ''}
                            >
                              {student.scores[sidx]}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Showing first 5 students. Total: {filteredStudents.length} students
              </div>
            </div>
          )}
          <div className="flex space-x-4 mt-6">
            <button
              onClick={() => handleImportScorebookData()}
              disabled={!importPreview || importLoading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {importLoading ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={() => {
                setImportScorebookTemplateModalOpen(false)
                setImportPreview(null)
              }}
              disabled={importLoading}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

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

  return renderContent()
}