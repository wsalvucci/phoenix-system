"use client";
import { getTopScrollingDashboard } from "@/api/dashboard";

// Force static generation to reduce serverless functions
export const dynamic = 'force-static';
import { numberToOrdinal, rankToColor } from "@/app/dataClasses";
import { LoadingState } from "@/components/LoadingLayout";
import { percentileToRating, Timeframe } from "@/types/domain";
import { SimpleDashboardData } from "@/api/service/dashboard";
import { useQuery } from "@tanstack/react-query";
import Color from "color";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function TopCards() {
    const [selectedTimeframeId, setSelectedTimeframeId] = useState<number | null>(null);
    
    const { data, isLoading, error } = useQuery({
        queryKey: ["topCards", selectedTimeframeId],
        queryFn: () => getTopScrollingDashboard(12, selectedTimeframeId)
    })

    console.log("=== TOPCARDS DASHBOARD DEBUG ===");
    console.log("Timeframes count:", data?.timeframes?.length);
    console.log("Timeframes:", data?.timeframes);
    console.log("Active timeframes:", data?.timeframes?.filter(tf => tf.active));
    console.log("=================================");

    const pinnedItemRef = useRef<HTMLDivElement>(null);
    const [pinnedItemHeight, setPinnedItemHeight] = useState(0);

    // Timeframe dropdown component
    const TimeframeDropdown = ({ timeframes }: { timeframes: Timeframe[] }) => {
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
                            {timeframe.name} {timeframe.active ? "(Active)" : ""}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    const StudentCard = ({ student }: { student: SimpleDashboardData["students"][0] }) => {
        // Function to create gradient text
        const createGradientText = (color: string, rating: string) => {
            // Special holographic effect for S ranks
            if (rating.startsWith('S')) {
                return {
                    background: `linear-gradient(45deg, #ff6b9d 0%, #c44569 12.5%, #feca57 25%, #ff9ff3 37.5%, #54a0ff 50%, #5f27cd 62.5%, #00d2d3 75%, #ff9f43 87.5%, #ff6b9d 100%)`,
                    backgroundSize: '25% 25%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: `
                        2px 2px 3px rgba(0,0,0,0.3),
                        -2px -2px 3px rgba(255,255,255,0.4)
                    `,
                };
            }
            // Shiny metallic effect for other ranks
            const baseColor = Color(color);
            // Create shiny metallic effect
            const veryLight = baseColor.lighten(0.6).toString();
            const light = baseColor.lighten(0.3).toString();
            const dark = baseColor.darken(0.2).toString();
            const veryDark = baseColor.darken(0.4).toString();
            return {
                background: `linear-gradient(45deg, ${veryLight} 0%, ${light} 25%, ${baseColor} 40%, ${dark} 60%, ${veryDark} 75%, ${light} 100%)`,
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: `
                    2px 2px 3px rgba(0,0,0,0.2),
                    -2px -2px 3px rgba(255,255,255,0.3)
                `,
            };
        };

        // Create dynamic gradient based on point group breakdown
        const createPointGroupGradient = () => {
            if (!student.pointGroups || student.pointGroups.length === 0) {
                return `linear-gradient(45deg, #000000 0%, #333333 25%, #666666 50%, #999999 75%, #cccccc 100%)`;
            }

            // Calculate total points for percentage calculation
            const totalPoints = student.pointGroups.reduce((sum, pg) => sum + pg.points, 0);
            if (totalPoints === 0) {
                return `linear-gradient(45deg, #000000 0%, #333333 25%, #666666 50%, #999999 75%, #cccccc 100%)`;
            }

            // Sort point groups by ID to maintain consistent order across all students
            const sortedPointGroups = [...student.pointGroups].sort((a, b) => a.id - b.id);
            
            // Start with black section to push point group colors to the side
            let gradient = 'linear-gradient(45deg, #000000 0%, #000000 50%';
            let currentPercent = 50; // Start point group colors at 50%
            
            sortedPointGroups.forEach((pg, index) => {
                const percentage = (pg.points / totalPoints) * 50; // Use remaining 50% of space
                const startPercent = currentPercent;
                currentPercent += percentage;
                
                // Darken the color to be less jarring against dark background
                const darkenedColor = Color(pg.color).darken(0.4).toString();
                
                gradient += `, ${darkenedColor} ${startPercent}%, ${darkenedColor} ${currentPercent}%`;
            });
            
            // Fill remaining space with black if needed
            if (currentPercent < 100) {
                gradient += `, #000000 ${currentPercent}%, #000000 100%`;
            }
            
            gradient += ')';
            return gradient;
        };

        return (
            <div className="flex-shrink-0 w-screen p-4 text-off-white rounded-lg shadow-xl border border-border" style={{
                background: createPointGroupGradient(),
            }}>         
                <div className="relative h-full" style={{ width: "45%"}}>
                    {/* Left side content */}
                    <div className="grid grid-cols-3">
                        <div className="h-full items-start" style={{
                            fontSize: "2.5rem",
                            fontWeight: "bold",
                            color: Color(rankToColor(student.rank)).lighten(0.5).toString()
                        }}>
                            {numberToOrdinal(student.rank)}
                        </div>
                        <div className="h-full ps-4">
                            <div style={{
                                fontSize: "2rem",
                                fontWeight: "bold"
                            }}>
                                {student.student.first_name} {student.student.last_name}
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
                                Grade {student.student.grade}
                            </div>
                            {student.studentGroups && student.studentGroups.length > 0 && (
                                <div className="text-off-white text-sm">
                                    {student.studentGroups.map((sg, index) => (
                                        <div key={sg.id} className="text-right mb-1">
                                            {sg.name}
                                        </div>
                                    ))}
                                </div>
                            )}
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
                                        key={`${student.studentId}-${index}`}
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