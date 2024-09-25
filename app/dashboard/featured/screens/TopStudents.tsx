"use client";
import { FeaturedDashboardData, GlobalDashboardData, metalStyle, metalTextShadow, numberToOrdinal, rankToColor } from "@/app/dataClasses";
import { getFeaturedDashData, newGetGlobalDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import { createClient } from "@/utils/supabase/client";
import { data } from "autoprefixer";
import Color from "color";
import { useState } from "react";

export default function TopStudents(
  {
    initGlobalDashData: initFeaturedDashData,
    groupFocusId: groupFocusId,
    gradeFocus: gradeFocus
  }: {
    initGlobalDashData: GlobalDashboardData,
    groupFocusId: number | null,
    gradeFocus: number | null
  }
) {
  const [featuredDashData, setFeaturedDashData] = useState<GlobalDashboardData>(initFeaturedDashData)

  const updateData = async () => {
    newGetGlobalDashData(12).then((data) => {
      setFeaturedDashData(data)
    })
  }

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
    <div className="h-full flex items-center" style={{
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
                  {pointsByGroup.find((group) => group.groupId == groupFocusId)?.points} PTS
                </div>
              ) :
              (
                <div className={`flex justify-start ` + rankToNameTextSize(rank)}>
                  {totalPoints} PTS
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
                  <div className="flex justify-end">{pointGroup.points}</div>
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

  const focusedGroupData = featuredDashData.topStudents.topByPointGroup.find((pointGroup) => pointGroup.id == groupFocusId)
  var orderedStudents = featuredDashData.topStudents.topOverall

  if (groupFocusId !== null) {
    orderedStudents = featuredDashData.topStudents.topByPointGroup.filter((group) => group.id == groupFocusId).flatMap((group) => group.topStudents)
  } else if (gradeFocus !== null) {
    orderedStudents = featuredDashData.topStudents.topByGrade.filter((grade) => grade.grade == gradeFocus).flatMap((grade) => grade.topStudents)
  }


  return (
    <div className="w-lvw h-lvh">
      <div className="pb-3" style={{
        height: '10%',
      }}>
        <div className="w-full h-full grid grid-cols-1 items-center" style={{
          backgroundImage: metalStyle(focusedGroupData === undefined ? '#000' : focusedGroupData.color),
          textShadow: metalTextShadow
        }}>
          <div className="flex justify-center text-5xl">
            {
              groupFocusId === null ? 'TOP STUDENTS' : 'TOP ' + focusedGroupData?.name.toLocaleUpperCase()
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
        height: '90%'
      }}>
        <div>
          {/*                    {
                        getFeaturedTileUsingStudentData({
                            data: orderedStudents.at(0),
                            rank: 0
                        })
                    }
          */}
        </div>
        <div className="grid grid-rows-4 gap-1">
          {/*
                    {
                        [...Array(4)].map((_, index) => (
                            getFeaturedTileUsingStudentData({
                                data: orderedStudents?.at(index + 1),
                                rank: index + 1
                            })
                        ))
                    }
          */}
        </div>
        <div className="grid grid-rows-5 gap-1">
          {/*
          {
            [...Array(5)].map((_, index) => (
              getFeaturedTileUsingStudentData({
                data: orderedStudents?.at(index + 5),
                rank: index + 5
              })
            ))
          }
          */}
        </div>
        <div className="grid grid-rows-10 gap-1">
          {/*
          {
            [...Array(10)].map((_, index) => (
              getFeaturedTileUsingStudentData({
                data: orderedStudents?.at(index + 10),
                rank: index + 10
              })
            ))
          }
          */}
        </div>
      </div>
    </div>
  )
}
