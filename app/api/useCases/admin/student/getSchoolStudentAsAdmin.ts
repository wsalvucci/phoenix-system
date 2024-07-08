import supabaseClient from "@/app/api/supabaseClient"
import { Student } from "@/app/dataClasses"

export default async function getSchoolStudentAsAdmin(schoolId: number, studentId: number): Promise<Student | null> {
    const supabase = supabaseClient
    const { data: studentData, error: studentError } = await supabase.rpc('get_school_student_as_admin', { provided_school_id: schoolId, provided_student_id: studentId }).maybeSingle()
    if (studentError) {
        console.error(studentError)
        return null
    }

    if (studentData === null) return null

    return new Student(
        studentData.id,
        studentData.link_code,
        studentData.powerschool_id,
        studentData.first_name,
        studentData.last_name,
        studentData.birthdate ? new Date(studentData.birthdate) : null,
        studentData.grade,
        studentData.gender
    )
}