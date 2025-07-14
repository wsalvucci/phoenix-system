"use client";
import { FeaturedDashboardData } from "@/app/dataClasses";
import { getFeaturedDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useRef, useState } from "react";
import TopStudentsByGroup from "./TopStudentsByGroup";
import Link from "next/link";

type CurrentDisplay = {
  title: string,
  students: {
    id: number,
    name: string,
    totalPoints: number,
    featuredPoints: number,
    pointsByPointGroup: {
      groupId: number,
      groupName: string,
      groupPoints: number,
      groupColor: string,
    }[]
  }[]
}

export default function TopStudents(
  {
    initGlobalDashData: initFeaturedDashData,
    gradeFocus: gradeFocus }: {
      initGlobalDashData: FeaturedDashboardData,
      groupFocusId: number | null,
      gradeFocus: number | null
    }
) {
  const [featuredDashData, setFeaturedDashData] = useState<FeaturedDashboardData>(initFeaturedDashData)
  const [currentDisplayData, setCurrentDisplayData] = useState<CurrentDisplay>({
    title: "",
    students: []
  })

  const updateData = async () => {
    getFeaturedDashData(12, null).then((data) => {
      setFeaturedDashData(data)
    })
  }

  const [curGroupFocusId, setCurGroupFocusId] = useState<number | null>(null)
  const [paused, setPaused] = useState<boolean>(false)

  const TEMP_INTERVAL_LENGTH = 30000
  const [passedTime, setPassedTime] = useState<number>(0)

  function advanceGroup() {
    setCurGroupFocusId((prevGroupFocusId) => {
      const currentIndex = featuredDashData.topByPointGroup.findIndex((pointGroup) => pointGroup.id === prevGroupFocusId)
      if (prevGroupFocusId === null) {
        return featuredDashData.topByPointGroup.at(0)?.id ?? null
      } else {
        return featuredDashData.topByPointGroup.at(currentIndex + 1)?.id ?? null
      }
    })
    setPassedTime(0)
  }

  function retreatGroup() {
    setCurGroupFocusId((prevGroupFocusId) => {
      const currentIndex = featuredDashData.topByPointGroup.findIndex((pointGroup) => pointGroup.id === prevGroupFocusId)
      if (prevGroupFocusId === null) {
        return featuredDashData.topByPointGroup.at(featuredDashData.topByPointGroup.length - 1)?.id ?? null
      } else {
        if (currentIndex - 1 < 0) return null
        return featuredDashData.topByPointGroup.at(currentIndex - 1)?.id ?? null
      }
    })
    setPassedTime(0)
  }

  useEffect(() => {
    const timePassedInterval = setInterval(() => {
      if (paused) return
      if ((passedTime + 100) >= TEMP_INTERVAL_LENGTH) {
        advanceGroup()
      } else {
        setPassedTime((prevTime) => prevTime + 100)
      }
    }, 100)

    return () => clearInterval(timePassedInterval)
  }, [featuredDashData, paused, passedTime])

  useEffect(() => {
    if (curGroupFocusId == null) {
      setCurrentDisplayData({
        title: "TOP STUDENTS",
        students: featuredDashData.topOverall.map((student) => {
          return {
            id: student.id,
            name: student.firstName + " " + student.lastName,
            totalPoints: student.totalPoints,
            featuredPoints: student.totalPoints,
            pointsByPointGroup: student.byPointGroup.map((pointGroup) => {
              return {
                groupId: pointGroup.id,
                groupName: pointGroup.name,
                groupPoints: pointGroup.totalPoints,
                groupColor: pointGroup.color
              }
            })
          }
        })
      })
    } else {
      const focusedGroup = featuredDashData.topByPointGroup.find((pointGroup) => pointGroup.id == curGroupFocusId)
      if (focusedGroup === undefined) return
      setCurrentDisplayData({
        title: "TOP " + focusedGroup.name.toUpperCase(),
        students: focusedGroup.students.map((student) => {
          return {
            id: student.id,
            name: student.firstName + " " + student.lastName,
            totalPoints: student.totalPoints,
            featuredPoints: student.byPointGroup.find((pointGroup) => pointGroup.id === focusedGroup.id)?.totalPoints ?? 0,
            pointsByPointGroup: student.byPointGroup.map((pointGroup) => {
              return {
                groupId: pointGroup.id,
                groupName: pointGroup.name,
                groupPoints: pointGroup.totalPoints,
                groupColor: pointGroup.color
              }
            })
          }
        })
      })
    }

    return
  }, [curGroupFocusId])


  const supabase = createClient();
  const broadcastChannel = supabase.channel("student-points-channel");

  broadcastChannel.on(
    'broadcast',
    { event: 'sync' },
    (payload) => {
      console.log('Received broadcast:', payload);
      updateData();
    }
  ).subscribe();

  let orderedStudents = featuredDashData.topOverall

  if (curGroupFocusId !== null) {
    orderedStudents = featuredDashData.topByPointGroup.at(curGroupFocusId)?.students ?? orderedStudents
  } else if (gradeFocus !== null) {
    orderedStudents = featuredDashData.topByGrade.filter((grade) => grade.grade == gradeFocus).flatMap((grade) => grade.students)
  }

  return (
    <div className="h-dvh w-dvw bg-slate-900 text-white">
      <div className="bg-slate-500" style={{
        height: '0.5%'
      }}>
        <div className="h-full bg-green-500" style={{
          width: `${(passedTime / TEMP_INTERVAL_LENGTH) * 100}%`
        }}>

        </div>
      </div>
      <div className="flex justify-between" style={{
        height: '1.5%'
      }}>
        <div>
          <button className="border-gray-500 border-2 rounded-lg px-3 my-1 mx-1 hover:bg-slate-700"
            onClick={() => { retreatGroup() }}
          >
            Previous
          </button>
          <button className="border-gray-500 border-2 rounded-lg px-3 my-1 mx-1 hover:bg-slate-700"
            onClick={() => { setPaused(!paused) }}
          >
            {
              paused ? 'Resume' : 'Pause'
            }
          </button>
          <button className="border-gray-500 border-2 rounded-lg px-3 my-1 mx-1 hover:bg-slate-700"
            onClick={() => { advanceGroup() }}
          >
            Next
          </button>
        </div>
        <div>
          <Link className="border-gray-500 border-2 rounded-lg px-3 my-1 mx-1 hover:bg-slate-700" href={'/dashboard'}>Back</Link>
        </div>
      </div>
      <div style={{
        height: '98%'
      }}>
        <TopStudentsByGroup
          title={currentDisplayData.title}
          students={currentDisplayData.students}
        />
      </div>
    </div>
  )
}
