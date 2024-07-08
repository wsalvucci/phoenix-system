import supabaseClient from "@/app/api/supabaseClient";
import { Teacher } from "@/app/dataClasses";

export default async function getSchoolTeacherAsAdmin(schoolId: number, teacherId: number): Promise<Teacher | null> {
    const supabase = supabaseClient;
    const { data: teacherData, error: teacherError } = await supabase.rpc('get_school_teacher_as_admin', { provided_school_id: schoolId, provided_teacher_id: teacherId }).maybeSingle();
    if (teacherError) {
        console.error(teacherError);
        return null;
    }

    if (teacherData === null) return null

    return new Teacher(
        teacherData.teacher_id,
        teacherData.first_name,
        teacherData.last_name,
        teacherData.link_code,
        teacherData.user_id
    )
}