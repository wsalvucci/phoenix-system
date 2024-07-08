import supabaseClient from "@/app/api/supabaseClient";
import { Student } from "@/app/dataClasses";

export default async function getStudentGroupStudentsAsAdmin(schoolId: number, studentGroupId: number): Promise<Student[] | []> {
    const supabase = supabaseClient
    const { data: studentData, error: studentError } = await supabase.rpc('get_student_group_students_as_admin', { provided_school_id: schoolId, provided_student_group_id: studentGroupId })
    if (studentError) {
        console.error(studentError)
        return []
    }

    if (studentData === null) return []

    return studentData.map((student) => {
        return new Student(
            student.id,
            student.link_code,
            student.powerschool_id,
            student.first_name,
            student.last_name,
            student.birthdate ? new Date(student.birthdate) : null,
            student.grade,
            student.gender
        )
    })
}