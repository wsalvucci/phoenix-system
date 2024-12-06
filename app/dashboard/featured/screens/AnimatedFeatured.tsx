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
    rankingGroups: {
        currentGroupIdx: number,
        groups: {
            id: number,
            name: string
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
        rankingGroups: {
            currentGroupIdx: 0,
            groups: featuredDashData.studentGroups
                .reduce((acc, cur) => {
                    cur.rankingGroups.forEach((group) => {
                        if (acc.find((accGroup) => accGroup.id === group.id) !== undefined) return
                        acc.push({
                            id: group.id,
                            name: group.name
                        })
                    })
                    return acc
                }, [] as { id: number, name: string }[])
        }
    })
    const [curProgress, setCurProgress] = useState<{ [id: number]: { value: number } }>({})

    const [paused, setPaused] = useState<boolean>(false)
    const [intervalLength, setIntervalLength] = useState<number>(20000)
    const [passedTime, setPassedTime] = useState<number>(0)

    function decrementDav() {
        setPassedTime(0)
        setCurNavigationState((lastState) => {
            if (lastState.currentCategory === Category.OVERALL) {
                return {
                    ...lastState,
                    currentCategory: Category.STUDENT_GROUP,
                    rankingGroups: {
                        ...lastState.rankingGroups,
                        currentGroupIdx: lastState.rankingGroups.groups.length - 1
                    }
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
                        },
                        pointGroups: {
                            ...lastState.pointGroups,
                            currentGroupIdx: lastState.pointGroups.groups.length - 1
                        }
                    }
                }
            } else if (lastState.currentCategory === Category.STUDENT_GROUP) {
                if (lastState.rankingGroups.currentGroupIdx - 1 >= 0) {
                    return {
                        ...lastState,
                        rankingGroups: {
                            ...lastState.rankingGroups,
                            currentGroupIdx: lastState.rankingGroups.currentGroupIdx - 1
                        }
                    }
                } else {
                    return {
                        ...lastState,
                        currentCategory: Category.GRADE,
                        rankingGroups: {
                            ...lastState.rankingGroups,
                            currentGroupIdx: 0
                        },
                        grades: {
                            ...lastState.grades,
                            currentGradeIdx: lastState.grades.grades.length - 1
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
                        currentCategory: Category.STUDENT_GROUP,
                        grades: {
                            ...lastState.grades,
                            currentGradeIdx: 0
                        }
                    }
                }
            } else if (lastState.currentCategory === Category.STUDENT_GROUP) {
                if (lastState.rankingGroups.currentGroupIdx + 1 < lastState.rankingGroups.groups.length) {
                    return {
                        ...lastState,
                        rankingGroups: {
                            ...lastState.rankingGroups,
                            currentGroupIdx: lastState.rankingGroups.currentGroupIdx + 1
                        }
                    }
                } else {
                    return {
                        ...lastState,
                        currentCategory: Category.OVERALL,
                        rankingGroups: {
                            ...lastState.rankingGroups,
                            currentGroupIdx: 0
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
            if ((passedTime + 1000) >= intervalLength) {
                setPassedTime(0)
                incrementNav()
            } else {
                setPassedTime((prevTime) => prevTime + 1000)
            }
        }, 1000)

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
                transition={{
                    layout: { duration: 0.5 }
                }}
            >
                <motion.div
                    className="border-e border-white"
                    animate={{ backgroundColor: rankToColor(index + 1).darken(0.5).toString() }}
                    transition={{
                        duration: 1 * percentOfFirst
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
                    transition={{ duration: 1 * percentOfFirst }}
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

    function TopStudentGroups() {
        return (
            <AnimatePresence>
                {
                    featuredDashData
                        .studentGroups
                        .filter((group) => group.rankingGroups.find((rankingGroup) => rankingGroup.id === curNavigationState.rankingGroups.groups.at(curNavigationState.rankingGroups.currentGroupIdx)?.id) !== undefined)
                        .map((group) => {
                            return {
                                id: group.id,
                                name: group.name,
                                averagePoints: group.students.reduce((acc, cur) => {
                                    acc += cur.totalPoints
                                    return acc
                                }, 0) / group.students.length
                            }
                        })
                        .sort((a, b) => (b.averagePoints ?? 0) - (a.averagePoints ?? 0)).map((studentGroup, index, array) => {
                            return (
                                StudentBar(
                                    {
                                        student: {
                                            id: studentGroup.id,
                                            points: studentGroup.averagePoints ?? 0,
                                            firstName: studentGroup.name,
                                            lastName: ''
                                        },
                                        index: index,
                                        arrayLength: array.length,
                                        firstPlacePoints: array.at(0)?.averagePoints ?? 0 ?? Number.MAX_SAFE_INTEGER
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
                width: `${(passedTime / intervalLength) * 100}%`
            }}>

            </div>
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
                <select
                    className="px-3 py-1 bg-transparent text-white"
                    defaultValue={intervalLength}
                    onChange={(e) => {
                        setIntervalLength(parseInt(e.target.value))
                    }}
                >
                    <option key={10} value={10000}>10s</option>
                    <option key={20} value={20000}>20s</option>
                    <option key={30} value={30000}>30s</option>
                    <option key={45} value={45000}>45s</option>
                    <option key={60} value={60000}>60s</option>
                    <option key={90} value={90000}>90s</option>
                    <option key={120} value={120000}>120s</option>
                </select>
            </div>
            <motion.div
                className="flex justify-center text-5xl">
                TOP {
                    (curNavigationState.currentCategory === Category.OVERALL && "students" ||
                        curNavigationState.currentCategory === Category.POINT_GROUP && curNavigationState.pointGroups.groups.at(curNavigationState.pointGroups.currentGroupIdx)?.title + " students" ||
                        curNavigationState.currentCategory === Category.GRADE && numberToOrdinal(parseInt(curNavigationState.grades.grades.at(curNavigationState.grades.currentGradeIdx)?.title ?? '')) + " grade students" ||
                        curNavigationState.currentCategory === Category.STUDENT_GROUP && curNavigationState.rankingGroups.groups.at(curNavigationState.rankingGroups.currentGroupIdx)?.name)
                        ?.toString().toUpperCase()
                }
            </motion.div>
            {
                curNavigationState.currentCategory === Category.OVERALL && OverallTop20() ||
                curNavigationState.currentCategory === Category.POINT_GROUP && PointGroupTop20() ||
                curNavigationState.currentCategory === Category.GRADE && GradeTop20() ||
                curNavigationState.currentCategory === Category.STUDENT_GROUP && TopStudentGroups()
            }
        </div>
    )
}