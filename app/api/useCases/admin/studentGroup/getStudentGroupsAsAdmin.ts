import supabaseClient from "@/app/api/supabaseClient";
import { StudentGroup } from "@/app/dataClasses";

export default async function getStudentGroupsAsAdmin(schoolId: number): Promise<StudentGroup[] | null> {
    const supabase = supabaseClient;
    const { data: studentGroupData, error: studentGroupError } = await supabase.rpc('get_student_groups_as_admin', { school_id: schoolId })
    if (studentGroupError) {
        console.error(studentGroupError);
        return null;
    }

    if (studentGroupData === null) return null

    return studentGroupData.map((studentGroup: any) => {
        return new StudentGroup(
            studentGroup.id,
            studentGroup.name,
            studentGroup.parent_id
        )
    })
}