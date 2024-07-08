import supabaseClient from "@/app/api/supabaseClient";

export default async function addTeacherToStudentGroup(teacherId: number, studentGroupId: number): Promise<boolean> {
    const supabase = supabaseClient;
    const { error: addTeacherToStudentGroupError } = await supabase.rpc('add_teacher_to_student_group', { provided_teacher_id: teacherId, provided_student_group_id: studentGroupId });
    if (addTeacherToStudentGroupError) {
        console.error(addTeacherToStudentGroupError);
        return false;
    }

    return true
}