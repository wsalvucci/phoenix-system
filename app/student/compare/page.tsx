import { getStudentDashboardData, getSchoolGlobalStats } from "@/api/student";
import { StudentPointsData, GlobalPoints } from "@/app/supaApi/universal/utils/types";
import CompareContainer from "./components/CompareContainer";

// Adapter function to convert new student data to old format
function adaptStudentData(newData: any): StudentPointsData {
    return {
        schoolId: newData.student.schoolId,
        studentId: newData.student.id,
        firstName: newData.student.firstName,
        lastName: newData.student.lastName,
        grade: newData.student.grade,
        gradeRank: newData.gradeRank,
        gradeOutOf: newData.gradeOutOf,
        totalPoints: newData.totalPoints,
        totalRank: newData.totalRank,
        totalOutOf: newData.totalOutOf,
        nearbyStudents: newData.nearbyStudents,
        nearbyGradeStudents: newData.nearbyGradeStudents,
        pointGroups: [], // We'll need to calculate this from point events
        studentGroups: [], // We'll need to calculate this from student groups
        pointEvents: [] // We'll need to get this from recent events
    };
}

// Adapter function to convert new global data to old format
function adaptGlobalData(newData: any): GlobalPoints {
    return {
        schoolId: newData.schoolId,
        totalStudents: newData.totalStudents,
        timeframes: [newData.timeframe],
        grades: Array.from(new Set(newData.students.map((s: any) => s.grade))),
        students: newData.students.map((s: any) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            rank: s.rank,
            lastMonthRank: s.rank, // We don't have this data
            totalPoints: s.totalPoints,
            lastMonthPoints: s.totalPoints, // We don't have this data
            grade: s.grade,
            gradeRank: s.rank, // We don't have grade-specific ranking
            lastMonthGradeRank: s.rank, // We don't have this data
            pointGroups: [], // We don't have this data
            totalPointsByDay: new Map(),
            pointsEarnedEachDay: new Map(),
            monthToMonthChange: 0,
            studentGroups: []
        })),
        pointGroups: newData.pointGroups,
        studentGroups: [], // We don't have this data
        rankingGroups: [], // We don't have this data
        pointEvents: [] // We don't have this data
    };
}

export default async function StudentCompare() {
    const studentData = await getStudentDashboardData();
    if (!studentData) {
        return <div>Student data not found</div>;
    }

    const globalData = await getSchoolGlobalStats(studentData.student.schoolId, null);
    if (!globalData) {
        return <div>Global data not found</div>;
    }

    // Convert to old format
    const adaptedStudentData = adaptStudentData(studentData);
    const adaptedGlobalData = adaptGlobalData(globalData);

    return (
        <CompareContainer _studentData={adaptedStudentData} _globalData={adaptedGlobalData} />
    );
}