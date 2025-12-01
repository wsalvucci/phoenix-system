"use client";

import { useState, useEffect, useRef } from "react"
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
  // Add overscroll styles and table hover effects
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .table-container {
        overscroll-behavior-x: contain;
        scroll-behavior: smooth;
      }
      
      .table-cell-dimmed {
        opacity: 0.7;
        transition: opacity 0.2s ease;
      }
      
      .table-cell-highlighted {
        opacity: 1;
        transition: opacity 0.2s ease;
      }
      
      .table-cell-dimmed:hover {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
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
  const [importProgress, setImportProgress] = useState<{
    stage: string;
    current: number;
    total: number;
    message: string;
  } | null>(null);
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

  // Table scroll navigation
  const tableScrollRef = useRef<HTMLDivElement>(null);
  
  // Table hover state
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  
  // Helper functions for table hover effects
  const handleCellHover = (rowIndex: number, columnIndex: number) => {
    setHoveredRow(rowIndex);
    setHoveredColumn(columnIndex);
  };
  
  const handleCellLeave = () => {
    setHoveredRow(null);
    setHoveredColumn(null);
  };
  
  const getCellClassName = (rowIndex: number, columnIndex: number, baseClasses: string) => {
    // Don't apply dimming to header row (-1) or student name column (-1)
    const isHeaderRow = rowIndex === -1;
    const isStudentColumn = columnIndex === -1;
    
    if (isHeaderRow || isStudentColumn) {
      return baseClasses; // Return base classes without dimming
    }
    
    const isHighlighted = hoveredRow === rowIndex || hoveredColumn === columnIndex;
    return `${baseClasses} ${isHighlighted ? 'table-cell-highlighted' : 'table-cell-dimmed'}`;
  };
  
  const scrollTable = (direction: 'left' | 'right') => {
    if (tableScrollRef.current) {
      const scrollAmount = 300; // pixels to scroll
      const currentScroll = tableScrollRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      tableScrollRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  const scrollToToday = () => {
    if (!tableScrollRef.current || !scorebookData) return;
    
    const today = DateTime.now();
    let closestEvent: NewScorebookPointEvent | null = null;
    let minDaysDiff = Infinity;
    
    // Find the event closest to today
    scorebookData.pointEvents.forEach(event => {
      const eventDate = DateTime.fromISO(event.date);
      const daysDiff = Math.abs(today.diff(eventDate, 'days').days);
      
      if (daysDiff < minDaysDiff) {
        minDaysDiff = daysDiff;
        closestEvent = event;
      }
    });
    
    if (closestEvent) {
      // Find the column index for this event
      const eventIndex = scorebookData.pointEvents.findIndex(e => e.id === closestEvent!.id);
      if (eventIndex !== -1) {
        // Calculate scroll position to center the event column
        const columnWidth = 200; // Based on the w-[200px] class in the table
        const studentColumnWidth = 200; // Approximate width of student name column
        const scrollPosition = studentColumnWidth + (eventIndex * columnWidth) - (tableScrollRef.current.clientWidth / 2) + (columnWidth / 2);
        
        tableScrollRef.current.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  };

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
        
        <main className="flex-1 overflow-auto p-6">
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
        
        {/* Global Import Progress Overlay */}
        {importLoading && importProgress && !importScorebookTemplateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
              <h3 className="text-lg font-semibold mb-4 text-center">Importing Scorebook Data</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {importProgress.message}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {importProgress.current}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${importProgress.current}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
                  Stage: {importProgress.stage} ({importProgress.current}/{importProgress.total})
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Please wait while the import processes. This may take a moment for large datasets.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Helper: Determine which students/events have changes
  function getChangedMatrix() {
    if (!importPreview || !scorebookData) return { changedStudents: [], changedEvents: [] };
    
    // Helper function to normalize values for comparison
    const normalizeValue = (value: string | undefined | null): string => {
      if (!value || value.trim() === '' || value === 'null' || value === 'undefined') {
        return '0';
      }
      return value.trim();
    };
    
    const changedStudents: boolean[] = importPreview.students.map((student, sIdx) => {
      return importPreview.eventIds.some((eventId, eIdx) => {
        const event = scorebookData.pointEvents.find(e => e.id.toString() === eventId);
        let currentValue = '';
        if (event) {
          const sp = event.studentPoints.find(sp => sp.student.id === parseInt(student.studentId));
          if (sp) currentValue = sp.pointData.value.toString();
        }
        
        const csvValue = normalizeValue(student.scores[eIdx]);
        const dbValue = normalizeValue(currentValue);
        
        return csvValue !== dbValue;
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
        
        const csvValue = normalizeValue(student.scores[eIdx]);
        const dbValue = normalizeValue(currentValue);
        
        return csvValue !== dbValue;
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

  // Auto-center table on closest event to today when data loads
  useEffect(() => {
    if (scorebookData && tableScrollRef.current) {
      // Small delay to ensure table is rendered
      setTimeout(() => {
        scrollToToday()
      }, 100)
    }
  }, [scorebookData])

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
        
        {/* Table Navigation Buttons */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => scrollTable('left')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="Scroll table left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Scroll Left
          </button>
          
          <button
            onClick={scrollToToday}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            title="Go to event closest to today"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Go to Today
          </button>
          
          <button
            onClick={() => scrollTable('right')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="Scroll table right"
          >
            Scroll Right
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="overflow-x-auto max-w-full h-full overflow-y-auto table-container" ref={tableScrollRef}>
            <table className="min-w-full bg-white dark:bg-gray-800">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className={getCellClassName(-1, -1, "border-r border-gray-300 dark:border-gray-600 px-4 py-2 text-left bg-gray-50 dark:bg-gray-700 sticky left-0 z-30 shadow-sm")}>
                    Student
                  </th>
                  {filteredPointEvents.map((pointEvent, columnIndex) => (
                    <th 
                      key={pointEvent.id} 
                      className={getCellClassName(-1, columnIndex, "border border-gray-300 dark:border-gray-600 px-3 py-2 text-center bg-gray-50 dark:bg-gray-700 w-[200px]")}
                      onMouseEnter={() => handleCellHover(-1, columnIndex)}
                      onMouseLeave={handleCellLeave}
                    >
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
                        <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                          ID: {pointEvent.id}
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
                  {/* Invisible columns for overscroll */}
                  {Array.from({ length: 3 }, (_, i) => (
                    <th 
                      key={`invisible-${i}`} 
                      className={getCellClassName(-1, filteredPointEvents.length + i, "w-[200px] min-w-[200px]")} 
                      style={{ visibility: 'hidden' }}
                      onMouseEnter={() => handleCellHover(-1, filteredPointEvents.length + i)}
                      onMouseLeave={handleCellLeave}
                    >
                      <div className="h-20 w-full">
                        <div>Invisible Content</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studentsToShow.map((student, rowIndex) => (
                  <tr
                    key={student.id}
                    className={
                      focusedStudentId === student.id
                        ? 'ring-2 ring-blue-400 dark:ring-blue-600 bg-blue-50 dark:bg-blue-950'
                        : ''
                    }
                  >
                    <td 
                      className={getCellClassName(rowIndex, -1, "border-r border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-50 dark:bg-gray-700 sticky left-0 z-10 shadow-sm font-medium whitespace-nowrap min-w-fit")}
                      onMouseEnter={() => handleCellHover(rowIndex, -1)}
                      onMouseLeave={handleCellLeave}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="whitespace-nowrap">{student.lastName}, {student.firstName}</span>
                        <button
                          type="button"
                          onClick={() => setFocusedStudentId(prev => prev === student.id ? null : student.id)}
                          aria-label={`${focusedStudentId === student.id ? 'Unfocus' : 'Focus on'} ${student.lastName}, ${student.firstName}`}
                          className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded border border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 flex-shrink-0"
                          title={focusedStudentId === student.id ? 'Unfocus' : 'Focus'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm0-6a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm0 18a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM3 11a1 1 0 011-1h2a1 1 0 110 2H4a1 1 0 01-1-1zm14 0a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM5.636 5.636a1 1 0 011.414 0l1.414 1.414a1 1 0 11-1.414 1.414L5.636 7.05a1 1 0 010-1.414zm10.9 10.9a1 1 0 011.414 0l1.414 1.414a1 1 0 01-1.414 1.414l-1.414-1.414a1 1 0 010-1.414zM5.636 18.364a1 1 0 010-1.414l1.414-1.414a1 1 0 111.414 1.414L7.05 18.364a1 1 0 01-1.414 0zm10.9-10.9a1 1 0 010-1.414l1.414-1.414a1 1 0 111.414 1.414L17.95 7.05a1 1 0 01-1.414 0z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                    {filteredPointEvents.map((pointEvent, columnIndex) => {
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
                        <td 
                          key={pointEvent.id} 
                          className={getCellClassName(rowIndex, columnIndex, `border border-gray-300 dark:border-gray-600 px-3 py-2 text-center ${bgClass}`)}
                          onMouseEnter={() => handleCellHover(rowIndex, columnIndex)}
                          onMouseLeave={handleCellLeave}
                        >
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
                    {/* Invisible cells for overscroll */}
                    {Array.from({ length: 3 }, (_, i) => (
                      <td 
                        key={`invisible-${i}`} 
                        className={getCellClassName(rowIndex, filteredPointEvents.length + i, "w-[200px] min-w-[200px]")} 
                        style={{ visibility: 'hidden' }}
                        onMouseEnter={() => handleCellHover(rowIndex, filteredPointEvents.length + i)}
                        onMouseLeave={handleCellLeave}
                      >
                        <div className="h-12 w-full">
                          <div>Invisible Content</div>
                        </div>
                      </td>
                    ))}
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
    if (!importPreview) {
      return;
    }
    
    setImportLoading(true);
    setImportProgress({
      stage: 'preparing',
      current: 0,
      total: 100,
      message: 'Preparing import data...'
    });
    
    try {
      // Convert importPreview to ImportedScorebook (array of event objects)
      setImportProgress({
        stage: 'converting',
        current: 25,
        total: 100,
        message: 'Converting data format...'
      });
      
      // Validate and filter events with invalid pointEventIds
      const invalidEvents: Array<{ index: number; name: string; eventId: string }> = [];
      const eventsWithValidIds = importPreview.eventIds
        .map((eventId, eventIdx) => {
          const parsedEventId = parseInt(eventId);
          const eventName = importPreview.eventNames[eventIdx] || `Event ${eventIdx + 1}`;
          
          // Check if eventId is valid
          if (!eventId || eventId.trim() === '' || isNaN(parsedEventId) || parsedEventId <= 0) {
            invalidEvents.push({
              index: eventIdx,
              name: eventName,
              eventId: eventId || '(empty)'
            });
            return null; // Mark for filtering
          }
          
          return {
            eventId: parsedEventId,
            originalIndex: eventIdx
          };
        })
        .filter((item): item is { eventId: number; originalIndex: number } => item !== null);
      
      // Detect duplicate event IDs
      const eventIdToIndices = new Map<number, number[]>();
      eventsWithValidIds.forEach(({ eventId, originalIndex }) => {
        if (!eventIdToIndices.has(eventId)) {
          eventIdToIndices.set(eventId, []);
        }
        eventIdToIndices.get(eventId)!.push(originalIndex);
      });
      
      const duplicateEvents: Array<{ eventId: number; indices: number[]; names: string[] }> = [];
      eventIdToIndices.forEach((indices, eventId) => {
        if (indices.length > 1) {
          duplicateEvents.push({
            eventId,
            indices,
            names: indices.map(idx => importPreview.eventNames[idx] || `Event ${idx + 1}`)
          });
        }
      });
      
      // Report invalid events to user
      if (invalidEvents.length > 0) {
        const invalidEventDetails = invalidEvents
          .map(e => `"${e.name}" (ID: ${e.eventId})`)
          .join(', ');
        const errorMessage = `Invalid point event IDs found. The following events have invalid or missing IDs and will be skipped: ${invalidEventDetails}. Please check your import data.`;
        alert(errorMessage);
      }
      
      // Report duplicate event IDs to user
      if (duplicateEvents.length > 0) {
        const duplicateDetails = duplicateEvents.map(dup => {
          const eventDetails = dup.indices.map((idx, i) => {
            const name = dup.names[i];
            const column = idx + 1; // 1-indexed for user display
            return `column ${column} ("${name}")`;
          }).join(', ');
          return `Event ID ${dup.eventId} appears in ${dup.indices.length} columns: ${eventDetails}`;
        }).join('\n');
        
        const warningMessage = `Duplicate point event IDs detected. The following event IDs appear multiple times:\n\n${duplicateDetails}\n\nOnly the first occurrence will be used for each event ID. Please check your CSV file.`;
        alert(warningMessage);
      }
      
      // Check if we have any valid events left
      if (eventsWithValidIds.length === 0) {
        alert('No valid point events found to import. All events have invalid IDs.');
        setImportLoading(false);
        setImportProgress(null);
        return;
      }
      
      // Filter out duplicate event IDs, keeping only the first occurrence of each
      const seenEventIds = new Set<number>();
      const uniqueEventsWithValidIds = eventsWithValidIds.filter(({ eventId }) => {
        if (seenEventIds.has(eventId)) {
          return false; // Skip duplicate
        }
        seenEventIds.add(eventId);
        return true;
      });
      
      // If duplicates were filtered, warn the user
      if (uniqueEventsWithValidIds.length < eventsWithValidIds.length) {
        const filteredCount = eventsWithValidIds.length - uniqueEventsWithValidIds.length;
        console.warn(`Filtered out ${filteredCount} duplicate event ID(s) during import`);
      }
      
      // Build imported data using only valid, unique events
      const imported: ImportedScorebook = uniqueEventsWithValidIds.map(({ eventId, originalIndex }) => {
        // Validate that originalIndex is within bounds
        if (originalIndex < 0 || originalIndex >= importPreview.eventIds.length) {
          console.error(`Invalid originalIndex ${originalIndex} for event ID ${eventId}. EventIds length: ${importPreview.eventIds.length}`);
          return null;
        }
        
        return {
          pointEventId: eventId,
          name: importPreview.eventNames[originalIndex] || '',
          date: '', // Not available from import
          template: { type: '', value: 0 }, // Not available from import
          studentPoints: importPreview.students.map((student) => {
            const parsedStudentId = parseInt(student.studentId);
            const studentNameParts = student.studentName.split(',');
            const lastName = studentNameParts[0]?.trim() || '';
            const firstName = studentNameParts[1]?.trim() || '';
            
            // Normalize empty/blank values to 0 for consistency
            const normalizeValue = (value: string | undefined | null): number => {
              if (!value || value.trim() === '' || value === 'null' || value === 'undefined') {
                return 0;
              }
              const parsed = parseFloat(value);
              return isNaN(parsed) ? 0 : parsed;
            };
            
            // Validate that originalIndex is within bounds for scores array
            let scoreValue = 0;
            if (originalIndex >= student.scores.length) {
              console.warn(`Score index ${originalIndex} out of bounds for student ${student.studentId} (${student.studentName}). Scores length: ${student.scores.length}, Event ID: ${eventId}. Using 0 as default.`);
            } else {
              scoreValue = normalizeValue(student.scores[originalIndex]);
            }
            
            return {
              id: parsedStudentId,
              lastName,
              firstName,
              input: scoreValue,
              value: scoreValue
            };
          }).filter((student): student is { id: number; lastName: string; firstName: string; input: number; value: number } => {
            // Filter out students with invalid IDs
            return !isNaN(student.id) && student.id > 0;
          })
        };
      }).filter((event): event is ImportedScorebook[0] => event !== null);
      
      // Validate imported data before sending
      if (imported.length === 0) {
        alert('No valid events to import. Please check your CSV file.');
        setImportLoading(false);
        setImportProgress(null);
        return;
      }
      
      // Filter out events with no student points to avoid server errors
      const importedWithStudents = imported.filter(event => event.studentPoints && event.studentPoints.length > 0);
      
      if (importedWithStudents.length === 0) {
        alert('No events with student data to import. Please check your CSV file.');
        setImportLoading(false);
        setImportProgress(null);
        return;
      }
      
      if (importedWithStudents.length < imported.length) {
        const filteredCount = imported.length - importedWithStudents.length;
        console.warn(`Filtered out ${filteredCount} event(s) with no student data`);
      }
      
      // Log import summary for debugging
      const totalRecords = importedWithStudents.reduce((sum, event) => sum + event.studentPoints.length, 0);
      
      console.log('=== Import Data Summary ===');
      console.log(`Total events: ${importedWithStudents.length}`);
      console.log(`Total student records: ${totalRecords}`);
      console.log(`First event:`, importedWithStudents[0] ? {
        id: importedWithStudents[0].pointEventId,
        name: importedWithStudents[0].name,
        studentCount: importedWithStudents[0].studentPoints.length
      } : 'No events');
      console.log('All event IDs:', importedWithStudents.map(e => e.pointEventId));
      console.log('==========================');
      
      setImportProgress({
        stage: 'uploading',
        current: 50,
        total: 100,
        message: 'Sending data to server...'
      });
      
      // Also log as object for easier inspection
      const importSummary = {
        eventCount: importedWithStudents.length,
        totalStudentRecords: totalRecords,
        eventIds: importedWithStudents.map(e => e.pointEventId),
        sampleEvent: importedWithStudents[0] ? {
          id: importedWithStudents[0].pointEventId,
          name: importedWithStudents[0].name,
          studentCount: importedWithStudents[0].studentPoints.length
        } : null
      };
      console.log('Starting import with data:', importSummary);
      
      // Batch the import to avoid payload size limits (process 10 events at a time)
      const BATCH_SIZE = 10;
      let processedEvents = 0;
      let totalProcessedRecords = 0;
      const errors: string[] = [];
      
      for (let i = 0; i < importedWithStudents.length; i += BATCH_SIZE) {
        const batch = importedWithStudents.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(importedWithStudents.length / BATCH_SIZE);
        
        setImportProgress({
          stage: 'uploading',
          current: 50 + Math.floor((i / importedWithStudents.length) * 40),
          total: 100,
          message: `Processing batch ${batchNumber} of ${totalBatches} (${batch.length} events)...`
        });
        
        try {
          const result = await importPhoenixScorebookData(parseInt(groupId), batch);
          
          if (typeof result === 'string') {
            errors.push(`Batch ${batchNumber}: ${result}`);
            console.error(`Import error for batch ${batchNumber}:`, result);
            // Continue with next batch instead of stopping
          } else {
            processedEvents += batch.length;
            const batchRecords = batch.reduce((sum, event) => sum + event.studentPoints.length, 0);
            totalProcessedRecords += batchRecords;
            console.log(`Batch ${batchNumber} completed: ${batch.length} events, ${batchRecords} records`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Batch ${batchNumber}: ${errorMessage}`);
          console.error(`Import exception for batch ${batchNumber}:`, error);
          // Continue with next batch
        }
      }
      
      setImportProgress({
        stage: 'completing',
        current: 100,
        total: 100,
        message: 'Import completed!'
      });
      
      // Show success/error message
      if (errors.length > 0) {
        alert(`Import completed with ${errors.length} error(s):\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n\n...and ${errors.length - 5} more errors` : ''}\n\nSuccessfully processed: ${processedEvents} events, ${totalProcessedRecords} records`);
      } else {
        alert(`Import completed successfully!\n\nSummary:\n• ${processedEvents} events processed\n• ${totalProcessedRecords} total student records analyzed\n• Only changed values were updated\n• Data refreshed in scorebook`);
      }
      
      setImportScorebookTemplateModalOpen(false);
      setImportPreview(null);
      fetchScorebookData();
      
    } catch (error) {
      console.error('Import error:', error);
      alert('An error occurred during import. Please try again.');
      setImportProgress(null);
    } finally {
      setImportLoading(false);
      setImportProgress(null);
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
        // Third row: dates (optional - should be skipped)
        const eventIds = rows[0].slice(2);
        const eventNames = rows[1].slice(2);
        
        // Check if row 2 (index 2) is a dates row by checking if first two columns are empty
        // and the row doesn't look like a student row (no name in first column)
        const row2 = rows[2];
        const isDatesRow = row2 && 
          (!row2[0] || row2[0].trim() === '') && 
          (!row2[1] || row2[1].trim() === '') &&
          row2.length > 2;
        
        // Start from row 3 (index 3) if row 2 is a dates row, otherwise start from row 2
        const studentStartIndex = isDatesRow ? 3 : 2;
        const students = rows.slice(studentStartIndex).filter(r => r.length > 1 && r[0] && r[0].trim() !== '').map(row => {
          const scores = row.slice(2);
          // Ensure scores array matches eventIds array length by trimming or padding
          // This handles cases where CSV rows have inconsistent lengths
          const trimmedScores = scores.slice(0, eventIds.length);
          // Pad with empty strings if scores array is shorter than eventIds
          while (trimmedScores.length < eventIds.length) {
            trimmedScores.push('');
          }
          return {
            studentName: row[0],
            studentId: row[1],
            scores: trimmedScores
          };
        });
        
        setImportPreview({ eventIds, eventNames, students });
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        alert('Error parsing CSV file: ' + error.message);
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
                    {filteredStudents.map((student, idx) => (
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
                            
                            // Normalize values for comparison (same logic as getChangedMatrix)
                            const normalizeValue = (value: string | undefined | null): string => {
                              if (!value || value.trim() === '' || value === 'null' || value === 'undefined') {
                                return '0';
                              }
                              return value.trim();
                            };
                            
                            const csvValue = normalizeValue(student.scores[sidx]);
                            const dbValue = normalizeValue(currentValue);
                            
                            if (csvValue !== dbValue) {
                              highlight = true;
                              tooltip = `Current: ${currentValue || '0'}`;
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
                Showing all {filteredStudents.length} students
              </div>
            </div>
          )}
          {/* Progress Indicator */}
          {importProgress && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {importProgress.message}
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {importProgress.current}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${importProgress.current}%` }}
                ></div>
              </div>
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                Stage: {importProgress.stage} ({importProgress.current}/{importProgress.total})
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