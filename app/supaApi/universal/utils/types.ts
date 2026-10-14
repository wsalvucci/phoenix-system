export type SupabaseUserData = {
    supaId: string
}

export type UserData = {
    userId: number,
    adminId: number,
}

export type AdminData = {
    userId: number,
    adminId: number,
    schools: number[]
}

export type TimeframeData = {
    id: number,
    name: string,
    startDate: string,
    endDate: string,
    isActive: boolean
}

export type PointEventData = {
    id: number,
    name: string,
    date: string,
    maxInput: number,
    template: {
        id: number,
        pointGroupId: number,
        conversionRule: {
            name: string,
            value: number
        }
    },
    studentGroup: {
        id: number,
        name: string,
        rankingGroups: number[],
    },
    studentPoints: {
        studentId: number,
        input: number
    }[]
}

export type RankingGroupPointEventData = {
    id: number,
    name: string,
    date: string,
    groupPoints: {
        groupId: number,
        points: number
    }[]
}

export type StudentData = {
    id: number,
    schoolId: number,
    firstName: string,
    lastName: string,
    grade: number,
}

export type PointGroupData = {
    id: number,
    name: string,
    color: string
}

export type StudentGroupData = {
    id: number,
    name: string,
    students: number[]
}

export type RankingGroupData = {
    id: number,
    name: string,
    studentGroups: number[],
    timeframeStart: string | null,
    timeframeEnd: string | null,
}

export type CompiledStudentPoints = {
    id: number,
    firstName: string,
    lastName: string,
    totalPoints: number,
    lastMonthPoints: number,
    grade: number,
    pointGroups: {
        id: number,
        points: number,
        lastMonthPoints: number
    }[],
    totalPointsByDay: Map<string, number>,
    pointsEarnedEachDay: Map<string, number>,
    monthToMonthImprovement: number,
    studentGroups: number[]
}

export type GlobalPoints = {
    // Counts before privacy shortlisting, for category-specific public display limits.
    categoryStudentCounts?: {
        grades: Record<number, number>,
        pointGroups: Record<number, number>,
    },
    schoolId: number,
    totalStudents: number,
    timeframes: TimeframeData[],
    grades: number[],
    students: {
        id: number,
        firstName: string,
        lastName: string,
        rank: number,
        lastMonthRank: number,
        totalPoints: number,
        lastMonthPoints: number,
        grade: number,
        gradeRank: number,
        lastMonthGradeRank: number,
        pointGroups: {
            id: number,
            points: number,
            rank: number,
            lastMonthPoints: number,
            lastMonthRank: number
        }[],
        totalPointsByDay: Map<string, number>,
        pointsEarnedEachDay: Map<string, number>,
        monthToMonthChange: number,
        studentGroups: number[]
    }[],
    pointGroups: {
        id: number,
        name: string,
        color: string
    }[],
    studentGroups: {
        id: number,
        name: string,
        totalStudents: number,
        averagePoints: number,
        lastMonthAveragePoints: number,
        rawPoints: number,
        lastMonthRawPoints: number,
        pointGroups: {
            id: number,
            points: number
        }[]
    }[],
    rankingGroups: {
        id: number,
        name: string,
        studentGroups: {
            id: number,
            name: string,
            totalStudents: number,
            averagePoints: number,
            lastMonthAveragePoints: number,
            rawPoints: number,
            lastMonthRawPoints: number,
            pointGroups: {
                id: number,
                points: number
            }[]
        }[]
    }[],
    pointEvents: {
        id: number,
        name: string,
        maxPoints: number,
        date: string,
        studentGroupId: number,
        pointGroup: number,
        students: {
            id: number,
            points: number
        }[]
    }[]
}

export type StudentPointsData = {
    schoolId: number,
    studentId: number,
    firstName: string,
    lastName: string,
    grade: number,
    gradeRank: number,
    gradeOutOf: number,
    totalPoints: number,
    totalRank: number,
    totalOutOf: number,
    nearbyStudents: {
        studentId: number,
        firstName: string,
        lastName: string,
        totalPoints: number,
        rank: number,
    }[],
    nearbyGradeStudents: {
        studentId: number,
        firstName: string,
        lastName: string,
        points: number,
        rank: number,
    }[],
    pointGroups: {
        id: number,
        name: string,
        color: string,
        points: number,
        rank: number,
        outOf: number,
        nearbyStudents: {
            studentId: number,
            firstName: string,
            lastName: string,
            points: number,
            rank: number,
        }[]
    }[],
    studentGroups: {
        id: number,
        name: string,
        rank: number,
        outOf: number,
        nearbyStudents: {
            studentId: number,
            firstName: string,
            lastName: string,
            points: number,
            rank: number,
        }[]
    }[],
    pointEvents: {
        id: number,
        name: string,
        date: string,
        maxPoints: number,
        points: number,
        rank: number,
        outOf: number,
        pointGroup: {
            id: number,
            name: string,
            color: string
        },
    }[]
}