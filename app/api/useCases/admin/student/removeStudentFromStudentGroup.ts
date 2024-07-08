import supabaseClient from "@/app/api/supabaseClient";

export default async function removeStudentFromStudentGroup(studentId: number, studentGroupId: number): Promise<boolean> {
    const supabase = supabaseClient;
    const { error: removeStudentFromStudentGroupError } = await supabase.rpc('remove_student_from_student_group', { provided_student_id: studentId, provided_student_group_id: studentGroupId });
    if (removeStudentFromStudentGroupError) {
        console.error(removeStudentFromStudentGroupError);
        return false;
    }

    return true
}