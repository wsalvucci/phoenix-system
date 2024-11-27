"use client";
import { backgroundGradient, FeaturedDashboardData, metalStyle, metalStyleGradient, numberToOrdinal, rankToColor } from "@/app/dataClasses";
import { getFeaturedDashData } from "@/app/supaApi/server/dashboard/dashboardApi";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react"
import { Roboto_Mono } from "next/font/google";
import { FaMedal } from "react-icons/fa"

const monoFont = Roboto_Mono({
    subsets: ["latin"]
})

enum Category {
    OVERALL = 0,
    POINT_GROUP = 1,
    GRADE = 2,
    STUDENT_GROUP = 3,
    TRENDING = 4
}

type NavigationState = {
    currentCategory: Category,
    pointGroups: {
        currentGroupIdx: number,
        groups: {
            title: string
        }[]
    },
    grades: {
        currentGradeIdx: number,
        grades: {
            title: string
        }[]
    },
    studentGroups: {
        currentGroupIdx: number,
        groups: {
            title: string
        }[]
    }
}


export default function AnimatedFeatured(
    {
        initGlobalDashData: initFeaturedDashData,
    }: {
        initGlobalDashData: FeaturedDashboardData,
    }
) {
    const [featuredDashData, setFeaturedDashData] = useState<FeaturedDashboardData>(initFeaturedDashData)
    const [curNavigationState, setCurNavigationState] = useState<NavigationState>({
        currentCategory: 1,
        pointGroups: {
            currentGroupIdx: 0,
            groups: featuredDashData.topByPointGroup.map((pointGroup) => {
                return {
                    title: pointGroup.name
                }
            })
        },
        grades: {
            currentGradeIdx: 0,
            grades: featuredDashData.topByGrade.map((grade) => {
                return {
                    title: grade.grade.toString()
                }
            })
        },
        studentGroups: {
            currentGroupIdx: 0,
            groups: featuredDashData.totalPointsByGroup.map((group) => {
                return {
                    title: group.name
                }
            })
        }
    })
    const [curProgress, setCurProgress] = useState<{ [id: number]: { value: number } }>({})

    const [paused, setPaused] = useState<boolean>(false)
    const TEMP_INTERVAL_LENGTH = 30000
    const [passedTime, setPassedTime] = useState<number>(0)

    function decrementDav() {
        setPassedTime(0)
        setCurNavigationState((lastState) => {
            if (lastState.currentCategory === Category.OVERALL) {
                return {
                    ...lastState,
                    currentCategory: Category.GRADE
                }
            } else if (lastState.currentCategory === Category.POINT_GROUP) {
                if (lastState.pointGroups.currentGroupIdx - 1 >= 0) {
                    return {
                        ...lastState,
                        pointGroups: {
                            ...lastState.pointGroups,
                            currentGroupIdx: lastState.pointGroups.currentGroupIdx - 1
                        }
                    }
                } else {
                    return {
                        ...lastState,
                        currentCategory: Category.OVERALL,
                        pointGroups: {
                            ...lastState.pointGroups,
                            currentGroupIdx: 0
                        }
                    }
                }
            } else if (lastState.currentCategory === Category.GRADE) {
                if (lastState.grades.currentGradeIdx - 1 >= 0) {
                    return {
                        ...lastState,
                        grades: {
                            ...lastState.grades,
                            currentGradeIdx: lastState.grades.currentGradeIdx - 1
                        }
                    }
                } else {
                    return {
                        ...lastState,
                        currentCategory: Category.POINT_GROUP,
                        grades: {
                            ...lastState.grades,
                            currentGradeIdx: 0
                        }
                    }
                }
            } // TODO: Remaining categories

            return lastState
        })
    }

    function incrementNav() {
        setPassedTime(0)
        setCurNavigationState((lastState) => {
            if (lastState.currentCategory === Category.OVERALL) {
                return {
                    ...lastState,
                    currentCategory: Category.POINT_GROUP
                }
            } else if (lastState.currentCategory === Category.POINT_GROUP) {
                if (lastState.pointGroups.currentGroupIdx + 1 < lastState.pointGroups.groups.length) {
                    return {
                        ...lastState,
                        pointGroups: {
                            ...lastState.pointGroups,
                            currentGroupIdx: lastState.pointGroups.currentGroupIdx + 1
                        }
                    }
                } else {
                    return {
                        ...lastState,
                        currentCategory: Category.GRADE,
                        pointGroups: {
                            ...lastState.pointGroups,
                            currentGroupIdx: 0
                        }
                    }
                }
            } else if (lastState.currentCategory === Category.GRADE) {
                if (lastState.grades.currentGradeIdx + 1 < lastState.grades.grades.length) {
                    return {
                        ...lastState,
                        grades: {
                            ...lastState.grades,
                            currentGradeIdx: lastState.grades.currentGradeIdx + 1
                        }
                    }
                } else {
                    return {
                        ...lastState,
                        currentCategory: Category.OVERALL,
                        grades: {
                            ...lastState.grades,
                            currentGradeIdx: 0
                        }
                    }
                }
            } // TODO: Remaining categories

            return lastState
        })
    }

    useEffect(() => {
        const timePassedInterval = setInterval(() => {
            if (paused) return
            if ((passedTime + 100) >= TEMP_INTERVAL_LENGTH) {
                setPassedTime(0)
                incrementNav()
            } else {
                setPassedTime((prevTime) => prevTime + 100)
            }
        }, 100)

        return () => clearInterval(timePassedInterval)
    }, [featuredDashData, paused, passedTime])

    const updateData = async () => {
        getFeaturedDashData(12).then((data) => {
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

    function StudentBar({
        student,
        index,
        arrayLength,
        firstPlacePoints
    }: {
        student: {
            id: number,
            points: number,
            firstName: string,
            lastName: string
        },
        index: number,
        arrayLength: number,
        firstPlacePoints: number
    }) {
        const percentOfFirst = student.points / firstPlacePoints
        return (
            <motion.div
                className={`grid py-2 text-2xl`}
                style={{
                    gridTemplateColumns: '1fr 3fr',
                    zIndex: index
                }}
                key={student.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                    duration: 1,
                    delay: 1 - ((arrayLength - index) / arrayLength),
                    layout: { duration: 3 }
                }}
            >
                <motion.div
                    className="border-e border-white"
                    animate={{ backgroundColor: rankToColor(index + 1).darken(0.5).toString() }}
                    transition={{
                        duration: 3
                    }}
                >
                    <div
                        className="grid"
                        style={{
                            gridTemplateColumns: '1fr 5fr',
                        }}
                    >

                        {
                            index < 3 ?
                                <div className="px-3 flex justify-center">
                                    <FaMedal color={rankToColor(index + 1).toString()} />
                                </div>
                                :
                                <div className="px-3 flex justify-start items-center">
                                    {numberToOrdinal(index + 1)}
                                </div>
                        }
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 2 }}
                            className={`flex justify-start px-3 font-normal text-nowrap overflow-hidden`}>
                            {student.firstName} {student.lastName}
                        </motion.div>
                    </div>
                </motion.div>
                <motion.div
                    className="px-3 flex justify-start align-middle"
                    initial={{ width: '0%' }}
                    animate={{
                        width: `${percentOfFirst * 100}%`,
                        background: backgroundGradient([
                            { color: rankToColor(index + 1).darken(0.5).toString(), percent: 0 },
                            { color: rankToColor(index + 1).darken(0.5).toString(), percent: 75 },
                            { color: rankToColor(index + 1).lighten(0.75).toString(), percent: 100 }
                        ])
                    }}
                    onUpdate={(latest) => {
                        // Funny trick. Mulitiplying by the current width means that the max width is <100% for everyone
                        // except first place, so the animation progress is the current % width / the final % width, which
                        // will only be 100% for 1st place and < 100% for everyone else
                        const value = (Number(latest.width.toString().slice(0, -1)) / 100) / percentOfFirst
                        setCurProgress((lastState) => ({
                            ...lastState,
                            [student.id]: { value },
                        }));
                    }}
                    transition={{ duration: 2 * percentOfFirst }}
                >
                    <motion.div
                        className={`flex items-center ${monoFont.className}`}
                    >
                        {Math.round(student.points * (curProgress[student.id]?.value ?? 0)).toLocaleString()}
                    </motion.div>
                </motion.div>
            </motion.div>
        )
    }

    function OverallTop20() {
        return (
            <AnimatePresence>
                {
                    featuredDashData.topOverall.sort((a, b) => b.totalPoints - a.totalPoints).map((student, index, array) => {
                        return (
                            StudentBar(
                                {
                                    student: {
                                        id: student.id,
                                        points: student.totalPoints,
                                        firstName: student.firstName,
                                        lastName: student.lastName
                                    },
                                    index: index,
                                    arrayLength: array.length,
                                    firstPlacePoints: array.at(0)?.totalPoints ?? Number.MAX_SAFE_INTEGER
                                },

                            )
                        )
                    })
                }
            </AnimatePresence>
        )
    }

    function PointGroupTop20() {
        return (
            <AnimatePresence>
                {
                    featuredDashData
                        .topByPointGroup
                        .at(curNavigationState.pointGroups.currentGroupIdx)
                        ?.students
                        .sort((a, b) => (b.byPointGroup.at(curNavigationState.pointGroups.currentGroupIdx)?.totalPoints ?? 0) - (a.byPointGroup.at(curNavigationState.pointGroups.currentGroupIdx)?.totalPoints ?? 0)).map((student, index, array) => {
                            return (
                                StudentBar(
                                    {
                                        student: {
                                            id: student.id,
                                            points: student.byPointGroup.at(curNavigationState.pointGroups.currentGroupIdx)?.totalPoints ?? 0,
                                            firstName: student.firstName,
                                            lastName: student.lastName
                                        },
                                        index: index,
                                        arrayLength: array.length,
                                        firstPlacePoints: array.at(0)?.byPointGroup.at(curNavigationState.pointGroups.currentGroupIdx)?.totalPoints ?? 0 ?? Number.MAX_SAFE_INTEGER
                                    },

                                )
                            )
                        })
                }
            </AnimatePresence>
        )
    }

    function GradeTop20() {
        return (
            <AnimatePresence>
                {
                    featuredDashData
                        .topByGrade
                        .at(curNavigationState.grades.currentGradeIdx)
                        ?.students
                        .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0)).map((student, index, array) => {
                            return (
                                StudentBar(
                                    {
                                        student: {
                                            id: student.id,
                                            points: student.totalPoints ?? 0,
                                            firstName: student.firstName,
                                            lastName: student.lastName
                                        },
                                        index: index,
                                        arrayLength: array.length,
                                        firstPlacePoints: array.at(0)?.totalPoints ?? 0 ?? Number.MAX_SAFE_INTEGER
                                    },

                                )
                            )
                        })
                }
            </AnimatePresence>
        )
    }

    return (
        <div
            className={`p-3 text-slate-100 font-bold`}
        >
            <div className="h-1 bg-green-500" style={{
                width: `${(passedTime / TEMP_INTERVAL_LENGTH) * 100}%`
            }}>

            </div>
            <motion.div
                className="flex justify-center text-5xl">
                TOP {
                    curNavigationState.currentCategory !== Category.OVERALL && (
                        curNavigationState.currentCategory === Category.POINT_GROUP && curNavigationState.pointGroups.groups.at(curNavigationState.pointGroups.currentGroupIdx)?.title ||
                        curNavigationState.currentCategory === Category.GRADE && numberToOrdinal(parseInt(curNavigationState.grades.grades.at(curNavigationState.grades.currentGradeIdx)?.title ?? '')) + " grade"
                    )?.toString().toUpperCase()
                } STUDENTS
            </motion.div>
            <div>
                <button className="border-gray-500 border-2 rounded-lg px-3 my-1 mx-1 hover:bg-slate-700"
                    onClick={(e) => { decrementDav() }}
                >
                    Previous
                </button>
                <button className="border-gray-500 border-2 rounded-lg px-3 my-1 mx-1 hover:bg-slate-700"
                    onClick={(e) => { setPaused(!paused) }}
                >
                    {
                        paused ? 'Resume' : 'Pause'
                    }
                </button>
                <button className="border-gray-500 border-2 rounded-lg px-3 my-1 mx-1 hover:bg-slate-700"
                    onClick={(e) => { incrementNav() }}
                >
                    Next
                </button>
            </div>
            {
                curNavigationState.currentCategory === Category.OVERALL && OverallTop20() ||
                curNavigationState.currentCategory === Category.POINT_GROUP && PointGroupTop20() ||
                curNavigationState.currentCategory === Category.GRADE && GradeTop20()
            }
        </div>
    )
}