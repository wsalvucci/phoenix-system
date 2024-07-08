import { Student } from "@/app/dataClasses";
import { studentResponseToData } from "@/app/supaApi/mappers/dataMappers";
import getSchoolStudents from "@/app/supaApi/server/admin/students/getSchoolStudents";

export async function clientGetSchoolStudents(schoolId: number): Promise<Student[] | null> {
    const students = await getSchoolStudents(schoolId);

    if (!students) return null;

    return students.map(studentResponseToData);
}