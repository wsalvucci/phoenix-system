"use client";
import { FeaturedDashboardData, GlobalDashboardData, metalStyle, metalTextShadow, numberToOrdinal, rankToColor } from "@/app/dataClasses";
import { getFeaturedDashData, newGetGlobalDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import { createClient } from "@/utils/supabase/client";
import { data } from "autoprefixer";
import Color from "color";
import { useEffect, useState } from "react";

export default function TopStudents(
  {
    initGlobalDashData: initFeaturedDashData,
    groupFocusId: groupFocusId,
    gradeFocus: gradeFocus
  }: {
    initGlobalDashData: FeaturedDashboardData,
    groupFocusId: number | null,
    gradeFocus: number | null
  }
) {
  const [featuredDashData, setFeaturedDashData] = useState<FeaturedDashboardData>(initFeaturedDashData)

  const updateData = async () => {
    getFeaturedDashData(12).then((data) => {
      setFeaturedDashData(data)
    })
  }

  const [curGroupFocusId, setCurGroupFocusId] = useState<number | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurGroupFocusId((prevGroupFocusId) => {
        if (prevGroupFocusId === null) {
          console.log(0)
          return 0
        } else if (prevGroupFocusId < featuredDashData.topByPointGroup.length - 1) {
          console.log(prevGroupFocusId + 1)
          return prevGroupFocusId + 1
        } else {
          console.log(null)
          return null
        }
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [])


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

  const rankToNameTextSize = (rank: number): string => {
    if (rank === 1) {
      return 'text-5xl'
    } else if (rank <= 5) {
      return 'text-3xl'
    } else if (rank <= 10) {
      return 'text-2xl'
    } else {
      return 'text-xl'
    }
  }

  const rankToPointGroupTextSize = (rank: number): string => {
    if (rank === 1) {
      return 'text-3xl'
    } else if (rank <= 5) {
      return 'text-xl'
    } else if (rank <= 10) {
      return 'text-lg'
    } else {
      return ''
    }
  }

  const EmptyFeaturedStudentTile = () => (
    <div className="h-full flex items-center" style={{
      backgroundImage: metalStyle('#000'),
      backgroundSize: 'cover',
      textShadow: metalTextShadow,
    }}>
    </div>
  )

  const FeaturedStudentTile = ({ fullName, totalPoints, rank, pointsByGroup }: {
    fullName: string,
    totalPoints: number,
    rank: number,
    pointsByGroup: {
      groupId: number,
      groupName: string,
      points: number,
      color: string
    }[]
  }) => (
    <div className="h-full flex items-center text-white" style={{
      backgroundImage: metalStyle(rankToColor(rank).toString()),
      backgroundSize: 'cover',
      textShadow: metalTextShadow,
    }}>
      <div className={`px-5 w-full ` + (rank > 1 ? 'grid grid-cols-2 gap-1 items-center' : 'grid grid-cols-1 gap-10')}>
        <div>
          <div className={`flex justify-start ` + rankToNameTextSize(rank)}>{numberToOrdinal(rank)}</div>
          <div className={`flex justify-start ` + rankToNameTextSize(rank)}>{fullName}</div>
          {
            groupFocusId !== null ?
              (
                <div className={`flex justify-start ` + rankToNameTextSize(rank)}>
                  {pointsByGroup.at(curGroupFocusId ?? -1)?.points.toLocaleString()} PTS
                </div>
              ) :
              (
                <div className={`flex justify-start ` + rankToNameTextSize(rank)}>
                  {totalPoints.toLocaleString()} PTS
                </div>
              )
          }
        </div>
        <div>
          {
            pointsByGroup.map((pointGroup) => {
              return (
                <div className={`grid grid-cols-2 border-b ` + rankToPointGroupTextSize(rank)} style={{
                  borderColor: pointGroup.color
                }}>
                  <div className="flex justify-start">{pointGroup.groupName}</div>
                  <div className="flex justify-end">{pointGroup.points.toLocaleString()}</div>
                </div>
              )
            })
          }
        </div>
      </div>
    </div>
  )

  const getFeaturedTileUsingStudentData = ({ data, rank }: {
    data: {
      id: number
      firstName: string
      lastName: string
      totalPoints: number
      byPointGroup: {
        id: number
        name: string
        color: string
        totalPoints: number
      }[]
    } | undefined,
    rank: number
  }) => (
    data !== undefined ?
      <FeaturedStudentTile
        key={rank}
        fullName={data?.firstName + " " + data?.lastName}
        totalPoints={data?.totalPoints ?? 0}
        pointsByGroup={
          data?.byPointGroup.map((pointGroup => {
            return {
              groupId: pointGroup.id,
              groupName: pointGroup.name,
              points: pointGroup.totalPoints,
              color: pointGroup.color
            }
          })) ?? []
        }
        rank={rank + 1}
      /> : <EmptyFeaturedStudentTile />
  )

  const focusedGroupData = featuredDashData.topByPointGroup.at(curGroupFocusId ?? -1) ?? undefined
  var orderedStudents = featuredDashData.topOverall

  if (curGroupFocusId !== null) {
    orderedStudents = featuredDashData.topByPointGroup.at(curGroupFocusId)?.students ?? orderedStudents
  } else if (gradeFocus !== null) {
    orderedStudents = featuredDashData.topByGrade.filter((grade) => grade.grade == gradeFocus).flatMap((grade) => grade.students)
  }


  return (
    <div className="w-lvw h-lvh bg-slate-900">
      <div className="pb-3" style={{
        height: '1%',
      }}>

      </div>
      <div className="pb-3" style={{
        height: '10%',
      }}>
        <div className="w-full h-full grid grid-cols-1 items-center text-white" style={{
          backgroundImage: metalStyle(focusedGroupData === undefined ? '#000' : focusedGroupData.color),
          textShadow: metalTextShadow
        }}>
          <div className="flex justify-center text-5xl">
            {
              curGroupFocusId === null ? 'TOP STUDENTS' : 'TOP ' + focusedGroupData?.name.toLocaleUpperCase()
            }
          </div>
          {
            gradeFocus !== null && (
              <div className="flex justify-center text-3xl">
                {numberToOrdinal(gradeFocus).toLocaleUpperCase() + ' GRADE'}
              </div>
            )
          }
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1" style={{
        height: '89%'
      }}>
        <div>
          {
            getFeaturedTileUsingStudentData({
              data: orderedStudents.at(0),
              rank: 0
            })
          }

        </div>
        <div className="grid grid-rows-4 gap-1">

          {
            [...Array(4)].map((_, index) => (
              getFeaturedTileUsingStudentData({
                data: orderedStudents?.at(index + 1),
                rank: index + 1
              })
            ))
          }

        </div>
        <div className="grid grid-rows-5 gap-1">

          {
            [...Array(5)].map((_, index) => (
              getFeaturedTileUsingStudentData({
                data: orderedStudents?.at(index + 5),
                rank: index + 5
              })
            ))
          }

        </div>
        <div className="grid grid-rows-10 gap-1">

          {
            [...Array(10)].map((_, index) => (
              getFeaturedTileUsingStudentData({
                data: orderedStudents?.at(index + 10),
                rank: index + 10
              })
            ))
          }

        </div>
      </div>
    </div>
  )
}
