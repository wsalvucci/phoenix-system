import supabaseClient from "@/app/api/supabaseClient";

export default async function addStudentToStudentGroup(studentId: number, studentGroupId: number): Promise<boolean> {
    const supabase = supabaseClient;
    const { error: addStudentToStudentGroupError } = await supabase.rpc('add_student_to_student_group', { provided_student_id: studentId, provided_student_group_id: studentGroupId });
    if (addStudentToStudentGroupError) {
        console.error(addStudentToStudentGroupError);
        return false;
    }

    return true
}