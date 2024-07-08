import supabaseClient from "@/app/api/supabaseClient";
import { Student } from "@/app/dataClasses";
import { Database } from "@/types/supabase";

export default async function getSchoolStudentsAsAdmin(schoolId: number): Promise<Student[] | null> {
    const supabase = supabaseClient;
    const { data: studentData, error: studentError } = await supabase.rpc('get_school_students_as_admin', { provided_school_id: schoolId })
    if (studentError) {
        console.error(studentError);
        return null;
    }

    if (studentData === null) return null

    return studentData.map((student: Database['public']['Tables']['student']['Row']) => {
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