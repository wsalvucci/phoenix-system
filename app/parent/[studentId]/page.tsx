import { getStudentDashboardDataById } from "@/api/student";
import Link from "next/link";
import { redirect } from "next/navigation";

// Helper function to convert number to ordinal
function numberToOrdinal(num: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

// Helper function to format date
function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch {
        return 'Invalid date';
    }
}

export default async function ParentStudentDashboard({ params: { studentId } }: { params: { studentId: string } }) {
    const studentData = await getStudentDashboardDataById(parseInt(studentId), null);

    if (!studentData) {
        redirect("/parent");
    }

    const { student, totalPoints, totalRank, totalOutOf, gradeRank, gradeOutOf, nearbyStudents } = studentData;

    return (
        <div className="w-full h-full">
            <div className="absolute top-20 left-10">
                <Link 
                    className="bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 rounded-lg px-3 py-1" 
                    href={'/parent'}
                >
                    Back
                </Link>
            </div>
            <div className="mt-5">
                <div className="text-3xl flex justify-center">
                    {student.firstName} {student.lastName}
                </div>
                <div className="text-3xl flex justify-center">
                    {totalPoints.toLocaleString()}pts
                </div>
                <div className="text-xl flex justify-center">
                    {numberToOrdinal(totalRank)} / {totalOutOf.toLocaleString()} students
                </div>
                <div className="text-lg flex justify-center">
                    {numberToOrdinal(Math.round((1 - (totalRank / totalOutOf)) * 100))} percentile
                </div>
            </div>
            
            <div className="border-t-2 m-5 p-5">
                <div className="flex justify-center text-3xl py-3">Grade Ranking</div>
                <div className="grid grid-cols-2">
                    <div className="flex justify-center">Grade</div>
                    <div className="flex justify-center">Rank</div>
                    <div className="col-span-2 grid grid-cols-2 border-t p-2">
                        <div className="flex justify-center">Grade {student.grade}</div>
                        <div className="flex justify-center">
                            {numberToOrdinal(gradeRank)} / {gradeOutOf} students
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t-2 m-5 p-5">
                <div className="flex justify-center text-3xl py-3">Nearby Students</div>
                <div className="grid grid-cols-3 gap-1">
                    <div className="col-span-3 grid grid-cols-3">
                        <div className="flex justify-center">Name</div>
                        <div className="flex justify-center">Points</div>
                        <div className="flex justify-center">Rank</div>
                    </div>
                    {nearbyStudents.map((nearby) => (
                        <div key={nearby.studentId} className="col-span-3 grid grid-cols-3 p-2 border-t">
                            <div className="flex justify-start">
                                {nearby.firstName} {nearby.lastName}
                            </div>
                            <div className="flex justify-center">
                                {nearby.totalPoints.toLocaleString()}
                            </div>
                            <div className="flex justify-center">
                                #{nearby.rank}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}