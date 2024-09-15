import Link from "next/link";
import { getOwnStudentData, getStudentDashboardData, getStudentRankData } from "../supaApi/server/student/studentApi";
import ContainerComponent from "./components/ContainerComponent";

export default async function StudentDashboard() {

    const studentData = await getOwnStudentData();

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
        const studentRankData = await getStudentRankData();
        return (
            <ContainerComponent studentData={studentData} studentRankData={studentRankData} />
        )
    }
}