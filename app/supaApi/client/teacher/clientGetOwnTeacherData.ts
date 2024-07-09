import { Teacher } from "@/app/dataClasses";
import getOwnTeacherData from "../../server/teacher/getOwnTeacherData";
import { teacherResponseToData } from "../../mappers/dataMappers";

export default async function clientGetOwnTeacherData(): Promise<Teacher | null> {
    const teacherData = await getOwnTeacherData();

    if (!teacherData) return null;

    return teacherResponseToData(teacherData);
}