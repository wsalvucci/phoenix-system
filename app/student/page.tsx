import { getOwnStudentData, getStudentRankData } from "../supaApi/server/student/studentApi";
import ContainerComponent from "./components/ContainerComponent";

export default async function StudentDashboard() {

    const studentData = await getOwnStudentData();
    const studentRankData = await getStudentRankData();

    return (
        <ContainerComponent studentData={studentData} studentRankData={studentRankData} />
    )
}