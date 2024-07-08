import supabaseClient from "@/app/api/supabaseClient";
import { Teacher } from "@/app/dataClasses";

export default async function getSchoolTeachersAsAdmin(schoolId: number): Promise<Teacher[] | []> {
    const supabase = supabaseClient;
    const { data: teacherData, error: teacherError } = await supabase.rpc('get_school_teachers_as_admin', { provided_school_id: schoolId })
    if (teacherError) {
        console.error(teacherError);
        return [];
    }

    if (teacherData === null) return []

    return teacherData.map((teacher: any) => {
        return new Teacher(
            teacher.teacher_id,
            teacher.first_name,
            teacher.last_name,
            teacher.link_code,
            teacher.user_id
        )
    })
}