import Link from "next/link";
import { getOwnStudentData, getStudentDashboardData } from "../supaApi/server/student/studentApi";
import ContainerComponent from "./components/ContainerComponent";
import { getStudentPointStats } from "../supaApi/universal/universalApi";

export default async function StudentDashboard() {

    const studentData = await getStudentPointStats(null, null);

    if (studentData === null) {
        return (
            <div>
                <div className="text-xl flex justify-center">Student Data Not Found</div>
                <Link href="/linkAccount/student"
                    className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700">
                    Link Student Account
                </Link>
            </div>
        )
    } else {
        return (
            <ContainerComponent studentRankData={studentData} />
        )
    }
}