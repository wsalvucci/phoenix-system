import supabaseClient from "@/app/api/supabaseClient";

export default async function addStudentGroup(schoolId: number, studentGroupName: string, parentId: number | undefined): Promise<boolean> {
    const supabase = supabaseClient;
    const { error: addStudentGroupError } = await supabase.rpc('add_student_group', { provided_school_id: schoolId, provided_name: studentGroupName, provided_parent_id: parentId });
    if (addStudentGroupError) {
        console.error(addStudentGroupError);
        return false;
    }

    return true
}