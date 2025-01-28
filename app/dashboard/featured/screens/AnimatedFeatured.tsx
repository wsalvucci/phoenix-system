"use client";
import { backgroundGradient, numberToOrdinal, rankToColor } from "@/app/dataClasses";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react"
import { Roboto_Mono } from "next/font/google";
import { FaMedal } from "react-icons/fa"
import Color from "color";
import { GlobalPoints } from "@/app/supaApi/universal/utils/types";
import { featuredDashGetGlobalStats } from "@/app/supaApi/universal/universalApi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";

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
            id: number,
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
        initGlobalDashData: GlobalPoints,
    }
) {
    const [featuredDashData, setFeaturedDashData] = useState<GlobalPoints>(initFeaturedDashData)
    const [curNavigationState, setCurNavigationState] = useState<NavigationState>({
        currentCategory: 1,
        pointGroups: {
            currentGroupIdx: 0,
            groups: featuredDashData.pointGroups.map((pointGroup) => {
                return {
                    id: pointGroup.id,
                    title: pointGroup.name
                }
            })
        },
        grades: {
            currentGradeIdx: 0,
            grades: [9, 10, 11, 12].map((grade) => {
                return {
                    title: grade.toString()
                }
            })
        },
        rankingGroups: {
            currentGroupIdx: 0,
            groups: featuredDashData.rankingGroups.map((rankingGroup) => {
                return {
                    id: rankingGroup.id,
                    name: rankingGroup.name
                }
            })
        }
    })
    const [curProgress, setCurProgress] = useState<{ [id: number]: { value: number } }>({})

    const [paused, setPaused] = useState<boolean>(false)
    const [intervalLength, setIntervalLength] = useState<number>(20000)
    const [passedTime, setPassedTime] = useState<number>(0)

    console.log(initFeaturedDashData)

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

    const updateData = async (timeframe: number | null = null) => {
        featuredDashGetGlobalStats(12, timeframe).then((data) => {
            if (data === null) return
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
        rankChange,
        arrayLength,
        firstPlacePoints,
        breakdownPoints
    }: {
        student: {
            id: number,
            points: number,
            firstName: string,
            lastName: string
        },
        index: number,
        rankChange: number | null,
        arrayLength: number,
        firstPlacePoints: number,
        breakdownPoints: {
            pointGroupColor: string,
            pointGroupId: number,
            points: number
        }[] | null
    }) {
        const percentOfFirst = student.points / firstPlacePoints
        let breakdownGradient : String | null = null
        if (breakdownPoints !== null) {
            breakdownGradient = backgroundGradient(breakdownPoints.map((pointGroup) => {
                return {
                    color: Color(pointGroup.pointGroupColor).darken(0.5).toString(),
                    percent: (pointGroup.points / student.points) * 100
                }
            }))
        }
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
                    className="border-b border-e"
                    animate={{
                        borderRightColor: 'white',
                        borderBottomColor: rankToColor(index + 1).darken(0.5).toString(),
                    }}
                    transition={{
                        duration: 1 * percentOfFirst
                    }}
                >
                    <div
                        className="grid"
                        style={{
                            gridTemplateColumns: '75px 75px 5fr',
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
                        {
                            rankChange !== null  && rankChange !== 0 ?
                            <div className="px-3 flex justify-start items-center" style={{
                                color: rankChange > 0 ? 'green' : 'red',
                            }}>
                                {rankChange > 0 ? <FontAwesomeIcon icon={faArrowUp} /> : <FontAwesomeIcon icon={faArrowDown} />} {Math.abs(rankChange)}
                            </div> : <div className="px-3 flex justify-start items-center"/>
                        }
                        <motion.div
                            className={`flex justify-start px-3 font-normal text-nowrap overflow-hidden`}
                            animate={{
                                backgroundColor: rankToColor(index + 1).darken(0.5).toString()
                            }}>
                            {student.firstName} {student.lastName}
                        </motion.div>
                    </div>
                </motion.div>
                <motion.div
                    className="px-3 flex justify-start align-middle"
                    style={{
                        background: breakdownPoints !== null ? backgroundGradient(breakdownPoints.reduce((acc, pointGroup) => {
                            let curPct = 0
                            if (acc.length > 0) {
                                curPct = acc[acc.length - 1].percent
                                acc.push({
                                    color: Color(acc[acc.length - 1].color).darken(0.5).toString(),
                                    percent: curPct
                                })
                            }
                            acc.push({
                                color: Color(pointGroup.pointGroupColor).darken(0.5).toString(),
                                percent: curPct
                            })
                            acc.push({
                                color: Color(pointGroup.pointGroupColor).darken(0.5).toString(),
                                percent: (pointGroup.points / student.points) * 100 + curPct
                            })
                            return acc
                        }, [] as { color: string, percent: number }[])) : backgroundGradient([
                            { color: rankToColor(index + 1).darken(0.5).toString(), percent: 0 },
                            { color: rankToColor(index + 1).darken(0.5).toString(), percent: 75 },
                            { color: rankToColor(index + 1).lighten(0.75).toString(), percent: 100 }
                        ])
                    }}
                    initial={{ width: '0%' }}
                    animate={{
                        width: `${percentOfFirst * 100}%`,
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
                    featuredDashData.students
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .slice(0, 20)
                    .map((student, index, array) => {
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
                                    rankChange: student.lastMonthRank - student.rank,
                                    arrayLength: array.length,
                                    firstPlacePoints: array.at(0)?.totalPoints ?? Number.MAX_SAFE_INTEGER,
                                    breakdownPoints: student.pointGroups.map((pointGroup) => {
                                        return {
                                            pointGroupColor: featuredDashData.pointGroups.find((pg) => pg.id === pointGroup.id)?.color ?? 'black',
                                            pointGroupId: pointGroup.id,
                                            points: pointGroup.points
                                        }
                                    })
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
                        .students
                        .sort((a, b) =>
                            (b.pointGroups.find((pg) => pg.id === curNavigationState.pointGroups.groups.at(curNavigationState.pointGroups.currentGroupIdx)?.id)?.points ?? 0) -
                            (a.pointGroups.find((pg) => pg.id === curNavigationState.pointGroups.groups.at(curNavigationState.pointGroups.currentGroupIdx)?.id)?.points ?? 0)
                        )
                        .slice(0, 20)
                        .map((student, index, array) => {
                            return (
                                StudentBar(
                                    {
                                        student: {
                                            id: student.id,
                                            points: student.pointGroups.find((pg) => pg.id === curNavigationState.pointGroups.groups.at(curNavigationState.pointGroups.currentGroupIdx)?.id)?.points ?? 0,
                                            firstName: student.firstName,
                                            lastName: student.lastName
                                        },
                                        index: index,
                                        rankChange: null,
                                        arrayLength: array.length,
                                        firstPlacePoints: array.at(0)?.pointGroups.find((pg) => pg.id === curNavigationState.pointGroups.groups.at(curNavigationState.pointGroups.currentGroupIdx)?.id)?.points ?? 0 ?? Number.MAX_SAFE_INTEGER,
                                        breakdownPoints: null
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
                        .students
                        .filter((student) => student.grade === parseInt(curNavigationState.grades.grades.at(curNavigationState.grades.currentGradeIdx)?.title ?? ''))
                        .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
                        .slice(0, 20)
                        .map((student, index, array) => {
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
                                        rankChange: null,
                                        arrayLength: array.length,
                                        firstPlacePoints: array.at(0)?.totalPoints ?? 0 ?? Number.MAX_SAFE_INTEGER,
                                        breakdownPoints: student.pointGroups.map((pointGroup) => {
                                            return {
                                                pointGroupColor: featuredDashData.pointGroups.find((pg) => pg.id === pointGroup.id)?.color ?? 'black',
                                                pointGroupId: pointGroup.id,
                                                points: pointGroup.points
                                            }
                                        })
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
                        .filter((group) => featuredDashData.rankingGroups.find((rg) => rg.id === curNavigationState.rankingGroups.groups.at(curNavigationState.rankingGroups.currentGroupIdx)?.id)?.studentGroups.includes(group.id))
                        .map((group) => {
                            return {
                                id: group.id,
                                name: group.name,
                                averagePoints: group.averagePoints + group.rawPoints
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
                                        rankChange: null,
                                        arrayLength: array.length,
                                        firstPlacePoints: array.at(0)?.averagePoints ?? 0 ?? Number.MAX_SAFE_INTEGER,
                                        breakdownPoints: featuredDashData.studentGroups.find((sg) => sg.id === studentGroup.id)?.pointGroups.map((pointGroup) => {
                                            return {
                                                pointGroupColor: featuredDashData.pointGroups.find((pg) => pg.id === pointGroup.id)?.color ?? 'black',
                                                pointGroupId: pointGroup.id,
                                                points: pointGroup.points / (featuredDashData.studentGroups.find((sg) => sg.id === studentGroup.id)?.totalStudents ?? 0)
                                            }
                                        }) ?? null
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
            }}/>
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
                    <option className="text-black" key={10} value={10000}>10s</option>
                    <option className="text-black" key={20} value={20000}>20s</option>
                    <option className="text-black" key={30} value={30000}>30s</option>
                    <option className="text-black" key={45} value={45000}>45s</option>
                    <option className="text-black" key={60} value={60000}>60s</option>
                    <option className="text-black" key={90} value={90000}>90s</option>
                    <option className="text-black" key={120} value={120000}>120s</option>
                </select>
                <select
                    className="px-3 py-1 bg-transparent text-white"
                    defaultValue={featuredDashData.timeframes.find((timeframe) => timeframe.isActive)?.id}
                    onChange={(e) => {
                        updateData(parseInt(e.target.value))
                    }}
                    >
                        {
                            featuredDashData.timeframes.map((timeframe) => {
                                return (
                                    <option className="text-black" key={timeframe.id} value={timeframe.id}>
                                        {timeframe.name}
                                    </option>
                                )
                            })
                        }
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