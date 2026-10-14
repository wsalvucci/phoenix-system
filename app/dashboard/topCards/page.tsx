"use client";
import { getDisplayBoards } from "@/app/supaApi/server/dashboard/displayBoards";

import { numberToOrdinal } from "@/app/dataClasses";
import { displayRankTier } from "@/lib/rankTier";
import { LoadingState } from "@/components/LoadingLayout";
import type { DisplayStudentRow, DisplayTimeframe } from "@/app/supaApi/universal/displayTypes";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useDashboardSchool } from "@/app/dashboard/useDashboardSchool";

export default function TopCards() {
    const [selectedTimeframeId, setSelectedTimeframeId] = useState<number | null>(null);
    
    const { schoolId } = useDashboardSchool();
    const { data, isLoading, error } = useQuery({
        queryKey: ["topCards", schoolId, selectedTimeframeId],
        enabled: schoolId !== null,
        queryFn: async () => {
            const boards = await getDisplayBoards(schoolId, selectedTimeframeId);
            if (!boards) throw new Error("No dashboard data available");
            // Overall board only: already cut by the server (public.display_cut).
            return { timeframes: boards.timeframes, students: boards.overall.rows };
        }
    })

    const pinnedItemRef = useRef<HTMLDivElement>(null);
    const [pinnedItemHeight, setPinnedItemHeight] = useState(0);

    // Timeframe dropdown component
    const TimeframeDropdown = ({ timeframes }: { timeframes: readonly DisplayTimeframe[] }) => {
        return (
            <div className="w-full">
                <label htmlFor="timeframe-select" className="block text-sm font-medium text-off-white mb-2">
                    Select Timeframe
                </label>
                <select
                    id="timeframe-select"
                    value={selectedTimeframeId || ""}
                    onChange={(e) => {
                        const value = e.target.value;
                        setSelectedTimeframeId(value === "" ? null : parseInt(value));
                    }}
                    className="block w-full px-3 py-2 bg-secondary border border-border rounded-md text-off-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                    <option value="">Active Timeframe</option>
                    {timeframes.map((timeframe) => (
                        <option key={timeframe.id} value={timeframe.id}>
                            {timeframe.name} {timeframe.isActive ? "(Active)" : ""}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    const StudentCard = ({ student }: { student: DisplayStudentRow }) => {
        return (
            <div className="flex-shrink-0 w-screen p-4 text-off-white rounded-lg shadow-xl border border-border" style={{
                background: "linear-gradient(45deg, #000000 0%, #333333 25%, #666666 50%, #999999 75%, #cccccc 100%)",
            }}>         
                <div className="relative h-full" style={{ width: "45%"}}>
                    {/* Left side content */}
                    <div className="grid grid-cols-3">
                        <div className="h-full items-start" data-rank-tier={displayRankTier(student.rank)} style={{
                            fontSize: "2.5rem",
                            fontWeight: "bold",
                            color: "hsl(var(--rank-foreground))"
                        }}>
                            {numberToOrdinal(student.rank)}
                        </div>
                        <div className="h-full ps-4">
                            <div style={{
                                fontSize: "2rem",
                                fontWeight: "bold"
                            }}>
                                {student.firstName} {student.lastName}
                            </div>
                            <div style={{
                                fontSize: "2.5rem",
                                fontWeight: "bold"
                            }}>
                                {student.totalPoints.toLocaleString()}pts
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="text-off-white text-lg mb-2">
                                Grade {student.grade}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Measure the pinned item height
    useEffect(() => {
        if (pinnedItemRef.current) {
            const height = pinnedItemRef.current.offsetHeight;
            setPinnedItemHeight(height);
        }
    }, [data?.students.length]);

    return (
        <LoadingState
            isLoading={isLoading}
            error={error}
            data={data}
            errorFallback={(err) => <div>Error: {err.message}</div>}
        >
            {(data) => {
                if (!data.students.length) return <div>No students found</div>;
                
                // Create array with duplicated items for seamless infinite scroll
                // Remove the first item since it's pinned, so start with second item
                const scrollingItems = [...data.students.slice(1), ...data.students.slice(1)];
                
                // Calculate proper animation distance based on measured height
                const itemHeight = pinnedItemHeight + 16; // measured height + gap-4
                const totalDistance = (data.students.length - 1) * itemHeight; // Subtract 1 for pinned item
                
                return (
                    <div className="relative w-full overflow-hidden">
                        {/* Timeframe dropdown - positioned above pinned card and scrolling content */}
                        <div className="absolute top-0 left-0 z-20 w-full p-4" style={{
                            background: "rgba(0, 0, 0, 1)"
                        }}>
                            <TimeframeDropdown timeframes={data.timeframes} />
                        </div>
                        
                        {/* Pinned first item - positioned below dropdown but above scrolling content */}
                        <div ref={pinnedItemRef} className="absolute left-0 top-0 z-10" style={{ top: '80px' }}>
                            <StudentCard student={data.students[0]} />
                        </div>
                        
                        {/* Auto-scrolling container - positioned below pinned card */}
                        <div className="flex flex-col gap-4" style={{ paddingTop: `${pinnedItemHeight + 100}px` }}>
                            <motion.div
                                className="flex flex-col gap-4"
                                initial={{ y: 0 }} // Start at normal position
                                animate={{
                                    y: [0, -totalDistance] // Move vertically by the height of one complete set of items
                                }}
                                transition={{
                                    duration: data.students.length * 10,
                                    ease: "linear",
                                    repeat: Infinity,
                                    repeatType: "loop",
                                    delay: 2 // Wait 2 seconds before starting to scroll
                                }}
                            >
                                {scrollingItems.map((student, index) => (
                                    <motion.div
                                        key={`${student.key}-${index}`}
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <StudentCard student={student} />
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                );
            }}
        </LoadingState>
    )
}