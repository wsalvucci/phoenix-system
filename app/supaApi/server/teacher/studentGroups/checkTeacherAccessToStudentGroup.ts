"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import getOwnTeacherData from "../getOwnTeacherData";

export async function checkTeacherAccessToStudentGroup(studentGroupId: number): Promise<boolean> {
    const teacherData = await getOwnTeacherData();

    if (!teacherData) return false;

    const supabase = await supabaseServiceClient();

    const { data: studentGroupPairData, error: studentGroupPairError } = await supabase.from("teacher_student_group_pair").select("*").eq("teacher_id", teacherData.id).eq("group_id", studentGroupId).single();

    if (studentGroupPairError) {
        console.error(studentGroupPairError);
        return false;
    }

    if (studentGroupPairData === null) return false;

    return true;
}