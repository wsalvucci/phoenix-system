import supabaseClient from "@/app/api/supabaseClient";

export default async function removeTeacherFromStudentGroup(schoolId: number, teacherId: number, studentGroupId: number): Promise<boolean> {
    const supabase = supabaseClient;
    const { error: removeTeacherFromStudentGroupError } = await supabase.rpc('remove_teacher_from_student_group', { provided_school_id: schoolId, provided_teacher_id: teacherId, provided_group_id: studentGroupId });
    if (removeTeacherFromStudentGroupError) {
        console.error(removeTeacherFromStudentGroupError);
        return false;
    }

    return true
}