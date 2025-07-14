"use client";

import { useState, useEffect } from "react"
import { DateTime } from "luxon"
import { getTeacherRankingGroupScorebook } from "@/api/teacher"
import { RankingGroupScorebookData } from "@/types/domain"
import { wrapServerAction } from "@/utils/serverActionWrapper"
import { useQuery } from "@tanstack/react-query"

type NewPointEventData = {
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

export default function TeacherRankingGroup({ params: { groupId } }: { params: { groupId: string } }) {
  const [rankingGroupData, setRankingGroupData] = useState<RankingGroupScorebookData | null>(null)
  const [loading, setLoading] = useState(true)

  const [newPointEventModalOpen, setNewPointEventModalOpen] = useState(false)
  const [newPointEventData, setNewPointEventData] = useState<NewPointEventData>({
    name: "",
    date: DateTime.now().toFormat("yyyy-MM-dd")
  })

  const [editPointEventModalOpen, setEditPointEventModalOpen] = useState(false)
  const [currentlyEditedPointEvent, setCurrentlyEditedPointEvent] = useState<CurrentlyEditedPointEvent>({
    id: -1,
    name: "",
    date: "",
    points: []
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ["teacherRankingGroupScorebook", groupId],
    queryFn: () => wrapServerAction(getTeacherRankingGroupScorebook)(parseInt(groupId))
  });

  useEffect(() => {
    if (data) {
      setRankingGroupData(data)
      setLoading(false)
    }
  }, [data])

  const updateNewPointEventData = (name: string, date: string) => {
    setNewPointEventData({ name, date })
  }

  const addNewPointEvent = async () => {
    // TODO: Implement create ranking group point event
    setNewPointEventModalOpen(false)
    setNewPointEventData({
      name: "",
      date: DateTime.now().toFormat("yyyy-MM-dd")
    })
    // Refresh data
  }

  const saveEditedPointEventData = async () => {
    // TODO: Implement edit ranking group point event
    setEditPointEventModalOpen(false)
    setCurrentlyEditedPointEvent({
      id: -1,
      name: "",
      date: "",
      points: []
    })
    // Refresh data
  }

  const addNewPointEventButton = () => (
    <button
      onClick={() => setNewPointEventModalOpen(true)}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Add New Point Event
    </button>
  )

  const addNewPointEventModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-slate-300 dark:bg-slate-700 border p-6 rounded-lg w-1/2">
        <h2 className="text-xl font-bold mb-4">Add New Point Event</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Event Name</label>
            <input
              type="text"
              value={newPointEventData.name}
              onChange={(e) => updateNewPointEventData(e.target.value, newPointEventData.date)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-black dark:text-white"
              placeholder="Enter event name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={newPointEventData.date}
              onChange={(e) => updateNewPointEventData(newPointEventData.name, e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-black dark:text-white"
            />
          </div>
        </div>
        <div className="flex space-x-4 mt-6">
          <button
            onClick={addNewPointEvent}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Create Event
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

  const editPointEventModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-slate-300 dark:bg-slate-700 border p-6 rounded-lg w-3/4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit Point Event</h2>
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Event Name</label>
            <input
              type="text"
              value={currentlyEditedPointEvent.name}
              onChange={(e) => setCurrentlyEditedPointEvent({
                ...currentlyEditedPointEvent,
                name: e.target.value
              })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-black dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={currentlyEditedPointEvent.date}
              onChange={(e) => setCurrentlyEditedPointEvent({
                ...currentlyEditedPointEvent,
                date: e.target.value
              })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-black dark:text-white"
            />
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Student Group Points</h3>
          <div className="grid grid-cols-1 gap-3">
            {currentlyEditedPointEvent.points
              .sort((a, b) => a.studentGroupName.localeCompare(b.studentGroupName))
              .map((point) => (
                <div key={point.studentGroupId} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="font-medium">{point.studentGroupName}</div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={point.value}
                      onChange={(e) => {
                        setCurrentlyEditedPointEvent({
                          ...currentlyEditedPointEvent,
                          points: currentlyEditedPointEvent.points.map((p) => {
                            if (p.studentGroupId === point.studentGroupId) {
                              return {
                                ...p,
                                value: parseInt(e.target.value) || 0
                              }
                            }
                            return p;
                          })
                        })
                      }}
                      className="w-20 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-slate-700"
                      min="0"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      points
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={saveEditedPointEventData}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Save Changes
          </button>
          <button
            onClick={() => {
              setEditPointEventModalOpen(false)
              setCurrentlyEditedPointEvent({
                id: -1,
                name: "",
                date: "",
                points: []
              })
            }}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  const scorebookTable = () => {
    if (!rankingGroupData) return <div>No data</div>
    return (
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden h-full">
        <div className="overflow-x-auto max-w-full h-full overflow-y-auto">
          <table className="min-w-full bg-white dark:bg-gray-800">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="border-r border-gray-300 dark:border-gray-600 px-4 py-2 text-left bg-gray-50 dark:bg-gray-700 sticky left-0 z-30 shadow-sm">
                  Student Group
                </th>
                {rankingGroupData.pointEvents
                  .sort((a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis())
                  .map((pointEvent) => (
                    <th key={pointEvent.id} className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center bg-gray-50 dark:bg-gray-700 w-[200px]">
                      <div className="flex flex-col items-center space-y-1">
                        <div className="text-sm font-bold text-center leading-tight min-h-[2.5rem] flex items-center justify-center">
                          {pointEvent.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {DateTime.fromISO(pointEvent.date).toFormat('MMM dd')}
                        </div>
                        <div className="flex space-x-1 mt-1">
                          <button
                            onClick={() => {
                              setCurrentlyEditedPointEvent({
                                id: pointEvent.id,
                                name: pointEvent.name,
                                date: pointEvent.date,
                                points: rankingGroupData.studentGroups.map((sg) => ({
                                  studentGroupId: sg.id,
                                  studentGroupName: sg.name,
                                  value: pointEvent.studentGroupPoints.find((sgp) => sgp.studentGroupId === sg.id)?.value || 0,
                                  pointId: pointEvent.studentGroupPoints.find((sgp) => sgp.studentGroupId === sg.id)?.pointId || -1
                                }))
                              })
                              setEditPointEventModalOpen(true)
                            }}
                            className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rankingGroupData.studentGroups
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((studentGroup) => (
                  <tr key={studentGroup.id}>
                    <td className="border-r border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-50 dark:bg-gray-700 sticky left-0 z-10 shadow-sm">
                      <div className="font-medium">
                        {studentGroup.name}
                      </div>
                    </td>
                    {rankingGroupData.pointEvents
                      .sort((a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis())
                      .map((pointEvent) => {
                        const studentGroupPoint = pointEvent.studentGroupPoints.find(sgp => sgp.studentGroupId === studentGroup.id)
                        return (
                          <td key={`${studentGroup.id}-${pointEvent.id}`} className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center w-[200px]">
                            {studentGroupPoint ? (
                              <span className="text-lg font-semibold">
                                {studentGroupPoint.value} pts
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

  const loadingScreen = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-slate-300 dark:bg-slate-700 border p-6 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-center">Loading ranking group data...</p>
      </div>
    </div>
  )

  if (loading || isLoading) {
    return loadingScreen()
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Ranking Group</h2>
          <p className="text-gray-600 dark:text-gray-400">{error.message}</p>
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
            <h1 className="text-3xl font-bold">Ranking Group Scorebook</h1>
            {rankingGroupData && (
              <div className="text-lg opacity-75">
                {rankingGroupData.name}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Action Buttons */}
          <div className="flex space-x-2">
            {addNewPointEventButton()}
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
    </div>
  )
}
