"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import checkAdminTeacherAccess from "../teachers/checkAdminTeacherAccess";
import checkAdminStudentGroupAccess from "./checkAdminStudentGroupAccess";

export default async function removeTeacherFromStudentGroup(teacherId: number, studentGroupId: number): Promise<boolean> {
    const adminAccess = await checkAdminStudentGroupAccess(studentGroupId);

    if (!adminAccess) return false;

    const adminTeacherAccess = await checkAdminTeacherAccess(teacherId);

    if (!adminTeacherAccess) return false;

    const supabase = await supabaseServiceClient();

    const { error } = await supabase.from("teacher_student_group_pair").delete().eq("teacher_id", teacherId).eq("group_id", studentGroupId);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}