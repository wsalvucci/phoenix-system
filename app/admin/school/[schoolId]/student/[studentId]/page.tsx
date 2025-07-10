"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminStudentDataWithTimeframe } from "@/api/admin";
import { AdminStudentDashboardData, numberToOrdinal } from "@/app/dataClasses";
import { useTimeframe } from "../../TimeframeProvider";
import { LoadingState } from "@/components/LoadingLayout";
import { wrapServerAction } from "@/utils/serverActionWrapper";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faChartPie, faCalendarAlt, faStar, faGraduationCap, faUsers, faMedal } from "@fortawesome/free-solid-svg-icons";
import { DateTime } from "luxon";
import Color from "color";

export default function AdminStudentPage({ params: { schoolId, studentId } }: { params: { schoolId: string, studentId: string } }) {
  const { selectedTimeframeId } = useTimeframe();
  
  const { data: studentData, isLoading, error } = useQuery({
    queryKey: ["adminStudentData", schoolId, studentId, selectedTimeframeId],
    queryFn: () => wrapServerAction(getAdminStudentDataWithTimeframe)(parseInt(schoolId), parseInt(studentId), selectedTimeframeId)
  });

  // Prepare chart data for point groups
  const pointGroupChartData = studentData?.student.rankByPointGroup.map(group => ({
    name: group.name,
    points: group.points,
    color: group.color,
    rank: group.rank,
    outOf: group.outOf
  })) || [];

  // Prepare recent points data
  const recentPoints = studentData?.pointEvents.slice(0, 10) || [];

  return (
    <LoadingState
      isLoading={isLoading}
      error={error}
      data={studentData}
      errorFallback={(err) => (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-destructive text-2xl mb-4">⚠️</div>
            <p className="text-destructive">Failed to load student data: {err.message}</p>
          </div>
        </div>
      )}
    >
      {(data) => (
        <div className="animate-in w-full p-6 space-y-6">
          {/* Header */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {data.student.name}
                </h1>
                <p className="text-muted-foreground">
                  Grade {data.student.grade} • Student Dashboard
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-primary">
                  {data.student.totalPoints.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Points</div>
              </div>
            </div>
            
            {/* Overall Ranking */}
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faTrophy} className="text-yellow-500 text-xl" />
                <span className="text-lg font-semibold text-foreground">
                  Rank: {numberToOrdinal(data.student.rank)} / {data.student.outOf}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faGraduationCap} className="text-blue-500 text-xl" />
                <span className="text-lg font-semibold text-foreground">
                  Grade Rank: {numberToOrdinal(data.student.rankByGrade.rank)} / {data.student.rankByGrade.outOf}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Point Groups Breakdown */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faChartPie} className="text-purple-500 text-xl" />
                <h2 className="text-xl font-semibold text-foreground">Points by Category</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pointGroupChartData}
                        dataKey="points"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, points }) => `${name}: ${points.toLocaleString()}`}
                      >
                        {pointGroupChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={Color(entry.color).darken(0.25).toString()} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [value.toLocaleString(), 'Points']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Rankings */}
                <div className="space-y-3">
                  {data.student.rankByPointGroup.map((group) => (
                    <div 
                      key={group.groupId} 
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      style={{ borderLeftColor: group.color, borderLeftWidth: '4px' }}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <div>
                          <div className="font-medium text-foreground">{group.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {group.points.toLocaleString()} points
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">
                          {numberToOrdinal(group.rank)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          of {group.outOf}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-green-500 text-xl" />
                <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentPoints.length > 0 ? (
                  recentPoints.map((event) => (
                    <div 
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      style={{ borderLeftColor: event.pointGroup.color, borderLeftWidth: '4px' }}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{event.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {DateTime.fromISO(event.date).toFormat('MMM dd, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">
                          +{event.pointsEarned.value}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.pointsEarned.input}/{event.maxInput}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-4xl mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ranking Groups */}
          {data.student.rankByRankingGroup.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faUsers} className="text-indigo-500 text-xl" />
                <h2 className="text-xl font-semibold text-foreground">Ranking Groups</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.student.rankByRankingGroup.map((group) => (
                  <div 
                    key={group.groupId}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faMedal} className="text-yellow-500" />
                      <div>
                        <div className="font-medium text-foreground">{group.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {group.outOf} students
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        {numberToOrdinal(group.rank)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Point Events */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faStar} className="text-orange-500 text-xl" />
              <h2 className="text-xl font-semibold text-foreground">All Point Events</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Event</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.pointEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{event.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: event.pointGroup.color }}
                          />
                          <span className="text-foreground">{event.pointGroup.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {DateTime.fromISO(event.date).toFormat('MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {event.pointsEarned.input}/{event.maxInput}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-primary">
                          +{event.pointsEarned.value}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </LoadingState>
  );
}