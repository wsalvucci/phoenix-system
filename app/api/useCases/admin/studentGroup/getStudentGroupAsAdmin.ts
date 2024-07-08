import supabaseClient from "@/app/api/supabaseClient";
import { Student, StudentGroup, Teacher } from "@/app/dataClasses";
import { Database } from "@/types/supabase";

export default async function getStudentGroupAsAdmin(schoolId: number, studentGroupId: number): Promise<StudentGroup | null> {
    const supabase = supabaseClient;
    const { data: studentGroupData, error: studentGroupError } = await supabase.rpc('get_student_group_as_admin', { provided_school_id: schoolId, provided_group_id: studentGroupId }).maybeSingle();
    if (studentGroupError) {
        console.error(studentGroupError);
        return null;
    }

    if (studentGroupData === null) return null

    return new StudentGroup(
        studentGroupData.id,
        studentGroupData.name,
        studentGroupData.parent_id,
        studentGroupData.child_groups
            .filter((group) => group !== null)
            .map((childGroup: Database['public']['Tables']['student_group']['Row']) =>
                new StudentGroup(
                    childGroup.id,
                    childGroup.name,
                    childGroup.parent_id
                )
            ),
        studentGroupData.teachers
            .filter((group) => group !== null)
            .map((teacher: Database['public']['Tables']['teacher']['Row']) =>
                new Teacher(
                    teacher.id,
                    teacher.first_name,
                    teacher.last_name,
                    teacher.link_code,
                    null
                )),
        studentGroupData.students
            .filter((group) => group !== null)
            .map((student: Database['public']['Tables']['student']['Row']) =>
                new Student(
                    student.id,
                    student.link_code,
                    student.powerschool_id,
                    student.first_name,
                    student.last_name,
                    student.birthdate ? new Date(student.birthdate) : null,
                    student.grade,
                    student.gender
                ))
    )
}